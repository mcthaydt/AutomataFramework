import { z } from '../../lib/zod.ts'
import { LANGUAGES, type Language } from '../content/content.ts'

/** The player's choice of language: one of the six, or `null` for "follow my device". The `language` section of the settings. */
export interface LanguageSettings {
  readonly format: 1
  readonly language: Language | null
}

/** What a new player starts with: no choice made, so the host's language, then the device's, then English. */
export const LANGUAGE_SETTINGS_DEFAULT: LanguageSettings = Object.freeze({ format: 1, language: null })

/**
 * The strict shape of the stored `language` section. A language of ours that a game does not have is a valid value
 * (the same settings may be kept for another game); one that is no language of ours is refused, and the section then
 * starts again from its first values without anything being written over what is stored.
 */
export const LanguageSettingsSchema: z.ZodType<LanguageSettings, LanguageSettings> = z.strictObject({
  format: z.literal(1),
  language: z.enum(LANGUAGES).nullable(),
})
