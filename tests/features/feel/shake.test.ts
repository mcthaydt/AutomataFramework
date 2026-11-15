import { expect, test } from 'vitest'
import { largestShake, SHAKE_HZ, type Shaking, shakeAt } from '#src/features/feel/shake.ts'

const shaking = (strength: number, length: number, age = 0, tick = 5): Shaking => ({
  strength,
  length,
  seed: 3,
  tick,
  age,
})

test('at its start the offset is at most the strength on each axis', () => {
  for (let tick = 0; tick < 200; tick++) {
    const now = shakeAt(shaking(0.4, 0.2, 0, tick))
    expect(Math.abs(now.x)).toBeLessThanOrEqual(0.4)
    expect(Math.abs(now.y)).toBeLessThanOrEqual(0.4)
    expect(now.size).toBe(0.4)
  }
})

test('it fades: the size is half at half its length and zero at the end', () => {
  expect(shakeAt(shaking(0.4, 0.2, 0.1)).size).toBeCloseTo(0.2, 12)
  expect(shakeAt(shaking(0.4, 0.2, 0.2))).toEqual({ x: 0, y: 0, size: 0 })
  expect(shakeAt(shaking(0.4, 0.2, 5))).toEqual({ x: 0, y: 0, size: 0 })
})

test('the offset holds for a thirtieth of a second, then changes', () => {
  const beat = 1 / SHAKE_HZ
  const a = shakeAt(shaking(1, 10, 0.001))
  const b = shakeAt(shaking(1, 10, beat * 0.9))
  const c = shakeAt(shaking(1, 10, beat * 1.2))
  // The direction (offset over size) is the same within a beat and another in the next.
  expect(a.x / a.size).toBeCloseTo(b.x / b.size, 12)
  expect(c.x / c.size).not.toBeCloseTo(a.x / a.size, 6)
})

test('two shakes take the larger, never the sum', () => {
  const small = shaking(0.2, 1)
  const big = shaking(0.6, 1)
  const alone = shakeAt(big)
  const both = largestShake([small, big])
  expect(both).toEqual({ x: alone.x, y: alone.y })
  expect(Math.abs(both.x)).toBeLessThanOrEqual(0.6)
  expect(Math.abs(both.y)).toBeLessThanOrEqual(0.6)
  expect(largestShake([big, small])).toEqual(both)
})

test('a shake that has faded below another gives way to it', () => {
  const old = shaking(0.6, 1, 0.9)
  const fresh = shaking(0.2, 1, 0)
  const alone = shakeAt(fresh)
  expect(largestShake([old, fresh])).toEqual({ x: alone.x, y: alone.y })
})

test('no shake is a zero offset', () => expect(largestShake([])).toEqual({ x: 0, y: 0 }))
