// What one page of the sounding game does for its sound, loaded inside a frame by `tests/fixtures/saves/open-page.ts`.
// It builds an audio over the real `webHost()` and the real `webSpeaker`, with no seams, and keeps the volumes in the
// game's settings as a game's own page would. Every method runs in this frame: its own memory, with nothing in common
// with the next page but what the browser stored.
import {
  createAudio,
  SOUND_SETTINGS_DEFAULT,
  type SoundSettings,
  SoundSettingsSchema,
} from '#src/features/audio/audio.ts'
import { openSettings, type SettingsSection } from '#src/features/saves/saves.ts'
import { webHost, webSpeaker } from '#src/features/web/web.ts'
import { loadSoundingGame } from './sounding-game.ts'

/** What the test can ask of one page of the sounding game. Every method runs inside that page. */
export interface AudioPage {
  /** The volumes the audio has now. */
  volumes(): Promise<SoundSettings>
  /** Sets the volumes the way a settings screen does: the audio first, then the stored settings. */
  setVolumes(volumes: SoundSettings): Promise<void>
}

/** The three lines the settings screen will write: the sound section, as the audio feature gives it. */
const sound: SettingsSection<SoundSettings> = {
  name: 'sound',
  schema: SoundSettingsSchema,
  initial: SOUND_SETTINGS_DEFAULT,
}

const host = webHost()
const settings = openSettings({ game: 'fixture-game', store: host.store })
/** Built when first asked, after the settings have been read, so the volumes it starts at are the stored ones. */
const made = (async () => {
  const section = (await settings).section(sound)
  const audio = createAudio({ content: await loadSoundingGame(), speaker: webSpeaker({ host }) })
  audio.setVolumes(section.get())
  return { audio, section }
})()

const page: AudioPage = {
  async volumes() {
    return (await made).audio.volumes()
  },
  async setVolumes(volumes) {
    const { audio, section } = await made
    audio.setVolumes(volumes)
    await section.set(volumes)
  },
}

;(window as unknown as { savesPage: AudioPage }).savesPage = page
// Tells the frame's opener (`open-page.ts`) that the page can be asked things.
parent.postMessage({ savesPage: 'ready' }, '*')
