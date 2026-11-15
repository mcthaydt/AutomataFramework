// `Sim.read` (plan Q, Task 8): a resource's value by its id, for a page that knows only the id a game's file names.
import { afterEach, expect, test } from 'vitest'
import { z } from 'zod'
import { createSim, type Sim } from '#src/features/sim/create-sim.ts'
import { definePlugin, defineResource, defineSystem } from '#src/features/sim/definitions.ts'

const Score = defineResource('hero.score', z.object({ sparks: z.number().int() }), () => ({ sparks: 0 }))
const plugin = definePlugin({
  name: 'scorer',
  resources: [Score],
  systems: [
    defineSystem({
      name: 'scorer.count',
      phase: 'gameplay',
      run: (ctx) => {
        ctx.resource(Score).sparks += 1
      },
    }),
  ],
})

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})
const open = async (): Promise<Sim> => {
  const sim = await createSim({ seed: 1, plugins: [plugin] })
  made.push(sim)
  return sim
}

test("Sim.read gives a resource's value, and undefined for an id the sim does not have", async () => {
  const sim = await open()
  expect(sim.read('hero.score')).toEqual({ sparks: 0 })
  sim.step([])
  sim.step([])
  expect(sim.read('hero.score')).toEqual({ sparks: 2 })
  expect(sim.read('nowhere')).toBeUndefined()
})

test('what Sim.read gives is a copy: changing it changes neither the sim nor its hash', async () => {
  const sim = await open()
  const before = sim.describeSnapshot().header
  const got = sim.read('hero.score') as { sparks: number }
  got.sparks = 99
  expect(sim.read('hero.score')).toEqual({ sparks: 0 })
  expect(sim.describeSnapshot().header).toEqual(before)
})
