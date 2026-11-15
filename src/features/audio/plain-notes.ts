// A song as plain notes: pitches, ticks and a volume, before any instrument. A MIDI file and the speaker both start from
// these, so what a song plays and what it exports are the same notes. Whole numbers and tables only: every time is a whole
// number of ticks, so every engine gets the same notes.
import {
  type ArrangedMusic,
  type ChordLoop,
  DRUMS,
  type Drum,
  type DrumLoop,
  type GameContent,
  type Instrument,
  type Key,
  type LoopFile,
  type Mode,
  type MotifChanges,
  type MotifFile,
  type NoteLoop,
  STEP,
  type StepMusic,
} from '../content/content.ts'
import { chordOf, keyRoot, pitchOf, scaleOf, stepOffset } from './theory.ts'

/** Ticks to a beat: every time in a plain note is a whole number of these. */
export const TICKS_PER_BEAT = 480
/** Four beats make a bar, always. */
const BEATS_PER_BAR = 4
/** Ticks in one bar. */
export const TICKS_PER_BAR: number = TICKS_PER_BEAT * BEATS_PER_BAR

/** The loops and motifs a song is made from. A `GameContent` fits. */
export type SongParts = Pick<GameContent, 'loops' | 'motifs'>

/** One note of a track before any instrument. */
export interface PlainNote {
  readonly lane: string
  readonly instrument: Instrument
  /** A MIDI pitch for a note; for a drum hit, which drum. */
  readonly pitch: number | Drum
  /** Ticks from the track's start, and how many it lasts (a drum hit: 0). */
  readonly at: number
  readonly ticks: number
  /** The lane's volume times the track's. */
  readonly volume: number
}

/** Where a loop is played: the lane it is in, and the key, the mode and the chord of each bar. */
interface Place {
  readonly lane: string
  readonly instrument: Instrument
  readonly volume: number
  readonly key: Key
  readonly mode: Mode
  /** The chord of bar `bar`, counted from 0. */
  readonly chordAt: (bar: number) => string
}

/** The octave a root sits in, for each kind of loop that has one. */
const ROOT_OCTAVE = { bass: 2, chords: 3, melody: 4 } as const
const rootPitch = (octave: number, root: number): number => 12 * (octave + 1) + root

const stepsOf = (row: string | undefined): string[] => (row === undefined || row === '' ? [] : row.split(' '))

/** The hits of a drum loop played over `bars` bars from bar `first`. */
function drumHits(loop: DrumLoop, place: Place, first: number, bars: number): PlainNote[] {
  const hits: PlainNote[] = []
  const stepTicks = TICKS_PER_BAR / loop.stepsPerBar
  for (const drum of DRUMS) {
    const rows = loop.notes[drum]
    if (rows === undefined) continue
    for (let bar = 0; bar < bars; bar++)
      stepsOf(rows[bar % loop.bars]).forEach((step, i) => {
        if (step !== 'x') return
        hits.push({
          lane: place.lane,
          instrument: place.instrument,
          pitch: drum,
          at: (first + bar) * TICKS_PER_BAR + i * stepTicks,
          ticks: 0,
          volume: place.volume,
        })
      })
  }
  return hits
}

/** The notes of a bass or melody loop: a step of the bar's chord, a fixed note, a rest or a hold. */
function lineNotes(loop: NoteLoop, place: Place, first: number, bars: number): PlainNote[] {
  const notes: PlainNote[] = []
  const stepTicks = TICKS_PER_BAR / loop.stepsPerBar
  const octave = ROOT_OCTAVE[loop.lane]
  // The note sounding now: it grows with every hold and ends at a rest, another note or the end of the block.
  let held: { pitch: number; at: number; ticks: number } | undefined
  const flush = (): void => {
    if (held !== undefined)
      notes.push({
        lane: place.lane,
        instrument: place.instrument,
        pitch: held.pitch,
        at: held.at,
        ticks: held.ticks,
        volume: place.volume,
      })
    held = undefined
  }
  for (let bar = 0; bar < bars; bar++) {
    const chord = chordOf(place.chordAt(first + bar), place.key, place.mode)
    stepsOf(loop.notes[bar % loop.bars]).forEach((step, i) => {
      if (step === '=') {
        if (held !== undefined) held.ticks += stepTicks
        return
      }
      flush()
      const at = (first + bar) * TICKS_PER_BAR + i * stepTicks
      if (STEP.test(step))
        held = { pitch: rootPitch(octave, chord.root) + stepOffset(chord.scale, step), at, ticks: stepTicks }
      else {
        const fixed = pitchOf(step)
        if (fixed !== undefined) held = { pitch: fixed, at, ticks: stepTicks }
      }
    })
  }
  flush()
  return notes
}

