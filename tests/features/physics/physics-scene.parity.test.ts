// The physics scene's golden: 300 ticks of the mixed scene end on the committed hash, and on the same check hashes on
// the way, in Node and in every browser. Recorded from CI, never typed (see tests/fixtures/golden.ts).
import { expect, test } from 'vitest'
import { expectGolden, runGolden } from '../../fixtures/golden.ts'
import { createScene, sceneCommands } from '../../fixtures/physics/scene.ts'
import physicsGolden from '../../golden/physics-scene.json' with { type: 'json' }

test('the physics scene ends on its golden hash', async () => {
  const sim = await createScene()
  const run = runGolden(sim, 300, sceneCommands)
  sim.dispose()
  expect(run.ticks).toBe(300)
  expectGolden(run, physicsGolden)
})
