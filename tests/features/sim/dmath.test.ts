// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/math/dmath.test.ts
import { expect, test } from 'vitest'
import { atan, atan2, cos, exp, log, pow, sin, tan } from '#src/features/sim/dmath.ts'

// Deterministic PRNG for sampling (mulberry32: 32-bit integer ops only).
function sampler(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function maxErr(f: (r: () => number) => [number, number], rel = false): number {
  const rand = sampler(7)
  let worst = 0
  for (let i = 0; i < 100_000; i++) {
    const [got, want] = f(rand)
    const e = rel ? Math.abs((got - want) / want) : Math.abs(got - want)
    if (e > worst) worst = e
  }
  return worst
}

test('stays within ~1 ulp of the built-ins (pow within 1e-12)', () => {
  expect(
    maxErr((q) => {
      const x = q() * 2000 - 1000
      return [sin(x), Math.sin(x)]
    }),
  ).toBeLessThan(1e-14)
  expect(
    maxErr((q) => {
      const x = q() * 2000 - 1000
      return [cos(x), Math.cos(x)]
    }),
  ).toBeLessThan(1e-14)
  expect(
    maxErr((q) => {
      let x = q() * 2000 - 1000
      while (Math.abs(Math.cos(x)) < 1e-3) x += 0.01
      return [tan(x), Math.tan(x)]
    }, true),
  ).toBeLessThan(1e-12)
  expect(
    maxErr((q) => {
      const y = q() * 2000 - 1000
      const x = q() * 2000 - 1000
      return [atan2(y, x), Math.atan2(y, x)]
    }),
  ).toBeLessThan(1e-14)
  expect(
    maxErr((q) => {
      const x = q() * 1400 - 700
      return [exp(x), Math.exp(x)]
    }, true),
  ).toBeLessThan(1e-14)
  expect(
    maxErr((q) => {
      const x = 10 ** (q() * 600 - 300)
      return [log(x), Math.log(x)]
    }, true),
  ).toBeLessThan(1e-14)
  expect(
    maxErr((q) => {
      const x = q() * 100 + 1e-9
      const y = q() * 20 - 10
      return [pow(x, y), x ** y]
    }, true),
  ).toBeLessThan(1e-12)
})

test('edge values and signed zeros match the built-ins', () => {
  expect(exp(0)).toBe(1)
  expect(log(1)).toBe(0)
  expect(exp(710)).toBe(Number.POSITIVE_INFINITY)
  expect(exp(-800)).toBe(0)
  expect(log(0)).toBe(Number.NEGATIVE_INFINITY)
  expect(Number.isNaN(log(-1))).toBe(true)
  expect(Object.is(sin(-0), -0)).toBe(true)
  expect(Object.is(atan(-0), -0)).toBe(true)
  for (const [y, x] of [
    [0, -1],
    [-0, -1],
    [0, 0],
    [-0, 0],
    [0, -0],
    [-0, -0],
  ] as const) {
    expect(Object.is(atan2(y, x), Math.atan2(y, x))).toBe(true)
  }
  expect(pow(2, 3)).toBe(8)
  expect(pow(-2, 3)).toBe(-8)
  expect(pow(2, -2)).toBe(0.25)
  expect(Object.is(pow(-0, 3), -0)).toBe(true)
})
