// The two choices a player has about the touch controls, kept with the rest of their settings: which thumb walks, and
// whether the device may buzz. Plain data, so an agent or an editor reads and writes the same two words.
import { z } from '../../lib/zod.ts'

/** What a player chose about touch. */
export interface TouchSettings {
  readonly format: 1
  /** False: the left thumb walks and the right one jumps. True: the other way round. */
  readonly swapSides: boolean
  /** Whether the device may buzz when the game says so. */
  readonly vibration: boolean
}

/** Left thumb walks, buzz on. */
export const TOUCH_SETTINGS_DEFAULT: TouchSettings = Object.freeze({
  format: 1,
  swapSides: false,
  vibration: true,
})

export const TouchSettingsSchema: z.ZodType<TouchSettings, TouchSettings> = z.strictObject({
  format: z.literal(1),
  swapSides: z.boolean(),
  vibration: z.boolean(),
})

/** What a saved value says about touch: its two choices, or the defaults for anything that does not read as them. */
export function touchSettingsOf(saved: unknown): TouchSettings {
  const parsed = TouchSettingsSchema.safeParse(saved)
  return parsed.success ? parsed.data : TOUCH_SETTINGS_DEFAULT
}
