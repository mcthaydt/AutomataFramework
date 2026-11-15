// The two touch choices a player has, as plain data.
import { expect, test } from 'vitest'
import { TOUCH_SETTINGS_DEFAULT, TouchSettingsSchema, touchSettingsOf } from '#src/features/input/input.ts'

test('the default is the left thumb walking, with buzz on, and passes its own schema', () => {
  expect(TOUCH_SETTINGS_DEFAULT).toEqual({ format: 1, swapSides: false, vibration: true })
  expect(TouchSettingsSchema.safeParse(TOUCH_SETTINGS_DEFAULT).success).toBe(true)
})

test('an unknown key is refused, and so is a missing one', () => {
  expect(TouchSettingsSchema.safeParse({ ...TOUCH_SETTINGS_DEFAULT, extra: 1 }).success).toBe(false)
  expect(TouchSettingsSchema.safeParse({ format: 1, swapSides: true }).success).toBe(false)
})

test('what was saved is what is read; anything else is the default', () => {
  const saved = { format: 1, swapSides: true, vibration: false }
  expect(touchSettingsOf(saved)).toEqual(saved)
  expect(touchSettingsOf(undefined)).toBe(TOUCH_SETTINGS_DEFAULT)
  expect(touchSettingsOf('left')).toBe(TOUCH_SETTINGS_DEFAULT)
  expect(touchSettingsOf({ ...saved, swapSides: 'yes' })).toBe(TOUCH_SETTINGS_DEFAULT)
})
