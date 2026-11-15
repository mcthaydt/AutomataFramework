import { expect, test } from 'vitest'
import { SOUND_SETTINGS_DEFAULT, SoundSettingsSchema } from '#src/features/audio/audio.ts'
import { canonicalJson } from '#src/lib/canonical.ts'

test('the first values are music 0.7 and sound 1, and frozen', () => {
  expect(SOUND_SETTINGS_DEFAULT).toEqual({ format: 1, music: 0.7, sound: 1 })
  expect(Object.isFrozen(SOUND_SETTINGS_DEFAULT)).toBe(true)
})

test('the schema takes the first values and refuses a volume under 0, over 1, a missing one and an unknown key', () => {
  const ok = (value: unknown): boolean => SoundSettingsSchema.safeParse(value).success
  expect(ok(SOUND_SETTINGS_DEFAULT)).toBe(true)
  expect(ok({ format: 1, music: 0, sound: 1 })).toBe(true)
  expect(ok({ format: 1, music: -0.1, sound: 1 })).toBe(false)
  expect(ok({ format: 1, music: 0.5, sound: 1.1 })).toBe(false)
  expect(ok({ format: 1, music: 0.5 })).toBe(false)
  expect(ok({ format: 1, music: 0.5, sound: 1, mute: true })).toBe(false)
  expect(ok({ format: 2, music: 0.5, sound: 1 })).toBe(false)
  expect(ok({ format: 1, music: 'loud', sound: 1 })).toBe(false)
})

test('the stored form is {"format":1,"music":0.7,"sound":1}', () => {
  expect(canonicalJson(SOUND_SETTINGS_DEFAULT)).toBe('{"format":1,"music":0.7,"sound":1}')
})
