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
const WORDS_PATTERN = /^[a-z][a-z0-9]*(?:[-.][a-z0-9]+)*$/

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
export function isGamePath(path: string, ending: '.json' | '.png'): boolean {
  if (!path.endsWith(ending) || path.includes('\\') || path.includes(':')) return false
  return path.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
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
