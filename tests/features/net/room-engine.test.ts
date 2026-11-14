import { afterEach, expect, test } from 'vitest'
import { verifyReplay } from '#src/features/commands/commands.ts'
import { JoinCommand, LeaveCommand, playersIn } from '#src/features/level/level.ts'
import {
  createRoomEngine,
  MAX_LEAD_TICKS,
  MAX_QUEUED_COMMANDS,
  type RoomEngine,
  type RoomOptions,
  type RoomPeer,
  type ServerMessage,
} from '#src/features/net/net.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { coopSim, onlineSim } from '../../fixtures/online/game.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** A peer that keeps everything it is sent. */
interface Fake extends RoomPeer {
  readonly got: ServerMessage[]
  readonly bytes: Uint8Array[]
}
function fake(): Fake {
  const got: ServerMessage[] = []
  const bytes: Uint8Array[] = []
  return { got, bytes, send: (m) => void got.push(m), sendBytes: (b) => void bytes.push(b) }
}
const ofType = <T extends ServerMessage['t']>(f: Fake, t: T): Extract<ServerMessage, { t: T }>[] =>
  f.got.filter((m): m is Extract<ServerMessage, { t: T }> => m.t === t)
const ticks = (f: Fake) => ofType(f, 'tick')

async function room(seats = 2): Promise<{ sim: Sim; engine: RoomEngine; options: RoomOptions }> {
  const sim = await onlineSim(seats)
  made.push(sim)
  const engine = createRoomEngine({ sim, level: 'level-1', seats })
  return { sim, engine, options: engine.options }
}
const cmd = (seq: number, tick: number, held: readonly string[] = ['right']) => ({
  t: 'cmd',
  seq,
  tick,
  type: 'controls',
  payload: { held },
})
const steps = (engine: RoomEngine, n: number): void => {
  for (let i = 0; i < n; i++) engine.step()
}
/** A started room of two with a peer on each seat. */
async function started() {
  const r = await room()
  const a = fake()
  const b = fake()
  r.engine.join(a, r.options, 'ROOM')
  r.engine.join(b, r.options, 'ROOM')
  return { ...r, a, b }
}

test('the room waits, then starts when every seat is taken', async () => {
  const { engine, options } = await room()
  const a = fake()
  const b = fake()
  expect(engine.join(a, options, 'ROOM')).toEqual({ seat: 1 })
  expect(a.got).toEqual([
    { t: 'seat', seat: 1, code: 'ROOM', nextSeq: 0 },
    { t: 'waiting', missing: 1 },
  ])
  engine.step()
  expect(engine.started).toBe(false)
  expect(ticks(a)).toEqual([])
  expect(engine.join(b, options, 'ROOM')).toEqual({ seat: 2 })
  expect(b.got).toEqual([{ t: 'seat', seat: 2, code: 'ROOM', nextSeq: 0 }, { t: 'start' }])
  expect(a.got.at(-1)).toEqual({ t: 'start' })
  engine.step()
  expect(ticks(a)).toEqual([{ t: 'tick', tick: 0, commands: [] }])
  expect(ticks(b)).toEqual([{ t: 'tick', tick: 0, commands: [] }])
})

test('another version is refused before it takes a seat', async () => {
  const { engine, options } = await room()
  const odd = fake()
  expect(engine.join(odd, { ...options, contentHash: '0000000000000000' }, 'ROOM')).toEqual({
    problem: 'different-version',
  })
  expect(engine.join(fake(), 'not options', 'ROOM')).toEqual({ problem: 'different-version' })
  expect(odd.got).toEqual([])
  expect(engine.join(fake(), options, 'ROOM')).toEqual({ seat: 1 })
  expect(engine.join(fake(), options, 'ROOM')).toEqual({ seat: 2 })
  expect(engine.join(fake(), options, 'ROOM')).toEqual({ problem: 'room-full' })
})

