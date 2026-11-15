// OKLab of a colour, from the numbers its author published.
import { expect, test } from 'vitest'
import { labOf } from '#src/features/content/lab.ts'

const near = (got: readonly number[], want: readonly number[], within: number): void => {
  want.forEach((value, i) => {
    const gap = Math.abs((got[i] as number) - value)
    expect(gap, `channel ${i}: ${got[i]} against ${value}`).toBeLessThan(within)
  })
}

test('white is all light and no colour', () => near(labOf(0xffffff), [1, 0, 0], 1e-6))

test('black is no light at all', () => near(labOf(0x000000), [0, 0, 0], 1e-6))

test('red is where its author put it', () => near(labOf(0xff0000), [0.62796, 0.22486, 0.12585], 1e-4))

test('a grey has no colour at any depth', () => {
  for (const grey of [0x202020, 0x808080, 0xc0c0c0]) near(labOf(grey).slice(1), [0, 0], 1e-6)
})

test('a lighter grey has more light', () => {
  const [dark, mid, light] = [0x202020, 0x808080, 0xe0e0e0].map((grey) => labOf(grey)[0])
  expect(dark).toBeLessThan(mid as number)
  expect(mid).toBeLessThan(light as number)
})
