// The room's rules, with no sockets and no clock: who is in which seat, which command lands on which tick, and what is
// sent to whom. A Colyseus room (the `server` feature) wraps this and calls `step` on a timer; the tests call it
// directly. The engine owns the one sim the room runs, so what the players agree on is what this sim computes.
//
// Queue rules. A command takes effect on `max(its stamped tick, the room's next tick, the effective tick of that
// seat's previous command)`: late is never refused and never rewound, and a seat's commands never overtake each other.
// A command the room makes for a seat (a let-go when the connection drops) takes that seat's next `seq`, so the
// room's replay holds the seat's commands in one order, and the seat's next `seat` message tells the player where to
// carry on.
//
// A game with `seatCommands` (a co-op game, where heroes come and go) has no lobby: the room starts on the first join,
// and each player's hero appears when the room queues that seat's `join` command, and goes when it queues `leave`.
// Everyone after the first is brought up to date the way a returning player is: `seat`, then the state. A seat whose
// player left stays taken (`gone`): a room of four that lost a player cannot give that number to a newcomer, because the
// sim would have to take a `join` for a number that just had a `leave`.
import { controlsCommand, createRecorder, type Recorder, type Replay } from '../commands/commands.ts'
import type { Command, Sim } from '../sim/sim.ts'
import {
  HASH_EVERY,
  MAX_LEAD_TICKS,
  MAX_QUEUED_COMMANDS,
  parseClientMessage,
  parseRoomOptions,
  type Refusal,
  type RoomOptions,
  roomOptionsOf,
  type ServerMessage,
} from './protocol.ts'

/** Where the engine sends what it says to one player. The room's client, or a fake in a test. */
export interface RoomPeer {
  send(message: ServerMessage): void
  sendBytes(bytes: Uint8Array): void
}

export interface RoomEngine {
  readonly options: RoomOptions
  readonly started: boolean
  /** The next tick the room steps. */
  readonly tick: number
  readonly stats: { readonly late: number; readonly refused: number; readonly ignored: number }
  /** The lowest free seat, or the problem. Sends `seat`, then `waiting` to everyone, or `start` when full. */
  join(
    peer: RoomPeer,
    options: unknown,
    code: string,
  ): { readonly seat: number } | { readonly problem: 'different-version' | 'room-full' }
  /** Anything off the wire from that seat. Never throws. */
  receive(seat: number, raw: unknown): void
  /** The connection dropped: tells the others `away` and lets go of that player's controls. */
  away(seat: number): void
  /** The same player, on a new connection: `seat`, then `sync` and the bytes; tells the others `back`. */
  back(seat: number, peer: RoomPeer): void
  /** The player is gone for good: the seat stays taken, and the hero stands still (or, with `seatCommands`, goes). */
  leave(seat: number): void
  /** One tick, if started: steps the commands due, sends `refused` for what the sim rejected, relays the rest. */
  step(): void
  replay(): Replay
}

/** One seat's state. A seat is a player number, 1 to `seats`. */
interface Seat {
  peer: RoomPeer | undefined
  /** True from the drop until the player is back or gone. */
  away: boolean
  gone: boolean
  /** The highest `seq` this seat has used, the room's own included; -1 before any. */
  lastSeq: number
  /** The tick the seat's latest command takes effect on. */
  lastEffective: number
  /** Commands from this seat waiting for their tick. */
  queued: number
}

const sameOptions = (a: RoomOptions, b: RoomOptions): boolean =>
  (Object.keys(b) as (keyof RoomOptions)[]).every((key) => a[key] === b[key])

