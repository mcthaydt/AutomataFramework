import { expect, test } from 'vitest'
import {
  type GameContent,
  RECORDING_RATE,
  readRecording,
  recordingPaths,
  recordingProblems,
  type SoundFile,
  writeRecording,
} from '#src/features/content/content.ts'
import { encodeWav } from '#src/lib/wav.ts'

/** A sound of one recording voice. */
const sound = (id: string, file: string, voice: Record<string, number> = {}): SoundFile => ({
  format: 1,
  id,
  volume: 1,
  voices: [{ kind: 'recording', file, from: 0, length: 1, speed: 1, at: 0, volume: 1, ...voice }],
})

/** A game that is only its sounds, which is all `recordingProblems` reads. */
const gameOf = (...sounds: SoundFile[]): GameContent =>
  ({
    sounds: Object.fromEntries(sounds.map((s) => [s.id, s])),
    project: {
      content: sounds.map((s) => ({ type: 'sound', path: `content/sounds/${s.id}.json` })),
    },
  }) as unknown as GameContent

/** A recording file of `seconds` seconds of a quiet tone. */
const seconds = (n: number): Uint8Array =>
  encodeWav(new Float32Array(Math.round(n * RECORDING_RATE)).fill(0.25), RECORDING_RATE)

const readOver =
  (files: Record<string, Uint8Array | undefined>) =>
  async (path: string): Promise<Uint8Array | undefined> =>
    files[path]

test('audio is written as one channel of 44100 samples a second', () => {
  const bytes = writeRecording([new Float32Array([0.5, 0.5, 0.5, 0.5])], RECORDING_RATE)
  const read = readRecording(bytes, 'door.wav')
  expect(read.ok).toBe(true)
  if (read.ok) expect(read.value.samples.length).toBe(4)
})

test('two channels are mixed to their mean', () => {
  const bytes = writeRecording([new Float32Array([1, 0]), new Float32Array([0, 0])], RECORDING_RATE)
  const read = readRecording(bytes, 'door.wav')
  expect(read.ok && read.value.samples[0]).toBeCloseTo(0.5, 3)
})

test('audio at another rate is resampled, the length rounded down', () => {
  const bytes = writeRecording([new Float32Array(22050).fill(0.5)], 22050)
  const read = readRecording(bytes, 'door.wav')
  expect(read.ok && read.value.samples.length).toBe(44100)
  expect(read.ok && read.value.seconds).toBe(1)
})

test('ten seconds is the most, and an empty recording is refused', () => {
  expect(() => writeRecording([new Float32Array(10.5 * 1000)], 1000)).toThrow(
    'A recording can be at most 10 seconds. This one is 10.5.',
  )
  expect(() => writeRecording([new Float32Array(10 * 1000)], 1000)).not.toThrow()
  expect(() => writeRecording([], 44100)).toThrow('A recording needs some sound in it.')
  expect(() => writeRecording([new Float32Array(0)], 44100)).toThrow('A recording needs some sound in it.')
})

test('a file at another rate is not a recording this game can play', () => {
  const slow = encodeWav(new Float32Array(10), 8000)
  const read = readRecording(slow, 'door.wav')
  expect(read).toEqual({
    ok: false,
    message:
      'door.wav is not a recording this game can play. Save it as WAV: one channel, 16-bit, 44100 samples a second.',
  })
  expect(readRecording(new Uint8Array([1, 2, 3]), 'door.wav').ok).toBe(false)
})

test('a recording over ten seconds says how long it is', () => {
  expect(readRecording(seconds(12), 'door.wav')).toEqual({
    ok: false,
    message: 'door.wav is 12 seconds long. A recording can be at most 10 seconds.',
  })
})

test('the recordings a game names, each once', () => {
  const game = gameOf(sound('a', 'content/sounds/door.wav'), sound('b', 'content/sounds/door.wav'))
  expect(recordingPaths(game)).toEqual(['content/sounds/door.wav'])
})

test('a recording that is not there', async () => {
  const problems = await recordingProblems(gameOf(sound('door', 'content/sounds/door.wav')), readOver({}))
  expect(problems).toEqual([
    {
      file: 'content/sounds/door.json',
      path: 'voices[0].file',
      message: 'There is no recording at "content/sounds/door.wav". Put one there, or take this voice out.',
    },
  ])
})

test('a read that rejects counts as a missing file', async () => {
  const problems = await recordingProblems(gameOf(sound('door', 'content/sounds/door.wav')), async () => {
    throw new Error('no such file')
  })
  expect(problems.map((p) => p.path)).toEqual(['voices[0].file'])
})

test('a refused file is said once, however many voices play it', async () => {
  const two: SoundFile = {
    ...sound('door', 'content/sounds/door.wav'),
    voices: [
      { kind: 'recording', file: 'content/sounds/door.wav', from: 0, length: 1, speed: 1, at: 0, volume: 1 },
      { kind: 'recording', file: 'content/sounds/door.wav', from: 0, length: 1, speed: 1, at: 2, volume: 1 },
    ],
  }
  const problems = await recordingProblems(gameOf(two), readOver({ 'content/sounds/door.wav': seconds(12) }))
  expect(problems).toEqual([
    {
      file: 'content/sounds/door.wav',
      path: '',
      message: 'door.wav is 12 seconds long. A recording can be at most 10 seconds.',
    },
  ])
})

test('a voice that plays past the end of its file', async () => {
  const problems = await recordingProblems(
    gameOf(sound('door', 'content/sounds/door.wav', { from: 0.5, length: 0.7 })),
    readOver({ 'content/sounds/door.wav': seconds(0.8) }),
  )
  expect(problems).toEqual([
    {
      file: 'content/sounds/door.json',
      path: 'voices[0]',
      message:
        'This voice plays to 1.2 seconds of door.wav, which is 0.8 seconds long. Lower "from", "length" or "speed".',
    },
  ])
})

test('a voice inside its file is fine', async () => {
  const problems = await recordingProblems(
    gameOf(sound('door', 'content/sounds/door.wav', { length: 0.4, speed: 2 })),
    readOver({ 'content/sounds/door.wav': seconds(0.8) }),
  )
  expect(problems).toEqual([])
})

test('a game with no recording reads nothing', async () => {
  let reads = 0
  const none: SoundFile = {
    format: 1,
    id: 'beep',
    volume: 1,
    voices: [{ kind: 'noise', pitch: 800, at: 0, length: 0.1, volume: 1 }],
  }
  await recordingProblems(gameOf(none), async () => {
    reads++
    return undefined
  })
  expect(reads).toBe(0)
})
