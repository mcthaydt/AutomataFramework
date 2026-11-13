// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/world/negative-zero.test.ts
import { expect, test } from 'vitest'
import { z } from 'zod'
import { createSim } from '#src/features/sim/create-sim.ts'
import { definePlugin, defineResource, defineSystem } from '#src/features/sim/definitions.ts'

// A resource holding -0 must restore as -0: 1 / -0 is -Infinity, so the two runs would otherwise diverge.
const Sign = defineResource('sign', z.object({ v: z.number(), log: z.array(z.number()) }), () => ({
  v: -0,
  log: [],
}))
const plugin = definePlugin({
  name: 'sign',
  resources: [Sign],
  systems: [
    defineSystem({
      name: 'sign.read',
      phase: 'gameplay',
      run(ctx) {
        const s = ctx.resource(Sign)
        s.log.push(1 / s.v > 0 ? 1 : -1)
      },
    }),
  ],
})

test('a resource holding -0 restores as -0 and the run continues identically', async () => {
  const straight = await createSim({ seed: 1, plugins: [plugin] })
  straight.step([])
  const restored = await createSim({ seed: 1, plugins: [plugin] })
  restored.restore(straight.snapshot())
  expect(Object.is(restored.resource(Sign).v, -0)).toBe(true)
  for (let t = 0; t < 5; t++) {
    straight.step([])
    restored.step([])
  }
  expect(restored.resource(Sign).log).toEqual(straight.resource(Sign).log)
  expect(restored.hash()).toBe(straight.hash())
})
