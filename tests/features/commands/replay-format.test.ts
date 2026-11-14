// Replay format 2: a replay knows the shape of the rules it was recorded with, says `code-changed` when they differ, and
// refuses checks that are not for ticks the run had. Format 1 is still read.
import { afterEach, expect, test } from 'vitest'
import {
  createRecorder,
  parseReplay,
  type Replay,
  verifyReplay,
  writeReplay,
} from '#src/features/commands/commands.ts'
import { createGameSim } from '#src/features/level/level.ts'
import type { PluginDef, Sim } from '#src/features/sim/sim.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'
import { PUSH_TICKS, pushScript } from '../../fixtures/game/script.ts'

// Every sim is disposed: Koota allows only 16 live worlds per process.
const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** The fixture game's sim, with the hero's rules unless `plugins` says otherwise. */
async function fresh(
  plugins: readonly PluginDef[] = [heroPlugin],
  overrides: Record<string, string | undefined> = {},
): Promise<Sim> {
  const sim = await createGameSim({ content: await loadFixtureGame(overrides), plugins })
  made.push(sim)
  return sim
}

/** The level file with the crate moved: content that is not the recorded content. */
const movedCrate = (): Record<string, string> => {
  const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] ?? '') as { things: { x: number }[] }
  ;(level.things[0] as { x: number }).x = 9.5
  return { 'content/levels/level-1.json': JSON.stringify(level) }
}

async function record(): Promise<Replay> {
  const sim = await fresh()
  const recorder = createRecorder(sim)
  for (let t = 0; t < PUSH_TICKS; t++) recorder.step(pushScript(sim.tick))
  return recorder.replay()
}

/** The replay's text as a plain object, to change and write back. */
const asObject = (replay: Replay): Record<string, unknown> => JSON.parse(writeReplay(replay))

/** The same play as a format 1 file: no schema hash. */
function format1(replay: Replay): string {
  const { schemaHash: _gone, ...rest } = asObject(replay)
  return `${JSON.stringify({ ...rest, format: 1 }, null, 2)}\n`
}

test('a recorder writes format 2 with the schema hash, after the content hash', async () => {
  const replay = await record()
  expect(replay.format).toBe(2)
  const sim = await fresh()
  expect(replay.schemaHash).toBe(sim.describeSnapshot().header.schemaHash)
  expect(Object.keys(asObject(replay)).slice(0, 7)).toEqual([
    'format',
    'framework',
    'tickHz',
    'seed',
    'contentHash',
    'schemaHash',
    'ticks',
  ])
})

test('a format 1 replay is still read, has no schemaHash, and is written back as it was', async () => {
  const text = format1(await record())
  const old = parseReplay(text)
  expect(old.format).toBe(1)
  expect('schemaHash' in old).toBe(false)
  expect(writeReplay(old)).toBe(text)
})

test('a format 2 replay with no schemaHash, and a format 1 replay with one, are refused', async () => {
  const replay = await record()
  const said = 'This is not a replay: schemaHash: a format 2 replay has one and a format 1 replay has none.'
  const { schemaHash: _gone, ...without } = asObject(replay)
  expect(() => parseReplay(JSON.stringify(without))).toThrow(said)
  expect(() => parseReplay(JSON.stringify({ ...asObject(replay), format: 1 }))).toThrow(said)
})

test('the same replay on a sim with other rules says code-changed', async () => {
  const replay = await record()
  const verdict = verifyReplay(await fresh([]), replay)
  expect(verdict).toMatchObject({ ok: false, reason: 'code-changed', expected: replay.schemaHash })
  expect((verdict as { actual: string }).actual).not.toBe(replay.schemaHash)
})

test('changed content is still content-changed, and says whether the rules changed too', async () => {
  const replay = await record()
  expect(verifyReplay(await fresh([heroPlugin], movedCrate()), replay)).toMatchObject({
    ok: false,
    reason: 'content-changed',
    rulesChanged: false,
  })
  expect(verifyReplay(await fresh([], movedCrate()), replay)).toMatchObject({
    ok: false,
    reason: 'content-changed',
    rulesChanged: true,
  })
})

test('a format 1 replay is never code-changed: it has no schema hash to compare', async () => {
  const old = parseReplay(format1(await record()))
  // The same play on a game with no hero ends somewhere else, which is all a format 1 replay can say.
  expect(verifyReplay(await fresh([]), old)).toMatchObject({ ok: false, reason: 'diverged' })
  expect(verifyReplay(await fresh([heroPlugin], movedCrate()), old)).toMatchObject({
    ok: false,
    reason: 'content-changed',
    rulesChanged: false,
  })
  expect(verifyReplay(await fresh(), old)).toEqual({ ok: true })
})

test('checks out of order, repeated, at tick 0, or at the last tick or after are refused', async () => {
  const replay = await record()
  const hash = replay.finalHash
  const refused = (checks: { tick: number; hash: string }[]) => () =>
    parseReplay(JSON.stringify({ ...asObject(replay), checks }))
  expect(
    refused([
      { tick: 60, hash },
      { tick: 120, hash },
      { tick: 120, hash },
    ]),
  ).toThrow('This is not a replay: checks.2: checks must be in order of tick, each tick once.')
  expect(
    refused([
      { tick: 120, hash },
      { tick: 60, hash },
    ]),
  ).toThrow('This is not a replay: checks.1: checks must be in order of tick, each tick once.')
  expect(refused([{ tick: 0, hash }])).toThrow('This is not a replay: checks.0: a check is for tick 0')
  expect(refused([{ tick: PUSH_TICKS, hash }])).toThrow(
    `This is not a replay: checks.0: a check is for tick ${PUSH_TICKS}, but the run ended at tick ${PUSH_TICKS}. The last tick has finalHash.`,
  )
  expect(refused([{ tick: PUSH_TICKS + 1, hash }])).toThrow('but the run ended at tick 300')
})

test('each check is compared with the hash played at its own tick, not the same place', async () => {
  const replay = await record()
  const without120: Replay = { ...replay, checks: replay.checks.filter((c) => c.tick !== 120) }
  expect(verifyReplay(await fresh(), without120)).toEqual({ ok: true })
  // Hand-built, out of order: still compared at its own tick.
  const backwards: Replay = { ...replay, checks: [...replay.checks].reverse() }
  expect(verifyReplay(await fresh(), backwards)).toEqual({ ok: true })
  const changed: Replay = {
    ...replay,
    checks: replay.checks.map((c) => (c.tick === 60 ? { ...c, hash: '0'.repeat(16) } : c)),
  }
  expect(verifyReplay(await fresh(), changed)).toMatchObject({ ok: false, reason: 'diverged', tick: 60 })
})
