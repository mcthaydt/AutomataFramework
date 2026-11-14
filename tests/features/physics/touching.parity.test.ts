import { describe, expect, test } from 'vitest'
import {
  Body,
  BodyKind,
  body,
  collider,
  joint,
  physics,
  Touching,
  Transform,
  transform,
} from '#src/features/physics/physics.ts'
import { createSim, type Sim } from '#src/features/sim/sim.ts'

// What a body stands on and leans against, with Rapier itself, in Node and in every browser. y points down: the floor's
// top is at y = 6, so a box 1 tall stands with its centre at 5.5.
const FLOOR_TOP = 6
const stage = (options: { joints?: boolean } = {}): Promise<Sim> =>
  createSim({ seed: 1, plugins: [physics({ touching: true, ...options })] })
const floor = (sim: Sim): number => sim.spawn([transform({ y: FLOOR_TOP + 0.1 }), collider.cuboid(10, 0.1)])
/** Eight runs of wall, one on top of the next, from y = -6 to y = 6, whose face is at x = 1.5. */
function stackedWall(sim: Sim): void {
  for (let i = 0; i < 8; i++) {
    sim.spawn([transform({ x: 2, y: -5.25 + i * 1.5 }), collider.cuboid(0.5, 0.75)])
  }
}
/** A hero-shaped box: upright, so it never tips, and with the component that is filled in. */
const hero = (sim: Sim, x: number, y: number): number =>
  sim.spawn([
    transform({ x, y }),
    body(BodyKind.dynamic, { fixedRotation: true }),
    collider.cuboid(0.4, 0.5),
    Touching,
  ])
const touch = (sim: Sim, sid: number) => {
  const t = sim.entity(sid)?.get(Touching)
  return { below: t?.below, left: t?.left, right: t?.right }
}
interface Seen {
  readonly below: boolean | undefined
  readonly left: boolean | undefined
  readonly right: boolean | undefined
  readonly x: number
  readonly y: number
}
/** Steps `n` ticks, setting the sideways speed to `vx` before each (so the body keeps leaning), reading after each. */
function walk(sim: Sim, sid: number, vx: number, n: number): Seen[] {
  const seen: Seen[] = []
  for (let i = 0; i < n; i++) {
    sim.entity(sid)?.set(Body, { vx })
    sim.step([])
    const at = sim.entity(sid)?.get(Transform)
    seen.push({ ...touch(sim, sid), x: at?.x ?? 0, y: at?.y ?? 0 })
  }
  return seen
}

