import { z } from '../../lib/zod.ts'

/**
 * The player's two volumes, 0 (silent) to 1 (full), and whether the sound is switched off. The `sound` section of the
 * settings. A switch and not a third volume: with it off the two sliders keep where the player put them, so switching
 * the sound back on brings the same mix. Settings kept before the switch existed have no `muted`, and are not muted.
 */
export interface SoundSettings {
  readonly format: 1
  readonly music: number
  readonly sound: number
  readonly muted?: boolean | undefined
}

/** What a new player starts with: the music a little under the sound effects, which carry the game's news. */
export const SOUND_SETTINGS_DEFAULT: SoundSettings = Object.freeze({ format: 1, music: 0.7, sound: 1 })

const volume = z.number().min(0).max(1)

/** The strict shape of the stored `sound` section. A game's settings screen makes the section from this and the first values. */
export const SoundSettingsSchema: z.ZodType<SoundSettings, SoundSettings> = z.strictObject({
  format: z.literal(1),
  music: volume,
  sound: volume,
  muted: z.boolean().optional(),
})

/** The volumes the speaker is given: both 0 while `muted`, else the player's own. */
export function heardVolumes(settings: SoundSettings): { readonly sound: number; readonly music: number } {
  return settings.muted === true ? { sound: 0, music: 0 } : { sound: settings.sound, music: settings.music }
}