test('a command lands on its tick, with its player as source', async () => {
  const { engine, a, b } = await started()
  steps(engine, 2)
  engine.receive(1, cmd(0, 5))
  steps(engine, 4)
  // Messages for ticks 0 to 5: only the last one carries the command.
  expect(ticks(b).map((t) => t.commands.length)).toEqual([0, 0, 0, 0, 0, 1])
  expect(ticks(b)[5]?.commands).toEqual([
    { tick: 5, source: 1, seq: 0, type: 'controls', payload: { held: ['right'] } },
  ])
  expect(ticks(a)[5]?.commands).toEqual(ticks(b)[5]?.commands)
})

test('a late command lands on the next tick and is counted', async () => {
  const { engine, b } = await started()
  steps(engine, 4)
  engine.receive(1, cmd(0, 1))
  engine.step()
  const landed = ticks(b).find((t) => t.commands.length > 0)
  expect(landed?.tick).toBe(4)
  expect(landed?.commands[0]?.source).toBe(1)
  expect(engine.stats.late).toBe(1)
})

test("a seat's commands keep their order", async () => {
  const { engine, b } = await started()
  steps(engine, 3)
  engine.receive(1, cmd(0, 9, ['left']))
  engine.receive(1, cmd(1, 6, ['right']))
  steps(engine, 8)
  const landed = ticks(b).filter((t) => t.commands.length > 0)
  expect(landed.map((t) => t.tick)).toEqual([9])
  expect(landed[0]?.commands.map((c) => c.seq)).toEqual([0, 1])
})

test('rubbish in changes nothing for the other player', async () => {
  const { engine, a, b } = await started()
  steps(engine, 3)
  engine.receive(1, 'x')
  engine.receive(1, null)
  engine.receive(1, { ...cmd(0, 10), source: 2 })
  engine.receive(7, cmd(0, 10))
  expect(engine.stats.ignored).toBe(4)

  // A payload the sim does not take is refused when its tick comes, and is not relayed.
  engine.receive(1, { t: 'cmd', seq: 0, tick: engine.tick + 1, type: 'controls', payload: { held: 'right' } })
  steps(engine, 3)
  expect(ofType(a, 'refused')).toEqual([{ t: 'refused', seq: 0, reason: 'not-valid' }])
  expect(ticks(b).flatMap((t) => t.commands)).toEqual([])
  a.got.length = 0

  // The same seq twice, and a tick too far ahead.
  engine.receive(1, cmd(0, engine.tick + 1))
  engine.receive(1, cmd(50, engine.tick + MAX_LEAD_TICKS + 1))
  expect(ofType(a, 'refused')).toEqual([
    { t: 'refused', seq: 0, reason: 'out-of-order' },
    { t: 'refused', seq: 50, reason: 'too-far-ahead' },
  ])
  a.got.length = 0

  // 40 commands for one far tick: the 33rd on are refused too-many.
  for (let seq = 1; seq <= 40; seq++) engine.receive(1, cmd(seq, engine.tick + 20))
  const refusals = ofType(a, 'refused')
  expect(refusals.map((r) => r.reason)).toEqual(Array(40 - MAX_QUEUED_COMMANDS).fill('too-many'))
  expect(refusals[0]?.seq).toBe(MAX_QUEUED_COMMANDS + 1)

  // The other player saw only the room's ordinary messages.
  expect(b.got.every((m) => ['seat', 'start', 'tick'].includes(m.t))).toBe(true)
  expect(engine.stats.refused).toBe(1 + 2 + 8)
})

test('a command before the room starts is refused', async () => {
  const { engine, options } = await room()
  const a = fake()
  engine.join(a, options, 'ROOM')
  engine.receive(1, cmd(0, 3))
  expect(ofType(a, 'refused')).toEqual([{ t: 'refused', seq: 0, reason: 'not-started' }])
})

test('a hash comes with every sixtieth tick, after that tick is stepped', async () => {
  const { engine, sim, a } = await started()
  const after: string[] = []
  for (let i = 0; i < 61; i++) {
    engine.step()
    after.push(sim.hash())
  }
  const all = ticks(a)
  expect(all[59]?.hash).toBe(after[59])
  expect(all[58]?.hash).toBeUndefined()
  expect(all[60]?.hash).toBeUndefined()
})

