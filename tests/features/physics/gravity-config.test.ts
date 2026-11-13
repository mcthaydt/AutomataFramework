// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/tests/unit/shared/gravity-config.test.ts
import { afterEach, expect, test } from 'vitest'
import { BodyKind, body, collider, physics, transform } from '#src/features/physics/physics.ts'
import { createSim, type PluginDef, type Sim } from '#src/features/sim/sim.ts'

// Gravity is hashed when the factory runs (spec §10.8), so the factory copies and freezes it: a caller that
// mutates its own gravity object afterwards must not change what the sim runs with (audit re-check at 4d9e6f4).

const sims: Sim[] = []
afterEach(() => {
  for (const sim of sims.splice(0)) sim.dispose()
})

// Gravity pointing down the y-up scene these tests were written for; the default points down in y-down space.
const FALL = { x: 0, y: -9.81 }

async function fallFor10Ticks(plugin: PluginDef): Promise<Sim> {
  const sim = await createSim({ seed: 1, plugins: [plugin] })
  sims.push(sim)
  sim.spawn([transform({ y: 3 }), body(BodyKind.dynamic), collider.ball(0.5)])
  for (let t = 0; t < 10; t++) sim.step([])
  return sim
}

test('mutating the gravity object after physics() changes neither the sim nor its hash', async () => {
  const gravity = { x: 0, y: -9.81 }
  const plugin = physics({ gravity })
  gravity.y = 0
  const mutated = await fallFor10Ticks(plugin)
  const reference = await fallFor10Ticks(physics({ gravity: FALL }))
  expect(mutated.hash()).toBe(reference.hash())
})

test('-0 and 0 gravity are the same schema, since Rapier runs them identically (audit nit)', async () => {
  const negative = await fallFor10Ticks(physics({ gravity: { x: -0, y: -9.81 } }))
  const positive = await fallFor10Ticks(physics({ gravity: FALL }))
  positive.restore(negative.snapshot())
  expect(positive.hash()).toBe(negative.hash())
})
