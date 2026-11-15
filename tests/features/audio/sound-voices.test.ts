import { expect, test } from 'vitest'
import { playSound, soundSeconds, soundVoices, testSpeaker } from '#src/features/audio/audio.ts'
import type { MotifVoice, SoundFile, SoundVoice } from '#src/features/content/content.ts'
import { songParts } from '../../fixtures/audio/song.ts'

const sound = (voices: SoundVoice[], volume = 1): SoundFile => ({ format: 1, id: 'tune', volume, voices })

const theme = (patch: Partial<MotifVoice> = {}): MotifVoice => ({
  kind: 'motif',
  motif: 'hero-theme',
  instrument: 'pluck',
  key: 'C',
  tempo: 120,
  at: 0,
  volume: 1,
  ...patch,
})

/** The distinct times the voices start, lowest first. */
const starts = (voices: readonly { readonly at: number }[]): number[] =>
  [...new Set(voices.map((voice) => voice.at))].sort((a, b) => a - b)

test('a motif voice is its notes: four groups of voices, at 0, 0.5, 0.75 and 1 second at 120 beats a minute', () => {
  const voices = soundVoices(sound([theme()]), songParts())
  expect(voices.every((voice) => voice.kind === 'tone')).toBe(true)
  const times = starts(voices)
  expect(times).toHaveLength(4)
  for (const [i, time] of [0, 0.5, 0.75, 1].entries()) expect(times[i]).toBeCloseTo(time, 9)
})

test("the voice's own at moves every note", () => {
  const times = starts(soundVoices(sound([theme({ at: 0.25 })]), songParts()))
  for (const [i, time] of [0.25, 0.75, 1, 1.25].entries()) expect(times[i]).toBeCloseTo(time, 9)
})

test("the voice's volume and the sound's are multiplied", () => {
  const loud = soundVoices(sound([theme()]), songParts())
  const soft = soundVoices(sound([theme({ volume: 0.5 })], 0.5), songParts())
  expect(soft).toHaveLength(loud.length)
  for (const [i, voice] of soft.entries()) expect(voice.volume).toBeCloseTo((loud[i]?.volume ?? 0) * 0.25, 9)
})

test("a motif's changes are heard: slower is longer, shifted is higher", () => {
  const plain = starts(soundVoices(sound([theme()]), songParts()))
  const slow = starts(soundVoices(sound([theme({ speed: 0.5 })]), songParts()))
  expect(slow[3]).toBeCloseTo((plain[3] ?? 0) * 2, 9)
  const first = (patch: Partial<MotifVoice>): number => {
    const voice = soundVoices(sound([theme(patch)]), songParts())[0]
    return voice?.kind === 'tone' ? voice.from : 0
  }
  expect(first({ shift: 2 })).toBeGreaterThan(first({}))
})

test('a tone, a hiss and a recording pass through with the sound volume times theirs', () => {
  const recording: SoundVoice = {
    kind: 'recording',
    file: 'a.wav',
    from: 0.1,
    length: 0.5,
    speed: 2,
    at: 0.2,
    volume: 0.5,
  }
  const hiss: SoundVoice = { kind: 'noise', pitch: 1000, at: 0, length: 0.1, volume: 1 }
  const voices = soundVoices(sound([recording, hiss], 0.5), {})
  expect(voices).toEqual([
    { ...recording, volume: 0.25 },
    { ...hiss, volume: 0.5 },
  ])
})

test('a motif the parts do not have is said in plain words', () => {
  expect(() => soundVoices(sound([theme({ motif: 'nope' })]), songParts())).toThrow(
    'The sound "tune" uses a motif called "nope", which this game does not have.',
  )
})

test('a sound lasts until its last voice ends', () => {
  const tone: SoundVoice = { kind: 'tone', wave: 'sine', from: 440, to: 440, at: 0.2, length: 0.3, volume: 1 }
  expect(soundSeconds(sound([tone]), {})).toBeCloseTo(0.5, 9)
  const recording: SoundVoice = {
    kind: 'recording',
    file: 'a.wav',
    from: 0,
    length: 2,
    speed: 1,
    at: 0.5,
    volume: 1,
  }
  expect(soundSeconds(sound([tone, recording]), {})).toBeCloseTo(2.5, 9)
  expect(soundSeconds(sound([theme()]), songParts())).toBeGreaterThan(1)
})

test('playSound hands over every voice, now, on the bus; nothing while the speaker waits', () => {
  const speaker = testSpeaker()
  playSound(speaker, 'sound', sound([theme()]), songParts())
  expect(speaker.played).toEqual([])
  speaker.tap()
  speaker.advance(2)
  playSound(speaker, 'music', sound([theme()]), songParts())
  const voices = soundVoices(sound([theme()]), songParts())
  expect(speaker.played).toHaveLength(voices.length)
  expect(speaker.played.every((p) => p.bus === 'music' && p.when === 2)).toBe(true)
  expect(speaker.played.map((p) => p.voice)).toEqual(voices)
})