/** The voicing's notes of a chord: root, third and fifth (and seventh) from octave 3, spread as the voicing says. */
function voiced(loop: ChordLoop, root: number, tones: readonly number[]): number[] {
  const base = rootPitch(ROOT_OCTAVE.chords, root) + (loop.voicing === 'high' ? 12 : 0)
  return tones.map((tone, i) => base + tone + (loop.voicing === 'open' && i === 1 ? 12 : 0))
}

/** The notes of a chord loop: `x` plays the bar's chord whole, `=` holds it and `-` is a rest. */
function chordNotes(loop: ChordLoop, place: Place, first: number, bars: number): PlainNote[] {
  const notes: PlainNote[] = []
  const stepTicks = TICKS_PER_BAR / loop.stepsPerBar
  let held: { pitches: number[]; at: number; ticks: number } | undefined
  const flush = (): void => {
    if (held !== undefined)
      for (const pitch of held.pitches)
        notes.push({
          lane: place.lane,
          instrument: place.instrument,
          pitch,
          at: held.at,
          ticks: held.ticks,
          volume: place.volume,
        })
    held = undefined
  }
  for (let bar = 0; bar < bars; bar++) {
    const chord = chordOf(place.chordAt(first + bar), place.key, place.mode)
    stepsOf(loop.notes[bar % loop.bars]).forEach((step, i) => {
      if (step === '=') {
        if (held !== undefined) held.ticks += stepTicks
        return
      }
      flush()
      if (step === 'x')
        held = {
          pitches: voiced(loop, chord.root, chord.tones),
          at: (first + bar) * TICKS_PER_BAR + i * stepTicks,
          ticks: stepTicks,
        }
    })
  }
  flush()
  return notes
}

/** A loop played over `bars` bars from bar `first` (counted from 0), as notes. */
function playLoop(loop: LoopFile, place: Place, first: number, bars: number): PlainNote[] {
  if (loop.lane === 'drums') return drumHits(loop, place, first, bars)
  if (loop.lane === 'chords') return chordNotes(loop, place, first, bars)
  return lineNotes(loop, place, first, bars)
}

/** What a use of a motif is played as. */
export type MotifUse = MotifChanges & {
  readonly key: Key
  readonly mode: Mode
  readonly instrument: Instrument
  readonly volume: number
  readonly lane?: string
}

/**
 * One use of a motif as plain notes from tick 0. A note's pitch is its step moved by `shift` (a step that goes below 1
 * or above 15 carries on down or up the scale) in the key and mode of the use, `1` in octave 4. A note
 * lasts its beats divided by `speed`; `backwards` plays them in the other order.
 */
export function motifNotes(motif: MotifFile, use: MotifUse): PlainNote[] {
  const scale = scaleOf(use.mode)
  const speed = use.speed ?? 1
  const ordered = use.backwards === true ? [...motif.notes].reverse() : motif.notes
  let at = 0
  return ordered.map((note) => {
    const text = String(note.step)
    const accidental = text.startsWith('b') || text.startsWith('#') ? text.slice(0, 1) : ''
    const number = Number(accidental === '' ? text : text.slice(1)) + (use.shift ?? 0)
    const ticks = Math.round((note.beats * TICKS_PER_BEAT) / speed)
    const placed: PlainNote = {
      lane: use.lane ?? 'motif',
      instrument: use.instrument,
      pitch: rootPitch(ROOT_OCTAVE.melody, keyRoot(use.key)) + stepOffset(scale, `${accidental}${number}`),
      at,
      ticks,
      volume: use.volume,
    }
    at += ticks
    return placed
  })
}

/** Throws, in plain words, for a loop or motif a song names that the game does not have. */
function missing(music: ArrangedMusic, noun: 'loop' | 'motif', id: string): Error {
  return new Error(`The track "${music.id}" uses a ${noun} called "${id}", which this game does not have.`)
}

/** Where a pitch sorts among the notes that start together: low first, drums in their usual order. */
const order = (pitch: number | Drum): number => (typeof pitch === 'number' ? pitch : DRUMS.indexOf(pitch))

/**
 * A format 2 track as plain notes, in the order they start; notes that start together are in lane order, then low pitch
 * first. A note at or after the track's last tick is dropped and one that runs past it is cut to end there. Throws an
 * `Error` in plain words for a loop or motif the parts do not have.
 */
