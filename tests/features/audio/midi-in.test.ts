import { expect, test } from 'vitest'
import { midiToMusic, notesOf } from '#src/features/audio/audio.ts'
import { LoopSchema, MusicSchema, writeContent } from '#src/features/content/content.ts'
import { type MidiEvent, writeMidi } from '#src/lib/midi.ts'
import { EXTRAS, FORMAT_0, RIFF } from '../../fixtures/audio/midi-files.ts'
import { gameFiles, gameProblems } from '../../fixtures/content/kind.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

/** A sixteenth, in ticks at 480 to a quarter. */
const STEP = 120

/** A note from the step it starts at and how many steps it lasts. */
const note = (step: number, steps: number, pitch: number, channel = 0, velocity = 100): MidiEvent => ({
  kind: 'note',
  tick: step * STEP,
  ticks: steps * STEP,
  channel,
  pitch,
  velocity,
})

/** A file of tracks, at 480 ticks to a quarter. */
const file = (...tracks: MidiEvent[][]): Uint8Array => writeMidi({ division: 480, tracks })

/** A file read, which is expected to come in. */
function imported(bytes: Uint8Array, id = 'tune') {
  const result = midiToMusic(bytes, id)
  if (!result.ok) throw new Error(result.message)
  expect(MusicSchema.safeParse(result.value.music).success).toBe(true)
  for (const loop of result.value.loops) expect(LoopSchema.safeParse(loop).success, loop.id).toBe(true)
  return result.value
}

/** The loops of an import, by id, as `notesOf` takes them. */
const partsOf = (value: ReturnType<typeof imported>) => ({
  loops: Object.fromEntries(value.loops.map((loop) => [loop.id, loop])),
})

test('the tempo is the first one, rounded, and 120 when there is none', () => {
  expect(imported(FORMAT_0).tempo).toBe(120)
  expect(imported(file([{ kind: 'tempo', tick: 0, bpm: 90 }, note(0, 4, 60)])).tempo).toBe(90)
  expect(imported(file([note(0, 4, 60)])).tempo).toBe(120)
  expect(imported(file([{ kind: 'tempo', tick: 0, bpm: 500 }, note(0, 4, 60)])).tempo).toBe(300)
})

test('the key is the key signature when there is one', () => {
  const value = imported(file([{ kind: 'key', tick: 0, sharps: -1, minor: true }, note(0, 4, 62)]))
  expect([value.music.key, value.music.mode]).toEqual(['D', 'minor'])
})

test('with no key signature the key is the major key that covers the notes best', () => {
  const scale = [60, 62, 64, 65, 67, 69, 71, 72]
  const inC = file([...scale.map((pitch, i) => note(i * 4, 4, pitch))])
  const inF = file([...scale.map((pitch, i) => note(i * 4, 4, pitch + 5))])
  expect(imported(inC).music.key).toBe('C')
  expect(imported(inF).music.key).toBe('F')
})

test('channel 10 is a drum lane, each note number the nearest of the five drums', () => {
  const value = imported(
    file([note(0, 1, 36, 9), note(4, 1, 38, 9), note(8, 1, 42, 9), note(10, 1, 40, 9), note(12, 1, 47, 9)]),
  )
  expect(value.music.lanes).toMatchObject([{ id: 'drums', instrument: 'drums' }])
  const loop = value.loops[0]
  expect(loop).toMatchObject({ lane: 'drums', bars: 1, stepsPerBar: 16 })
  const rows = loop?.lane === 'drums' ? loop.notes : {}
  expect(rows).toEqual({
    kick: ['x - - - - - - - - - - - - - - -'],
    snare: ['- - - - x - - - - - - - - - - -'],
    hat: ['- - - - - - - - x - - - - - - -'],
    clap: ['- - - - - - - - - - x - - - - -'],
    tom: ['- - - - - - - - - - - - x - - -'],
  })
})

test('four equal bars are one loop in one block of four', () => {
  const hits = [0, 1, 2, 3].map((bar) => note(bar * 16, 1, 36, 9))
  const value = imported(file(hits))
  expect(value.loops).toHaveLength(1)
  expect(value.loops[0]).toMatchObject({ bars: 1 })
  expect(value.music.lanes[0]?.blocks).toEqual([{ at: 1, loop: value.loops[0]?.id, bars: 4 }])
  expect(value.bars).toBe(4)
})

test('the chord of a bar is the key triad whose notes sound longest', () => {
  const bar1 = [note(0, 16, 60), note(0, 16, 64), note(0, 16, 67)]
  const bar2 = [note(16, 16, 57), note(16, 16, 60), note(16, 16, 64)]
  const value = imported(file([...bar1, ...bar2]))
  expect(value.music.chords).toEqual(['I', 'vi'])
  expect([value.music.key, value.music.mode]).toEqual(['C', 'major'])
})

test('a bar with no notes is the first chord', () => {
  const value = imported(file([note(0, 4, 60), note(32, 4, 60)]))
  expect(value.music.chords).toEqual(['I', 'I', 'I'])
})

test('a three-note chord on one channel becomes three lanes, highest first', () => {
  const value = imported(file([note(0, 16, 60), note(0, 16, 64), note(0, 16, 67)]))
  expect(value.lanes).toBe(3)
  const first = notesOf(value.music, partsOf(value))
  expect(first.map((n) => n.pitch).sort()).toEqual([60, 64, 67])
})

