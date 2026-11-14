import { afterEach, expect, test } from 'vitest'
import { createGameSim } from '#src/features/level/level.ts'
import {
  MAX_CATCH_UP,
  PROTOCOL_VERSION,
  parseClientMessage,
  parseRoomOptions,
  parseServerMessage,
  roomOptionsOf,
  type ServerMessage,
} from '#src/features/net/net.ts'
import { FRAMEWORK_VERSION, type Sim } from '#src/features/sim/sim.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})
async function fixtureSim(withHero: boolean): Promise<Sim> {
  const sim = await createGameSim({
    content: await loadFixtureGame(),
    plugins: withHero ? [heroPlugin] : [],
  })
  made.push(sim)
  return sim
}

const cmd = { t: 'cmd', seq: 0, tick: 5, type: 'controls', payload: { held: ['right'] } }

test('a good cmd and a good sync parse', () => {
  expect(parseClientMessage(cmd)).toEqual(cmd)
  expect(parseClientMessage({ t: 'sync' })).toEqual({ t: 'sync' })
})

test('anything else from a client is undefined, never a throw', () => {
  const bad: unknown[] = [
    'x',
    null,
    undefined,
    42,
    { t: 'nope' },
    { ...cmd, source: 2 },
    { ...cmd, seq: -1 },
    { ...cmd, seq: 1.5 },
    { ...cmd, tick: 4_294_967_296 },
    { ...cmd, type: '' },
    { t: 'sync', extra: true },
  ]
  for (const raw of bad) expect(parseClientMessage(raw)).toBeUndefined()
})

const every: ServerMessage[] = [
  { t: 'seat', seat: 2, code: 'abc', nextSeq: 5 },
  { t: 'waiting', missing: 1 },
  { t: 'start' },
  { t: 'tick', tick: 3, commands: [{ tick: 3, source: 1, seq: 0, type: 'controls', payload: { held: [] } }] },
  { t: 'tick', tick: 59, commands: [], hash: '0123456789abcdef' },
  { t: 'refused', seq: 4, reason: 'too-far-ahead' },
  { t: 'sync', tick: 90 },
  { t: 'away', seat: 2 },
  { t: 'back', seat: 2 },
  { t: 'gone', seat: 2 },
]

test('every message the room sends round-trips', () => {
  for (const message of every)
    expect(parseServerMessage(JSON.parse(JSON.stringify(message)))).toEqual(message)
})

test('a tick with a bad hash, and a refusal with an unknown reason, are undefined', () => {
  expect(parseServerMessage({ t: 'tick', tick: 59, commands: [], hash: 'abc' })).toBeUndefined()
  expect(parseServerMessage({ t: 'refused', seq: 1, reason: 'because' })).toBeUndefined()
  expect(parseServerMessage('hello')).toBeUndefined()
})

test('the numbers a client lead may use are a small whole count of steps', () => {
  expect(MAX_CATCH_UP).toBe(4)
  expect(PROTOCOL_VERSION).toBe(1)
})

test('room options are checked', async () => {
  const good = roomOptionsOf(await fixtureSim(true), { level: 'level-1', seats: 2 })
  expect(parseRoomOptions(good)).toEqual(good)
  expect(parseRoomOptions({ ...good, seats: 0 })).toBeUndefined()
  expect(parseRoomOptions({ ...good, seats: 5 })).toBeUndefined()
  expect(parseRoomOptions({ ...good, protocol: 2 })).toBeUndefined()
  const { level: _level, ...noLevel } = good
  expect(parseRoomOptions(noLevel)).toBeUndefined()
})

test('roomOptionsOf describes the sim', async () => {
  const sim = await fixtureSim(true)
  const options = roomOptionsOf(sim, { level: 'level-1', seats: 2 })
  expect(options).toMatchObject({
    protocol: 1,
    framework: FRAMEWORK_VERSION,
    contentHash: sim.contentHash,
    tickHz: 60,
    seed: sim.seed,
    level: 'level-1',
    seats: 2,
  })
  expect(options.schemaHash).toMatch(/^[0-9a-f]{16}$/)
  // The game's code shape is part of what a room agrees on: the same game without the hero is another game.
  expect(roomOptionsOf(await fixtureSim(false), { level: 'level-1', seats: 2 }).schemaHash).not.toBe(
    options.schemaHash,
  )
})
