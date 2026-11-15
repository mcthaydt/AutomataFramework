import { expect, test } from 'vitest'
import { motifBeats } from '#src/features/content/content.ts'
import { heroTheme } from '../../fixtures/audio/song.ts'
import { expectRoundTrip, problemsOf } from '../../fixtures/content/kind.ts'

type Json = Record<string, unknown>
const file = 'content/motifs/hero-theme.json'
const said = (value: unknown): string[] => problemsOf('motif', value, file)
const withNote = (note: Json): Json => ({ ...heroTheme(), notes: [note] })

const STEP_HINT = 'Write a step of the key from 1 to 15, like 5, or with b or # in front, like "b3".'
const BEATS_HINT = 'Write how many beats it lasts, from 0.25 to 8, in quarters, like 0.5.'

test('a motif reads, and writes back to the same bytes twice', () => {
  expectRoundTrip('motif', heroTheme())
  expectRoundTrip('motif', {
    format: 1,
    id: 'sad',
    notes: [
      { step: 'b3', beats: 0.25 },
      { step: '#4', beats: 8 },
      { step: 15, beats: 1.75 },
    ],
  })
})

test('a step from 1 to 15, or one with a b or a # in front', () => {
  expect(said(withNote({ step: 16, beats: 1 }))).toEqual([`${file}: notes[0].step: ${STEP_HINT}`])
  expect(said(withNote({ step: 0, beats: 1 }))).toEqual([`${file}: notes[0].step: ${STEP_HINT}`])
  expect(said(withNote({ step: 'x', beats: 1 }))).toEqual([`${file}: notes[0].step: ${STEP_HINT}`])
})

test('beats from a quarter to eight, in quarters', () => {
  for (const beats of [0.1, 0.3, 8.25, 0])
    expect(said(withNote({ step: 1, beats }))).toEqual([`${file}: notes[0].beats: ${BEATS_HINT}`])
})

test('a motif has one note at least and sixteen at most', () => {
  expect(said({ ...heroTheme(), notes: [] })).toEqual([`${file}: notes: This needs at least 1 item.`])
  expect(said({ ...heroTheme(), notes: Array.from({ length: 17 }, () => ({ step: 1, beats: 1 })) })).toEqual([
    `${file}: notes: This has more than 16 items, which is the most allowed.`,
  ])
})

test('how long a use of a motif lasts', () => {
  expect(motifBeats(heroTheme(), {})).toBe(4)
  expect(motifBeats(heroTheme(), { speed: 2 })).toBe(2)
  expect(motifBeats(heroTheme(), { speed: 0.5, shift: 3 })).toBe(8)
})
