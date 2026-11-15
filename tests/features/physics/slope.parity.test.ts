// Slopes, with Rapier itself in Node and in every browser: a right triangle that fills half its box, which a ball rolls
// down, a box stands on with no seam, and a box slides up past six tile corners without a catch. y points down.
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
import { expectGolden, runGolden } from '../../fixtures/golden.ts'
import slopeGolden from '../../golden/slope-ledge.json' with { type: 'json' }

const stage = (): Promise<Sim> => createSim({ seed: 1, plugins: [physics()] })
/** A floor whose top is at y = 10 and that is 20 wide. */
const floor = (sim: Sim): number => sim.spawn([transform({ x: 6, y: 10.5 }), collider.cuboid(10, 0.5)])
/** An upright box 0.8 wide and 1 tall, at (`x`, `y`), moving (`vx`, `vy`). */
const hero = (sim: Sim, x: number, y: number, vx = 0, vy = 0): number =>
  sim.spawn([
    transform({ x, y }),
    body(BodyKind.dynamic, { fixedRotation: true, vx, vy }),
    collider.cuboid(0.4, 0.5),
  ])
const at = (sim: Sim, sid: number): { x: number; y: number } => {
  const t = sim.entity(sid)?.get(Transform)
  return { x: t?.x ?? Number.NaN, y: t?.y ?? Number.NaN }
}

test('a ball dropped on a slope rolls down it, to its low side and onto the floor', async () => {
  const sim = await stage()
  floor(sim)
  // A slope 4 wide and 4 high whose line is y = 10 - x: it rises to the right, so the low side is the left.
  sim.spawn([transform({ x: 2, y: 8 }), collider.slope(2, 2, 1)])
  const ball = sim.spawn([transform({ x: 3, y: 3 }), body(BodyKind.dynamic), collider.ball(0.25)])
  for (let i = 0; i < 300; i++) sim.step([])
  const end = at(sim, ball)
  expect(end.x).toBeLessThan(1.5)
  expect(end.y).toBeGreaterThan(9)
  sim.dispose()
})

test('a box stands on a slope’s line, with its lowest corner on it, and stays there', async () => {
  const sim = await stage()
  // 3 wide and 3 high, line y = 8 - x. A friction above 1 holds a box on its 45 degrees.
  sim.spawn([transform({ x: 1.5, y: 6.5 }), collider.slope(1.5, 1.5, 1, { friction: 2 })])
  const box = sim.spawn([
    transform({ x: 1.5, y: 5.9 }),
    body(BodyKind.dynamic, { fixedRotation: true }),
    collider.cuboid(0.5, 0.5, { friction: 2 }),
  ])
  for (let i = 0; i < 60; i++) sim.step([])
  const landed = at(sim, box)
  for (let i = 0; i < 120; i++) {
    sim.step([])
    const now = at(sim, box)
    // The box's lowest corner is its bottom right one, and the line there is y = 8 - (x + 0.5).
    expect(Math.abs(now.y + 0.5 - (8 - (now.x + 0.5))), `tick ${i}`).toBeLessThan(0.02)
  }
  const end = at(sim, box)
  expect(Math.abs(end.x - landed.x)).toBeLessThan(0.05)
  sim.dispose()
})

test('a box slid up a slope that passes six tile corners keeps moving to the top', async () => {
  const sim = await stage()
  const noFriction = { friction: 0 }
  sim.spawn([transform({ x: 6, y: 10.5 }), collider.cuboid(10, 0.5, noFriction)])
  // 6 wide and 6 high from x = 6: its line is y = 10 - (x - 6), through the six whole tile corners.
  sim.spawn([transform({ x: 9, y: 7 }), collider.slope(3, 3, 1, noFriction)])
  const box = sim.spawn([
    transform({ x: 2, y: 9.5 }),
    body(BodyKind.dynamic, { fixedRotation: true, vx: 20 }),
    collider.cuboid(0.5, 0.5, noFriction),
  ])
  let climbed = 0
  const trace: string[] = []
  for (let i = 0; i < 200; i++) {
    sim.step([])
    const here = at(sim, box)
    if (i % 4 === 0) trace.push(`${i}: ${here.x.toFixed(2)},${here.y.toFixed(2)} v ${sim.entity(box)?.get(Body).vx.toFixed(2)},${sim.entity(box)?.get(Body).vy.toFixed(2)}`)
    if (here.x < 6.5 || here.x > 11.5) continue
    climbed++
    expect(sim.entity(box)?.get(Body).vx, `tick ${i} at x ${here.x}`).toBeGreaterThan(1)
  }
  expect(climbed, trace.join('\n')).toBeGreaterThan(5)
  sim.dispose()
})

test('a scene of a slope, a ledge and what falls on them ends on its golden hash', async () => {
  const sim = await stage()
  floor(sim)
  sim.spawn([transform({ x: 2, y: 8 }), collider.slope(2, 2, 1)])
  sim.spawn([transform({ x: 9, y: 8 }), collider.slope(2, 2, -1)])
  sim.spawn([transform({ x: 6, y: 6 }), collider.ledge(1.5, 0.125)])
  sim.spawn([transform({ x: 3, y: 3 }), body(BodyKind.dynamic), collider.ball(0.25)])
  sim.spawn([transform({ x: 8, y: 3 }), body(BodyKind.dynamic), collider.ball(0.3)])
  hero(sim, 6, 2)
  hero(sim, 6, 9, 0, -9)
  const run = runGolden(sim, 300, () => [])
  sim.dispose()
  expect(run.ticks).toBe(300)
  expectGolden(run, slopeGolden)
})
