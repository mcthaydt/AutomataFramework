// A new sound from a kind and a seed. Each kind is a recipe in `library/kinds.json`: the numbers of a tone or a hiss as
// ranges, drawn from a seeded stream, so the same kind and seed make the same sound in every engine and the next seed is
// another take. Whole numbers and one multiply per draw: no engine's `Math.random` or power function is asked for anything.
import type { NoiseVoice, SoundFile, ToneVoice, Wave } from '../content/content.ts'
import data from './library/kinds.json' with { type: 'json' }

/** The kinds of sound that can be made, in the order their recipes are in the file. */
export const SOUND_KINDS = [
  'jump',
  'land',
  'coin',
  'hit',
  'explosion',
  'door',
  'click',
  'power-up',
  'laser',
  'blip',
] as const
export type SoundKind = (typeof SOUND_KINDS)[number]

/** A number as a recipe writes it: fixed, or any number from `low` to `high`. */
type Range = number | readonly [number, number]
/** So many times (a range) the pitch of the voice before, counted from 0. */
interface Times {
  readonly times: readonly [number, number]
  readonly of: number
}
/** Where the voice before ends, counted from 0. */
interface After {
  readonly after: number
}

interface ToneRecipe {
  readonly kind: 'tone'
  /** A wave, or a list to pick one from. */
  readonly wave: Wave | readonly Wave[]
  readonly from: Range | Times
  /** Left out: the pitch is held, so it is `from`. */
  readonly to?: Range | Times
  readonly at: Range | After
  readonly length: Range
  readonly volume: Range
}
interface NoiseRecipe {
  readonly kind: 'noise'
  readonly pitch: Range
  readonly at: Range
  readonly length: Range
  readonly volume: Range
}
interface Kinds {
  readonly [kind: string]: { readonly volume: number; readonly voices: readonly (ToneRecipe | NoiseRecipe)[] }
}

const recipes = data as unknown as Kinds

const MODULUS = 2147483647
/** Park-Miller's multiplier. A product of it and a state is under 2^53, so it is exact in every engine. */
const MULTIPLIER = 16807
/**
 * Steps taken before the first draw, besides one for each kind's place. A small seed gives small first draws, so
 * seeds 0 and 1 would sound the same; a few steps spread them.
 */
const WARM_UP = 3

/** Rounded to three places, the same in every engine. */
const round = (x: number): number => Math.round(x * 1000) / 1000

const isPair = (value: unknown): value is readonly [number, number] => Array.isArray(value)

/**
 * A new sound of a kind. The same kind and seed give the same sound everywhere; the next seed is another take. `seed` is
 * a whole number from 0 and `id` is the kind's name unless one is given. The answer is a valid sound file. Throws a
 * `RangeError` in plain words for a seed that is not a whole number from 0, and an `Error` for a kind that is not one.
 * Numbers are drawn in the order of a voice's fields: the wave, then the pitch, the end pitch, `at`, `length`, `volume`.
 */
export function makeSound(kind: SoundKind, seed: number, id: string = kind): SoundFile {
  if (!Number.isInteger(seed) || seed < 0)
    throw new RangeError(`A seed is a whole number from 0, like 3. Got ${String(seed)}.`)
  const place = SOUND_KINDS.indexOf(kind)
  const recipe = recipes[kind]
  if (place < 0 || recipe === undefined)
    throw new Error(
      `There is no kind of sound called "${String(kind)}". The kinds are: ${SOUND_KINDS.join(', ')}.`,
    )
  let state = seed + 1
  const step = (): number => {
    state = (state * MULTIPLIER) % MODULUS
    return state / MODULUS
  }
  for (let i = 0; i < place + WARM_UP; i++) step()
  const draw = (range: Range): number =>
    isPair(range) ? round(range[0] + (range[1] - range[0]) * step()) : range
  const voices: (ToneVoice | NoiseVoice)[] = []
  /** A tone's pitch: drawn, or a multiple of an earlier tone's. */
  const pitch = (value: Range | Times): number => {
    if (typeof value === 'number' || isPair(value)) return draw(value)
    const before = voices[value.of]
    return round((before?.kind === 'tone' ? before.from : 0) * draw(value.times))
  }
  /** Where a voice starts: drawn, or where an earlier voice ends. */
  const start = (value: Range | After): number => {
    if (typeof value === 'number' || isPair(value)) return draw(value)
    const before = voices[value.after]
    return before === undefined ? 0 : round(before.at + before.length)
  }
  for (const part of recipe.voices) {
    if (part.kind === 'noise') {
      const hiss = draw(part.pitch)
      const at = draw(part.at)
      const length = draw(part.length)
      voices.push({ kind: 'noise', pitch: hiss, at, length, volume: draw(part.volume) })
      continue
    }
    const waves = typeof part.wave === 'string' ? [part.wave] : part.wave
    const wave = waves.length === 1 ? waves[0] : waves[Math.floor(step() * waves.length)]
    const from = pitch(part.from)
    const to = part.to === undefined ? from : pitch(part.to)
    const at = start(part.at)
    const length = draw(part.length)
    voices.push({ kind: 'tone', wave: wave ?? 'sine', from, to, at, length, volume: draw(part.volume) })
  }
  return { format: 1, id, volume: recipe.volume, voices }
}
