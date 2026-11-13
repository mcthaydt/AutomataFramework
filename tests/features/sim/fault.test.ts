// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/world/fault.test.ts
import { expect, test } from 'vitest'
import { createSim, SimFaultedError } from '#src/features/sim/create-sim.ts'
import { definePlugin, defineSystem } from '#src/features/sim/definitions.ts'
import { Body, fixturePlugin } from '../../fixtures/fixture-world.ts'

// A system that throws at a chosen tick, after the fixture's systems have already changed state that tick.
function boomAt(tick: { at: number }) {
  return definePlugin({
    name: 'zz-boom',
    systems: [
      defineSystem({
        name: 'boom',
        phase: 'cleanup',
        run(ctx) {
          if (ctx.tick === tick.at) throw new Error('kaboom')
        },
      }),
    ],
  })
}

test('a throwing system faults the sim: step throws SimFaultedError naming the system and tick', async () => {
  const sim = await createSim({ seed: 4, plugins: [fixturePlugin, boomAt({ at: 3 })] })
  sim.spawn([[Body, { x: 1, vy: 1 }]])
  for (let t = 0; t < 3; t++) sim.step([])
  let caught: unknown
  try {
    sim.step([])
  } catch (err) {
    caught = err
  }
  expect(caught).toBeInstanceOf(SimFaultedError)
  const fault = caught as SimFaultedError
  expect(fault.system).toBe('boom')
  expect(fault.tick).toBe(3)
  expect((fault.cause as Error).message).toBe('kaboom')
})

test('a faulted sim refuses step, snapshot and hash until a good restore, then continues identically', async () => {
  const at = { at: 3 }
  const sim = await createSim({ seed: 4, plugins: [fixturePlugin, boomAt(at)] })
  const twin = await createSim({ seed: 4, plugins: [fixturePlugin, boomAt({ at: -1 })] })
  for (const s of [sim, twin]) s.spawn([[Body, { x: 1, vy: 1 }]])
  for (let t = 0; t < 3; t++) {
    sim.step([])
    twin.step([])
  }
  const good = sim.snapshot()
  expect(() => sim.step([])).toThrow(SimFaultedError)
  expect(() => sim.step([])).toThrow(SimFaultedError)
  expect(() => sim.snapshot()).toThrow(SimFaultedError)
  expect(() => sim.hash()).toThrow(SimFaultedError)

  at.at = -1
  sim.restore(good)
  for (let t = 0; t < 5; t++) {
    sim.step([])
    twin.step([])
  }
  expect(sim.hash()).toBe(twin.hash())
})
