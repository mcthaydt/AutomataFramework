import { expect, test } from 'vitest'
import { editDistance, nearest } from '#src/lib/near.ts'

test('editDistance counts one-letter edits', () => {
  expect(editDistance('jump-speed', 'jump-speed')).toBe(0)
  expect(editDistance('jump-sped', 'jump-speed')).toBe(1)
  expect(editDistance('jump-spede', 'jump-speed')).toBe(2)
  expect(editDistance('', 'abc')).toBe(3)
  expect(editDistance('abc', '')).toBe(3)
  expect(editDistance('kitten', 'sitting')).toBe(3)
})

test('nearest is the closest word within the limit, and nothing for one in the list or far from it', () => {
  const words = ['walk-speed', 'jump-speed', 'dash-speed']
  expect(nearest('jump-sped', words, 1)).toBe('jump-speed')
  expect(nearest('jump-speed', words, 2)).toBeUndefined()
  expect(nearest('crate-weight', words, 2)).toBeUndefined()
  // The closest wins; of two equally close, the first.
  expect(nearest('wash-speed', ['walk-speed', 'wash-speeds'], 2)).toBe('wash-speeds')
  expect(nearest('abx', ['abc', 'abd'], 1)).toBe('abc')
})
