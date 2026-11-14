// Lifted from AutomataFrameworkFailed@ed8592e8: extensions/physics/tests/unit/2d/physics-2d.test.ts

import { afterEach, expect, test, vi } from 'vitest'
import {
  Body,
  BodyKind,
  body,
  Collider,
  collider,
  Joint,
  joint,
  type PhysicsOptions,
  physics,
  ShapeKind,
  Transform,
  transform,
} from '#src/features/physics/physics.ts'
import { createSim, type Sim, SimFaultedError, type SpawnPart } from '#src/features/sim/sim.ts'
import { createScene, sceneCommands } from '../../fixtures/physics/scene.ts'

const sims: Sim[] = []
afterEach(() => {
  for (const sim of sims.splice(0)) sim.dispose()
})
// The scenes below were laid out with y up (the floor under the ball), so they ask for that gravity explicitly: the
// default gravity points down in the framework's y-down world.
const Y_UP: PhysicsOptions = { gravity: { x: 0, y: -9.81 } }
async function world(options: PhysicsOptions = Y_UP): Promise<Sim> {
  const sim = await createSim({ seed: 1, plugins: [physics(options)] })
  sims.push(sim)
  return sim
}
const run = (sim: Sim, ticks: number) => {
  for (let i = 0; i < ticks; i++) sim.step([])
}
const pose = (sim: Sim, sid: number) =>
  sim.entity(sid)?.get(Transform) as { x: number; y: number; rotation: number }
const floor = (sim: Sim, y = 0): number => sim.spawn([transform({ y: y - 0.1 }), collider.cuboid(5, 0.1)])
const ball = (sim: Sim, at: { x?: number; y?: number }, radius = 0.5): number =>
  sim.spawn([transform(at), body(BodyKind.dynamic), collider.ball(radius)])

test('physics() is the physics plugin with its four systems; helpers give the defaults', () => {
  const plugin = physics()
  expect(plugin.name).toBe('physics')
  expect(plugin.systems.map((s) => [s.name, s.phase])).toEqual([
    ['physics.sync-in', 'prePhysics'],
    ['physics.step', 'physics'],
    ['physics.sync-out', 'postPhysics'],
    ['physics.events', 'postPhysics'],
  ])
  expect(transform({ x: 1 })).toEqual([Transform, { x: 1, y: 0, rotation: 0 }])
  expect(body(BodyKind.fixed)).toEqual([
    Body,
    { kind: 1, linearDamping: 0, angularDamping: 0, vx: 0, vy: 0, angvel: 0, fixedRotation: false },
  ])
  expect(collider.capsule(0.45, 0.3)).toEqual([
    Collider,
    {
      shape: ShapeKind.capsule,
      hx: 0.3,
      hy: 0.45,
      sensor: false,
      groups: 0xffffffff,
      friction: 0.5,
      restitution: 0,
    },
  ])
})

test('a ball falls onto a lone cuboid and rests; at rest it leaves the render delta', async () => {
  const sim = await world()
  floor(sim)
  const b = ball(sim, { y: 3 })
  run(sim, 5)
  expect(sim.entity(b)?.get(Body).vy).toBeLessThan(0)
  run(sim, 400)
  expect(pose(sim, b).y).toBeCloseTo(0.5, 1)
  expect(sim.step([]).render.changed).toEqual([])
})

test('teleport, kinematic-position following, velocity writes, collider rebuild and lone collider moves', async () => {
  const sim = await world({ gravity: { x: 0, y: 0 } })
  const b = ball(sim, {})
  const k = sim.spawn([transform({ x: -5 }), body(BodyKind.kinematicPosition), collider.capsule(0.45, 0.3)])
  sim.step([])
  sim.entity(b)?.set(Transform, { x: 3, y: 4, rotation: 0.5 })
  sim.entity(k)?.set(Transform, { x: -4.95 })
  sim.step([])
  expect(pose(sim, b)).toEqual({ x: 3, y: 4, rotation: 0.5 })
  expect(pose(sim, k).x).toBe(Math.fround(-4.95))
  expect(sim.entity(k)?.get(Body).vx).toBeCloseTo(3, 2)
  sim.entity(b)?.set(Body, { vx: 2, angvel: 1 })
  run(sim, 60)
  expect(pose(sim, b).x).toBeCloseTo(5, 3)
  expect(pose(sim, b).rotation).toBeCloseTo(1.5, 3)

  const sim2 = await world()
  const f = floor(sim2)
  const c = ball(sim2, { y: 1 })
  run(sim2, 120)
  sim2.entity(c)?.set(Collider, { hx: 1 })
  run(sim2, 120)
  expect(pose(sim2, c).y).toBeCloseTo(1, 1)
  sim2.entity(f)?.set(Transform, { y: -1.1 })
  run(sim2, 120)
  expect(pose(sim2, c).y).toBeCloseTo(0, 1)
})

