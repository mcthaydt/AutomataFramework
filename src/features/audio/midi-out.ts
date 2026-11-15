// A track, a loop or a motif as a Standard MIDI File: the notes the speaker plays (`PlainNote`s), written as a file any
// music program opens. Every number is whole and every table fixed, so the same input gives the same bytes everywhere.
import { type MidiEvent, writeMidi } from '../../lib/midi.ts'
import type { Drum, Instrument, Key, LoopFile, Mode, MotifFile, MusicFile } from '../content/content.ts'
import {
  loopNotes,
  motifNotes,
  notesOf,
  type PlainNote,
  type SongParts,
  stepNotes,
  TICKS_PER_BEAT,
} from './plain-notes.ts'
import { keySignature } from './theory.ts'

/** What can be taken out as a MIDI file. */
export type MidiSource =
  | { readonly type: 'music'; readonly value: MusicFile }
  | { readonly type: 'loop'; readonly value: LoopFile }
  | { readonly type: 'motif'; readonly value: MotifFile }

/** General MIDI's note for each drum. */
const DRUM_NOTES: Readonly<Record<Drum, number>> = { kick: 36, snare: 38, hat: 42, clap: 39, tom: 45 }
/** The channel of the drums, counted from 0: what a player calls channel 10. */
const DRUM_CHANNEL = 9
/** A drum hit has no length; a sixteenth of a beat's four is what a file shows. */
const HIT_TICKS = TICKS_PER_BEAT / 4

/** One lane of a file: its name, what plays it and its notes. */
interface Lane {
  readonly id: string
  readonly instrument: Instrument
  readonly notes: readonly PlainNote[]
}

/** What a source comes to before it is written: a name, how fast, what key, and its lanes. */
interface Song {
  readonly id: string
  readonly tempo: number
  readonly key: Key
  readonly mode: Mode
  readonly lanes: readonly Lane[]
}

/** The notes of a source, grouped into lanes in the order a song lists them. */
function songOf(source: MidiSource, parts: SongParts): Song {
  if (source.type === 'loop') {
    const notes = loopNotes(source.value)
    const instrument = notes[0]?.instrument ?? 'keys'
    const lane = { id: source.value.lane, instrument, notes }
    return { id: source.value.id, tempo: 110, key: 'C', mode: 'major', lanes: [lane] }
  }
  if (source.type === 'motif') {
    const use = { key: 'C', mode: 'major', instrument: 'pluck', volume: 1, lane: 'motif' } as const
    const lane = { id: 'motif', instrument: 'pluck', notes: motifNotes(source.value, use) } as const
    return { id: source.value.id, tempo: 120, key: 'C', mode: 'major', lanes: [lane] }
  }
  const music = source.value
  if (music.format === 1) {
    const all = stepNotes(music)
    const lanes = music.parts.map((part) => ({
      id: part.id,
      instrument: (part.kind === 'drums' ? 'drums' : 'lead') as Instrument,
      notes: all.filter((note) => note.lane === part.id),
    }))
    return { id: music.id, tempo: music.tempo, key: 'C', mode: 'major', lanes }
  }
  const all = notesOf(music, parts)
  const lanes = music.lanes.map((lane) => ({
    id: lane.id,
    instrument: lane.instrument,
    notes: all.filter((note) => note.lane === lane.id),
  }))
  return { id: music.id, tempo: music.tempo, key: music.key, mode: music.mode, lanes }
}

/** A lane's velocity: its volume as a number from 1 to 127. */
const velocityOf = (volume: number): number => Math.max(1, Math.min(127, Math.round(volume * 127)))

/**
 * A format 1 MIDI file at 480 ticks to a beat: a first track with the name, the tempo and the key signature, then one
 * track a lane, drums on channel 10 (the others on 1 to 9 and 11 to 16, in lane order). A loop is written over `I` in C
 * major at 110 beats a minute and a motif in C major at 120. Each track starts with its lane's id as its name.
 */
export function musicToMidi(source: MidiSource, parts: SongParts = {}): Uint8Array<ArrayBuffer> {
  const song = songOf(source, parts)
  const tracks: MidiEvent[][] = [
    [
      { kind: 'name', tick: 0, text: song.id },
      { kind: 'tempo', tick: 0, bpm: song.tempo },
      { kind: 'key', tick: 0, sharps: keySignature(song.key, song.mode), minor: song.mode === 'minor' },
      { kind: 'time', tick: 0, beats: 4, unit: 4 },
    ],
  ]
  // The channels other than the drums', in order: 0 to 8, then 10 to 15.
  const free = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15]
  for (const lane of song.lanes) {
    const channel = lane.instrument === 'drums' ? DRUM_CHANNEL : (free.shift() ?? 0)
    const events: MidiEvent[] = [{ kind: 'name', tick: 0, text: lane.id }]
    for (const note of lane.notes) {
      const hit = typeof note.pitch === 'string'
      events.push({
        kind: 'note',
        tick: note.at,
        ticks: hit ? HIT_TICKS : note.ticks,
        channel,
        pitch: typeof note.pitch === 'string' ? DRUM_NOTES[note.pitch] : note.pitch,
        velocity: velocityOf(note.volume),
      })
    }
    tracks.push(events)
  }
  return writeMidi({ division: TICKS_PER_BEAT, tracks })
}
