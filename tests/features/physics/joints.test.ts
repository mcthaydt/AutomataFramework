import { afterEach, expect, test } from 'vitest'
import { z } from 'zod'
import { checkJoint } from '#src/features/physics/checks.ts'
import {
  BodyKind,
  body,
  collider,
  Joint,
  joint,
  physics,
  Transform,
  transform,
} from '#src/features/physics/physics.ts'
import {
  createSim,
  defineCommand,
  definePlugin,
  defineSystem,
  type Sim,
  SimFaultedError,
} from '#src/features/sim/sim.ts'

// Joints against the real Rapier. The framework's y points down, so the default gravity pulls things toward larger y
// and a positive turn takes the right end of a plank down.

const Kill = defineCommand('kill', z.object({ sid: z.number().int() }))
const killer = definePlugin({
  name: 'killer',
  commands: [Kill],
  systems: [
    defineSystem({
      name: 'killer.kill',
      phase: 'input',
      run(ctx) {
        for (const c of ctx.commands.of(Kill)) ctx.despawn(c.payload.sid)
      },
    }),
  ],
})

const sims: Sim[] = []
afterEach(() => {
  for (const sim of sims.splice(0)) sim.dispose()
})
async function world(): Promise<Sim> {
  const sim = await createSim({ seed: 1, plugins: [physics({ joints: true }), killer] })
  sims.push(sim)
  return sim
}
const anchorAt = (sim: Sim, x = 0, y = 0): number => sim.spawn([transform({ x, y }), body(BodyKind.fixed)])
const pose = (sim: Sim, sid: number) =>
  (sim.entity(sid) as NonNullable<ReturnType<Sim['entity']>>).get(Transform)

test('a pinned plank stays on its pin and turns under a weight', async () => {
  const sim = await world()
  const anchor = anchorAt(sim)
  const plank = sim.spawn([
    transform(),
    body(BodyKind.dynamic, { angularDamping: 1 }),
    collider.cuboid(2, 0.1),
  ])
  sim.spawn([joint.pin(plank, anchor)])
  sim.spawn([transform({ x: 1.5, y: -1 }), body(BodyKind.dynamic), collider.ball(0.3)])
  for (let t = 0; t < 120; t++) sim.step([])
  const t = pose(sim, plank)
  expect(Math.hypot(t.x, t.y)).toBeLessThan(0.02)
  expect(t.rotation).toBeGreaterThan(0.1) // y points down, so the right end going down is a positive turn
})

test('a pin with limits stops at them', async () => {
  const sim = await world()
  const anchor = anchorAt(sim)
  const plank = sim.spawn([
    transform(),
    body(BodyKind.dynamic, { angularDamping: 1 }),
    collider.cuboid(2, 0.1),
  ])
  sim.spawn([joint.pin(plank, anchor, { min: -0.3, max: 0.3 })])
  sim.spawn([transform({ x: 1.5, y: -1 }), body(BodyKind.dynamic), collider.ball(0.3)])
  for (let t = 0; t < 240; t++) {
    sim.step([])
    expect(pose(sim, plank).rotation).toBeLessThanOrEqual(0.32)
  }
  expect(pose(sim, plank).rotation).toBeGreaterThan(0.25)
})

test('a rope never lets its thing further than its length', async () => {
  const sim = await world()
  const anchor = anchorAt(sim)
  const box = sim.spawn([transform({ x: 2 }), body(BodyKind.dynamic), collider.cuboid(0.2, 0.2)])
  sim.spawn([joint.rope(box, anchor, 2)])
  let nearest = 2
  for (let t = 0; t < 300; t++) {
    sim.step([])
    const p = pose(sim, box)
    expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(2.02)
    nearest = Math.min(nearest, p.x)
  }
  expect(nearest).toBeLessThan(1) // it swung
})

test('pinned things pass through each other and roped things bump', async () => {
  const sim = await world()
  const floor = sim.spawn([transform(), body(BodyKind.fixed), collider.cuboid(0.5, 0.5)])
  const pinned = sim.spawn([transform(), body(BodyKind.dynamic), collider.cuboid(0.5, 0.5)])
  sim.spawn([joint.pin(pinned, floor)])
  for (let t = 0; t < 60; t++) sim.step([])
  expect(Math.hypot(pose(sim, pinned).x, pose(sim, pinned).y)).toBeLessThan(0.01)

  const other = await world()
  const ground = other.spawn([transform({ y: 3 }), body(BodyKind.fixed), collider.cuboid(2, 0.2)])
  const hung = other.spawn([transform(), body(BodyKind.dynamic), collider.cuboid(0.2, 0.2)])
  other.spawn([joint.rope(hung, ground, 3)])
  for (let t = 0; t < 120; t++) other.step([])
  // resting on top of the ground (its top is at y 2.8, the box's half is 0.2), not through it
  expect(pose(other, hung).y).toBeGreaterThan(2.5)
  expect(pose(other, hung).y).toBeLessThan(2.7)
})

