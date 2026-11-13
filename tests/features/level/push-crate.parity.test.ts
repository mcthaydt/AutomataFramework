// M1's proof: content, physics, commands and replay end on one hash in Node, Chromium, WebKit and Firefox.
import { afterEach, expect, test } from 'vitest'
import { createRecorder, playReplay, type Replay, verifyReplay } from '#src/features/commands/commands.ts'
import { createGameSim, Thing } from '#src/features/level/level.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'
import { PUSH_TICKS, pushScript } from '../../fixtures/game/script.ts'
import { expectGolden, expectRecorded } from '../../fixtures/golden.ts'
import golden from '../../golden/push-crate.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})
async function fresh(overrides: Record<string, string | undefined> = {}): Promise<Sim> {
  const sim = await createGameSim({ content: await loadFixtureGame(overrides), plugins: [heroPlugin] })
  made.push(sim)
  return sim
}

/** Plays the push-crate script on a new game sim, recording it. */
async function record(): Promise<{ sim: Sim; replay: Replay }> {
  const sim = await fresh()
  const recorder = createRecorder(sim)
  for (let t = 0; t < PUSH_TICKS; t++) recorder.step(pushScript(sim.tick))
  return { sim, replay: recorder.replay() }
}

test('the hero pushes the crate, and the run matches its golden', async () => {
  const { sim, replay } = await record()
  const crate = sim.query(Thing).find((e) => e.get(Thing).id === 'crate-1')
  expect(crate?.get(Transform).x).toBeGreaterThan(6.5 + 1)
  expectGolden({ ticks: replay.ticks, finalHash: replay.finalHash, checks: replay.checks }, golden)
})

test('the recorded replay verifies on a fresh game sim', async () => {
  const { replay } = await record()
  expect(verifyReplay(await fresh(), replay)).toEqual({ ok: true })
})

test('with the crate moved in the level file, the replay says the content changed', async () => {
  const { replay } = await record()
  const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] ?? '') as { things: { x: number }[] }
  ;(level.things[0] as { x: number }).x = 9.5
  const changed = await fresh({ 'content/levels/level-1.json': JSON.stringify(level) })
  const verdict = verifyReplay(changed, replay)
  expect(verdict.ok).toBe(false)
  if (!verdict.ok) expect(verdict.reason).toBe('content-changed')

  // `playReplay` only plays: the same commands still run to the end on the changed game.
  const played = playReplay(await fresh({ 'content/levels/level-1.json': JSON.stringify(level) }), replay)
  expect(played.finalHash).not.toBe(replay.finalHash)
})

test('sixty idle ticks with only the framework plugins end on the recorded hash', async () => {
  // No `heroPlugin`: this is the run tests/install/smoke.mjs repeats on the packed package, which has no game code.
  const sim = await createGameSim({ content: await loadFixtureGame() })
  made.push(sim)
  for (let i = 0; i < 60; i++) sim.step([])
  expectRecorded('idleHash60', sim.hash(), (golden as { idleHash60?: string }).idleHash60)
})