test('a sensor reports started and ended with sensor: true', async () => {
  const sim = await world()
  const zone = sim.spawn([transform({ y: 2 }), collider.cuboid(2, 0.1, { sensor: true })])
  const b = ball(sim, { y: 4 })
  const seen: unknown[] = []
  for (let t = 0; t < 90; t++)
    for (const e of sim.step([]).events) seen.push({ type: e.type, ...(e.payload as object) })
  expect(seen).toEqual([
    { type: 'physics.collision-started', a: zone, b, sensor: true },
    { type: 'physics.collision-ended', a: zone, b, sensor: true },
  ])
})

test.each([
  ['zero size', [transform(), collider.ball(0)], 'physics.collider.hx'],
  ['unknown body kind', [transform(), [Body, { kind: 4 }]], 'physics.body.kind'],
] as const)('%s: sync-in throws naming the entity and field', async (_, parts, field) => {
  const sim = await world()
  const sid = sim.spawn(parts as unknown as SpawnPart[])
  let caught: unknown
  try {
    sim.step([])
  } catch (err) {
    caught = err
  }
  expect(caught).toBeInstanceOf(SimFaultedError)
  expect(((caught as SimFaultedError).cause as Error).message).toContain(`entity ${sid}: ${field}`)
})

test('the mixed 2D scene, with its spawns, despawns and component edits, reports balanced pairs', async () => {
  const sim = await createScene()
  const touching = new Set<string>()
  let count = 0
  for (let t = 0; t < 300; t++)
    for (const e of sim.step(sceneCommands(t)).events) {
      if (!e.type.startsWith('physics.collision-')) continue
      const { a, b } = e.payload as { a: number; b: number }
      const key = `${a}:${b}`
      const started = e.type === 'physics.collision-started'
      expect(touching.has(key), `${e.type} ${key}`).toBe(!started)
      if (started) touching.add(key)
      else touching.delete(key)
      count += 1
    }
  sim.dispose()
  expect(count).toBeGreaterThan(20)
})

test('a rotated lone collider is not re-rotated every tick (audit: Rapier stores the angle as cos/sin)', async () => {
  const RAPIER = (await import('@dimforge/rapier2d-deterministic')).default
  const sim = await world()
  for (let i = 0; i < 200; i++)
    sim.spawn([transform({ x: i, rotation: i * 0.0314 - Math.PI }), collider.cuboid(0.4, 0.2)])
  sim.step([]) // creates them
  const spy = vi.spyOn(RAPIER.Collider.prototype, 'setRotation')
  for (let t = 0; t < 10; t++) sim.step([])
  expect(spy).not.toHaveBeenCalled()
  spy.mockRestore()
})

test('physics() without joints registers no joint, so nothing recorded moves', () => {
  const plain = physics()
  expect(plain.components.map((c) => c.id)).toEqual(['transform', 'physics.body', 'physics.collider'])
  expect(plain.config).toEqual({ gravity: { x: 0, y: 9.81 } })
  expect(physics({ joints: true }).components.map((c) => c.id)).toContain('physics.joint')
  expect(physics({ joints: true }).config).toEqual({ gravity: { x: 0, y: 9.81 }, joints: true })
})

test('joint.pin and joint.rope fill every field', () => {
  expect(joint.pin(1, 2, { bx: 3, min: -0.5, max: 0.5 })).toEqual([
    Joint,
    { kind: 0, a: 1, b: 2, ax: 0, ay: 0, bx: 3, by: 0, limited: true, min: -0.5, max: 0.5 },
  ])
  expect((joint.rope(1, 2, 4) as readonly [unknown, unknown])[1]).toMatchObject({
    kind: 1,
    limited: false,
    min: 0,
    max: 4,
  })
  expect((joint.pin(1, 2, { min: -1 }) as readonly [unknown, unknown])[1]).toMatchObject({ limited: false })
})
