// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/util/sorted.test.ts
import { expect, test } from 'vitest'
import { ownKeyCount, sortedEntries, sortedKeys } from '#src/lib/sorted.ts'

test('sortedKeys returns own enumerable keys in code-unit order, independent of insertion order', () => {
  expect(sortedKeys({ b: 1, a: 2, B: 3, aa: 4 })).toEqual(['B', 'a', 'aa', 'b'])
})

test('sortedEntries pairs each sorted key with its value', () => {
  expect(sortedEntries({ z: 1, y: 2 })).toEqual([
    ['y', 2],
    ['z', 1],
  ])
})

test('integer-like keys sort as strings, not in JS engine integer order', () => {
  // Engines enumerate integer keys first in ascending numeric order; the sim must not depend on that.
  expect(sortedKeys({ 10: 'a', 9: 'b', x: 'c' })).toEqual(['10', '9', 'x'])
})

test('ownKeyCount counts own enumerable keys only', () => {
  const withProto = Object.create({ inherited: 1 }) as Record<string, number>
  withProto.own = 2
  expect(ownKeyCount({ a: 1, b: undefined })).toBe(2)
  expect(ownKeyCount(withProto)).toBe(1)
})
