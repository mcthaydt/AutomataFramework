import { z } from '../../lib/zod.ts'

/** The player's one choice about feel: whether the picture may shake. The `feel` section of the settings. */
export interface FeelSettings {
  readonly format: 1
  /** False: no shake is drawn. Dust, freezes and buzzes are not changed by it. */
  readonly shake: boolean
}

/** The strict shape of the stored `feel` section. A game's settings screen makes the section from this and the first values. */
export const FeelSettingsSchema: z.ZodType<FeelSettings, FeelSettings> = z.strictObject({
  format: z.literal(1),
  shake: z.boolean(),
})

/** What a new player starts with: shake on, unless the device asked for less motion. */
export function feelSettingsFirst(reducedMotion: boolean): FeelSettings {
  return Object.freeze({ format: 1, shake: !reducedMotion })
}

/** What a saved value says, or `feelSettingsFirst(reducedMotion)` for anything that does not read as the section. */
export function feelSettingsOf(saved: unknown, reducedMotion: boolean): FeelSettings {
  const read = FeelSettingsSchema.safeParse(saved)
  return read.success ? read.data : feelSettingsFirst(reducedMotion)
}
