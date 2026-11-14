import { z } from 'zod'

/** The player's two volumes, 0 (silent) to 1 (full). The `sound` section of the settings. */
export interface SoundSettings {
  readonly format: 1
  readonly music: number
  readonly sound: number
}

/** What a new player starts with: the music a little under the sound effects, which carry the game's news. */
export const SOUND_SETTINGS_DEFAULT: SoundSettings = Object.freeze({ format: 1, music: 0.7, sound: 1 })

const volume = z.number().min(0).max(1)

/** The strict shape of the stored `sound` section. A game's settings screen makes the section from this and the first values. */
export const SoundSettingsSchema: z.ZodType<SoundSettings, SoundSettings> = z.strictObject({
  format: z.literal(1),
  music: volume,
  sound: volume,
})
