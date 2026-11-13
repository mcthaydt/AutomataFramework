// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/define/fields.test.ts
import { expect, test } from 'vitest'
import { coerceField, defaultField } from '#src/features/sim/fields.ts'

test('f32 rounds through Math.fround; f64 keeps full precision', () => {
  expect(coerceField('f32', 0.1)).toBe(Math.fround(0.1))
  expect(coerceField('f64', 0.1)).toBe(0.1)
})

test.each([
  ['f32', Number.NaN],
  ['f64', Number.POSITIVE_INFINITY],
  ['f32', Number.NEGATIVE_INFINITY],
] as const)('%s rejects %s (NaN bytes are engine-chosen; snapshots must be canonical)', (type, value) => {
  expect(() => coerceField(type, value)).toThrow(RangeError)
})

test('f32 rejects values that overflow to Infinity after rounding', () => {
  expect(() => coerceField('f32', 1e39)).toThrow(RangeError)
  expect(() => coerceField('f32', -1e39)).toThrow(RangeError)
})

test('i32 and u32 accept only in-range integers', () => {
  expect(coerceField('i32', -5)).toBe(-5)
  expect(coerceField('u32', 4294967295)).toBe(4294967295)
  expect(() => coerceField('i32', 1.5)).toThrow(RangeError)
  expect(() => coerceField('i32', 2 ** 31)).toThrow(RangeError)
  expect(() => coerceField('u32', -1)).toThrow(RangeError)
  expect(() => coerceField('u32', 2 ** 32)).toThrow(RangeError)
})

test('entity is a u32 StableId (0 = none); bool and string are type-checked', () => {
  expect(coerceField('entity', 17)).toBe(17)
  expect(() => coerceField('entity', -1)).toThrow(RangeError)
  expect(coerceField('bool', true)).toBe(true)
  expect(() => coerceField('bool', 1)).toThrow(TypeError)
  expect(coerceField('string', 'sword')).toBe('sword')
  expect(() => coerceField('string', 3)).toThrow(TypeError)
  expect(() => coerceField('f32', '1')).toThrow(TypeError)
})

test('defaults: 0 for numbers and entity, false, empty string', () => {
  expect(defaultField('f32')).toBe(0)
  expect(defaultField('entity')).toBe(0)
  expect(defaultField('bool')).toBe(false)
  expect(defaultField('string')).toBe('')
})
