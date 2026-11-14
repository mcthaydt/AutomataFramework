// Plan I's proof: players joining and leaving end on one hash in Node, Chromium, WebKit and Firefox.
import { afterEach, expect, test } from 'vitest'
import { createRecorder, type Replay, verifyReplay } from '#src/features/commands/commands.ts'
import { createGameSim, playersIn } from '#src/features/level/level.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { COOP_TICKS, coopFiles, coopScript } from '../../fixtures/game/co-op.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { expectGolden } from '../../fixtures/golden.ts'
import golden from '../../golden/co-op.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})
async function fresh(): Promise<Sim> {
  const sim = await createGameSim({
    content: await loadFixtureGame(coopFiles),
    plugins: [heroPlugin],
    players: [1],
  })
  made.push(sim)
  return sim
}

async function record(): Promise<{ sim: Sim; replay: Replay }> {
  const sim = await fresh()
  const recorder = createRecorder(sim)
  for (let t = 0; t < COOP_TICKS; t++) recorder.step(coopScript(sim.tick))
  return { sim, replay: recorder.replay() }
}

test('three join, one leaves, and the run matches its golden', async () => {
  const { sim, replay } = await record()
  expect(playersIn(sim)).toEqual([1, 3])
  expectGolden({ ticks: replay.ticks, finalHash: replay.finalHash, checks: replay.checks }, golden)
})

test('the recorded co-op replay verifies on a fresh sim', async () => {
  const { replay } = await record()
  expect(replay.commands.some((c) => c.type === 'join' && c.source === 2)).toBe(true)
  expect(verifyReplay(await fresh(), replay)).toEqual({ ok: true })
})

test('a sim restored from tick 120 ends on the same hash', async () => {
  const { sim: whole } = await record()
  const first = await fresh()
  for (let t = 0; t < 120; t++) first.step(coopScript(first.tick))
  const bytes = first.snapshot()
  const second = await fresh()
  second.restore(bytes)
  for (let t = 120; t < COOP_TICKS; t++) second.step(coopScript(second.tick))
  expect(second.hash()).toBe(whole.hash())
})
