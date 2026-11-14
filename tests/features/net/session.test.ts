import { afterEach, expect, test } from 'vitest'
import { Player } from '#src/features/commands/commands.ts'
import {
  type ClientMessage,
  createRoomEngine,
  createSession,
  LEAD_DECAY_TICKS,
  type Link,
  MAX_AHEAD,
  MAX_CONFIRM_PER_ADVANCE,
  type RoomEngine,
  type ServerMessage,
  type Session,
  START_LEAD,
  SYNC_BEHIND,
} from '#src/features/net/net.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { onlineSim } from '../../fixtures/online/game.ts'
import { createWire, type Delay, type Wire } from '../../fixtures/online/wire.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})
async function sim(seats: number): Promise<Sim> {
  const s = await onlineSim(seats)
  made.push(s)
  return s
}

interface Player1 {
  readonly session: Session
  readonly confirmed: Sim
  readonly predicted: Sim
  /** What this player's link was asked to send. */
  readonly sent: ClientMessage[]
  readonly checks: { tick: number; hash: string; ok: boolean }[]
  closed: number
  /** What is held from which predicted tick, as a script: [tick, held][]. */
  script: readonly (readonly [number, readonly string[]])[]
  next: number
}
interface Room {
  readonly engineSim: Sim
  readonly engine: RoomEngine
  readonly wire: Wire
  readonly players: Player1[]
  /** One beat: deliver, the room steps (unless it is stopped), then every session advances on its script. */
  beat(): void
  beats(n: number): void
  /** The room stops; the wire drains and every session takes what is left. */
  drain(): void
}

/** A line wrapper for a test that wants to see or change what crosses. */
type Wrap = (link: Link) => Link

async function room(delays: readonly Delay[], wrap: Wrap = (l) => l): Promise<Room> {
  const seats = delays.length
  const engineSim = await sim(seats)
  const engine = createRoomEngine({ sim: engineSim, level: 'level-1', seats })
  const wire = createWire(engine)
  const players: Player1[] = []
  for (const delay of delays) {
    const sent: ClientMessage[] = []
    const inner = wire.link(delay)
    const link = wrap({
      ...inner,
      send: (m) => (sent.push(m), inner.send(m)),
      listen: (h) => inner.listen(h),
    })
    const confirmed = await sim(seats)
    const predicted = await sim(seats)
    const p: Player1 = { sent, checks: [], closed: 0, script: [], next: 0 } as unknown as Player1
    Object.assign(p, {
      confirmed,
      predicted,
      session: createSession({
        link,
        confirmed,
        predicted,
        onCheck: (tick, hash, ok) => p.checks.push({ tick, hash, ok }),
        onLinkClosed: () => void p.closed++,
      }),
    })
    players.push(p)
  }
  let stopped = false
  const local = (p: Player1) => {
    const out: { type: string; payload: unknown }[] = []
    while (p.next < p.script.length && (p.script[p.next]?.[0] ?? Infinity) <= p.session.sim.tick) {
      out.push({ type: 'controls', payload: { held: p.script[p.next]?.[1] } })
      p.next++
    }
    return out
  }
  const r: Room = {
    engineSim,
    engine,
    wire,
    players,
    beat() {
      wire.pump()
      if (!stopped) engine.step()
      for (const p of players) p.session.advance(local(p))
    },
    beats(n) {
      for (let i = 0; i < n; i++) r.beat()
    },
    drain() {
      stopped = true
      for (let i = 0; i < 6; i++) r.beat()
    },
  }
  return r
}
const hero = (s: Sim, n: number) => s.query(Player, Transform).find((e) => e.get(Player).number === n)
const x = (s: Sim, n: number) => hero(s, n)?.get(Transform).x ?? Number.NaN
const ONE: Delay = { up: 1, down: 1 }

