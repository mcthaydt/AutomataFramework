// The notes of a song's key, chords and steps, as pitches. A pitch is a MIDI number (C4 is 60), so a song's notes and a
// MIDI file's are the same numbers. Whole-number arithmetic and tables only, so every engine gets the same notes.
import type { Key, Mode } from '../content/content.ts'

/** Semitones above C of each key's first note. */
const ROOTS: Readonly<Record<Key, number>> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
}

/** The seven semitone offsets of the major scale, and of the natural minor. */
const MAJOR: readonly number[] = [0, 2, 4, 5, 7, 9, 11]
const MINOR: readonly number[] = [0, 2, 3, 5, 7, 8, 10]
/** The minor scale with its fifth lowered: the scale of a diminished chord. */
const DIMINISHED: readonly number[] = [0, 2, 3, 5, 6, 8, 10]

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

/** The numerals of a scale's seven steps, the longest first so `vii` is not read as `v` and `iii` as `i`. */
const NUMERALS: readonly (readonly [string, number])[] = [
  ['vii', 7],
  ['iii', 3],
  ['vi', 6],
  ['iv', 4],
  ['ii', 2],
  ['v', 5],
  ['i', 1],
]

/** Semitones above C of a key's first note: `keyRoot('Eb')` is 3. */
export function keyRoot(key: Key): number {
  return ROOTS[key]
}

/** The seven semitone offsets of a mode. */
export function scaleOf(mode: Mode): readonly number[] {
  return mode === 'major' ? MAJOR : MINOR
}

/**
 * A step of a scale as semitones above its first note: 1 to 15 (two octaves), with `b` or `#` in front for the note
 * between. `stepOffset(scaleOf('major'), '8')` is 12 and `'b7'` is 10.
 */
export function stepOffset(scale: readonly number[], step: number | string): number {
  const text = String(step)
  const shift = text.startsWith('b') ? -1 : text.startsWith('#') ? 1 : 0
  const number = Number(shift === 0 ? text : text.slice(1))
  const index = number - 1
  const octave = Math.floor(index / 7)
  return (scale[index - octave * 7] ?? 0) + octave * 12 + shift
}

/** A chord's notes. */
export interface ChordNotes {
  /** Semitones above C, 0 to 11. */
  readonly root: number
  /** The chord's own scale, seven offsets from its root: major for a major chord, minor for a minor one. */
  readonly scale: readonly number[]
  /** Its notes as offsets from its root: `[0, 4, 7]`, `[0, 3, 7, 10]`, `[0, 5, 7]`. */
  readonly tones: readonly number[]
}

/** What a numeral says: which step of the key, its case, a diminished sign and a seventh or a suspension. */
interface Numeral {
  readonly degree: number
  readonly minor: boolean
  readonly diminished: boolean
  readonly seventh: boolean
  readonly sus: boolean
}

/** Reads a numeral like `V7`, `vii°` or `IVsus4`. A text that is none falls back to `I`. */
function readNumeral(numeral: string): Numeral {
  const lower = numeral.toLowerCase()
  const [name, degree] = NUMERALS.find(([n]) => lower.startsWith(n)) ?? ['i', 1]
  const rest = lower.slice(name.length)
  return {
    degree,
    minor: numeral.startsWith(name),
    diminished: rest.startsWith('°'),
    seventh: rest.endsWith('7'),
    sus: rest.endsWith('sus4'),
  }
}

/** The notes of a chord given as a numeral of the key, in the key's mode. */
export function chordOf(numeral: string, key: Key, mode: Mode): ChordNotes {
  const parts = readNumeral(numeral)
  const root = (keyRoot(key) + (scaleOf(mode)[parts.degree - 1] ?? 0)) % 12
  const base = parts.diminished ? [0, 3, 6] : parts.minor ? [0, 3, 7] : [0, 4, 7]
  const tones = parts.sus ? [0, 5, 7] : parts.seventh ? [...base, 10] : base
  const scale = parts.diminished ? DIMINISHED : parts.minor ? MINOR : MAJOR
  // A seventh chord's step 7 is its own seventh, so 3, 5 and 7 land on the chord's notes.
  return { root, scale: parts.seventh ? scale.map((offset, i) => (i === 6 ? 10 : offset)) : scale, tones }
}

