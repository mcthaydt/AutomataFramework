// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/shared/define/fields.ts
// Component field types. Every write goes through coerceField so stored values are canonical.

export const FIELD_TYPES = ['f32', 'f64', 'i32', 'u32', 'bool', 'entity', 'string'] as const
/**
 * A component field's type: `f32`, `f64`, `i32`, `u32`, `bool`, `entity` (a StableId, stored as a `u32`) or
 * `string`.
 */
export type FieldType = (typeof FIELD_TYPES)[number]
/** A component's fields, by name. */
export type FieldSchema = Readonly<Record<string, FieldType>>
/**
 * The JavaScript type a field holds: `boolean` for `bool`, `string` for `string`, `number` for every other
 * type.
 */
export type FieldValue<T extends FieldType> = T extends 'bool'
  ? boolean
  : T extends 'string'
    ? string
    : number
/** The writable record of values a `FieldSchema` describes. */
export type FieldValues<S extends FieldSchema> = { -readonly [K in keyof S]: FieldValue<S[K]> }

const finite = (type: FieldType, v: unknown): number => {
  if (typeof v !== 'number') throw new TypeError(`${type} field expects a number, got ${typeof v}`)
  // NaN's byte pattern is engine-chosen when written to a buffer, so it can't appear in a canonical snapshot.
  if (!Number.isFinite(v)) throw new RangeError(`${type} field must be finite, got ${v}`)
  return v
}

const intIn = (type: FieldType, v: unknown, min: number, max: number): number => {
  const n = finite(type, v)
  if (!Number.isInteger(n) || n < min || n > max) throw new RangeError(`${type} field out of range: ${n}`)
  return n
}

export function coerceField(type: FieldType, value: unknown): number | boolean | string {
  switch (type) {
    case 'f32': {
      const r = Math.fround(finite(type, value))
      if (!Number.isFinite(r)) throw new RangeError(`f32 field out of range: ${value}`)
      return r
    }
    case 'f64':
      return finite(type, value)
    case 'i32':
      return intIn(type, value, -2147483648, 2147483647)
    case 'u32':
    case 'entity':
      return intIn(type, value, 0, 4294967295)
    case 'bool':
      if (typeof value !== 'boolean') throw new TypeError(`bool field expects a boolean, got ${typeof value}`)
      return value
    case 'string':
      if (typeof value !== 'string') throw new TypeError(`string field expects a string, got ${typeof value}`)
      return value
  }
}

export function defaultField(type: FieldType): number | boolean | string {
  return type === 'bool' ? false : type === 'string' ? '' : 0
}
