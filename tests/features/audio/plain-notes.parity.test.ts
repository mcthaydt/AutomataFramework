// A song as plain notes is whole-number arithmetic over tables, so every engine gets the same notes: each case below has
// its pitches and ticks typed out.
import { expect, test } from 'vitest'
import { loopNotes, motifNotes, notesOf, type PlainNote, TICKS_PER_BAR } from '#src/features/audio/audio.ts'
import type { ArrangedMusic, LoopFile, MotifFile } from '#src/features/content/content.ts'
import { bouncyBass, easyDrums, heroTheme, meadow, songParts } from '../../fixtures/audio/song.ts'

const pitches = (notes: readonly PlainNote[]): (number | string)[] => notes.map((note) => note.pitch)
const ats = (notes: readonly PlainNote[]): number[] => notes.map((note) => note.at)

/** A song of `bars` bars with one lane that plays these blocks. */
function song(
  blocks: ArrangedMusic['lanes'][number]['blocks'],
  change: Partial<ArrangedMusic> = {},
  instrument: ArrangedMusic['lanes'][number]['instrument'] = 'bass',
): ArrangedMusic {
  return {
    ...meadow(),
    bars: 4,
    chords: ['I', 'vi', 'IV', 'V'],
    lanes: [{ id: 'line', instrument, volume: 1, blocks }],
    volume: 1,
    ...change,
  }
}

const bassOver = (change: Partial<ArrangedMusic> = {}): PlainNote[] =>
  notesOf(song([{ at: 1, loop: 'bouncy-bass', bars: 4 }], change), songParts())

test("the spec's bouncy bass follows the chords: C2 and G2, A2 and E3, F2 and C3, G2 and D3", () => {
  const notes = bassOver()
  expect(pitches(notes)).toEqual([36, 43, 36, 43, 45, 52, 57, 52, 41, 48, 41, 48, 43, 50, 55, 50])
  expect(ats(notes).slice(0, 4)).toEqual([0, 480, 960, 1440])
  expect(ats(notes).slice(4, 6)).toEqual([TICKS_PER_BAR, TICKS_PER_BAR + 480])
  for (const note of notes) expect(note).toMatchObject({ lane: 'line', instrument: 'bass', ticks: 240, volume: 1 })
})

test('the same song in Eb is every pitch three higher, and in B the roots are in octave 2 too', () => {
  const c = pitches(bassOver())
  expect(pitches(bassOver({ key: 'Eb' }))).toEqual(c.map((pitch) => (pitch as number) + 3))
  expect(pitches(bassOver({ key: 'B' }))[0]).toBe(47)
})

/** A one-bar loop of four steps, `row`, in a lane. */
const line = (lane: 'bass' | 'melody', row: string, bars = 1): LoopFile => ({
  format: 1,
  id: 'line',
  lane,
  bars,
  stepsPerBar: 4,
  notes: Array.from({ length: bars }, () => row),
})

test('in minor the thirds fall, and a chord has its own scale', () => {
  expect(pitches(loopNotes(line('bass', '1 3 5 8')))).toEqual([36, 40, 43, 48])
  expect(pitches(loopNotes(line('bass', '1 3 5 8'), { chords: ['i'], mode: 'minor' }))).toEqual([36, 39, 43, 48])
  // A diminished chord's fifth is lowered.
  expect(pitches(loopNotes(line('bass', '1 3 5 8'), { chords: ['vii°'] }))).toEqual([47, 50, 53, 59])
})

test('a melody loop sits in octave 4 and a bass loop in octave 2', () => {
  expect(pitches(loopNotes(line('melody', '1 3 5 8')))).toEqual([60, 64, 67, 72])
})

test('a fixed note ignores the key and the chord', () => {
  const notes = loopNotes(line('bass', 'C4 - E4 -'), { key: 'Eb', chords: ['V'] })
  expect(pitches(notes)).toEqual([60, 64])
  expect(notes.map((note) => note.ticks)).toEqual([480, 480])
})

