// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/world/capacity.test.ts
import { afterEach, expect, test } from 'vitest'
import { createSim, type Sim, SimCapacityError } from '#src/features/sim/create-sim.ts'
import { SnapshotFormatError } from '#src/features/sim/snapshot.ts'
import { Body, fixturePlugin } from '../../fixtures/fixture-world.ts'

// Koota allows 16 worlds per process and each sim holds one (M2.1 spec §10.3).
const alive: Sim[] = []
afterEach(() => {
  for (const sim of alive.splice(0)) sim.dispose()
})
const make = async () => {
  const sim = await createSim({ seed: 5, plugins: [fixturePlugin] })
  alive.push(sim)
  return sim
}

test('restore works with 16 sims alive, because it never needs a second world', async () => {
  const source = await make()
  source.spawn([[Body, { x: 2 }]])
  source.step([])
  const bytes = source.snapshot()
  for (let i = 1; i < 16; i++) await make()
  const target = alive[15] as Sim
  target.restore(bytes)
  expect(target.snapshot()).toEqual(bytes)
})

test('a bad entity row is refused before the old state is touched, even at the limit', async () => {
  const source = await make()
  source.spawn([[Body, { x: 1, y: 2 }]])
  const bytes = source.snapshot()
  for (let i = 1; i < 16; i++) await make()
  const target = alive[15] as Sim
  target.spawn([[Body, { x: 9 }]])
  const before = target.snapshot()
  // The last 4 bytes are Body.y (f32); make it NaN, which coerce rejects.
  const bad = bytes.slice()
  bad.set([0, 0, 0xc0, 0x7f], bad.length - 4)
  expect(() => target.restore(bad)).toThrow(SnapshotFormatError)
  expect(target.snapshot()).toEqual(before)
})

test('a 17th sim is refused with SimCapacityError', async () => {
  for (let i = 0; i < 16; i++) await make()
  await expect(createSim({ seed: 5, plugins: [fixturePlugin] })).rejects.toThrow(SimCapacityError)
})