export function createRoomEngine(setup: {
  readonly sim: Sim
  readonly level: string
  readonly seats: number
  /** The ids of the commands that put a player's hero in and take it out. Set for a game made with no players. */
  readonly seatCommands?: { readonly join: string; readonly leave: string }
}): RoomEngine {
  const { sim, level, seats, seatCommands } = setup
  const options = roomOptionsOf(sim, { level, seats })
  const recorder: Recorder = createRecorder(sim, {
    meta: {
      level,
      players: seatCommands === undefined ? Array.from({ length: seats }, (_, i) => i + 1).join(',') : '',
      seats: String(seats),
    },
  })
  const table = new Map<number, Seat>()
  /** Commands waiting for a tick, by that tick. */
  const queue = new Map<number, Command[]>()
  /** The commands a player sent, as opposed to the ones the room made: only these count against the queue limit. */
  const fromPlayers = new WeakSet<Command>()
  const stats = { late: 0, refused: 0, ignored: 0 }
  let started = false
  let code = ''

  const peers = (): RoomPeer[] => [...table.values()].flatMap((s) => (s.peer !== undefined ? [s.peer] : []))
  const tellOthers = (seat: number, message: ServerMessage): void => {
    for (const [n, s] of table) if (n !== seat) s.peer?.send(message)
  }
  const refuse = (seat: number, seq: number, reason: Refusal): void => {
    stats.refused++
    table.get(seat)?.peer?.send({ t: 'refused', seq, reason })
  }
  const enqueue = (tick: number, command: Command): void => {
    const list = queue.get(tick)
    if (list === undefined) queue.set(tick, [command])
    else list.push(command)
  }
  /** The room's own `controls` for a seat that let go: nothing held. */
  const letGo = (seat: number, state: Seat): void => {
    if (!started) return
    const tick = Math.max(sim.tick, state.lastEffective)
    state.lastSeq += 1
    state.lastEffective = tick
    enqueue(tick, controlsCommand(tick, seat, state.lastSeq, []))
  }
  /** The room's own `join` or `leave` for a seat, in the order the seat's other commands are in. */
  const seatCommand = (seat: number, state: Seat, type: string): void => {
    const tick = Math.max(sim.tick, state.lastEffective)
    state.lastSeq += 1
    state.lastEffective = tick
    enqueue(tick, { tick, source: seat, seq: state.lastSeq, type, payload: {} })
  }
  const sendState = (peer: RoomPeer): void => {
    peer.send({ t: 'sync', tick: sim.tick })
    peer.sendBytes(sim.snapshot())
  }

  return {
    options,
    get started() {
      return started
    },
    get tick() {
      return sim.tick
    },
    stats,

    join(peer, given, joinCode) {
      const parsed = parseRoomOptions(given)
      if (parsed === undefined || !sameOptions(parsed, options)) return { problem: 'different-version' }
      let seat = 1
      while (table.has(seat) && seat <= seats) seat++
      if (seat > seats) return { problem: 'room-full' }
      code = joinCode
      const state: Seat = { peer, away: false, gone: false, lastSeq: -1, lastEffective: 0, queued: 0 }
      table.set(seat, state)
      if (seatCommands !== undefined) {
        // No lobby: the first player starts the room, and every player's hero comes by the sim's own command.
        const first = !started
        started = true
        seatCommand(seat, state, seatCommands.join)
        peer.send({ t: 'seat', seat, code, nextSeq: state.lastSeq + 1 })
        if (first) peer.send({ t: 'start' })
        else sendState(peer)
        return { seat }
      }
      peer.send({ t: 'seat', seat, code, nextSeq: 0 })
      if (table.size === seats) {
        started = true
        for (const p of peers()) p.send({ t: 'start' })
      } else {
        for (const p of peers()) p.send({ t: 'waiting', missing: seats - table.size })
      }
      return { seat }
    },

    receive(seat, raw) {
      const state = table.get(seat)
      const message = parseClientMessage(raw)
      if (state?.peer === undefined || message === undefined) {
        stats.ignored++
        return
      }
      if (message.t === 'sync') {
        sendState(state.peer)
        return
      }
      if (!started) return refuse(seat, message.seq, 'not-started')
      if (message.seq <= state.lastSeq) return refuse(seat, message.seq, 'out-of-order')
      if (message.tick > sim.tick + MAX_LEAD_TICKS) return refuse(seat, message.seq, 'too-far-ahead')
      if (state.queued >= MAX_QUEUED_COMMANDS) return refuse(seat, message.seq, 'too-many')
      if (message.tick < sim.tick) stats.late++
      const tick = Math.max(message.tick, sim.tick, state.lastEffective)
      state.lastSeq = message.seq
      state.lastEffective = tick
      state.queued++
      const command: Command = {
        tick,
        source: seat,
        seq: message.seq,
        type: message.type,
        payload: message.payload,
      }
      fromPlayers.add(command)
      enqueue(tick, command)
    },

    away(seat) {
      const state = table.get(seat)
      if (state === undefined || state.away || state.gone) return
      state.peer = undefined
      state.away = true
      tellOthers(seat, { t: 'away', seat })
      letGo(seat, state)
    },

    back(seat, peer) {
      const state = table.get(seat)
      if (state === undefined || !state.away || state.gone) return
      state.peer = peer
      state.away = false
      peer.send({ t: 'seat', seat, code, nextSeq: state.lastSeq + 1 })
      sendState(peer)
      if (!started) peer.send({ t: 'waiting', missing: seats - table.size })
      tellOthers(seat, { t: 'back', seat })
    },

    leave(seat) {
      const state = table.get(seat)
      if (state === undefined || state.gone) return
      if (!started) {
        // Nobody is playing yet, so the seat is free again and the others are told how many are still missing.
        table.delete(seat)
        for (const p of peers()) p.send({ t: 'waiting', missing: seats - table.size })
        return
      }
      if (seatCommands !== undefined) {
        // The hero goes by the sim's own command. A player who was away has already let go, and the others were told.
        state.peer = undefined
        state.gone = true
        state.away = true
        seatCommand(seat, state, seatCommands.leave)
        tellOthers(seat, { t: 'gone', seat })
        return
      }
      // A player who leaves on purpose lets go like one whose connection dropped; one already away has done so.
      if (!state.away) {
        state.peer = undefined
        tellOthers(seat, { t: 'away', seat })
        letGo(seat, state)
      }
      state.gone = true
      state.away = true
      // Gone for good: the others take the player off the list of those who lost their connection.
      tellOthers(seat, { t: 'gone', seat })
    },

    step() {
      if (!started) return
      const tick = sim.tick
      const due = (queue.get(tick) ?? []).sort((a, b) => a.source - b.source || a.seq - b.seq)
      queue.delete(tick)
      for (const c of due) {
        const state = table.get(c.source)
        if (state !== undefined && fromPlayers.has(c)) state.queued--
      }
      const result = recorder.step(due)
      const rejected = new Set(result.rejected.map((r) => r.command))
      for (const r of result.rejected) refuse(r.command.source, r.command.seq, 'not-valid')
      const message: ServerMessage = {
        t: 'tick',
        tick,
        commands: due.filter((c) => !rejected.has(c)),
        ...((tick + 1) % HASH_EVERY === 0 ? { hash: sim.hash() } : {}),
      }
      for (const p of peers()) p.send(message)
    },

    replay: () => recorder.replay(),
  }
}
