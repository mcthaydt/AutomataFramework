// The audio feature's entry: what a game sounds like, played when the sim's events say so. It is handed a step's events
// and never the sim, so it has nothing to change; it plays through a `Speaker`, which a page makes with Web Audio
// (`webSpeaker`, in the web feature) and a test makes with `testSpeaker`.
export { hertzOf } from './notes.ts'
export { type Score, type ScoreNote, scoreOf } from './score.ts'
export { SOUND_SETTINGS_DEFAULT, type SoundSettings, SoundSettingsSchema } from './settings.ts'
export type { Bus, Speaker, SpeakerState } from './speaker.ts'
export { type PlayedVoice, type TestSpeaker, testSpeaker } from './test-speaker.ts'
