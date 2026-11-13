import { afterEach, expect, test } from 'vitest'
import {
  Body,
  BodyKind,
  body,
  Collider,
  collider,
  physics,
  Transform,
  transform,
} from '#src/features/physics/physics.ts'
import { createSim, type Sim } from '#src/features/sim/sim.ts'

const sims: Sim[] = []
afterEach(() => {
  for (const sim of sims.splice(0)) sim.dispose()
})

test('a body with fixedRotation never turns', async () => {
  // A 1 x 2 box dropped so one corner lands on the edge of a fixed ledge.
  const sim = await createSim({ seed: 1, plugins: [physics({ gravity: { x: 0, y: 30 } })] })
  sims.push(sim)
  sim.spawn([transform({ x: 0, y: 5 }), body(BodyKind.fixed), collider.cuboid(1, 0.5)])
  const tipping = sim.spawn([transform({ x: 1.4, y: 0 }), body(BodyKind.dynamic), collider.cuboid(0.5, 1)])
  const upright = sim.spawn([
    transform({ x: -1.4, y: 0 }),
    body(BodyKind.dynamic, { fixedRotation: true }),
    collider.cuboid(0.5, 1),
  ])
  for (let i = 0; i < 120; i++) sim.step([])
  expect(sim.entity(tipping)?.get(Transform).rotation).not.toBe(0)
  expect(sim.entity(upright)?.get(Transform).rotation).toBe(0)
})

test('fixedRotation can be switched on and off while the sim runs', async () => {
  const sim = await createSim({ seed: 1, plugins: [physics({ gravity: { x: 0, y: 30 } })] })
  sims.push(sim)
  sim.spawn([transform({ x: 0, y: 5 }), body(BodyKind.fixed), collider.cuboid(1, 0.5)])
  const box = sim.spawn([transform({ x: 1.4, y: 0 }), body(BodyKind.dynamic), collider.cuboid(0.5, 1)])
  sim.step([])
  sim.entity(box)?.set(Body, { fixedRotation: true })
  for (let i = 0; i < 120; i++) sim.step([])
  expect(sim.entity(box)?.get(Transform).rotation).toBe(0)
  sim.entity(box)?.set(Body, { fixedRotation: false })
  for (let i = 0; i < 120; i++) sim.step([])
  expect(sim.entity(box)?.get(Transform).rotation).not.toBe(0)
  expect(sim.entity(box)?.has(Collider)).toBe(true)
})
