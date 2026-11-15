// What a hero's moves reach (plan G, task 2), worked out with no sim. The numbers in these tests are sums: 12 * 12 /
// (2 * 30) is 2.4 tiles up in a smooth fall, and Rapier's four substeps to a tick (jump-path.ts) take 0.025 off that
// for 2.375; 48 ticks at 6 a second is 4.8 across; a dash of 18 tiles a second for 10 ticks is 3. The first two were
// 2.3 and 4.7 before the parity test showed the real sim's tick: the tracker's ruling for task 2 says so.
// jump-path.parity.test.ts holds them to the real sim.
import { describe, expect, test } from 'vitest'
import { MOVE_NUMBERS, type MoveNumbers, moveNumbers, moveNumbersOf } from '#src/features/content/content.ts'
import { DEFAULT_GRAVITY, jumpPaths } from '#src/features/level/level.ts'
import type { MoveSwitches } from '#src/features/level/move-step.ts'

const N: MoveNumbers = moveNumbers(undefined)
const OFF: MoveSwitches = { doubleJump: false, wallJump: false, dash: false }
const ALL: MoveSwitches = { doubleJump: true, wallJump: true, dash: true }
const of = (values: Readonly<Record<string, number>>): MoveNumbers => moveNumbersOf(values)

describe('the jump', () => {
  test('the framework numbers: a jump reaches 2.375 tiles up and lands 4.8 across', () => {
    const { jump } = jumpPaths(N, OFF)
    expect(jump.up).toBeCloseTo(2.375, 3)
    expect(jump.across).toBeCloseTo(4.8, 3)
  })

  test('the default pull is the sim default, 30', () => expect(DEFAULT_GRAVITY).toBe(30))

  test('the path starts at the feet, never goes under the floor, and ends on it', () => {
    const { points } = jumpPaths(N, OFF).jump
    expect(points[0]).toEqual({ x: 0, y: 0 })
    for (const p of points) expect(p.y).toBeLessThanOrEqual(0)
    expect(points.at(-1)?.y).toBe(0)
    for (let i = 1; i < points.length; i++) expect(points[i]?.x).toBeGreaterThan(points[i - 1]?.x ?? 0)
  })

  test('one point a tick: 49 points for the framework numbers, the press and 48 ticks', () =>
    expect(jumpPaths(N, OFF).jump.points).toHaveLength(49))

  test('more jump-speed reaches higher and farther; more walk-speed reaches no higher and farther', () => {
    const base = jumpPaths(N, OFF).jump
    const fast = jumpPaths(of({ 'jump-speed': 15 }), OFF).jump
    expect(fast.up).toBeGreaterThan(base.up)
    expect(fast.across).toBeGreaterThan(base.across)
    const quick = jumpPaths(of({ 'walk-speed': 9 }), OFF).jump
    expect(quick.up).toBeCloseTo(base.up, 6)
    expect(quick.across).toBeGreaterThan(base.across)
  })

  test('jump-cut does not change a held jump', () =>
    expect(jumpPaths(of({ 'jump-cut': 0.2 }), OFF).jump).toEqual(jumpPaths(N, OFF).jump))

  test('half the gravity reaches about twice as high', () => {
    const half = jumpPaths(N, OFF, DEFAULT_GRAVITY / 2).jump.up
    expect(half / jumpPaths(N, OFF).jump.up).toBeGreaterThan(1.9)
    expect(half / jumpPaths(N, OFF).jump.up).toBeLessThan(2.1)
  })
})

describe('the air jump', () => {
  test('with doubleJump on the air jump reaches higher than the jump, by `rise`; off, there is none', () => {
    expect(jumpPaths(N, OFF).airJump).toBeUndefined()
    const paths = jumpPaths(N, { ...OFF, doubleJump: true })
    const air = paths.airJump
    expect(air).toBeDefined()
    expect(air?.up).toBeGreaterThan(paths.jump.up)
    expect(air?.rise).toBeCloseTo((air?.up ?? 0) - paths.jump.up, 9)
    expect(air?.rise).toBeGreaterThan(0.5)
  })

  test('air-jumps 3 reaches higher than air-jumps 1', () => {
    const on = { ...OFF, doubleJump: true }
    const one = jumpPaths(of({ 'air-jumps': 1 }), on).airJump
    const three = jumpPaths(of({ 'air-jumps': 3 }), on).airJump
    expect(three?.up).toBeGreaterThan(one?.up ?? 0)
  })
})

describe('the wall jump and the dash', () => {
  test('a dash goes 3 tiles for the framework numbers, and dash-ticks 20 goes 6', () => {
    expect(jumpPaths(N, { ...OFF, dash: true }).dash?.across).toBeCloseTo(3, 3)
    expect(jumpPaths(of({ 'dash-ticks': 20 }), { ...OFF, dash: true }).dash?.across).toBeCloseTo(6, 3)
  })

  test('a wall jump goes up, more wall-jump-up goes higher; with the switches off there are none', () => {
    expect(jumpPaths(N, OFF).dash).toBeUndefined()
    expect(jumpPaths(N, OFF).wallJump).toBeUndefined()
    const base = jumpPaths(N, { ...OFF, wallJump: true }).wallJump?.up ?? 0
    expect(base).toBeGreaterThan(1)
    const higher = jumpPaths(of({ 'wall-jump-up': 16 }), { ...OFF, wallJump: true }).wallJump?.up
    expect(higher).toBeGreaterThan(base)
  })
})

describe('the limits and the answer', () => {
  test('every number at each of its two limits ends inside 1200 ticks, on the floor', () => {
    for (const n of MOVE_NUMBERS)
      for (const value of [n.min, n.max]) {
        const paths = jumpPaths(of({ [n.id]: value }), ALL)
        for (const flight of [paths.jump, paths.airJump]) {
          expect(flight?.points.length, `${n.id} ${value}`).toBeLessThan(1200)
          expect(flight?.points.at(-1)?.y, `${n.id} ${value}`).toBe(0)
          expect(flight?.up).toBeGreaterThanOrEqual(0)
          expect(flight?.across).toBeGreaterThanOrEqual(0)
        }
        expect(paths.wallJump?.up).toBeGreaterThan(0)
        expect(paths.dash?.across).toBeGreaterThan(0)
      }
  })

  test('the strongest numbers together still land: jump-speed 30 with three air jumps, fall-speed 5', () => {
    const paths = jumpPaths(of({ 'jump-speed': 30, 'air-jumps': 3, 'fall-speed': 5 }), ALL)
    expect(paths.airJump?.points.length).toBeLessThan(1200)
    expect(paths.airJump?.points.at(-1)?.y).toBe(0)
  })

  test('the answer is frozen, and the same call gives equal numbers', () => {
    const a = jumpPaths(N, ALL)
    expect(Object.isFrozen(a)).toBe(true)
    expect(Object.isFrozen(a.jump)).toBe(true)
    expect(Object.isFrozen(a.jump.points)).toBe(true)
    expect(Object.isFrozen(a.jump.points[1])).toBe(true)
    expect(jumpPaths(N, ALL)).toEqual(a)
  })
})