describe('touching', () => {
  test('a box at rest on a floor is below and nothing else', async () => {
    const sim = await stage()
    floor(sim)
    const sid = hero(sim, 0, FLOOR_TOP - 0.5)
    for (let i = 0; i < 60; i++) sim.step([])
    expect(touch(sim, sid)).toEqual({ below: true, left: false, right: false })
    sim.dispose()
  })

  test('a box in the air is nothing', async () => {
    const sim = await stage()
    const sid = hero(sim, 0, 0)
    for (let i = 0; i < 10; i++) sim.step([])
    expect(touch(sim, sid)).toEqual({ below: false, left: false, right: false })
    sim.dispose()
  })

  test('a box pushed against a wall in the air is right, and stops being so when it leaves', async () => {
    const sim = await stage()
    sim.spawn([transform({ x: 2, y: 0 }), collider.cuboid(0.1, 30)])
    const sid = hero(sim, 1.4, 0)
    const pressed = walk(sim, sid, 4, 20)
    expect(pressed.at(-1)).toMatchObject({ below: false, left: false, right: true })
    const leaving = walk(sim, sid, -4, 12)
    expect(leaving.at(-1)).toMatchObject({ right: false })
    sim.dispose()
  })

  test('a box on a crate is below; a box beside a crate is neither left nor right', async () => {
    const onTop = await stage()
    floor(onTop)
    onTop.spawn([transform({ x: 0, y: FLOOR_TOP - 0.5 }), body(BodyKind.dynamic), collider.cuboid(0.5, 0.5)])
    const sid = hero(onTop, 0, FLOOR_TOP - 1.5)
    for (let i = 0; i < 60; i++) onTop.step([])
    expect(touch(onTop, sid)).toEqual({ below: true, left: false, right: false })
    onTop.dispose()

    const beside = await stage()
    floor(beside)
    beside.spawn([
      transform({ x: 1.3, y: FLOOR_TOP - 0.5 }),
      body(BodyKind.dynamic),
      collider.cuboid(0.5, 0.5),
    ])
    const walker = hero(beside, 0, FLOOR_TOP - 0.5)
    const seen = walk(beside, walker, 3, 40)
    expect(seen.every((s) => s.left === false && s.right === false)).toBe(true)
    expect(seen.at(-1)?.x).toBeGreaterThan(0.5) // it really did walk up to the crate and push it
    beside.dispose()
  })

  test('walking across the seam between two tile runs never says left or right', async () => {
    const sim = await stage()
    // Two runs of floor that meet at x = 0, as a level's tile runs do.
    sim.spawn([transform({ x: -3, y: FLOOR_TOP + 0.1 }), collider.cuboid(3, 0.1)])
    sim.spawn([transform({ x: 3, y: FLOOR_TOP + 0.1 }), collider.cuboid(3, 0.1)])
    const sid = hero(sim, -4, FLOOR_TOP - 0.5)
    const seen = walk(sim, sid, 6, 90) // a second and a half at 6 tiles a second: from -4 to 5
    expect(seen.at(-1)?.x).toBeGreaterThan(3)
    expect(seen.every((s) => s.left === false && s.right === false)).toBe(true)
    expect(seen.at(-1)?.below).toBe(true)
    sim.dispose()
  })

  test('sliding down a wall of four stacked runs never says below before the floor', async () => {
    const sim = await stage()
    floor(sim)
    // Eight runs, one on top of the next, from y = -6 to y = 6: a wall whose face is at x = 1.5 and that is far
    // taller than the fall, so the box leans on it the whole way down.
    stackedWall(sim)
    const sid = hero(sim, 1.05, -4)
    const seen = walk(sim, sid, 3, 120)
    // Until its feet are within a tenth of the floor, the box is in the air, whatever the seams under its side say.
    const falling = seen.filter((s) => s.y + 0.5 < FLOOR_TOP - 0.1)
    expect(falling.length).toBeGreaterThan(10)
    expect(falling.every((s) => s.below === false)).toBe(true)
    expect(seen.filter((s) => s.right).length).toBeGreaterThan(10) // not vacuous: it leaned on the wall
    expect(seen.at(-1)?.below).toBe(true)
    sim.dispose()
  })

  test('a box on a swinging platform stays below while it swings', async () => {
    const sim = await stage({ joints: true })
    const anchor = sim.spawn([transform(), body(BodyKind.fixed)])
    const platform = sim.spawn([
      transform({ y: 3 }),
      body(BodyKind.dynamic, { vx: 1.5 }),
      collider.cuboid(1.2, 0.1),
    ])
    sim.spawn([joint.rope(platform, anchor, 2.5, { ax: -1.2, bx: -1.2, by: 0.5 })])
    sim.spawn([joint.rope(platform, anchor, 2.5, { ax: 1.2, bx: 1.2, by: 0.5 })])
    const sid = hero(sim, 0, 2.4)
    const seen = walk(sim, sid, 0, 0)
    for (let i = 0; i < 120; i++) {
      sim.step([])
      if (i >= 20) seen.push({ ...touch(sim, sid), x: 0, y: 0 })
    }
    expect(seen.length).toBe(100)
    expect(seen.every((s) => s.below === true)).toBe(true)
    sim.dispose()
  })

  test('restored from a snapshot, the next ticks say the same as the sim that was not restored', async () => {
    const make = async (): Promise<{ sim: Sim; sid: number }> => {
      const sim = await stage()
      floor(sim)
      stackedWall(sim)
      return { sim, sid: hero(sim, 1.05, -4) }
    }
    const straight = await make()
    const restored = await make()
    walk(straight.sim, straight.sid, 3, 40)
    const bytes = straight.sim.snapshot()
    restored.sim.restore(bytes)
    const a = walk(straight.sim, straight.sid, 3, 80)
    const b = walk(restored.sim, restored.sid, 3, 80)
    expect(b).toEqual(a)
    expect(restored.sim.hash()).toBe(straight.sim.hash())
    straight.sim.dispose()
    restored.sim.dispose()
  })

  test('a sim made without touching is the sim it was', async () => {
    const plain = await createSim({ seed: 1, plugins: [physics()] })
    const off = await createSim({ seed: 1, plugins: [physics({ touching: false })] })
    const on = await createSim({ seed: 1, plugins: [physics({ touching: true })] })
    expect(off.snapshot()).toEqual(plain.snapshot())
    expect(on.snapshot()).not.toEqual(plain.snapshot())
    for (const sim of [plain, off, on]) sim.dispose()
  })
})