test('a key press moves the hero at once, before the room has answered', async () => {
  const r = await room([ONE])
  const p = r.players[0] as Player1
  r.wire.pump() // the room's `seat` and `start` arrive
  const before = x(p.predicted, 1)
  p.session.advance([{ type: 'controls', payload: { held: ['right'] } }])
  expect(x(p.predicted, 1)).toBeGreaterThan(before)
  expect(p.session.stats().confirmedTick).toBe(0)
  expect(p.sent[0]).toMatchObject({ t: 'cmd', seq: 0, tick: 0, type: 'controls' })
})

test('alone, it agrees with the room without a rollback', async () => {
  const r = await room([ONE])
  const p = r.players[0] as Player1
  p.script = [
    [10, ['right']],
    [60, ['right', 'jump']],
    [90, []],
  ]
  r.beats(120)
  expect(p.session.stats().rollbacks).toBe(0)
  r.drain()
  expect(p.confirmed.hash()).toBe(r.engineSim.hash())
  expect(p.session.stats().late).toBe(0)
})

test("another player's command rolls it back, and it ends where the room is", async () => {
  const r = await room([ONE, ONE])
  const [one, two] = r.players as [Player1, Player1]
  two.script = [
    [20, ['left']],
    [80, []],
  ]
  r.beats(60)
  expect(one.session.stats().rollbacks).toBeGreaterThan(0)
  expect(x(one.predicted, 2)).toBeLessThan(13.5)
  r.drain()
  expect(one.confirmed.hash()).toBe(r.engineSim.hash())
  expect(two.confirmed.hash()).toBe(r.engineSim.hash())
  expect(x(one.confirmed, 2)).toBe(x(r.engineSim, 2))
})

test('a late command is replayed where the room put it', async () => {
  const r = await room([{ up: 12, down: 1 }, ONE])
  const [one] = r.players as [Player1, Player1]
  one.script = [
    [10, ['right']],
    [50, []],
  ]
  r.beats(80)
  const stats = one.session.stats()
  expect(stats.late).toBeGreaterThanOrEqual(1)
  expect(stats.rollbacks).toBeGreaterThan(0)
  expect(stats.lead).toBeGreaterThan(START_LEAD)
  r.drain()
  expect(one.confirmed.hash()).toBe(r.engineSim.hash())
})

test('the lead comes back down after a calm stretch, and never below 1', async () => {
  const r = await room([ONE])
  const p = r.players[0] as Player1
  r.beats(LEAD_DECAY_TICKS + 10)
  expect(p.session.stats().lead).toBe(1)
  r.beats(2 * LEAD_DECAY_TICKS)
  expect(p.session.stats().lead).toBe(1)
})

test('a silent room: the game waits instead of running away, and carries on after', async () => {
  const r = await room([ONE])
  const p = r.players[0] as Player1
  p.script = [[5, ['right']]]
  r.beats(30)
  r.wire.silence(true)
  r.beats(60)
  const gap = () => p.session.stats().predictedTick - p.session.stats().confirmedTick
  const held = gap()
  expect(held).toBeLessThanOrEqual(MAX_AHEAD)
  r.beats(200)
  expect(gap()).toBe(held)
  r.wire.silence(false)
  r.beats(30)
  r.drain()
  expect(p.confirmed.hash()).toBe(r.engineSim.hash())
  expect(p.session.stats().desyncs).toBe(0)
})

test('far behind, it asks for the state instead of taking every tick one by one', async () => {
  const r = await room([ONE])
  const p = r.players[0] as Player1
  for (let i = 0; i < SYNC_BEHIND + 100; i++) {
    r.wire.pump()
    r.engine.step()
  }
  const before = p.session.stats().confirmedTick
  p.session.advance([])
  expect(p.sent.some((m) => m.t === 'sync')).toBe(true)
  expect(p.session.stats().confirmedTick - before).toBeLessThanOrEqual(MAX_CONFIRM_PER_ADVANCE)
  let widest = 0
  for (let i = 0; i < 8; i++) {
    r.wire.pump()
    r.engine.step()
    const was = p.session.stats().confirmedTick
    p.session.advance([])
    widest = Math.max(widest, p.session.stats().confirmedTick - was)
  }
  expect(widest).toBeLessThanOrEqual(MAX_CONFIRM_PER_ADVANCE)
  expect(p.session.stats().syncs).toBe(1)
  expect(p.session.stats().confirmedTick).toBeGreaterThanOrEqual(r.engine.tick - 3)
})

