// The Colyseus room: an adapter and nothing more. Every rule is the engine's (`net/room-engine.ts`); this class turns
// Colyseus's lifecycle into the engine's calls, a Colyseus client into a `RoomPeer`, and a tick scheduler into
// `engine.step()`. A refusal is an `Error` whose message is `<problem>: <words>`, which the client reads back.
import { type Client, CloseCode, Room } from '@colyseus/core'
import type { GameContent } from '../content/content.ts'
import { createGameSim, JoinCommand, LeaveCommand, LevelError } from '../level/level.ts'
import {
  BYTES_CHANNEL,
  coopSeats,
  createRoomEngine,
  MESSAGE_CHANNEL,
  type OnlineProblem,
  parseRoomOptions,
  type RoomEngine,
  type RoomOptions,
  type RoomPeer,
} from '../net/net.ts'
import type { PluginDef, Sim } from '../sim/sim.ts'
import { startTickScheduler, type TickClock, type TickScheduler } from './tick-scheduler.ts'

/** The game a server runs: what a room needs to make its sim. */
export interface RoomGame {
  readonly content: GameContent
  readonly plugins?: readonly PluginDef[]
  readonly gravity?: { readonly x: number; readonly y: number }
}

/** A room that is open: its engine, and the sim the engine runs. */
export interface OpenRoom {
  readonly engine: RoomEngine
  readonly sim: Sim
}

/** What every room of one server shares. */
export interface RoomContext {
  readonly game: RoomGame
  readonly maxRooms: number
  readonly graceSeconds: number
  readonly clock: TickClock
  /** Open rooms by code. */
  readonly rooms: Map<string, OpenRoom>
  /** What closed rooms did, added to what open ones are doing when the server reports. */
  readonly closed: { late: number; refused: number }
}

const refusal = (problem: OnlineProblem, words: string): Error => new Error(`${problem}: ${words}`)

const players = (seats: number): number[] => Array.from({ length: seats }, (_, i) => i + 1)

/** The room class one server runs: `GameRoom` with that server's context bound in. */
export function roomClassFor(ctx: RoomContext): new () => Room {
  return class GameRoom extends Room {
    private engine: RoomEngine | undefined
    private sim: Sim | undefined
    private scheduler: TickScheduler | undefined
    /** The seat each connection holds. */
    private readonly seats = new Map<string, number>()
    private options: RoomOptions | undefined

    override async onCreate(given: unknown): Promise<void> {
      const options = parseRoomOptions(given)
      if (options === undefined) throw refusal('bad-room', 'The room options are not valid.')
      if (ctx.rooms.size >= ctx.maxRooms)
        throw refusal('server-full', 'The server has no space for another room right now.')
      // A co-op game's players come and go by the sim's own commands, so its room's sim starts with nobody, and its seats
      // are what its level has start points for.
      const { content } = ctx.game
      const coop = coopSeats(content.project, content.levels[options.level]?.starts ?? [])
      if (coop !== undefined && options.seats !== coop)
        throw refusal('bad-room', `This game's room has ${coop} places, not ${options.seats}.`)
      let sim: Sim
      try {
        sim = await createGameSim({
          ...ctx.game,
          level: options.level,
          seed: options.seed,
          players: coop === undefined ? players(options.seats) : [],
        })
      } catch (error) {
        throw error instanceof LevelError ? refusal('bad-room', error.message) : error
      }
      // The room's code is Colyseus's own id, so joining by code is `joinById` and no table maps one to the other.
      this.maxClients = options.seats
      this.sim = sim
      this.options = options
      this.engine = createRoomEngine({
        sim,
        level: options.level,
        seats: options.seats,
        ...(coop === undefined ? {} : { seatCommands: { join: JoinCommand.id, leave: LeaveCommand.id } }),
      })
      ctx.rooms.set(this.roomId, { engine: this.engine, sim })
      this.onMessage(MESSAGE_CHANNEL, (client, raw: unknown) => {
        const seat = this.seats.get(client.sessionId)
        if (seat !== undefined) this.engine?.receive(seat, raw)
      })
    }

    /** Before a seat is reserved: a player with another copy of the game is refused, with words that say to reload. */
    override onAuth(_client: Client, given: unknown): true {
      const engine = this.engine
      const theirs = parseRoomOptions(given)
      const ours = engine?.options
      if (
        theirs === undefined ||
        ours === undefined ||
        (Object.keys(ours) as (keyof RoomOptions)[]).some((key) => theirs[key] !== ours[key])
      ) {
        throw refusal(
          'different-version',
          'This game is a different version from the room. Reload the page to get the newest one.',
        )
      }
      return true
    }

    override onJoin(client: Client, given: unknown): void {
      const engine = this.engine
      if (engine === undefined) throw refusal('bad-room', 'The room is not ready.')
      const joined = engine.join(peerOf(client), given, this.roomId)
      if ('problem' in joined) throw refusal(joined.problem, 'That room is full.')
      this.seats.set(client.sessionId, joined.seat)
      if (engine.started && this.scheduler === undefined) this.startClock(engine)
    }

    /** A connection lost, not given up: the seat is held for the grace. */
    override onDrop(client: Client): void {
      const seat = this.seats.get(client.sessionId)
      if (seat === undefined) return
      this.engine?.away(seat)
      // `onLeave` follows if the grace runs out; a dropped promise here would be an unhandled rejection.
      this.allowReconnection(client, ctx.graceSeconds).catch(() => undefined)
    }

    override onReconnect(client: Client): void {
      const seat = this.seats.get(client.sessionId)
      if (seat !== undefined) this.engine?.back(seat, peerOf(client))
    }

    /** A consented leave, or a drop whose grace ran out: the player is gone for good. */
    override onLeave(client: Client): void {
      const seat = this.seats.get(client.sessionId)
      if (seat === undefined) return
      this.seats.delete(client.sessionId)
      this.engine?.leave(seat)
    }

    override onDispose(): void {
      this.scheduler?.stop()
      this.scheduler = undefined
      const engine = this.engine
      if (engine !== undefined) {
        ctx.closed.late += engine.stats.late
        ctx.closed.refused += engine.stats.refused
      }
      ctx.rooms.delete(this.roomId)
      this.sim?.dispose()
      this.sim = undefined
      this.engine = undefined
    }

    private startClock(engine: RoomEngine): void {
      const tickHz = this.options?.tickHz ?? 60
      this.scheduler = startTickScheduler({
        tickMs: 1000 / tickHz,
        clock: ctx.clock,
        // Half a second at most: time a room drops rather than replays.
        maxCatchUp: Math.ceil(tickHz / 2),
        onTick: () => engine.step(),
        // The scheduler's promise that nothing escapes its timer: a room whose tick threw closes.
        onError: () => void this.disconnect(CloseCode.WITH_ERROR),
      })
    }
  }
}

/** A Colyseus client as the engine speaks to it. */
function peerOf(client: Client): RoomPeer {
  return {
    send: (message) => client.send(MESSAGE_CHANNEL, message),
    sendBytes: (bytes) => client.sendBytes(BYTES_CHANNEL, bytes),
  }
}
