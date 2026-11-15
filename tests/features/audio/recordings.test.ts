import { expect, test, vi } from 'vitest'
import { loadRecordings, RecordingError } from '#src/features/audio/audio.ts'
import { type GameContent, RECORDING_RATE, type SoundFile } from '#src/features/content/content.ts'
import { encodeWav } from '#src/lib/wav.ts'

const sound = (id: string, file: string): SoundFile => ({
  format: 1,
  id,
  volume: 1,
  voices: [{ kind: 'recording', file, from: 0, length: 0.5, speed: 1, at: 0, volume: 1 }],
})

/** A game that is only its sounds, which is all loading recordings reads. */
const gameOf = (...sounds: SoundFile[]): GameContent =>
  ({
    sounds: Object.fromEntries(sounds.map((s) => [s.id, s])),
    project: { content: sounds.map((s) => ({ type: 'sound', path: `content/sounds/${s.id}.json` })) },
  }) as unknown as GameContent

/** A recording file of `seconds` seconds, made without the checks of `writeRecording`, so one can be too long. */
const seconds = (n: number): Uint8Array =>
  encodeWav(new Float32Array(Math.round(n * RECORDING_RATE)).fill(0.25), RECORDING_RATE)

test('two sounds that name one file read it once', async () => {
  const read = vi.fn(async () => seconds(1))
  const loaded = await loadRecordings(gameOf(sound('a', 'door.wav'), sound('b', 'door.wav')), read)
  expect(read).toHaveBeenCalledTimes(1)
  expect([...loaded.keys()]).toEqual(['door.wav'])
  expect(loaded.get('door.wav')?.seconds).toBe(1)
})

test('every file the sounds name is read', async () => {
  const files: Record<string, Uint8Array> = { 'a.wav': seconds(1), 'b.wav': seconds(2) }
  const game = gameOf(sound('a', 'a.wav'), sound('b', 'b.wav'))
  const loaded = await loadRecordings(game, async (path) => files[path])
  expect([...loaded.keys()]).toEqual(['a.wav', 'b.wav'])
})

test('a game with no recording never reads', async () => {
  const read = vi.fn(async () => undefined)
  const loaded = await loadRecordings(gameOf(), read)
  expect(loaded.size).toBe(0)
  expect(read).not.toHaveBeenCalled()
})

test('a file that is too long rejects with the sentence that says how long a recording can be', async () => {
  const error = await loadRecordings(gameOf(sound('a', 'long.wav')), async () => seconds(11)).then(
    () => undefined,
    (reason: unknown) => reason,
  )
  expect(error).toBeInstanceOf(RecordingError)
  expect((error as RecordingError).message).toBe(
    'long.wav is 11 seconds long. A recording can be at most 10 seconds.',
  )
})

test('a file that is not there rejects, and the error carries every problem', async () => {
  const error = await loadRecordings(
    gameOf(sound('a', 'gone.wav'), sound('b', 'also-gone.wav')),
    async () => undefined,
  ).then(
    () => undefined,
    (reason: unknown) => reason,
  )
  expect(error).toBeInstanceOf(RecordingError)
  const diagnostics = (error as RecordingError).diagnostics
  expect(diagnostics).toHaveLength(2)
  expect(diagnostics[0]?.message).toBe(
    'There is no recording at "gone.wav". Put one there, or take this voice out.',
  )
})