test('taking the Joint away lets the thing fall', async () => {
  const sim = await world()
  const anchor = anchorAt(sim)
  const box = sim.spawn([transform(), body(BodyKind.dynamic), collider.cuboid(0.2, 0.2)])
  const holder = sim.spawn([joint.pin(box, anchor)])
  for (let t = 0; t < 30; t++) sim.step([])
  expect(pose(sim, box).y).toBeLessThan(0.01)
  ;(sim.entity(holder) as NonNullable<ReturnType<Sim['entity']>>).remove(Joint)
  for (let t = 0; t < 30; t++) sim.step([])
  expect(pose(sim, box).y).toBeGreaterThan(0.5)
})

test('despawning one end frees the other, and a snapshot still restores', async () => {
  const sim = await world()
  const anchor = anchorAt(sim)
  const box = sim.spawn([transform({ x: 2 }), body(BodyKind.dynamic), collider.cuboid(0.2, 0.2)])
  sim.spawn([joint.rope(box, anchor, 2)])
  for (let t = 0; t < 30; t++) sim.step([])
  sim.step([{ tick: 30, source: 0, seq: 0, type: 'kill', payload: { sid: anchor } }])
  for (let t = 31; t < 90; t++) sim.step([])
  expect(pose(sim, box).y).toBeGreaterThan(3)
  const before = sim.hash()
  sim.restore(sim.snapshot())
  expect(sim.hash()).toBe(before)
})

test('nonsense in a Joint is refused by name, not by Rapier', async () => {
  const bad: ReadonlyArray<[string, Record<string, unknown>]> = [
    ['kind is 9; expected a JointKind (0..1)', { kind: 9 }],
    ['b is 1; a joint needs two different entities', { b: 1 }],
    ["max is 0; a rope's length must be positive", { kind: 1, max: 0 }],
    ['min is 1; it must not be more than max (0.5)', { limited: true, min: 1, max: 0.5 }],
  ]
  for (const [sentence, fields] of bad) {
    const sim = await world()
    const a = sim.spawn([transform(), body(BodyKind.dynamic), collider.cuboid(0.2, 0.2)])
    const b = sim.spawn([transform({ x: 1 }), body(BodyKind.dynamic), collider.cuboid(0.2, 0.2)])
    const sid = sim.spawn([[Joint, { kind: 0, a, b, max: 1, ...fields }]])
    let caught: unknown
    try {
      sim.step([])
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(SimFaultedError)
    expect(((caught as SimFaultedError).cause as Error).message).toBe(
      `entity ${sid}: physics.joint.${sentence}`,
    )
  }
})

test('a number that is not a number is refused by name too', () => {
  const spec = { kind: 0, a: 1, b: 2, ax: Number.NaN, ay: 0, bx: 0, by: 0, limited: false, min: 0, max: 0 }
  expect(() => checkJoint(7, 'physics.joint', spec)).toThrow(
    'entity 7: physics.joint.ax is NaN; it must be a number',
  )
})

test('no joint is left in Rapier when its joint is removed', async () => {
  const sim = await world()
  const anchor = anchorAt(sim)
  const box = sim.spawn([transform({ x: 1 }), body(BodyKind.dynamic), collider.cuboid(0.2, 0.2)])
  const holder = sim.spawn([joint.pin(box, anchor)])
  sim.step([])
  ;(sim.entity(holder) as NonNullable<ReturnType<Sim['entity']>>).remove(Joint)
  sim.step([])
  // restore checks that the table and Rapier agree on every joint, so it only succeeds when Rapier holds none
  const before = sim.hash()
  sim.restore(sim.snapshot())
  expect(sim.hash()).toBe(before)
})

test('a joint to an entity with no body is refused by name', async () => {
  const sim = await world()
  const box = sim.spawn([transform(), body(BodyKind.dynamic), collider.cuboid(0.2, 0.2)])
  const lone = sim.spawn([transform({ x: 1 }), collider.cuboid(0.2, 0.2)])
  const sid = sim.spawn([joint.pin(box, lone)])
  let caught: unknown
  try {
    sim.step([])
  } catch (err) {
    caught = err
  }
  expect(((caught as SimFaultedError).cause as Error).message).toBe(
    `entity ${sid}: physics.joint.b is ${lone}; entity ${lone} has no physics.body, so nothing can be joined to it`,
  )
})
