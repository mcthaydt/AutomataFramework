// The joints scene's golden: 300 ticks of seesaw, chain, swing and balls end on the committed hash, and on the same
// check hashes on the way, in Node and in every browser. Recorded from CI, never typed (see tests/fixtures/golden.ts).
import { expect, test } from 'vitest'
import { expectGolden, runGolden } from '../../fixtures/golden.ts'
import { createJointsScene, jointsCommands } from '../../fixtures/physics/joints-scene.ts'
import jointsGolden from '../../golden/joints-scene.json' with { type: 'json' }

test('the joints scene ends on its golden hash', async () => {
  const sim = await createJointsScene()
  const run = runGolden(sim, 300, jointsCommands)
  sim.dispose()
  expect(run.ticks).toBe(300)
  expectGolden(run, jointsGolden)
})
