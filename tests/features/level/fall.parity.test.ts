// A hero that runs into a gap in the floor loses the level in the same tick, with the same hashes, in Node and in
// every browser (plan Q, Task 2). Recorded in CI like the other goldens: `tests/golden/fall.json`.
import { afterEach, expect, test } from 'vitest'
import { controlsCommand, Player } from '#src/features/commands/commands.ts'
import { createGameSim, FALL_DEPTH, Fallen } from '#src/features/level/level.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { fallFiles } from '../../fixtures/game/fall-game.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { expectGolden, runGolden } from '../../fixtures/golden.ts'
import golden from '../../golden/fall.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

test('the fall, in this engine, ends at the recorded hash', async () => {
  const content = await loadFixtureGame(fallFiles())
  const sim = await createGameSim({ content, plugins: [heroPlugin], players: [1] })
  made.push(sim)
  const result = runGolden(sim, 240, (tick) => (tick === 10 ? [controlsCommand(tick, 1, 0, ['right'])] : []))
  // The hero is below the level by the end and has been marked, so the run does not end on a standing hero by chance.
  const hero = sim.query(Player)[0]
  expect(hero?.has(Fallen)).toBe(true)
  expect(hero?.get(Transform).y).toBeGreaterThan(9 + FALL_DEPTH)
  expectGolden(result, golden)
})
