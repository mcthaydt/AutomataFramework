import { expect, test } from 'vitest'
import { expectRoundTrip, problemsOf } from '../../fixtures/content/kind.ts'

type Json = Record<string, unknown>
const file = 'content/loops/bouncy-bass.json'
const said = (value: unknown): string[] => problemsOf('loop', value, file)

const drums = (): Json => ({
  format: 1,
  id: 'easy-drums',
  lane: 'drums',
  bars: 2,
  stepsPerBar: 8,
  notes: { kick: ['x - - - x - - -', 'x - - - x - x -'], hat: ['x x x x x x x x', 'x x x x x x x x'] },
})
const bass = (): Json => ({
  format: 1,
  id: 'bouncy-bass',
  lane: 'bass',
  bars: 2,
  stepsPerBar: 8,
  notes: ['1 - 5 - 1 - 5 -', '1 - 5 - 8 - 5 -'],
})
const chords = (): Json => ({
  format: 1,
  id: 'pump',
  lane: 'chords',
  voicing: 'open',
  bars: 1,
  stepsPerBar: 8,
  notes: ['x - x x - x - -'],
})
const melody = (): Json => ({
  format: 1,
  id: 'sunny',
  lane: 'melody',
  bars: 1,
  stepsPerBar: 4,
  notes: ['C4 3 b7 ='],
})

test('a loop of each lane reads, and writes back to the same bytes twice', () => {
  for (const loop of [drums(), bass(), chords(), melody()]) expectRoundTrip('loop', loop)
})

test('a bass loop with a bar too few', () =>
  expect(said({ ...bass(), notes: ['1 - 5 - 1 - 5 -'] })).toEqual([
    `${file}: notes: This loop has 2 bars but 1 row. Write one row for each bar.`,
  ]))

test('a bar with the wrong number of steps', () =>
  expect(said({ ...bass(), notes: ['1 - 5 - 1 - 5 -', '1 - 5 - 1 - 5'] })).toEqual([
    `${file}: notes[1]: This bar has 7 steps but "stepsPerBar" is 8. Write 8, separated by one space.`,
  ]))

test('a drum row with a step that is not a hit or a rest', () => {
  const loop = drums()
  ;(loop.notes as Json).kick = ['x - - - q - - -', 'x - - - x - x -']
  expect(said(loop)).toEqual([
    `${file}: notes.kick[0]: "q" is not a drum step. Write x for a hit or - for a rest.`,
  ])
})

test('a drum loop with no drum in it', () =>
  expect(said({ ...drums(), notes: {} })).toEqual([
    `${file}: notes: A drum loop needs at least one drum: kick, snare, hat, clap or tom.`,
  ]))

test('a chord row with a step that is not x, - or =', () =>
  expect(said({ ...chords(), notes: ['x - x x - 1 - -'] })).toEqual([
    `${file}: notes[0]: "1" is not a chord step. Write x to play the chord, - for a rest, or = to hold it.`,
  ]))

test('a melody step that is neither a step of the chord nor a note', () =>
  expect(said({ ...melody(), notes: ['C4 z b7 ='] })).toEqual([
    `${file}: notes[0]: "z" is not a step. Write a step of the chord like 1, 3 or b7, a note like C4, - for a rest, or = to hold.`,
  ]))

test('steps in a bar can be 4, 8, 12 or 16', () =>
  expect(said({ ...bass(), stepsPerBar: 5 })).toContain(`${file}: stepsPerBar: Write 4, 8, 12 or 16.`))

test('a loop is at most eight bars', () =>
  expect(said({ ...melody(), bars: 9 })).toContain(`${file}: bars: This must be 8 or less.`))

test('a loop of a lane that does not exist names the choices', () =>
  expect(said({ ...bass(), lane: 'flute' })).toEqual([
    `${file}: lane: This must be one of: drums, bass, melody, chords.`,
  ]))

test('a field only another lane has', () =>
  expect(said({ ...bass(), voicing: 'open' })).toEqual([
    `${file}: voicing: This is not something a loop has. Remove it or check the spelling.`,
  ]))
