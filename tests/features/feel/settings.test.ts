import { expect, test } from 'vitest'
import { FeelSettingsSchema, feelSettingsFirst, feelSettingsOf } from '#src/features/feel/feel.ts'
import { canonicalJson } from '#src/lib/canonical.ts'

test('a new player has shake on', () => expect(feelSettingsFirst(false)).toEqual({ format: 1, shake: true }))

test('a device that asks for less motion starts with shake off', () =>
  expect(feelSettingsFirst(true).shake).toBe(false))

test('a saved choice wins whatever the device says', () => {
  expect(feelSettingsOf({ format: 1, shake: true }, true).shake).toBe(true)
  expect(feelSettingsOf({ format: 1, shake: false }, false).shake).toBe(false)
})

test('anything that does not read as the section is the first values', () => {
  const unread = [undefined, null, {}, { format: 1, shake: 'yes' }, { format: 1, shake: true, extra: 1 }, 7]
  for (const saved of unread) {
    expect(feelSettingsOf(saved, false)).toEqual({ format: 1, shake: true })
    expect(feelSettingsOf(saved, true)).toEqual({ format: 1, shake: false })
  }
})

test('the schema takes the first values and refuses a missing key, an unknown key and another format', () => {
  const ok = (value: unknown): boolean => FeelSettingsSchema.safeParse(value).success
  expect(ok(feelSettingsFirst(false))).toBe(true)
  expect(ok({ format: 1 })).toBe(false)
  expect(ok({ format: 2, shake: true })).toBe(false)
  expect(ok({ format: 1, shake: true, dust: false })).toBe(false)
})

test('the stored form is {"format":1,"shake":true}', () =>
  expect(canonicalJson(feelSettingsFirst(false))).toBe('{"format":1,"shake":true}'))
