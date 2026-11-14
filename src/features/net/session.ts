// The client: two sims made the same way. `confirmed` steps only what the room says happened, tick by tick, so it is
// always exactly the room's sim a little late. `predicted` runs a few ticks ahead on the player's own commands and is
// what a game draws, so a key press is seen at once. When the room's version of a tick differs from what `predicted`
// stepped (another player's command, or one of ours that landed late), `predicted` is put back on `confirmed` and
// stepped forward again with the commands the room has not confirmed yet.
//
// Nothing here reads a clock or sets a timer. Time is "advance once", from whoever owns the loop.
import { canonicalJson } from '../../lib/canonical.ts'
import type { Command, RenderDelta, Sim, SimEvent } from '../sim/sim.ts'
import type { Link } from './link.ts'
import {
  type ClientMessage,
  LEAD_DECAY_TICKS,
  MAX_CATCH_UP,
  MAX_CLIENT_LEAD,
  MAX_CONFIRM_PER_ADVANCE,
  MAX_LEAD_TICKS,
  MIN_LEAD,
  type ServerMessage,
  START_LEAD,
  SYNC_BEHIND,
} from './protocol.ts'

export interface SessionStats {
  readonly confirmedTick: number
  readonly predictedTick: number
  readonly lead: number
  readonly rollbacks: number
  readonly late: number
  readonly desyncs: number
  readonly syncs: number
  /** Hashes that matched the room's. */
  readonly checked: number
}

export type SessionState =
  | { readonly state: 'waiting'; readonly code: string; readonly missing: number }
  | { readonly state: 'playing'; readonly away: readonly number[] }
  | { readonly state: 'closed' }

export interface Advance {
  /** In order; the first after a rollback or a sync is a resync. Apply every one. */
  readonly deltas: readonly RenderDelta[]
  /** Events of ticks predicted for the first time; a replayed tick's events are not given twice. */
  readonly events: readonly SimEvent[]
  /**
   * The same ticks, one entry for each tick predicted for the first time, with that tick's own events and its tick
   * (the tick after the step). A page that listens for sound reads this, so two jumps that reach it in one `advance`
   * are two entries on their own ticks, not one list on the last.
   */
  readonly steps: readonly { readonly tick: number; readonly events: readonly SimEvent[] }[]
}

/** What `advance` fills in while it steps: the same lists `Advance` gives out. */
interface Filling {
  deltas: RenderDelta[]
  events: SimEvent[]
  steps: { tick: number; events: readonly SimEvent[] }[]
}

export interface Session {
  readonly seat: number | undefined
  /** The predicted sim: what a game draws and reads. Never step it. */
  readonly sim: Sim
  state(): SessionState
  stats(): SessionStats
  /** Once per tick of the caller's loop. Only `type` and `payload` of each local command are read. */
  advance(local: readonly Pick<Command, 'type' | 'payload'>[]): Advance
  /** Takes over a new link after a drop (the room answers with `seat` and `sync`). */
  resume(link: Link): void
  close(): void
}

export interface SessionSetup {
  readonly link: Link
  /** Both at tick 0, made the same way. */
  readonly confirmed: Sim
  readonly predicted: Sim
  /** The commands whose last value is sent again after a sync, because what was sent while the line was down is gone. */
  readonly resendAfterSync?: readonly string[]
  readonly onCheck?: (tick: number, hash: string, ok: boolean) => void
  readonly onState?: (state: SessionState) => void
  /** The link ended. The session keeps its state and waits for `resume` or `close`. */
  readonly onLinkClosed?: () => void
}

/** A command this player sent that the room has not yet confirmed. */
interface Pending {
  readonly seq: number
  /** The tick it was stamped with. */
  readonly tick: number
  readonly type: string
  readonly payload: unknown
  /** Whether `predicted` has stepped it since it was last put back on `confirmed`. */
  stepped: boolean
}

type TickMessage = Extract<ServerMessage, { t: 'tick' }>

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const sameCommands = (a: readonly unknown[], b: readonly unknown[]): boolean =>
  canonicalJson(a) === canonicalJson(b)

