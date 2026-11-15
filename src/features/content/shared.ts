// Pieces every kind of content file uses. A kind's file imports this and never `load.ts` or `project.ts`: `load.ts`
// imports the table and the table imports each kind, so that import would be a cycle.
import { z } from '../../lib/zod.ts'

/** "crate, hero", or a plain "nothing" for an empty game. Sorted by UTF-16 code unit, the same in every engine. */
export function list(ids: readonly string[]): string {
  return ids.length === 0 ? 'nothing' : [...ids].sort().join(', ')
}

/** `There is no <noun> called "<id>". This game has: a, b.` The one sentence for a name that is not there. */
export function noSuch(noun: string, id: string, known: readonly string[], owner = 'This game'): string {
  return `There is no ${noun} called "${id}". ${owner} has: ${list(known)}.`
}

/** Lower-case words joined by dots or dashes: the shape of a message key and of an event name. */
export const WORDS_PATTERN: RegExp = /^[a-z][a-z0-9]*(?:[-.][a-z0-9]+)*$/

/** The key of one message, like `keeper.hello`. */
export const MessageKey: z.ZodString = z
  .string()
  .max(96)
  .regex(WORDS_PATTERN, 'Use lower-case words joined by dots or dashes, like "keeper.hello".')

/** The name of an event the game raises, like `hero.landed`. */
export const EventName: z.ZodString = z
  .string()
  .max(96)
  .regex(WORDS_PATTERN, 'Write the event\'s name, like "hero.landed".')

/** A length of time the sim uses: whole ticks, at least one, at most `max`. 60 ticks is one second. */
export function ticks(what: string, max: number): z.ZodInt {
  return z.int().min(1).max(max).describe(`${what}, in ticks. 60 ticks is one second.`)
}

/** Relative, with `/`, no `.` or `..` part, ending in `ending`: nothing that could reach outside the game. */
export function isGamePath(path: string, ending: '.json' | '.png' | '.wav'): boolean {
  if (!path.endsWith(ending) || path.includes('\\') || path.includes(':')) return false
  return path.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
}

/**
 * A place in the game that holds files: relative, with `/`, no `.` or `..` part and no ending slash. A name that ends
 * like a file (`.json`, `.png`, `.wav`) is a file, not a folder.
 */
export function isGameFolder(folder: string): boolean {
  if (folder.includes('\\') || folder.includes(':')) return false
  if (/\.(?:json|png|wav)$/.test(folder)) return false
  return folder.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
}

/** The path of a picture inside the game. */
export function picturePath(what: string): z.ZodString {
  return z
    .string()
    .refine(
      (path) => isGamePath(path, '.png'),
      'Use a path inside the game that ends in .png, like art/tiles.png.',
    )
    .describe(`${what}, as a path inside the game, like art/tiles.png.`)
}

/** One of several shapes, told apart by one named field: `variants('do', [{ do: 'stay' }, { do: 'wander', ... }])`. */
export function variants<
  const Key extends string,
  const Options extends readonly [z.core.$ZodTypeDiscriminable, ...z.core.$ZodTypeDiscriminable[]],
>(key: Key, options: Options): z.ZodDiscriminatedUnion<Options, Key> {
  return z.discriminatedUnion(key, options)
}

/** Says `"<id>" is used twice. Each <noun> needs its own id.` at `[...path, i, field]` of every repeat. */
export function unique<T extends object>(
  items: readonly T[],
  field: keyof T & string,
  noun: string,
  path: readonly PropertyKey[],
  ctx: z.core.$RefinementCtx,
): void {
  const seen = new Set<string>()
  items.forEach((item, i) => {
    const id = String(item[field])
    if (seen.has(id))
      ctx.addIssue({
        code: 'custom',
        path: [...path, i, field],
        message: `"${id}" is used twice. Each ${noun} needs its own id.`,
      })
    seen.add(id)
  })
}

/** The keys a song can be in: the notes of an octave, the black ones with a sharp or a flat. */
export const KEYS = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
] as const
export type Key = (typeof KEYS)[number]
/** Whether a song's notes are bright (major) or sad (minor). */
export type Mode = 'major' | 'minor'

export const Key: z.ZodType<Key, Key> = z
  .enum(KEYS)
  .describe('The song\'s key: the note it is built on, like "C" or "F#".')
export const Mode: z.ZodType<Mode, Mode> = z
  .enum(['major', 'minor'])
  .describe('"major" for a bright song, "minor" for a sad one.')

/**
 * A chord as a Roman numeral of the key: `I` to `VII` for a major chord, `i` to `vii` for a minor one (and `vii°`, a lower-case
 * numeral with a `°`, for a diminished one), then `7` or `sus4` if it has one.
 */
export const CHORD: RegExp = /^(?:(?:VII|VI|IV|V|III|II|I)|(?:vii|vi|iv|v|iii|ii|i)°?)(?:7|sus4)?$/
export const Chord: z.ZodString = z
  .string()
  .regex(CHORD, 'Write a chord of the key, like "I", "vi" or "V7".')
  .describe('A chord as a Roman numeral of the key, like "I", "vi", "V7" or "IVsus4".')

/** A step of a scale: 1 to 15, with b or # in front for the note between. In a file it is a number or a string. */
export const STEP: RegExp = /^[b#]?(?:[1-9]|1[0-5])$/

/** The speeds a use of a motif can have: a quarter of the time to four times as fast. */
export type Speed = 0.25 | 0.5 | 1 | 2 | 4

/** The instruments a lane of a song plays. */
export const INSTRUMENTS = ['drums', 'bass', 'keys', 'pluck', 'lead', 'pad', 'bell', 'organ'] as const
export type Instrument = (typeof INSTRUMENTS)[number]

/** The changes a use of a motif carries. Every one may be left out; none written means none. */
export interface MotifChanges {
  /** Whole steps of the key, -14 to 14. */
  readonly shift?: number | undefined
  readonly speed?: Speed | undefined
  /** Play in this mode in place of the song's. */
  readonly mode?: Mode | undefined
  readonly backwards?: boolean | undefined
}

/** The four changes as schema fields, spread into the object that holds them. */
export const motifChanges: {
  readonly shift: z.ZodOptional<z.ZodInt>
  readonly speed: z.ZodOptional<z.ZodType<Speed, Speed>>
  readonly mode: z.ZodOptional<z.ZodType<Mode, Mode>>
  readonly backwards: z.ZodOptional<z.ZodBoolean>
} = {
  shift: z
    .int()
    .min(-14)
    .max(14)
    .optional()
    .describe('Higher or lower, in whole steps of the key, -14 to 14.'),
  speed: z
    .union([z.literal(0.25), z.literal(0.5), z.literal(1), z.literal(2), z.literal(4)], {
      error: 'Write 0.25, 0.5, 1, 2 or 4.',
    })
    .optional()
    .describe('How fast: 0.25, 0.5, 1, 2 or 4 times as fast. Left out, 1.'),
  mode: Mode.optional(),
  backwards: z.boolean().optional().describe('True to play the notes in the other order.'),
}
