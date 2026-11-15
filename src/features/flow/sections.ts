// The parts of the player's settings the flow reads: the controls they changed, how loud the sound is and what they chose
// about touch. Opened once, so every screen and every game shares the same three handles.
import {
  type GameAudio,
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

/** The settings, and the three sections of them the flow itself uses (the language is `Locale`'s own). */
export interface Sections {
  readonly settings: Settings
  readonly controls: SettingsHandle<InputSettings>
  readonly sound: SettingsHandle<SoundSettings>
  readonly touch: SettingsHandle<TouchSettings>
}

/** Opens the game's settings in the host's store and makes the three sections. */
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
  }
}

/** Gives the audio the player's volumes now and each time they change. Returns the function that stops it. */
export function wireSound(audio: GameAudio, sound: SettingsHandle<SoundSettings>): () => void {
  audio.setVolumes(sound.get())
  return sound.onChange((volumes) => audio.setVolumes(volumes))
}