export function createSession(setup: SessionSetup): Session {
  const { confirmed, predicted, resendAfterSync = ['controls'] } = setup
  let link = setup.link
  let seat: number | undefined
  let nextSeq = 0
  let state: SessionState = { state: 'waiting', code: '', missing: 0 }
  let away: readonly number[] = []
  let started = false
  let closed = false

  let lead = START_LEAD
  let calm = 0
  const counts = { rollbacks: 0, late: 0, desyncs: 0, syncs: 0, checked: 0 }

  /** Tick messages waiting to be confirmed, in the order they arrived. */
  let inbox: TickMessage[] = []
  /** What `predicted` stepped on each tick it has stepped since the last rollback, for comparing with the room's. */
  const predictedAt = new Map<number, Command[]>()
  const pending: Pending[] = []
  /** Local commands not yet given a tick, because no predicted step has been taken since they were given. */
  let unsent: { type: string; payload: unknown }[] = []
  const lastLocal = new Map<string, unknown>()
  /** True from asking for the state until it arrives: nothing is confirmed meanwhile. */
  let syncing = false
  /** The tick of a `sync` header whose bytes have not come yet. */
  let syncTick: number | undefined

  const setState = (next: SessionState): void => {
    state = next
    setup.onState?.(state)
  }
  const playing = (): void => {
    if (closed) return
    started = true
    setState({ state: 'playing', away })
  }
  const requestSync = (): void => {
    if (syncing) return
    syncing = true
    link.send({ t: 'sync' })
  }

  /** The state arrived: both sims go to it, and everything built on the old picture is let go. */
  const applySync = (bytes: Uint8Array): void => {
    confirmed.restore(bytes)
    predicted.restore(bytes)
    inbox = inbox.filter((m) => m.tick >= confirmed.tick)
    pending.length = 0
    predictedAt.clear()
    unsent = unsent.filter((u) => !resendAfterSync.includes(u.type))
    for (const type of resendAfterSync) {
      if (lastLocal.has(type)) unsent.push({ type, payload: lastLocal.get(type) })
    }
    syncing = false
    syncTick = undefined
    counts.syncs++
    calm = 0
    playing()
  }

  const handlers = {
    message(m: ServerMessage): void {
      if (closed) return
      switch (m.t) {
        case 'seat':
          seat = m.seat
          nextSeq = m.nextSeq
          if (!started) setState({ state: 'waiting', code: m.code, missing: 0 })
          break
        case 'waiting':
          setState({
            state: 'waiting',
            code: state.state === 'waiting' ? state.code : '',
            missing: m.missing,
          })
          break
        case 'start':
          playing()
          break
        case 'tick':
          if (!started) playing()
          inbox.push(m)
          break
        case 'refused': {
          const i = pending.findIndex((p) => p.seq === m.seq)
          if (i >= 0) pending.splice(i, 1)
          break
        }
        case 'sync':
          syncTick = m.tick
          break
        case 'away':
          away = [...away.filter((s) => s !== m.seat), m.seat].sort((a, b) => a - b)
          if (started) setState({ state: 'playing', away })
          break
        case 'back':
        case 'gone':
          away = away.filter((s) => s !== m.seat)
          if (started) setState({ state: 'playing', away })
          break
      }
    },
    bytes(bytes: Uint8Array): void {
      if (closed || syncTick === undefined) return
      applySync(bytes)
    },
    closed(): void {
      if (!closed) setup.onLinkClosed?.()
    },
  }
  link.listen(handlers)

  /** Steps `predicted` one tick with every pending command that is due and not yet stepped, in `seq` order. */
  function stepPredicted(tick: number, fresh: boolean, into: Filling): void {
    const commands: Command[] = []
    for (const p of pending) {
      if (p.stepped || p.tick > tick) continue
      p.stepped = true
      commands.push({ tick, source: seat ?? 0, seq: p.seq, type: p.type, payload: p.payload })
    }
    const result = predicted.step(commands)
    predictedAt.set(tick, commands)
    into.deltas.push(result.render)
    if (fresh) {
      into.events.push(...result.events)
      into.steps.push({ tick: result.tick, events: result.events })
    }
  }

  /**
   * Takes the room's ticks that are waiting. Says whether `predicted` no longer matches (`wrong`), and whether that is
   * because a tick it had already guessed holds other commands in the room (`putRight`): a rollback. The second is
   * asked of each tick as it is confirmed, because a page slower than its lead confirms past its own guess in one
   * batch, and by the end of the batch nothing is left ahead to show that the guess was wrong.
   */
  function confirmWaiting(): { wrong: boolean; putRight: boolean } {
    let wrong = false
    let putRight = false
    let taken = 0
    while (!syncing && taken < MAX_CONFIRM_PER_ADVANCE && inbox.length > 0) {
      const m = inbox[0] as TickMessage
      if (m.tick < confirmed.tick) {
        inbox.shift()
        continue
      }
      if (m.tick > confirmed.tick) {
        // A hole in what the room sent: only the whole state mends it.
        requestSync()
        break
      }
      inbox.shift()
      taken++
      confirmed.step(m.commands as Command[])
      if (m.hash !== undefined) {
        const mine = confirmed.hash()
        const ok = mine === m.hash
        setup.onCheck?.(m.tick, mine, ok)
        if (ok) counts.checked++
        else {
          counts.desyncs++
          requestSync()
        }
      }
      for (const c of m.commands) {
        if (c.source !== seat) continue
        const i = pending.findIndex((p) => p.seq === c.seq)
        const p = pending[i]
        if (p === undefined) continue
        pending.splice(i, 1)
        if (m.tick > p.tick) {
          counts.late++
          lead = Math.min(MAX_CLIENT_LEAD, lead + (m.tick - p.tick))
          calm = 0
        }
      }
      if (++calm >= LEAD_DECAY_TICKS && lead > MIN_LEAD) {
        lead--
        calm = 0
      }
      const guessed = predictedAt.get(m.tick)
      const same = sameCommands(m.commands, guessed ?? [])
      if (guessed !== undefined && !same) putRight = true
      if (predicted.tick <= m.tick || !same) wrong = true
      predictedAt.delete(m.tick)
    }
    // A command so old that its tick is far behind the room is given up.
    for (let i = pending.length - 1; i >= 0; i--) {
      if ((pending[i] as Pending).tick + 2 * MAX_LEAD_TICKS < confirmed.tick) pending.splice(i, 1)
    }
    return { wrong, putRight }
  }

  return {
    get seat() {
      return seat
    },
    sim: predicted,
    state: () => state,
    stats: () => ({
      confirmedTick: confirmed.tick,
      predictedTick: predicted.tick,
      lead,
      ...counts,
    }),

    advance(local) {
      const out: Filling = { deltas: [], events: [], steps: [] }
      if (closed) return out
      for (const c of local) {
        const given = { type: c.type, payload: clone(c.payload) }
        unsent.push(given)
        lastLocal.set(given.type, given.payload)
      }
      if (!started || seat === undefined) return out

      if (!syncing && inbox.length > SYNC_BEHIND) requestSync()
      const confirming = confirmWaiting()
      if (confirming.wrong) {
        // Put `predicted` back on the confirmed state and step it up to where it was, on what is still unconfirmed.
        const was = predicted.tick
        predicted.restore(confirmed.snapshot())
        predictedAt.clear()
        for (const p of pending) p.stepped = false
        if (confirming.putRight) counts.rollbacks++
        for (let t = confirmed.tick; t < was; t++) stepPredicted(t, false, out)
      }

      // `predicted` runs on to `lead` ticks past the last confirmed one and waits there: with a quiet room, the game
      // stops after `lead` ticks (the lead is at most MAX_CLIENT_LEAD).
      const steps = Math.max(0, Math.min(MAX_CATCH_UP, confirmed.tick + lead - predicted.tick))
      // The local commands are sent now, stamped with the tick `predicted` is about to step, even when it may not step
      // this time (it is as far ahead as it may be): a hand let go as the page is hidden must reach the room, and the
      // page will not ask again.
      for (const u of unsent) {
        const p: Pending = {
          seq: nextSeq++,
          tick: predicted.tick,
          type: u.type,
          payload: u.payload,
          stepped: false,
        }
        pending.push(p)
        link.send({
          t: 'cmd',
          seq: p.seq,
          tick: p.tick,
          type: p.type,
          payload: p.payload,
        } satisfies ClientMessage)
      }
      unsent = []
      for (let i = 0; i < steps; i++) stepPredicted(predicted.tick, true, out)
      return out
    },

    resume(next) {
      if (closed) return
      link = next
      syncing = false
      syncTick = undefined
      link.listen(handlers)
    },

    close() {
      if (closed) return
      closed = true
      link.close()
      setState({ state: 'closed' })
    },
  }
}
