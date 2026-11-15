// Ledges, with Rapier itself in Node and in every browser: a box that holds what comes from above and lets what comes
// from below pass up through, and that does so the same after a snapshot and a restore. y points down.
import { expect, test } from 'vitest'
import {
  Body,
  BodyKind,
  body,
  collider,
  physics,
  Transform,
  transform,
} from '#src/features/physics/physics.ts'
import { createSim, type Sim } from '#src/features/sim/sim.ts'

/** The ledge's top, and so where a standing box's bottom is. The ledge is 0.25 thick, as a tile's ledge is. */
const TOP = 4.8
const stage = (): Promise<Sim> => createSim({ seed: 1, plugins: [physics()] })
/** A ledge 4 wide centred at x = 0, its top at `TOP`. */
const ledge = (sim: Sim): number => sim.spawn([transform({ x: 0, y: TOP + 0.125 }), collider.ledge(2, 0.125)])
/** An upright box 0.8 wide and 1 tall, at (0, `y`), moving up or down at `vy`. */
const crate = (sim: Sim, y: number, vy = 0): number =>
  sim.spawn([
    transform({ x: 0, y }),
    body(BodyKind.dynamic, { fixedRotation: true, vy }),
    collider.cuboid(0.4, 0.5),
  ])
const yOf = (sim: Sim, sid: number): number => sim.entity(sid)?.get(Transform).y ?? Number.NaN
const run = (sim: Sim, ticks: number): void => {
  for (let i = 0; i < ticks; i++) sim.step([])
}

test('a box falling from above rests on the ledge’s top', async () => {
  const sim = await stage()
  ledge(sim)
  const sid = crate(sim, 0)
  run(sim, 240)
  expect(Math.abs(yOf(sim, sid) - (TOP - 0.5))).toBeLessThan(0.05)
  sim.dispose()
})

test('a box thrown up from under the ledge passes through it, and comes to rest on its top', async () => {
  const sim = await stage()
  ledge(sim)
  const sid = crate(sim, 8, -10)
  let highest = Number.POSITIVE_INFINITY
  for (let i = 0; i < 400; i++) {
    sim.step([])
    highest = Math.min(highest, yOf(sim, sid))
  }
  // It went above the ledge, and it is on top of it now.
  expect(highest).toBeLessThan(TOP - 1)
  expect(Math.abs(yOf(sim, sid) - (TOP - 0.5))).toBeLessThan(0.05)
  sim.dispose()
})

test('a box level with the ledge is not held by it: it falls through', async () => {
  const sim = await stage()
  ledge(sim)
  // Its bottom is well under the ledge's top, so the ledge lets it go.
  const sid = crate(sim, TOP + 0.1)
  run(sim, 60)
  expect(yOf(sim, sid)).toBeGreaterThan(TOP + 2)
  expect(sim.entity(sid)?.get(Body).vy).toBeGreaterThan(0)
  sim.dispose()
})

test('a box resting on a ledge is still there after a snapshot and a restore, with the same hash', async () => {
  const first = await stage()
  ledge(first)
  const sid = crate(first, 0)
  run(first, 200)
  const bytes = first.snapshot()
  const second = await stage()
  second.restore(bytes)
  run(first, 120)
  run(second, 120)
  expect(Math.abs(yOf(second, sid) - (TOP - 0.5))).toBeLessThan(0.05)
  expect(second.hash()).toBe(first.hash())
  first.dispose()
  second.dispose()
})
