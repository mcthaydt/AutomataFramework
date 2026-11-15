// The parts of the player's settings the flow reads: the controls they changed, how loud the sound is and what they chose
// about touch. Opened once, so every screen and every game shares the same three handles.
import {
  type GameAudio,
  heardVolumes,
  SOUND_SETTINGS_DEFAULT,
  type SoundSettings,
  SoundSettingsSchema,
} from '../audio/audio.ts'
import type { Host } from '../host/host.ts'
import {
  INPUT_SETTINGS_DEFAULT,
  type InputSettings,
  InputSettingsSchema,
  TOUCH_SETTINGS_DEFAULT,
  type TouchSettings,
  TouchSettingsSchema,
} from '../input/input.ts'
import { openSettings, type Settings, type SettingsHandle } from '../saves/saves.ts'
import { RECORDS_DEFAULT, type Records, RecordsSchema } from './records.ts'

/** The settings, and the four sections of them the flow itself uses (the language is `Locale`'s own). */
export interface Sections {
  readonly settings: Settings
  readonly controls: SettingsHandle<InputSettings>
  readonly sound: SettingsHandle<SoundSettings>
  readonly touch: SettingsHandle<TouchSettings>
  readonly records: SettingsHandle<Records>
}

/** Opens the game's settings in the host's store and makes the four sections. */
export async function openSections(options: {
  readonly game: string
  readonly host: Host
}): Promise<Sections> {
  const settings = await openSettings({ game: options.game, store: options.host.store })
  return {
    settings,
    controls: settings.section({
      name: 'controls',
      schema: InputSettingsSchema,
      initial: INPUT_SETTINGS_DEFAULT,
    }),
    sound: settings.section({
      name: 'sound',
      schema: SoundSettingsSchema,
      initial: SOUND_SETTINGS_DEFAULT,
    }),
    touch: settings.section({
      name: 'touch',
      schema: TouchSettingsSchema,
      initial: TOUCH_SETTINGS_DEFAULT,
    }),
    records: settings.section({
      name: 'records',
      schema: RecordsSchema,
      initial: RECORDS_DEFAULT,
    }),
  }
}

/**
 * Gives the audio what the player hears now and each time it changes: their volumes, or silence while the sound is
 * switched off. Returns the function that stops it.
 */
export function wireSound(audio: GameAudio, sound: SettingsHandle<SoundSettings>): () => void {
  const give = (settings: SoundSettings): void => audio.setVolumes({ format: 1, ...heardVolumes(settings) })
  give(sound.get())
  return sound.onChange(give)
}
