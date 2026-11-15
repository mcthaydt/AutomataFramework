import { expect, test } from 'vitest'
import { type MidiEvent, readMidi, writeMidi } from '#src/lib/midi.ts'
import {
  EXTRAS,
  FORMAT_0,
  FORMAT_2,
  midiFile,
  RIFF,
  RUNNING,
  SMPTE,
  STUCK,
} from '../fixtures/audio/midi-files.ts'

test('a tempo of 120 and one C4 for a beat at 480 ticks are these 42 bytes', () => {
  const bytes = writeMidi({
    division: 480,
    tracks: [
      [
        { kind: 'tempo', tick: 0, bpm: 120 },
        { kind: 'note', tick: 0, ticks: 480, channel: 0, pitch: 60, velocity: 100 },
      ],
    ],
  })
  expect([...bytes]).toEqual([
    // The header: format 1, one track, 480 ticks to a quarter note.
    ...[0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, 1, 0x01, 0xe0],
    // The track, 20 bytes long: a tempo, the note on, the note off 480 ticks (83 60) later, the end.
    ...[0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 20],
    ...[0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20],
    ...[0x00, 0x90, 0x3c, 0x64],
    ...[0x83, 0x60, 0x80, 0x3c, 0x00],
    ...[0x00, 0xff, 0x2f, 0x00],
  ])
})

test('the same input gives the same bytes', () => {
  const file = { division: 96, tracks: [[{ kind: 'name', tick: 0, text: 'x' } as const]] }
  expect([...writeMidi(file)]).toEqual([...writeMidi(file)])
})

test('three tracks with a tempo, a key, a name and overlapping notes read back as they were written', () => {
  const tracks: MidiEvent[][] = [
    [
      { kind: 'name', tick: 0, text: 'Meadow' },
      { kind: 'tempo', tick: 0, bpm: 110 },
      { kind: 'key', tick: 0, sharps: -3, minor: true },
      { kind: 'time', tick: 0, beats: 4, unit: 4 },
    ],
    [
      { kind: 'name', tick: 0, text: 'bass' },
      { kind: 'note', tick: 0, ticks: 480, channel: 0, pitch: 36, velocity: 90 },
      { kind: 'note', tick: 240, ticks: 480, channel: 0, pitch: 40, velocity: 90 },
      { kind: 'note', tick: 960, ticks: 120, channel: 0, pitch: 36, velocity: 1 },
    ],
    [
      { kind: 'name', tick: 0, text: 'drums' },
      { kind: 'note', tick: 0, ticks: 120, channel: 9, pitch: 36, velocity: 100 },
      { kind: 'note', tick: 0, ticks: 120, channel: 9, pitch: 42, velocity: 60 },
    ],
  ]
  const read = readMidi(writeMidi({ division: 480, tracks }))
  expect(read?.division).toBe(480)
  expect(read?.tracks).toEqual(tracks)
  expect(read?.skipped).toEqual({})
})

test('a note-off comes before a note-on at one tick, so a note that ends where the next starts is two notes', () => {
  const tracks: MidiEvent[][] = [
    [
      { kind: 'note', tick: 0, ticks: 480, channel: 0, pitch: 60, velocity: 90 },
      { kind: 'note', tick: 480, ticks: 480, channel: 0, pitch: 60, velocity: 90 },
    ],
  ]
  expect(readMidi(writeMidi({ division: 480, tracks }))?.tracks).toEqual(tracks)
})

test('a format 0 file reads as one track, with its notes on their own channels', () => {
  const read = readMidi(FORMAT_0)
  expect(read?.division).toBe(96)
  expect(read?.tracks).toEqual([
    [
      { kind: 'tempo', tick: 0, bpm: 120 },
      { kind: 'note', tick: 0, ticks: 96, channel: 0, pitch: 60, velocity: 100 },
      { kind: 'note', tick: 96, ticks: 96, channel: 1, pitch: 64, velocity: 80 },
    ],
  ])
})

test('running status reads, and a note-on with velocity 0 is a note-off', () => {
  expect(readMidi(RUNNING)?.tracks).toEqual([
    [
      { kind: 'note', tick: 0, ticks: 192, channel: 0, pitch: 60, velocity: 100 },
      { kind: 'note', tick: 96, ticks: 192, channel: 0, pitch: 62, velocity: 100 },
    ],
  ])
})

test('bends, controllers, programs, pressure, system messages and other meta events are counted and passed over', () => {
  const read = readMidi(EXTRAS)
  expect(read?.tracks).toEqual([[{ kind: 'note', tick: 0, ticks: 96, channel: 0, pitch: 60, velocity: 100 }]])
  expect(read?.skipped).toEqual({
    'pitch bends': 1,
    controllers: 1,
    programs: 1,
    aftertouch: 2,
    'system messages': 1,
    'meta events': 1,
  })
})

test("a note left on ends at the track's end", () => {
  expect(readMidi(STUCK)?.tracks[0]?.find((event) => event.kind === 'note')).toEqual({
    kind: 'note',
    tick: 0,
    ticks: 480,
    channel: 0,
    pitch: 60,
    velocity: 100,
  })
})

test('a file cut inside a chunk, format 2, SMPTE time and a WAV file are not MIDI', () => {
  expect(readMidi(FORMAT_0.subarray(0, FORMAT_0.length - 3))).toBeUndefined()
  expect(readMidi(FORMAT_0.subarray(0, 10))).toBeUndefined()
  expect(readMidi(FORMAT_2)).toBeUndefined()
  expect(readMidi(SMPTE)).toBeUndefined()
  expect(readMidi(RIFF)).toBeUndefined()
  expect(readMidi(new Uint8Array())).toBeUndefined()
})

test('a track that says a byte is coming where the file ends is not MIDI', () => {
  expect(readMidi(midiFile(0, 96, [0x00, 0x90, 0x3c]))).toBeUndefined()
  expect(readMidi(midiFile(0, 96, [0x00, 0xff, 0x51, 0x03, 0x07]))).toBeUndefined()
  expect(readMidi(midiFile(0, 96, [0x00, 0x3c, 0x64]))).toBeUndefined()
})

test('a variable-length number of four bytes reads and writes', () => {
  const tick = 0x0fffffff
  const tracks: MidiEvent[][] = [[{ kind: 'tempo', tick, bpm: 120 }]]
  const bytes = writeMidi({ division: 480, tracks })
  expect([...bytes].slice(22, 26)).toEqual([0xff, 0xff, 0xff, 0x7f])
  expect(readMidi(bytes)?.tracks).toEqual(tracks)
})
