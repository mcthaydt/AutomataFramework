import { expect, test } from 'vitest'
import { instrumentVoices, type PlainNote } from '#src/features/audio/audio.ts'
import library from '#src/features/audio/library/instruments.json' with { type: 'json' }
import { DRUMS, INSTRUMENTS } from '#src/features/content/content.ts'

const note = (change: Partial<PlainNote>): PlainNote => ({
  lane: 'line',
  instrument: 'pluck',
  pitch: 69,
  at: 0,
  ticks: 960,
  volume: 1,
  ...change,
})

test('every instrument and every drum in the file is one the content knows, and the other way round', () => {
  expect(Object.keys(library.instruments).sort()).toEqual(INSTRUMENTS.filter((i) => i !== 'drums').sort())
  expect(Object.keys(library.drums).sort()).toEqual([...DRUMS].sort())
})

test('a pluck rings 0.3 seconds however long it is written, in two layers', () => {
  // 1920 ticks at 120 beats a minute is two seconds.
  const voices = instrumentVoices(note({ ticks: 1920, volume: 0.5 }), 120)
  expect(voices).toEqual([
    { kind: 'tone', wave: 'square', from: 440, to: 440, at: 0, length: 0.3, volume: 0.25 },
    { kind: 'tone', wave: 'triangle', from: 880, to: 880, at: 0, length: 0.3, volume: 0.15 },
  ])
})

test('a note shorter than its ring lasts as long as written', () => {
  // 480 ticks at 240 beats a minute is a quarter of a second.
  expect(instrumentVoices(note({ ticks: 480 }), 240).map((voice) => voice.kind === 'tone' && voice.length)).toEqual([
    0.25, 0.25,
  ])
})

test('an instrument with no ring lasts as long as written', () => {
  // 480 ticks at 60 beats a minute is a second.
  const voices = instrumentVoices(note({ instrument: 'bass', pitch: 45, ticks: 480 }), 60)
  expect(voices.map((voice) => voice.kind === 'tone' && [voice.from, voice.length, voice.volume])).toEqual([
    [110, 1, 1],
    [110, 1, 0.2],
  ])
})

test("a drum hit is the table's voices, each volume times the note's", () => {
  expect(instrumentVoices(note({ instrument: 'drums', pitch: 'snare', ticks: 0, volume: 0.5 }), 120)).toEqual([
    { kind: 'noise', pitch: 1800, at: 0, length: 0.12, volume: 0.4 },
    { kind: 'tone', wave: 'triangle', from: 180, to: 120, at: 0, length: 0.08, volume: 0.25 },
  ])
  const clap = instrumentVoices(note({ instrument: 'drums', pitch: 'clap', ticks: 0 }), 120)
  expect(clap.map((voice) => voice.at)).toEqual([0, 0.015])
})

test('the drums play no pitch', () =>
  expect(instrumentVoices(note({ instrument: 'drums', pitch: 60 }), 120)).toEqual([]))
