// A note's pitch is a table lookup times a power of two, so it is the same number in Node and in every browser.
import { expect, test } from 'vitest'
import { hertzOf } from '#src/features/audio/audio.ts'

test('A4 is 440 and octaves double and halve exactly', () => {
  expect(hertzOf('A4')).toBe(440)
  expect(hertzOf('A3')).toBe(220)
  expect(hertzOf('A5')).toBe(880)
  expect(hertzOf('A0')).toBe(27.5)
})

test('the octave-4 table', () => {
  expect(hertzOf('C4')).toBe(261.6256)
  expect(hertzOf('F#4')).toBe(369.9944)
  expect(hertzOf('B4')).toBe(493.8833)
})

test('a flat is the sharp a step below, across an octave too', () => {
  expect(hertzOf('Db4')).toBe(277.1826)
  expect(hertzOf('Cb4')).toBe(hertzOf('B3'))
  expect(hertzOf('B#4')).toBe(hertzOf('C5'))
})

test('what is not a note is undefined', () => {
  for (const text of ['-', '=', 'H4', 'C9', 'c4', '', 'x', 'C#', 'C44'])
    expect(hertzOf(text), `"${text}"`).toBeUndefined()
})

test('the two notes past the ends of the octaves have pitches', () => {
  // B#8 is C9 and Cb0 is B-1: one octave step past C8 and below B0, which the table gives exactly.
  expect(hertzOf('B#8')).toBeCloseTo((hertzOf('C8') ?? 0) * 2, 9)
  expect(hertzOf('Cb0')).toBeCloseTo((hertzOf('B0') ?? 0) / 2, 9)
})
