import { pitchOf } from './theory.ts'

/**
 * The twelve notes of octave 4, in hertz, from C to B. A table, not `Math.pow(2, n / 12)`, so a pitch is the same
 * number in every engine; the other octaves are this times a power of two, which is exact.
 */
const OCTAVE_4: readonly number[] = [
  261.6256, 277.1826, 293.6648, 311.127, 329.6276, 349.2282, 369.9944, 391.9954, 415.3047, 440, 466.1638,
  493.8833,
]

/**
 * A pitch's frequency in hertz, from 0 to 127 (a MIDI number, so 69 is 440). The note is looked up in the table and
 * its octave reached by doubling or halving by hand: each is exact, and no engine's power function is asked for anything.
 */
export function hertzOfPitch(pitch: number): number {
  const step = ((pitch % 12) + 12) % 12
  const octave = Math.floor(pitch / 12) - 1
  let hertz = OCTAVE_4[step] ?? 0
  for (let o = 4; o < octave; o++) hertz *= 2
  for (let o = 4; o > octave; o--) hertz /= 2
  return hertz
}

/**
 * A note's pitch in hertz: `hertzOf('A4')` is 440. A flat is the note a step below, so `Db4` is `C#4`, `Cb4` is `B3` and
 * `B#4` is `C5`. `undefined` for anything that is not a note (a rest, a hold, a drum step, a wrong name).
 */
export function hertzOf(note: string): number | undefined {
  const pitch = pitchOf(note)
  return pitch === undefined ? undefined : hertzOfPitch(pitch)
}