const chords = (voicing: 'close' | 'open' | 'high', notes = 'x - x ='): LoopFile => ({
  format: 1,
  id: 'pump',
  lane: 'chords',
  voicing,
  bars: 1,
  stepsPerBar: 4,
  notes: [notes],
})

test('a chord loop plays the whole chord in its voicing, held by =', () => {
  const close = loopNotes(chords('close'))
  expect(pitches(close)).toEqual([48, 52, 55, 48, 52, 55])
  expect(ats(close)).toEqual([0, 0, 0, 960, 960, 960])
  expect(close.map((note) => note.ticks)).toEqual([480, 480, 480, 960, 960, 960])
  expect(pitches(loopNotes(chords('open'), { chords: ['I'] })).slice(0, 3)).toEqual([48, 55, 64])
  expect(pitches(loopNotes(chords('high'))).slice(0, 3)).toEqual([60, 64, 67])
})

test('a seventh and a sus4 chord', () => {
  expect(pitches(loopNotes(chords('close', 'x - - -'), { chords: ['V7'] }))).toEqual([55, 59, 62, 65])
  expect(pitches(loopNotes(chords('close', 'x - - -'), { chords: ['IVsus4'] }))).toEqual([53, 58, 60])
})

test('a hold carries a note over a bar line at its own pitch', () => {
  const loop: LoopFile = {
    format: 1,
    id: 'line',
    lane: 'bass',
    bars: 2,
    stepsPerBar: 4,
    notes: ['1 - - 5', '= 1 - -'],
  }
  const notes = loopNotes(loop, { chords: ['I', 'IV'] })
  expect(notes.map((note) => [note.pitch, note.at, note.ticks])).toEqual([
    [36, 0, 480],
    [43, 1440, 960],
    [41, 2400, 480],
  ])
})

test('a hold with nothing before it is a rest, and a hold never goes past the end of the block', () => {
  const loop: LoopFile = { format: 1, id: 'line', lane: 'bass', bars: 1, stepsPerBar: 4, notes: ['= 1 = ='] }
  expect(loopNotes(loop).map((note) => [note.pitch, note.at, note.ticks])).toEqual([[36, 480, 1440]])
})

test('a loop of two bars in a block of five plays its rows in turn', () => {
  const notes = notesOf(
    song([{ at: 1, loop: 'bouncy-bass', bars: 5 }], { bars: 5, chords: ['I', 'I', 'I', 'I', 'I'] }),
    songParts(),
  )
  expect(notes).toHaveLength(20)
  expect(notes.filter((note) => note.pitch === 48).map((note) => note.at)).toEqual([
    TICKS_PER_BAR + 960,
    3 * TICKS_PER_BAR + 960,
  ])
})

/** A drum loop with one drum on `row`, `stepsPerBar` steps in a bar. */
const hits = (stepsPerBar: 4 | 8 | 12 | 16, row: string): LoopFile => ({
  format: 1,
  id: 'hits',
  lane: 'drums',
  bars: 1,
  stepsPerBar,
  notes: { kick: [row] },
})

test('drum hits land on the right ticks for 4, 8, 12 and 16 steps a bar', () => {
  expect(ats(loopNotes(hits(4, 'x - x -')))).toEqual([0, 960])
  expect(ats(loopNotes(hits(8, 'x - - - x - - -')))).toEqual([0, 960])
  expect(ats(loopNotes(hits(12, 'x - - x - - x - - x - -')))).toEqual([0, 480, 960, 1440])
  expect(ats(loopNotes(hits(16, 'x - - - x - - - x - - - x - - -')))).toEqual([0, 480, 960, 1440])
  for (const note of loopNotes(hits(4, 'x - x -'))) expect(note).toMatchObject({ pitch: 'kick', ticks: 0 })
})

test("a drum loop plays each drum, in the drums' usual order when they hit together", () => {
  const notes = loopNotes(easyDrums())
  expect(notes.slice(0, 2).map((note) => note.pitch)).toEqual(['kick', 'hat'])
  expect(notes).toHaveLength(2 + 2 + 8)
})