export function notesOf(music: ArrangedMusic, parts: SongParts): PlainNote[] {
  const end = music.bars * TICKS_PER_BAR
  const found: { note: PlainNote; lane: number }[] = []
  music.lanes.forEach((lane, index) => {
    const volume = lane.volume * music.volume
    const place: Place = {
      lane: lane.id,
      instrument: lane.instrument,
      volume,
      key: music.key,
      mode: music.mode,
      chordAt: (bar) => music.chords[bar] ?? 'I',
    }
    for (const block of lane.blocks) {
      const start = block.at - 1
      let notes: PlainNote[]
      if ('loop' in block) {
        const loop = parts.loops?.[block.loop]
        if (loop === undefined) throw missing(music, 'loop', block.loop)
        notes = playLoop(loop, place, start, block.bars)
      } else {
        const motif = parts.motifs?.[block.motif]
        if (motif === undefined) throw missing(music, 'motif', block.motif)
        const use: MotifUse = {
          ...block,
          key: music.key,
          mode: block.mode ?? music.mode,
          instrument: lane.instrument,
          volume,
          lane: lane.id,
        }
        notes = motifNotes(motif, use).map((note) => ({ ...note, at: note.at + start * TICKS_PER_BAR }))
      }
      for (const note of notes) found.push({ note, lane: index })
    }
  })
  return found
    .filter(({ note }) => note.at < end)
    .sort((a, b) => a.note.at - b.note.at || a.lane - b.lane || order(a.note.pitch) - order(b.note.pitch))
    .map(({ note }) => (note.at + note.ticks > end ? { ...note, ticks: end - note.at } : note))
}

/** The instrument a loop is played by when none is given. */
const DEFAULT_INSTRUMENT: Readonly<Record<LoopFile['lane'], Instrument>> = {
  drums: 'drums',
  bass: 'bass',
  chords: 'keys',
  melody: 'pluck',
}

/** What `loopNotes` may be told. */
export interface LoopOptions {
  /** The chord of each bar, one after the other (the list starts again when it runs out). Default `['I']`. */
  readonly chords?: readonly string[]
  readonly key?: Key
  readonly mode?: Mode
  readonly instrument?: Instrument
  readonly volume?: number
  /** How many bars to play. Default: the loop's own. */
  readonly bars?: number
}

/** A loop on its own, over the chords given, in a key (default C major), as one lane. */
export function loopNotes(loop: LoopFile, options: LoopOptions = {}): PlainNote[] {
  const chords = options.chords === undefined || options.chords.length === 0 ? ['I'] : options.chords
  const place: Place = {
    lane: loop.lane,
    instrument: options.instrument ?? DEFAULT_INSTRUMENT[loop.lane],
    volume: options.volume ?? 1,
    key: options.key ?? 'C',
    mode: options.mode ?? 'major',
    chordAt: (bar) => chords[bar % chords.length] ?? 'I',
  }
  return playLoop(loop, place, 0, options.bars ?? loop.bars).sort(
    (a, b) => a.at - b.at || order(a.pitch) - order(b.pitch),
  )
}

/**
 * Format 1 music as plain notes: each part a lane (a tone part plays `lead`, a drum part's hit is a `snare`). A step is
 * a beat divided by `stepsPerBeat` and rounded to a whole tick; a held note grows by a step for each `=`.
 */
export function stepNotes(music: StepMusic): PlainNote[] {
  const stepTicks = Math.round(TICKS_PER_BEAT / music.stepsPerBeat)
  const notes: PlainNote[] = []
  for (const part of music.parts) {
    const volume = part.volume * music.volume
    const steps = part.notes.flatMap(stepsOf)
    let held: { pitch: number; at: number; ticks: number } | undefined
    const flush = (): void => {
      if (held !== undefined)
        notes.push({
          lane: part.id,
          instrument: 'lead',
          pitch: held.pitch,
          at: held.at,
          ticks: held.ticks,
          volume,
        })
      held = undefined
    }
    steps.forEach((step, i) => {
      if (part.kind === 'drums') {
        if (step === 'x')
          notes.push({
            lane: part.id,
            instrument: 'drums',
            pitch: 'snare',
            at: i * stepTicks,
            ticks: 0,
            volume,
          })
        return
      }
      if (step === '=') {
        if (held !== undefined) held.ticks += stepTicks
        return
      }
      flush()
      const pitch = pitchOf(step)
      if (pitch !== undefined) held = { pitch, at: i * stepTicks, ticks: stepTicks }
    })
    flush()
  }
  return notes.sort((a, b) => a.at - b.at)
}