test('a desync is caught and mended', async () => {
  let tampered = false
  const wrap: Wrap = (link) => ({
    ...link,
    listen(h) {
      link.listen({
        ...h,
        message(m: ServerMessage) {
          if (m.t === 'tick' && m.hash !== undefined && !tampered) {
            tampered = true
            h.message({ ...m, hash: '0000000000000000' })
          } else h.message(m)
        },
      })
    },
  })
  const r = await room([ONE], wrap)
  const p = r.players[0] as Player1
  r.beats(150)
  expect(p.checks[0]).toMatchObject({ tick: 59, ok: false })
  expect(p.session.stats().desyncs).toBe(1)
  expect(p.sent.filter((m) => m.t === 'sync')).toHaveLength(1)
  expect(p.session.stats().syncs).toBe(1)
  expect(p.checks.at(-1)?.ok).toBe(true)
  expect(p.session.stats().checked).toBeGreaterThan(0)
  r.drain()
  expect(p.confirmed.hash()).toBe(r.engineSim.hash())
})

test('after a sync it says what is held', async () => {
  const r = await room([ONE])
  const p = r.players[0] as Player1
  p.script = [[5, ['right']]]
  r.beats(20)
  const cmds = () => p.sent.filter((m) => m.t === 'cmd')
  const before = cmds().length
  r.engine.receive(1, { t: 'sync' })
  r.beats(6)
  const after = cmds().slice(before)
  expect(after).toHaveLength(1)
  expect(after[0]).toMatchObject({ t: 'cmd', type: 'controls', payload: { held: ['right'] } })
  expect((after[0] as { seq: number }).seq).toBeGreaterThan((cmds()[before - 1] as { seq: number }).seq)
  r.drain()
  expect(p.confirmed.hash()).toBe(r.engineSim.hash())
})

test('after the line drops it gets back into the same seat and agrees', async () => {
  const r = await room([ONE, ONE])
  const [one, two] = r.players as [Player1, Player1]
  two.script = [[10, ['right']]]
  r.beats(30)
  r.wire.drop(2)
  expect(two.closed).toBe(1)
  expect(two.session.state().state).toBe('playing')
  r.beats(60)
  expect(one.session.state()).toEqual({ state: 'playing', away: [2] })
  two.session.resume(r.wire.relink(2, ONE))
  r.beats(30)
  expect(one.session.state()).toEqual({ state: 'playing', away: [] })
  two.script = [[two.session.sim.tick + 5, ['left']]]
  two.next = 0
  r.beats(40)
  r.drain()
  expect(two.confirmed.hash()).toBe(r.engineSim.hash())
  expect(one.confirmed.hash()).toBe(r.engineSim.hash())
  expect(two.session.stats().syncs).toBe(1)
  // The hero stood still while its player was gone.
  expect(two.session.seat).toBe(2)
})

test("a command the room refused is forgotten, so the next rollback doesn't replay it", async () => {
  const r = await room([ONE])
  const p = r.players[0] as Player1
  r.wire.pump()
  // 40 commands in one go: the room takes 32 (holding left) and refuses the last 8 (holding right).
  const forty = Array.from({ length: 40 }, (_, i) => ({
    type: 'controls',
    payload: { held: [i < 32 ? 'left' : 'right'] },
  }))
  p.session.advance(forty)
  r.beats(20)
  r.drain()
  expect(p.sent.filter((m) => m.t === 'cmd')).toHaveLength(40)
  expect(hero(p.predicted, 1)?.get(Player).held).toBe('left')
  expect(hero(r.engineSim, 1)?.get(Player).held).toBe('left')
  expect(p.confirmed.hash()).toBe(r.engineSim.hash())
})