const THEME = heroTheme()
const use = { key: 'C', mode: 'major', instrument: 'pluck', volume: 1 } as const

test('a motif plays its steps in octave 4, each as long as its beats', () => {
  const notes = motifNotes(THEME, use)
  expect(pitches(notes)).toEqual([60, 64, 67, 72])
  expect(ats(notes)).toEqual([0, 480, 720, 960])
  expect(notes.map((note) => note.ticks)).toEqual([480, 240, 240, 960])
})

test('a motif moved up two steps, and down two past the bottom of the scale', () => {
  expect(pitches(motifNotes(THEME, { ...use, shift: 2 }))).toEqual([64, 67, 71, 76])
  expect(pitches(motifNotes(THEME, { ...use, shift: -2 }))).toEqual([57, 60, 64, 69])
})

test('a motif slowed, in minor, backwards, and with notes between', () => {
  const slow = motifNotes(THEME, { ...use, speed: 0.5 })
  expect(slow.map((note) => note.ticks)).toEqual([960, 480, 480, 1920])
  expect(ats(slow)).toEqual([0, 960, 1440, 1920])
  expect(pitches(motifNotes(THEME, { ...use, mode: 'minor' }))).toEqual([60, 63, 67, 72])
  const back = motifNotes(THEME, { ...use, backwards: true })
  expect(pitches(back)).toEqual([72, 67, 64, 60])
  expect(back.map((note) => note.ticks)).toEqual([960, 240, 240, 480])
  const between: MotifFile = { format: 1, id: 'x', notes: [{ step: 'b3', beats: 1 }, { step: '#4', beats: 1 }] }
  expect(pitches(motifNotes(between, use))).toEqual([63, 66])
})

test("a motif block in a song starts at its bar and in the lane's key and mode", () => {
  const notes = notesOf(song([{ at: 3, motif: 'hero-theme', mode: 'minor' }], {}, 'pluck'), songParts())
  expect(pitches(notes)).toEqual([60, 63, 67, 72])
  expect(ats(notes)).toEqual([0, 480, 720, 960].map((tick) => tick + 2 * TICKS_PER_BAR))
})

test('a note at or after the end of the track is dropped, and one that runs past it is cut', () => {
  const parts = {
    ...songParts(),
    motifs: { long: { format: 1, id: 'long', notes: [{ step: 1, beats: 8 }] } satisfies MotifFile },
  }
  const cut = notesOf(song([{ at: 1, motif: 'long' }], { bars: 1, chords: ['I'] }, 'pluck'), parts)
  expect(cut.map((note) => [note.at, note.ticks])).toEqual([[0, TICKS_PER_BAR]])
  const dropped = notesOf(
    song([{ at: 1, motif: 'hero-theme', speed: 0.5 }], { bars: 1, chords: ['I'] }, 'pluck'),
    songParts(),
  )
  expect(dropped).toHaveLength(3)
})

test("a song's notes start in order, and the lane's volume is times the track's", () => {
  const notes = notesOf(meadow(), songParts())
  expect(ats(notes)).toEqual([...ats(notes)].sort((a, b) => a - b))
  expect(notes.slice(0, 2).map((note) => [note.lane, note.pitch])).toEqual([
    ['drums', 'kick'],
    ['drums', 'hat'],
  ])
  expect(notes[0]?.volume).toBeCloseTo(0.8 * 0.7, 12)
})

test('a loop or a motif the game does not have is said in words', () => {
  expect(() => notesOf(song([{ at: 1, loop: 'nope', bars: 1 }]), songParts())).toThrow(
    'The track "meadow" uses a loop called "nope", which this game does not have.',
  )
  expect(() => notesOf(song([{ at: 1, motif: 'nope' }]), songParts())).toThrow(
    'The track "meadow" uses a motif called "nope", which this game does not have.',
  )
})

test("the bass loop of the fixtures is the spec's", () => {
  expect(bouncyBass().notes).toEqual(['1 - 5 - 1 - 5 -', '1 - 5 - 8 - 5 -'])
})