test('a dropped connection lets go of the controls', async () => {
  const { engine, a } = await started()
  engine.receive(2, cmd(0, 1, ['right']))
  steps(engine, 3)
  engine.away(2)
  expect(ofType(a, 'away')).toEqual([{ t: 'away', seat: 2 }])
  engine.step()
  const last = ticks(a).at(-1)
  expect(last?.commands).toEqual([
    { tick: last?.tick, source: 2, seq: 1, type: 'controls', payload: { held: [] } },
  ])
})

test("after a return the player's numbers carry on", async () => {
  const { engine } = await started()
  for (let seq = 0; seq < 4; seq++) engine.receive(2, cmd(seq, seq + 1, seq % 2 === 0 ? ['right'] : []))
  steps(engine, 6)
  engine.away(2)
  const back = fake()
  engine.back(2, back)
  const seat = ofType(back, 'seat')[0]
  expect(seat).toMatchObject({ seat: 2, nextSeq: 5 })
  engine.receive(2, cmd(5, engine.tick + 2, ['left']))
  steps(engine, 4)
  expect(ofType(back, 'refused')).toEqual([])
  expect(
    ticks(back)
      .flatMap((t) => t.commands)
      .filter((c) => c.source === 2 && c.seq === 5),
  ).toHaveLength(1)
})

test('a player who comes back is given the state', async () => {
  const { engine, sim, a } = await started()
  engine.receive(2, cmd(0, 1, ['right']))
  engine.away(2)
  steps(engine, 30)
  const back = fake()
  engine.back(2, back)
  expect(ofType(a, 'back')).toEqual([{ t: 'back', seat: 2 }])
  expect(back.got.map((m) => m.t)).toEqual(['seat', 'sync'])
  expect(ofType(back, 'sync')[0]).toEqual({ t: 'sync', tick: engine.tick })
  const copy = await onlineSim()
  made.push(copy)
  copy.restore(back.bytes[0] as Uint8Array)
  expect(copy.hash()).toBe(sim.hash())
  engine.step()
  expect(ticks(back)).toHaveLength(1)
})

test('a sync on request goes to that player only', async () => {
  const { engine, sim, a, b } = await started()
  steps(engine, 10)
  const before = b.got.length
  engine.receive(1, { t: 'sync' })
  expect(ofType(a, 'sync')).toEqual([{ t: 'sync', tick: 10 }])
  expect(a.bytes).toHaveLength(1)
  expect(b.got).toHaveLength(before)
  expect(b.bytes).toHaveLength(0)
  const copy = await onlineSim()
  made.push(copy)
  copy.restore(a.bytes[0] as Uint8Array)
  expect(copy.hash()).toBe(sim.hash())
})

test("the room's play is an ordinary replay", async () => {
  const { engine } = await started()
  steps(engine, 20)
  engine.receive(1, cmd(0, 25, ['right']))
  engine.receive(2, cmd(0, 30, ['left']))
  steps(engine, 40)
  engine.receive(1, cmd(1, 70, ['right', 'jump']))
  engine.receive(2, cmd(1, 5, []))
  steps(engine, 60)
  const replay = engine.replay()
  expect(replay.ticks).toBe(120)
  expect(replay.meta).toEqual({ level: 'level-1', players: '1,2', seats: '2' })
  const fresh = await onlineSim()
  made.push(fresh)
  expect(verifyReplay(fresh, replay)).toEqual({ ok: true })
})

// A co-op game: nobody is in the sim at the start, and heroes come and go by the sim's own `join` and `leave`.
async function coop(): Promise<{ sim: Sim; engine: RoomEngine; options: RoomOptions }> {
  const sim = await coopSim()
  made.push(sim)
  const engine = createRoomEngine({
    sim,
    level: 'level-1',
    seats: 4,
    seatCommands: { join: JoinCommand.id, leave: LeaveCommand.id },
  })
  return { sim, engine, options: engine.options }
}
const commandsOf = (f: Fake, type: string) =>
  ticks(f).flatMap((m) => m.commands.filter((c) => c.type === type))