/** Keys written with flats name their notes with flats. */
const flatKey = (key: Key): boolean => key.endsWith('b') || key === 'F'

/**
 * The name a person reads: `chordName('vi', 'C', 'major')` is `Am`, `V7` is `G7`, `vii°` is `Bdim` and `IVsus4` is
 * `Fsus4`. A flat key names its notes with flats, every other with sharps.
 */
export function chordName(numeral: string, key: Key, mode: Mode): string {
  const parts = readNumeral(numeral)
  const notes = flatKey(key) ? FLATS : SHARPS
  const name = notes[chordOf(numeral, key, mode).root] ?? 'C'
  const quality = parts.diminished ? 'dim' : parts.minor ? 'm' : ''
  return `${name}${quality}${parts.sus ? 'sus4' : parts.seventh ? '7' : ''}`
}

const NOTE = /^([A-G])([#b]?)([0-8])$/
const LETTER: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** The pitch of a note name: `pitchOf('A4')` is 69. A flat is a step below, so `Cb4` is `B3`. `undefined` for a non-note. */
export function pitchOf(note: string): number | undefined {
  const match = NOTE.exec(note)
  if (match === null) return undefined
  const letter = LETTER[match[1] ?? ''] ?? 0
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0
  return 12 * (Number(match[3]) + 1) + letter + accidental
}

/** The note name of a pitch, with sharps: `noteName(61)` is `C#4`. */
export function noteName(pitch: number): string {
  return `${SHARPS[((pitch % 12) + 12) % 12] ?? 'C'}${Math.floor(pitch / 12) - 1}`
}

/**
 * How many sharps (or, below 0, flats) a key signature has for each key, for the major and the minor. A key with no
 * signature of its own (D# major, A# major, G# major) is written as the key it sounds the same as.
 */
const SIGNATURES: Readonly<Record<Mode, Readonly<Record<Key, number>>>> = {
  major: {
    C: 0,
    'C#': 7,
    Db: -5,
    D: 2,
    'D#': -3,
    Eb: -3,
    E: 4,
    F: -1,
    'F#': 6,
    Gb: -6,
    G: 1,
    'G#': -4,
    Ab: -4,
    A: 3,
    'A#': -2,
    Bb: -2,
    B: 5,
  },
  minor: {
    C: -3,
    'C#': 4,
    Db: 4,
    D: -1,
    'D#': 6,
    Eb: -6,
    E: 1,
    F: -4,
    'F#': 3,
    Gb: 3,
    G: -2,
    'G#': 5,
    Ab: 5,
    A: 0,
    'A#': 7,
    Bb: -5,
    B: 2,
  },
}

/** The sharps (positive) or flats (negative) of a key's signature: `keySignature('A', 'major')` is 3. */
export function keySignature(key: Key, mode: Mode): number {
  return SIGNATURES[mode][key]
}

/** The key named by a signature, from -7 flats to 7 sharps: `keyOfSignature(-3, true)` is C minor. */
export function keyOfSignature(sharps: number, minor: boolean): { readonly key: Key; readonly mode: Mode } {
  const mode: Mode = minor ? 'minor' : 'major'
  const table = SIGNATURES[mode]
  // The names that stand for a signature: the first key in this list that has it.
  const order: readonly Key[] = minor
    ? ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'D', 'G', 'C', 'F', 'Bb', 'Eb']
    : ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']
  const clamped = Math.max(-7, Math.min(7, sharps))
  const found = order.find((key) => table[key] === clamped)
  return { key: found ?? (minor ? 'Ab' : 'B'), mode }
}