test('an in-key note is a step of the chord and an out-of-key note is a fixed note', () => {
  const value = imported(file([note(0, 4, 60), note(4, 4, 62), note(8, 4, 61), note(12, 4, 72)]))
  const loop = value.loops[0]
  expect(loop?.notes).toEqual(['1 = = = 2 = = = C#4 = = = 8 = = ='])
  const played = notesOf(value.music, partsOf(value))
  expect(played.map((n) => n.pitch)).toEqual([60, 62, 61, 72])
})

test('a note held across a bar line comes back as one note of its own length', () => {
  const value = imported(file([note(14, 4, 60)]))
  const played = notesOf(value.music, partsOf(value))
  expect(played).toMatchObject([{ pitch: 60, at: 14 * STEP, ticks: 4 * STEP }])
})

test('nine channels keep the eight busiest and say so', () => {
  const channels = Array.from({ length: 9 }, (_, channel) =>
    Array.from({ length: channel + 2 }, (_, i) => note(i * 2, 1, 60 + channel, channel === 9 ? 0 : channel)),
  )
  const value = imported(file(...channels))
  expect(value.lanes).toBe(8)
  expect(value.dropped).toEqual([
    { what: 'lanes', count: 1, sentence: '1 instrument was dropped: a song has at most eight lanes.' },
  ])
})

test('every thing dropped is counted and said, in order', () => {
  const messy = file([
    { kind: 'tempo', tick: 0, bpm: 110 },
    { kind: 'tempo', tick: 960, bpm: 140 },
    { kind: 'time', tick: 0, beats: 3, unit: 4 },
    // Off the grid by 10 ticks.
    { kind: 'note', tick: 10, ticks: 120, channel: 0, pitch: 60, velocity: 100 },
    { kind: 'note', tick: 130, ticks: 120, channel: 0, pitch: 62, velocity: 100 },
    // Four at once: the fourth has no lane to go to.
    ...[48, 52, 55, 59].map((pitch) => note(32, 4, pitch, 1)),
    // Long: it holds for ten bars and is cut at eight.
    note(64, 160, 72, 2),
    // After bar 128.
    note(128 * 16, 4, 60, 3),
  ])
  const value = imported(messy)
  const what = ['moved', 'tempo', 'time', 'bars', 'together', 'cut']
  expect(value.dropped.map((entry) => entry.what)).toEqual(what)
  expect(value.dropped.map((entry) => entry.sentence)).toEqual([
    '2 notes were moved to the nearest sixteenth.',
    'The tempo changes after the start were dropped; the song keeps 110 beats a minute.',
    'The file is in 3/4; it was read as four beats to a bar.',
    'Notes after bar 128 were dropped.',
    'Some notes played together in one instrument were dropped.',
    '1 long note was cut at the end of a loop.',
  ])
})

test('bends and controllers are said', () => {
  const value = imported(EXTRAS)
  expect(value.dropped).toEqual([
    { what: 'bends', count: 1, sentence: 'Pitch bends were dropped.' },
    { what: 'controllers', count: 1, sentence: 'Controllers (like the sustain pedal) were dropped.' },
  ])
})

test('a file whose notes all sit off the grid by 10 ticks counts them', () => {
  const hits: MidiEvent[] = [0, 4, 8, 12].map((step) => ({
    kind: 'note',
    tick: step * STEP + 10,
    ticks: 4 * STEP,
    channel: 0,
    pitch: 60,
    velocity: 100,
  }))
  const value = imported(file(hits))
  expect(value.dropped).toEqual([
    { what: 'moved', count: 4, sentence: '4 notes were moved to the nearest sixteenth.' },
  ])
  expect(notesOf(value.music, partsOf(value)).map((n) => n.at)).toEqual([0, 480, 960, 1440])
})

test('a lane of 64 bars that never repeats gives at most 8 loops', () => {
  // Two notes a bar, in a place no other bar has them.
  const hits = Array.from({ length: 64 }, (_, bar) => {
    const first = bar % 16
    const second = (first + 1 + Math.floor(bar / 16)) % 16
    return [note(bar * 16 + first, 1, 60), note(bar * 16 + second, 1, 60)]
  }).flat()
  const value = imported(file(hits))
  expect(value.bars).toBe(64)
  expect(value.loops.length).toBeLessThanOrEqual(8)
  const blocks = value.music.lanes[0]?.blocks ?? []
  expect(blocks.reduce((sum, block) => sum + ('bars' in block ? block.bars : 0), 0)).toBe(64)
})

test('a file that is not MIDI, and a MIDI file with no notes, are each refused in one sentence', () => {
  expect(midiToMusic(RIFF, 'x')).toEqual({
    ok: false,
    why: 'not-midi',
    message: 'This is not a MIDI file this game can read. Save it as a Standard MIDI File (type 0 or 1).',
  })
  expect(midiToMusic(file([{ kind: 'tempo', tick: 0, bpm: 100 }]), 'x')).toEqual({
    ok: false,
    why: 'no-notes',
    message: 'This MIDI file has no notes.',
  })
})

test('a game made of an import loads with no problem', async () => {
  const value = imported(file([note(0, 16, 60), note(0, 16, 64), note(0, 16, 67), note(0, 1, 36, 9)]), 'tune')
  const entries = [
    ...value.loops.map((loop) => ({
      type: 'loop' as const,
      path: `content/loops/${loop.id}.json`,
      text: writeContent('loop', loop),
    })),
    { type: 'music' as const, path: 'content/music/tune.json', text: writeContent('music', value.music) },
  ]
  expect(await gameProblems(gameFiles(fixtureFiles, entries))).toEqual([])
})