test('a co-op room starts with one player, who joins by the sim’s own command', async () => {
  const { sim, engine, options } = await coop()
  const a = fake()
  expect(engine.join(a, options, 'ROOM')).toEqual({ seat: 1 })
  expect(a.got).toEqual([{ t: 'seat', seat: 1, code: 'ROOM', nextSeq: 1 }, { t: 'start' }])
  expect(engine.started).toBe(true)
  engine.step()
  expect(commandsOf(a, 'join')).toMatchObject([{ tick: 0, source: 1, seq: 0 }])
  expect(playersIn(sim)).toEqual([1])
})

test('a second player joins a game that is going, from its state', async () => {
  const { sim, engine, options } = await coop()
  const a = fake()
  const b = fake()
  engine.join(a, options, 'ROOM')
  steps(engine, 90)
  expect(engine.join(b, options, 'ROOM')).toEqual({ seat: 2 })
  expect(b.got).toEqual([
    { t: 'seat', seat: 2, code: 'ROOM', nextSeq: 1 },
    { t: 'sync', tick: 90 },
  ])
  expect(b.bytes).toHaveLength(1)
  const fresh = await coopSim()
  made.push(fresh)
  fresh.restore(b.bytes[0] as Uint8Array)
  expect(fresh.hash()).toBe(sim.hash())
  engine.step()
  expect(commandsOf(a, 'join')).toMatchObject([{ source: 1 }, { tick: 90, source: 2, seq: 0 }])
  expect(commandsOf(b, 'join')).toMatchObject([{ tick: 90, source: 2 }])
  expect(playersIn(sim)).toEqual([1, 2])
})

test('leaving takes the hero out, and the others are not told it lost its connection', async () => {
  const { sim, engine, options } = await coop()
  const a = fake()
  const b = fake()
  engine.join(a, options, 'ROOM')
  engine.join(b, options, 'ROOM')
  steps(engine, 30)
  engine.leave(2)
  steps(engine, 2)
  expect(commandsOf(a, 'leave')).toMatchObject([{ source: 2 }])
  expect(playersIn(sim)).toEqual([1])
  expect(ofType(a, 'away')).toEqual([])
  expect(ofType(a, 'gone')).toEqual([{ t: 'gone', seat: 2 }])
})

test('a player who is away keeps their hero until the room is told they are gone', async () => {
  const { sim, engine, options } = await coop()
  const a = fake()
  const b = fake()
  engine.join(a, options, 'ROOM')
  engine.join(b, options, 'ROOM')
  steps(engine, 30)
  engine.away(2)
  steps(engine, 30)
  expect(ofType(a, 'away')).toEqual([{ t: 'away', seat: 2 }])
  expect(commandsOf(a, 'leave')).toEqual([])
  expect(playersIn(sim)).toEqual([1, 2])
  engine.leave(2)
  steps(engine, 2)
  expect(commandsOf(a, 'leave')).toHaveLength(1)
  expect(ofType(a, 'gone')).toEqual([{ t: 'gone', seat: 2 }])
  expect(playersIn(sim)).toEqual([1])
})

test('the fifth player is told the room is full', async () => {
  const { engine, options } = await coop()
  for (let i = 0; i < 4; i++) expect(engine.join(fake(), options, 'ROOM')).toEqual({ seat: i + 1 })
  expect(engine.join(fake(), options, 'ROOM')).toEqual({ problem: 'room-full' })
})

test('the play of a co-op room is a replay, with its joins and leaves in it', async () => {
  const { engine, options } = await coop()
  const a = fake()
  const b = fake()
  engine.join(a, options, 'ROOM')
  steps(engine, 30)
  engine.join(b, options, 'ROOM')
  engine.receive(1, cmd(1, 35))
  steps(engine, 60)
  engine.leave(2)
  steps(engine, 60)
  const replay = engine.replay()
  expect(replay.meta.players).toBe('')
  expect(replay.commands.map((c) => c.type).filter((t) => t === 'join' || t === 'leave')).toEqual([
    'join',
    'join',
    'leave',
  ])
  const again = await coopSim()
  made.push(again)
  expect(verifyReplay(again, replay)).toEqual({ ok: true })
})
