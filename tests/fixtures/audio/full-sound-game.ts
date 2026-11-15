// The sounding game with every sound format in it, all in folders: a format 2 song made of loops, a motif, a sound that
// plays the motif, a sound that plays a recording (a WAV the test makes, so no audio file is kept in this repository)
// and a cue list. It is the M1 fixture game underneath, so its sim is the sounding game's, and the sound it adds is the
// only thing that differs.
import { loadRecordings, type Recordings } from '#src/features/audio/audio.ts'
import {
  type CuesFile,
  type GameContent,
  loadGame,
  RECORDING_RATE,
  type SoundFile,
  withFolders,
  writeContent,
  writeRecording,
} from '#src/features/content/content.ts'
import { meadow, songFiles } from './song.ts'

/** Where the recorded sound is, from the game's root. */
export const BLIP_PATH = 'content/sounds/blip.wav'

/** A fifth of a second of a sawtooth, made with whole-number arithmetic so every engine writes the same bytes. */
export const blipBytes = (): Uint8Array<ArrayBuffer> => {
  const samples = new Float32Array(8820)
  for (let i = 0; i < samples.length; i++) samples[i] = ((i % 100) / 50 - 1) * 0.5
  return writeRecording([samples], RECORDING_RATE)
}

const theme: SoundFile = {
  format: 1,
  id: 'theme',
  volume: 0.8,
  voices: [{ kind: 'motif', motif: 'hero-theme', instrument: 'pluck', key: 'C', tempo: 120, at: 0, volume: 1 }],
}

const voice: SoundFile = {
  format: 1,
  id: 'voice',
  volume: 1,
  voices: [{ kind: 'recording', file: BLIP_PATH, from: 0, length: 0.2, speed: 1, at: 0, volume: 1 }],
}

const cues: CuesFile = {
  format: 1,
  id: 'cues',
  cues: [
    { on: 'hero.jumped', do: 'sound', sound: 'theme' },
    { on: 'hero.landed', do: 'sound', sound: 'voice' },
    { on: 'level.started', do: 'music', music: 'meadow' },
  ],
}

/** The game's text files, by path from its root; the sounds and the cues are in folders the project lists. */
export function fullSoundFiles(): Record<string, string> {
  const files = Object.fromEntries(
    Object.entries(songFiles(meadow())).filter((entry): entry is [string, string] => entry[1] !== undefined),
  )
  const toml = withFolders(files['automata.toml'] ?? '', [
    { type: 'sound', folder: 'content/sounds' },
    { type: 'cues', folder: 'content/cues' },
  ])
  return {
    ...files,
    'automata.toml': toml,
    'content/sounds/theme.json': writeContent('sound', theme),
    'content/sounds/voice.json': writeContent('sound', voice),
    'content/cues/cues.json': writeContent('cues', cues),
  }
}

/** The names directly in a folder of `files`, as `loadGame` takes a `list`. */
export const listOf =
  (files: Readonly<Record<string, string>>) =>
  async (folder: string): Promise<readonly string[]> =>
    Object.keys(files)
      .filter((path) => path.startsWith(`${folder}/`) && !path.slice(folder.length + 1).includes('/'))
      .map((path) => path.slice(folder.length + 1))

/** Loads the game and reads its recording. Throws, naming every problem, if either does not work. */
export async function loadFullSoundGame(): Promise<{ content: GameContent; recordings: Recordings }> {
  const files = fullSoundFiles()
  const loaded = await loadGame(async (path) => {
    const text = files[path]
    if (text === undefined) throw new Error(`${path}: no such file`)
    return text
  }, listOf(files))
  if (!loaded.ok)
    throw new Error(`The full sound game did not load:\n${loaded.diagnostics.map((d) => d.message).join('\n')}`)
  const bytes = blipBytes()
  const recordings = await loadRecordings(loaded.value, async (path) => (path === BLIP_PATH ? bytes : undefined))
  return { content: loaded.value, recordings }
}
