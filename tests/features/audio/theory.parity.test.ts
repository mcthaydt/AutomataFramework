// Keys, chords and steps are tables and whole numbers, so a song's notes are the same in Node and in every browser.
import { expect, test } from 'vitest'
import {
  chordName,
  chordOf,
  hertzOf,
  hertzOfPitch,
  keyRoot,
  noteName,
  pitchOf,
  scaleOf,
  stepOffset,
} from '#src/features/audio/audio.ts'
import { KEYS } from '#src/features/content/content.ts'

test('every key has its root, a note of the octave', () => {
  expect(KEYS.map((key) => keyRoot(key))).toEqual([0, 1, 1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11])
})

test('the scales of the two modes', () => {
  expect(scaleOf('major')).toEqual([0, 2, 4, 5, 7, 9, 11])
  expect(scaleOf('minor')).toEqual([0, 2, 3, 5, 7, 8, 10])
})

test('the chords of C major have the right roots and notes', () => {
  const chords = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'].map((numeral) => chordOf(numeral, 'C', 'major'))
  expect(chords.map((chord) => chord.root)).toEqual([0, 2, 4, 5, 7, 9, 11])
  expect(chords.map((chord) => chord.tones)).toEqual([
    [0, 4, 7],
    [0, 3, 7],
    [0, 3, 7],
    [0, 4, 7],
    [0, 4, 7],
    [0, 3, 7],
    [0, 3, 6],
  ])
})

test('the chords of A minor take their roots from the minor scale', () => {
  expect(['i', 'III', 'VII'].map((numeral) => chordOf(numeral, 'A', 'minor').root)).toEqual([9, 0, 7])
})

test('a seventh adds ten semitones, and a sus4 puts the third on the fourth', () => {
  expect(chordOf('V7', 'C', 'major').tones).toEqual([0, 4, 7, 10])
  expect(chordOf('ii7', 'C', 'major').tones).toEqual([0, 3, 7, 10])
  expect(chordOf('Isus4', 'C', 'major').tones).toEqual([0, 5, 7])
})

test('a step of a scale counts from the first note, an octave at 8', () => {
  const major = scaleOf('major')
  expect(['1', '3', '5', '8', 'b7', '#4', '15'].map((step) => stepOffset(major, step))).toEqual([
    0, 4, 7, 12, 10, 6, 24,
  ])
  expect(stepOffset(major, 5)).toBe(7)
})

test("a chord's own scale puts step 3 on its third", () => {
  for (const [numeral, third] of [
    ['I', 4],
    ['vi', 3],
    ['vii°', 3],
    ['IVsus4', 4],
  ] as const)
    expect(stepOffset(chordOf(numeral, 'C', 'major').scale, 3), numeral).toBe(third)
  // A diminished chord's fifth is lowered, and a seventh chord's step 7 is its own seventh.
  expect(stepOffset(chordOf('vii°', 'C', 'major').scale, 5)).toBe(6)
  expect(stepOffset(chordOf('V7', 'C', 'major').scale, 7)).toBe(10)
})

test('a chord is named as a person says it', () => {
  expect(chordName('vi', 'C', 'major')).toBe('Am')
  expect(chordName('V7', 'C', 'major')).toBe('G7')
  expect(chordName('vii°', 'C', 'major')).toBe('Bdim')
  expect(chordName('IVsus4', 'C', 'major')).toBe('Fsus4')
  expect(chordName('I', 'C', 'major')).toBe('C')
  expect(chordName('IV', 'Db', 'major')).toBe('Gb')
  expect(chordName('V', 'D', 'major')).toBe('A')
  expect(chordName('IV', 'D', 'major')).toBe('G')
})

test('a note name is a pitch, and back', () => {
  expect(pitchOf('A4')).toBe(69)
  expect(pitchOf('C4')).toBe(60)
  expect(pitchOf('Cb4')).toBe(59)
  expect(pitchOf('B#4')).toBe(72)
  expect(pitchOf('x')).toBeUndefined()
  expect(pitchOf('C9')).toBeUndefined()
  const sharps = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  for (let octave = 0; octave <= 8; octave++)
    for (const letter of sharps) {
      const name = `${letter}${octave}`
      expect(noteName(pitchOf(name) ?? -1), name).toBe(name)
    }
})

test('a pitch is the same frequency as its note name', () => {
  expect(hertzOfPitch(69)).toBe(440)
  expect(hertzOfPitch(60)).toBe(261.6256)
  for (let octave = 0; octave <= 8; octave++)
    for (const letter of ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
      const name = `${letter}${octave}`
      expect(hertzOfPitch(pitchOf(name) ?? -1), name).toBe(hertzOf(name))
    }
})
