import { expect, test } from 'vitest'
import { expectRoundTrip, problemsOf } from '../../fixtures/content/kind.ts'

type Json = Record<string, unknown>
const meadow = () => ({
  format: 1 as const,
  id: 'meadow',
  tempo: 100,
  stepsPerBeat: 4,
  volume: 0.6,
  loop: true,
  parts: [
    {
      id: 'lead',
      kind: 'tone',
      wave: 'triangle',
      volume: 0.5,
      notes: ['C4 - E4 - G4 - E4 - C4 - E4 - G4 - E4 -', 'D4 - F4 - A4 - F4 - D4 - F4 - A4 - G4 ='],
    },
    {
      id: 'drums',
      kind: 'drums',
      volume: 0.4,
      notes: ['x - - - x - - - x - - - x - x -', 'x - - - x - - - x - - - x x x -'],
    },
  ],
})
const file = 'content/music/meadow.json'
const said = (value: unknown): string[] => problemsOf('music', value, file)
const withPart = (i: number, change: (part: Json) => void): ReturnType<typeof meadow> => {
  const value = meadow()
  change(value.parts[i] as unknown as Json)
  return value
}

test('a track reads, and writes back to the same bytes twice', () => expectRoundTrip('music', meadow()))

test('two parts with one id', () =>
  expect(said(withPart(1, (p) => (p.id = 'lead')))).toEqual([
    `${file}: parts[1].id: "lead" is used twice. Each part needs its own id.`,
  ]))

test('a note that is not a note', () => {
  expect(said(withPart(0, (p) => (p.notes = ['C4 - H4 -', 'C4 - E4 -'])))).toContain(
    `${file}: parts[0].notes[0]: "H4" is not a note. Write a note like C4 or F#3, - for a rest, or = to hold the note before.`,
  )
  expect(said(withPart(0, (p) => (p.notes = ['C9 -'])))).toEqual([
    `${file}: parts[0].notes[0]: "C9" is not a note. Write a note like C4 or F#3, - for a rest, or = to hold the note before.`,
    `${file}: parts[1].notes: This part has 32 steps but the first part has 2. Every part must be the same length.`,
  ])
})

test('sharps, flats and holds are notes', () => {
  const t = meadow()
  Object.assign(t.parts[0] as Json, { notes: ['F#3 Bb2 = - C4 D4 E4 G4', 'A0 B8 - - - - - -'] })
  Object.assign(t.parts[1] as Json, { notes: ['x - - - - - - -', 'x - - - - - - -'] })
  expect(said(t)).toEqual([])
})

test('a drum step that is not x or -', () =>
  expect(
    said(
      withPart(1, (p) => (p.notes = ['x - C4 - x - - - x - - - x - x -', 'x - - - x - - - x - - - x x x -'])),
    ),
  ).toEqual([`${file}: parts[1].notes[0]: "C4" is not a drum step. Write x for a hit or - for a rest.`]))

test('two spaces between steps', () =>
  expect(
    said(
      withPart(1, (p) => (p.notes = ['x - - -  x - - - x - - - x - x -', 'x - - - x - - - x - - - x x x -'])),
    ),
  ).toEqual([
    `${file}: parts[1].notes[0]: Separate the steps with one space.`,
    `${file}: parts[1].notes: This part has 33 steps but the first part has 32. Every part must be the same length.`,
  ]))

test('parts of different lengths', () =>
  expect(
    said(
      withPart(1, (p) => (p.notes = ['x - - - x - - - x - - - x - x -', 'x - - - x - - - x - - - x x -'])),
    ),
  ).toEqual([
    `${file}: parts[1].notes: This part has 31 steps but the first part has 32. Every part must be the same length.`,
  ]))

test('a track of more than 4096 steps', () => {
  const row = Array.from({ length: 128 }, () => '-').join(' ')
  const rows = Array.from({ length: 33 }, () => row)
  expect(
    said({
      ...meadow(),
      parts: [{ id: 'bass', kind: 'tone', wave: 'sine', volume: 1, notes: rows }],
    }),
  ).toEqual([`${file}: parts[0].notes: A track can have at most 4096 steps. This one has 4224.`])
})

test('a tempo, a beat or a volume out of range', () => {
  expect(said({ ...meadow(), tempo: 20 })).toEqual([`${file}: tempo: This must be 30 or more.`])
  expect(said({ ...meadow(), stepsPerBeat: 9 })).toEqual([`${file}: stepsPerBeat: This must be 8 or less.`])
  expect(said({ ...meadow(), volume: 2 })).toEqual([`${file}: volume: This must be 1 or less.`])
})

test('a kind of part that does not exist, and a missing field', () => {
  expect(said(withPart(0, (p) => (p.kind = 'choir')))).toEqual([
    `${file}: parts[0].kind: This must be one of: tone, drums.`,
  ])
  expect(said(withPart(0, (p) => delete p.notes))).toEqual([
    `${file}: parts[0].notes: This is missing. Write the steps as rows of text, like ["C4 - E4 -"].`,
  ])
})

test('an unknown key', () =>
  expect(said({ ...meadow(), swing: 1 })).toEqual([
    `${file}: swing: This is not something a music track has. Remove it or check the spelling.`,
  ]))
