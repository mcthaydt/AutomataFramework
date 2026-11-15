import { expect, test } from 'vitest'
import { heardVolumes, SOUND_SETTINGS_DEFAULT, SoundSettingsSchema } from '#src/features/audio/audio.ts'
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

test('sound settings kept without muted still read, and are not muted', () => {
  const kept = SoundSettingsSchema.safeParse({ format: 1, music: 0.4, sound: 0.9 })
  expect(kept.success).toBe(true)
  expect(kept.success && heardVolumes(kept.data)).toEqual({ sound: 0.9, music: 0.4 })
  expect(heardVolumes(SOUND_SETTINGS_DEFAULT)).toEqual({ sound: 1, music: 0.7 })
})

test('muted gives 0 and 0, and the sliders keep their numbers', () => {
  const muted = { format: 1, music: 0.4, sound: 0.9, muted: true } as const
  expect(SoundSettingsSchema.safeParse(muted).success).toBe(true)
  expect(heardVolumes(muted)).toEqual({ sound: 0, music: 0 })
  expect(heardVolumes({ ...muted, muted: false })).toEqual({ sound: 0.9, music: 0.4 })
  expect(muted.music).toBe(0.4)
  expect(muted.sound).toBe(0.9)
})

test('muted must be true or false', () =>
  expect(SoundSettingsSchema.safeParse({ format: 1, music: 0.4, sound: 0.9, muted: 'yes' }).success).toBe(false))
