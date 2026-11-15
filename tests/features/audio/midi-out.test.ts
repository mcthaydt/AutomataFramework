import { expect, test } from 'vitest'
import { musicToMidi, notesOf, stepNotes } from '#src/features/audio/audio.ts'
import type { ArrangedMusic, StepMusic } from '#src/features/content/content.ts'
import { type MidiEvent, readMidi } from '#src/lib/midi.ts'
import { bouncyBass, easyDrums, heroTheme, meadow, songParts } from '../../fixtures/audio/song.ts'

/** The file read back: its tracks, each as its events. */
function read(bytes: Uint8Array): readonly (readonly MidiEvent[])[] {
  const file = readMidi(bytes)
  if (file === undefined) throw new Error('the bytes are not a MIDI file')
  expect(file.division).toBe(480)
  return file.tracks
}

type Note = Extract<MidiEvent, { kind: 'note' }>
const notesIn = (events: readonly MidiEvent[]): Note[] =>
  events.filter((event): event is Note => event.kind === 'note')

test('the song is a first track with the name, the tempo and the key, then a track for each lane', () => {
  const tracks = read(musicToMidi({ type: 'music', value: meadow() }, songParts()))
  expect(tracks).toHaveLength(3)
  expect(tracks[0]).toEqual([
    { kind: 'name', tick: 0, text: 'meadow' },
    { kind: 'tempo', tick: 0, bpm: 110 },
    { kind: 'key', tick: 0, sharps: 0, minor: false },
    { kind: 'time', tick: 0, beats: 4, unit: 4 },
  ])
  expect(tracks[1]?.[0]).toEqual({ kind: 'name', tick: 0, text: 'drums' })
  expect(tracks[2]?.[0]).toEqual({ kind: 'name', tick: 0, text: 'melody' })
})

test("each lane's track has the notes the speaker plays: pitch, tick and length", () => {
  const song = meadow()
  const tracks = read(musicToMidi({ type: 'music', value: song }, songParts()))
  const melody = notesOf(song, songParts()).filter((note) => note.lane === 'melody')
  expect(notesIn(tracks[2] ?? []).map((note) => [note.pitch, note.tick, note.ticks])).toEqual(
    melody.map((note) => [note.pitch, note.at, note.ticks]),
  )
  expect(notesIn(tracks[2] ?? []).every((note) => note.channel === 0)).toBe(true)
  // 0.6 of the lane times 0.7 of the track, as a velocity.
  expect(notesIn(tracks[2] ?? [])[0]?.velocity).toBe(Math.round(0.42 * 127))
})

test('the drums are on channel 10, as the five General MIDI notes, each a sixteenth long', () => {
  const drums = notesIn(read(musicToMidi({ type: 'music', value: meadow() }, songParts()))[1] ?? [])
  expect(drums.length).toBeGreaterThan(0)
  expect(drums.every((note) => note.channel === 9 && note.ticks === 120)).toBe(true)
  expect(new Set(drums.map((note) => note.pitch))).toEqual(new Set([36, 38, 42]))
})

test('a song in E flat minor writes six flats and minor; one in A major writes three sharps', () => {
  const key = (value: ArrangedMusic) =>
    read(musicToMidi({ type: 'music', value }, songParts()))[0]?.find((event) => event.kind === 'key')
  expect(key({ ...meadow(), key: 'Eb', mode: 'minor' })).toEqual({ kind: 'key', tick: 0, sharps: -6, minor: true })
  expect(key({ ...meadow(), key: 'A', mode: 'major' })).toEqual({ kind: 'key', tick: 0, sharps: 3, minor: false })
})

test('a step track writes its parts: a tone part as notes, a drum part as snare hits on channel 10', () => {
  const song: StepMusic = {
    format: 1,
    id: 'beeps',
    tempo: 120,
    stepsPerBeat: 2,
    volume: 1,
    loop: true,
    parts: [
      { id: 'lead', kind: 'tone', wave: 'sine', volume: 1, notes: ['C4 = E4 -'] },
      { id: 'drums', kind: 'drums', volume: 0.5, notes: ['x - x -'] },
    ],
  }
  const tracks = read(musicToMidi({ type: 'music', value: song }))
  expect(tracks).toHaveLength(3)
  expect(notesIn(tracks[1] ?? []).map((note) => [note.pitch, note.tick, note.ticks, note.channel])).toEqual([
    [60, 0, 480, 0],
    [64, 480, 240, 0],
  ])
  expect(notesIn(tracks[2] ?? []).map((note) => [note.pitch, note.tick, note.channel])).toEqual([
    [38, 0, 9],
    [38, 480, 9],
  ])
  expect(stepNotes(song)).toHaveLength(4)
})

test('a loop and a motif each write one lane', () => {
  const loop = read(musicToMidi({ type: 'loop', value: bouncyBass() }))
  expect(loop).toHaveLength(2)
  expect(loop[0]?.find((event) => event.kind === 'tempo')).toMatchObject({ bpm: 110 })
  expect(notesIn(loop[1] ?? [])[0]).toMatchObject({ pitch: 36, tick: 0 })
  const drums = read(musicToMidi({ type: 'loop', value: easyDrums() }))
  expect(notesIn(drums[1] ?? []).every((note) => note.channel === 9)).toBe(true)
  const motif = read(musicToMidi({ type: 'motif', value: heroTheme() }))
  expect(motif).toHaveLength(2)
  expect(motif[0]?.find((event) => event.kind === 'tempo')).toMatchObject({ bpm: 120 })
  expect(notesIn(motif[1] ?? []).map((note) => note.pitch)).toEqual([60, 64, 67, 72])
})

test('the same input gives the same bytes', () => {
  const once = musicToMidi({ type: 'music', value: meadow() }, songParts())
  const twice = musicToMidi({ type: 'music', value: meadow() }, songParts())
  expect([...once]).toEqual([...twice])
})
