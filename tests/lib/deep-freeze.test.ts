import { expect, test } from 'vitest'
import { deepFreeze } from '#src/lib/deep-freeze.ts'

test('deepFreeze freezes a value and everything inside it', () => {
  const value = deepFreeze({ a: [1, { b: 2 }], c: { d: 'e' } })
  expect(Object.isFrozen(value)).toBe(true)
  expect(Object.isFrozen(value.a)).toBe(true)
  expect(Object.isFrozen(value.a[1])).toBe(true)
  expect(Object.isFrozen(value.c)).toBe(true)
})

test('deepFreeze hands back what it was given, and leaves plain values alone', () => {
  const input = { x: 1 }
  expect(deepFreeze(input)).toBe(input)
  expect(deepFreeze(5)).toBe(5)
  expect(deepFreeze(null)).toBe(null)
})
