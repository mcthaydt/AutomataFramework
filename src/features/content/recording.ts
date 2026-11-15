// A recorded sound: a WAV file a sound's `recording` voice plays. This file writes one from audio a page recorded or
// decoded, reads one back, and judges every recording a game uses against the limits, in plain words.
import { decodeWav, encodeWav } from '../../lib/wav.ts'
import type { Diagnostic } from './diagnostics.ts'
import type { GameContent } from './load.ts'
import { PROJECT_FILE } from './project.ts'
import type { RecordingVoice } from './sound.ts'

/** Samples a second in every recording file. */
export const RECORDING_RATE = 44100
/** The longest a recording can be, in seconds. */
export const RECORDING_MAX_SECONDS = 10
/** The biggest one recording file can be: 1 MB. */
export const RECORDING_MAX_BYTES = 1048576
/** The most a game's recordings can come to together: 20 MB. */
export const RECORDINGS_MAX_BYTES = 20971520

/** A recording file once read. */
export interface Recording {
  readonly seconds: number
  readonly samples: Float32Array
}

/** A number for a sentence: one decimal place when it is not whole (`10.5`, `12`). */
const shown = (n: number): string => String(Math.round(n * 10) / 10)

/** The name of a file in the game, without the folders (`door.wav`). */
const nameOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1)

/**
 * Decoded audio as a recording file's bytes: the channels mixed to one (their mean), resampled to 44 100 samples a
 * second by straight lines between samples. The new length is rounded down, so ten seconds of input is at most 441 000
 * samples and never over the limit. Throws a `RangeError` in plain words when it is over 10 seconds or empty.
 */
export function writeRecording(
  channels: readonly Float32Array[],
  sampleRate: number,
): Uint8Array<ArrayBuffer> {
  if (!(sampleRate > 0) || !Number.isFinite(sampleRate))
    throw new RangeError('The sample rate of a recording must be a number above 0.')
  const length = Math.min(...channels.map((channel) => channel.length))
  if (channels.length === 0 || length === 0) throw new RangeError('A recording needs some sound in it.')
  if (length > RECORDING_MAX_SECONDS * sampleRate)
    throw new RangeError(
      `A recording can be at most ${RECORDING_MAX_SECONDS} seconds. This one is ${shown(length / sampleRate)}.`,
    )
  const mixed = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    let sum = 0
    for (const channel of channels) sum += channel[i] ?? 0
    mixed[i] = sum / channels.length
  }
  if (sampleRate === RECORDING_RATE) return encodeWav(mixed, RECORDING_RATE)
  const count = Math.floor((length * RECORDING_RATE) / sampleRate)
  const out = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const place = (i * sampleRate) / RECORDING_RATE
    const before = Math.floor(place)
    const a = mixed[before] ?? 0
    const b = mixed[Math.min(before + 1, length - 1)] ?? a
    out[i] = a + (b - a) * (place - before)
  }
  return encodeWav(out, RECORDING_RATE)
}

/** A recording file's bytes, read, or the one sentence that says what is wrong with them. `name` is for the words. */
export function readRecording(
  bytes: Uint8Array,
  name: string,
): { readonly ok: true; readonly value: Recording } | { readonly ok: false; readonly message: string } {
  const wav = decodeWav(bytes)
  if (wav === undefined || wav.channels !== 1 || wav.bits !== 16 || wav.sampleRate !== RECORDING_RATE)
    return {
      ok: false,
      message: `${name} is not a recording this game can play. Save it as WAV: one channel, 16-bit, ${RECORDING_RATE} samples a second.`,
    }
  const seconds = wav.samples.length / RECORDING_RATE
  if (seconds > RECORDING_MAX_SECONDS)
    return {
      ok: false,
      message: `${name} is ${shown(seconds)} seconds long. A recording can be at most ${RECORDING_MAX_SECONDS} seconds.`,
    }
  if (bytes.length > RECORDING_MAX_BYTES)
    return {
      ok: false,
      message: `${name} is ${shown(bytes.length / RECORDING_MAX_BYTES)} MB. A recording can be at most 1 MB.`,
    }
  return { ok: true, value: { seconds, samples: wav.samples } }
}

/** Every recording file a game's sounds name, each once, in the order the sounds are listed. */
export function recordingPaths(content: GameContent): string[] {
  const paths = new Set<string>()
  for (const sound of Object.values(content.sounds ?? {}))
    for (const voice of sound.voices) if (voice.kind === 'recording') paths.add(voice.file)
  return [...paths]
}

/** Where a sound's own file is, for a problem to name: the project's path for it, else the usual place. */
function soundPath(content: GameContent, id: string): string {
  const listed = content.project.content.find(
    (ref) => ref.type === 'sound' && nameOf(ref.path) === `${id}.json`,
  )
  return listed?.path ?? `content/sounds/${id}.json`
}

/**
 * One problem for each recording that is missing or refused, each voice that plays past its file's end, and one when the
 * game's recordings together are over 20 MB. `read` gives a file's bytes, or rejects or gives `undefined` for a file
 * that is not there.
 */
export async function recordingProblems(
  content: GameContent,
  read: (path: string) => Promise<Uint8Array | undefined>,
): Promise<Diagnostic[]> {
  const paths = recordingPaths(content)
  const bytes = new Map<string, Uint8Array | undefined>()
  await Promise.all(
    paths.map(async (path) => {
      try {
        bytes.set(path, await read(path))
      } catch {
        bytes.set(path, undefined)
      }
    }),
  )
  const problems: Diagnostic[] = []
  const judged = new Map<string, ReturnType<typeof readRecording>>()
  for (const [id, sound] of Object.entries(content.sounds ?? {})) {
    for (const [i, voice] of sound.voices.entries()) {
      if (voice.kind !== 'recording') continue
      const file = soundPath(content, id)
      const data = bytes.get(voice.file)
      if (data === undefined) {
        problems.push({
          file,
          path: `voices[${i}].file`,
          message: `There is no recording at "${voice.file}". Put one there, or take this voice out.`,
        })
        continue
      }
      let result = judged.get(voice.file)
      if (result === undefined) {
        result = readRecording(data, nameOf(voice.file))
        judged.set(voice.file, result)
        if (!result.ok) problems.push({ file: voice.file, path: '', message: result.message })
      }
      if (result.ok) reachProblem(problems, file, i, voice, result.value.seconds)
    }
  }
  let total = 0
  for (const data of bytes.values()) total += data?.length ?? 0
  if (total > RECORDINGS_MAX_BYTES)
    problems.push({
      file: PROJECT_FILE,
      path: '',
      message: `This game's recordings are ${shown(total / RECORDING_MAX_BYTES)} MB together. A game can have at most 20 MB.`,
    })
  return problems
}

/** A voice that plays to a time past the end of its file: said once, with both times. */
function reachProblem(
  problems: Diagnostic[],
  file: string,
  i: number,
  voice: RecordingVoice,
  seconds: number,
): void {
  const reaches = voice.from + voice.length * voice.speed
  if (reaches <= seconds + 1e-9) return
  // Rounded so that the two numbers in the sentence never read the same: the reach up, the file's length down.
  problems.push({
    file,
    path: `voices[${i}]`,
    message: `This voice plays to ${Math.ceil(reaches * 10) / 10} seconds of ${nameOf(voice.file)}, which is ${Math.floor(seconds * 10) / 10} seconds long. Lower "from", "length" or "speed".`,
  })
}
