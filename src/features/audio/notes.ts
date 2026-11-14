/**
 * The twelve notes of octave 4, in hertz, from C to B. A table, not `Math.pow(2, n / 12)`, so a pitch is the same
 * number in every engine; the other octaves are this times a power of two, which is exact.
 */
const OCTAVE_4: readonly number[] = [
  261.6256, 277.1826, 293.6648, 311.127, 329.6276, 349.2282, 369.9944, 391.9954, 415.3047, 440, 466.1638,
  493.8833,
]

/** How many steps above C each letter is. */
const LETTER: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

const NOTE = /^([A-G])([#b]?)([0-8])$/

/**
 * A note's pitch in hertz: `hertzOf('A4')` is 440. A flat is the note a step below, so `Db4` is `C#4`, `Cb4` is `B3` and
 * `B#4` is `C5`. `undefined` for anything that is not a note (a rest, a hold, a drum step, a wrong name).
 */
export function hertzOf(note: string): number | undefined {
  const match = NOTE.exec(note)
  if (match === null) return undefined
  let step = (LETTER[match[1] ?? ''] ?? 0) + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0)
  let octave = Number(match[3])
  if (step < 0) {
    step += 12
    octave -= 1
  } else if (step > 11) {
    step -= 12
    octave += 1
  }
  let hertz = OCTAVE_4[step] ?? 0
  // Doubling and halving by hand: each is exact, and no engine's power function is asked for anything.
  for (let o = 4; o < octave; o++) hertz *= 2
  for (let o = 4; o > octave; o--) hertz /= 2
  return hertz
}
