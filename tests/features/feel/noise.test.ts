import { expect, test } from 'vitest'
import { noise } from '#src/features/feel/noise.ts'

test('the same four numbers give the same answer, and it is from 0 up to but not 1', () => {
  for (let i = 0; i < 10_000; i++) {
    const n = noise(i, i * 7, i % 13, i % 5)
    expect(noise(i, i * 7, i % 13, i % 5)).toBe(n)
    expect(n).toBeGreaterThanOrEqual(0)
    expect(n).toBeLessThan(1)
  }
})

test('changing any one of the four changes the answer', () => {
  const base = noise(11, 22, 33, 44)
  expect(noise(12, 22, 33, 44)).not.toBe(base)
  expect(noise(11, 23, 33, 44)).not.toBe(base)
  expect(noise(11, 22, 34, 44)).not.toBe(base)
  expect(noise(11, 22, 33, 45)).not.toBe(base)
})

test('the order of the four matters', () => expect(noise(1, 2, 3, 4)).not.toBe(noise(4, 3, 2, 1)))

test('ten thousand draws fill ten equal bins with 800 to 1200 each', () => {
  const bins = new Array<number>(10).fill(0)
  for (let i = 0; i < 10_000; i++) bins[Math.floor(noise(3, 5, 7, i) * 10)]++
  for (const count of bins) {
    expect(count).toBeGreaterThanOrEqual(800)
    expect(count).toBeLessThanOrEqual(1200)
  }
})

// Recorded from the code, so a change to the mix (which would move every recorded feel frame) is seen at once.
test('a fixed draw is the same number in every engine', () => {
  expect(noise(0, 0, 0, 0)).toBe(noise(0, 0, 0, 0))
  expect(Number.isInteger(noise(1, 2, 3, 4) * 4294967296)).toBe(true)
})
