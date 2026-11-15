// What a character's things can hold (plan W, task 1). A character lists the values a placed copy of it may carry (a
// number, a switch, a link to other things, a path, a door's way into a level); a thing in a level gives them, and
// `value-checks.ts` holds the one to the other. Nothing here names a side of the screen, a clock or a file.
import { z } from '../../lib/zod.ts'
import { Id } from './ids.ts'
import type { ThingValue } from './level.ts'
import { list, MessageKey, variants } from './shared.ts'

/** How the level view draws a value: a small tag, a ring of reach, an arrow to another thing, a line, or not at all. */
export type ValueShown = 'tag' | 'reach' | 'arrow' | 'path' | 'none'

interface Declared {
  /** Used once in the character, like `opens`. */
  readonly id: string
  /** What an editor calls it, in the team's own words. Never translated. */
  readonly name: string
  readonly about?: string | undefined
  readonly shown?: ValueShown | undefined
}

/** One value a character's things may hold. `type` says what kind of value it is. */
export type ValueDeclaration =
  | (Declared & {
      readonly type: 'number'
      readonly least: number
      readonly most: number
      readonly step?: number | undefined
      readonly default: number
    })
  | (Declared & { readonly type: 'switch'; readonly default: boolean })
  | (Declared & {
      readonly type: 'choice'
      readonly from: readonly { readonly id: string; readonly name: string }[]
      readonly default: string
    })
  | (Declared & { readonly type: 'words'; readonly default?: string | undefined })
  | (Declared & {
      readonly type: 'thing'
      readonly kinds?: readonly string[] | undefined
      readonly most?: number | undefined
      readonly needed?: boolean | undefined
    })
  | (Declared & {
      readonly type: 'path'
      readonly least?: number | undefined
      readonly most?: number | undefined
      readonly loop?: boolean | undefined
    })
  | (Declared & { readonly type: 'leads-to'; readonly needed?: boolean | undefined })

/** What a declaration's `shown` may be, by its type. */
export const SHOWN_FOR: Readonly<Record<ValueDeclaration['type'], readonly ValueShown[]>> = {
  number: ['tag', 'reach', 'none'],
  switch: ['tag', 'none'],
  choice: ['tag', 'none'],
  words: ['tag', 'none'],
  thing: ['arrow', 'none'],
  path: ['path', 'none'],
  'leads-to': ['tag', 'none'],
}

/**
 * How the level view draws a value: its own `shown`, else a number, switch, choice or words value as a 'tag'; a thing
 * as an 'arrow'; a path as a 'path'; a way into a level as a 'tag' (the world sheet draws every door as an arrow
 * whatever this says). A switch's tag is drawn only when the thing's value is not the declaration's default (plan W,
 * task 14, holds that, since it needs the placed value).
 */
export function shownOf(declaration: ValueDeclaration): ValueShown {
  if (declaration.shown !== undefined) return declaration.shown
  return declaration.type === 'thing' ? 'arrow' : declaration.type === 'path' ? 'path' : 'tag'
}

/** A step is a whole number of them from `least`: `1.5` is on a step of 0.5 from 1, `1.3` is not. */
export function onStep(value: number, least: number, step: number): boolean {
  const steps = (value - least) / step
  return Math.abs(steps - Math.round(steps)) < 1e-9
}

const declared = {
  id: Id.describe('A name for this value, used once in this character, like "opens".'),
  name: z
    .string()
    .min(1)
    .max(40)
    .describe('What an editor calls this value, in your own words, like "Opens". It is not translated.'),
  about: z
    .string()
    .max(200)
    .describe('A short help line for whoever sets this value. Left out means none.')
    .optional(),
  shown: z
    .enum(['tag', 'reach', 'arrow', 'path', 'none'])
    .describe(
      'How the level view draws it: "tag" a small badge, "reach" a ring, "arrow" a line to another thing, "path" a line through places, "none" not at all. A number may be a tag, a reach or none; a switch, choice, words or leads-to value a tag or none; a thing an arrow or none; a path a path or none. Left out means the usual one for its type.',
    )
    .optional(),
}

const numberValue = z.strictObject({
  ...declared,
  type: z.literal('number').describe('"number": a number between two limits.'),
  least: z.number().describe('The smallest it may be.'),
  most: z.number().describe('The largest it may be.'),
  step: z
    .number()
    .gt(0)
    .describe('It moves in jumps of this size from "least". Left out means any number in between.')
    .optional(),
  default: z.number().describe('What a thing holds when it says nothing. Between "least" and "most".'),
})

const switchValue = z.strictObject({
  ...declared,
  type: z.literal('switch').describe('"switch": yes or no.'),
  default: z.boolean().describe('What a thing holds when it says nothing: true or false.'),
})

const choiceValue = z.strictObject({
  ...declared,
  type: z.literal('choice').describe('"choice": one of a few named options.'),
  from: z
    .array(
      z.strictObject({
        id: Id.describe('The option\'s name in a file, like "red".'),
        name: z
          .string()
          .min(1)
          .max(40)
          .describe('What an editor calls this option, in your own words. It is not translated.'),
      }),
    )
    .min(1)
    .max(16)
    .describe('The options, from 1 to 16.'),
  default: Id.describe('The option a thing holds when it says nothing, by its name.'),
})

const wordsValue = z.strictObject({
  ...declared,
  type: z
    .literal('words')
    .describe('"words": the key of one of the game\'s own messages, like "sign.welcome".'),
  default: MessageKey.describe('The key a thing holds when it says nothing. Left out means none.').optional(),
})

const thingValue = z.strictObject({
  ...declared,
  type: z.literal('thing').describe('"thing": a link to other things in the same level.'),
  kinds: z
    .array(Id)
    .max(16)
    .describe('The kinds of thing it may link to, like ["gate"]. Left out means any.')
    .optional(),
  most: z
    .int()
    .min(1)
    .max(16)
    .describe(
      'How many things it may link to, from 1 to 16. 1, or left out, means one thing, written as its id; more means a list of up to that many.',
    )
    .optional(),
  needed: z
    .boolean()
    .describe('True when every thing of this character must say it. Left out means false.')
    .optional(),
})

const pathValue = z.strictObject({
  ...declared,
  type: z.literal('path').describe('"path": a list of places in the level, one after another.'),
  least: z.int().min(2).max(64).describe('The fewest places it needs. Left out means 2.').optional(),
  most: z.int().min(2).max(64).describe('The most places it may have. Left out means 64.').optional(),
  loop: z
    .boolean()
    .describe('True when the end of the path joins its start. Left out means false.')
    .optional(),
})

const leadsToValue = z.strictObject({
  ...declared,
  type: z
    .literal('leads-to')
    .describe('"leads-to": a way into another level, and a thing in it to come out beside.'),
  needed: z
    .boolean()
    .describe('True when every thing of this character must say it. Left out means false.')
    .optional(),
})

/** One value a character declares. Unknown keys are refused; the checks across fields are `checkDeclarations`'. */
export const valueDeclaration: z.ZodType<ValueDeclaration> = variants('type', [
  numberValue,
  switchValue,
  choiceValue,
  wordsValue,
  thingValue,
  pathValue,
  leadsToValue,
])

/** What a declaration of this type is called in a sentence that starts with it. */
const WHAT: Readonly<Record<ValueDeclaration['type'], string>> = {
  number: 'A number',
  switch: 'A switch',
  choice: 'A choice',
  words: 'Words',
  thing: 'A thing',
  path: 'A path',
  'leads-to': 'A way into a level',
}

/** `1`, `0.5`: a number as a person writes it. */
const show = (n: number): string => String(n)

/**
 * The checks on a character's `values` that look across fields: ids used once, limits the right way round, defaults
 * inside them, and a `shown` the type can draw. Written to cope with a half-read list, since it may run beside other
 * problems; a declaration that did not read has no `type` and is skipped.
 */
export function checkDeclarations(
  values: readonly Partial<ValueDeclaration>[],
  ctx: z.core.$RefinementCtx,
): void {
  const add = (i: number, field: string, message: string): void =>
    ctx.addIssue({ code: 'custom', path: ['values', i, field], message })
  const seen = new Set<string>()
  values.forEach((value, i) => {
    if (value.id !== undefined) {
      if (seen.has(value.id)) add(i, 'id', `"${value.id}" is used twice. Each value needs its own id.`)
      seen.add(value.id)
    }
    if (value.type === undefined) return
    if (value.shown !== undefined && !SHOWN_FOR[value.type].includes(value.shown))
      add(
        i,
        'shown',
        `${WHAT[value.type]} cannot be shown as "${value.shown}". Use one of: ${list(SHOWN_FOR[value.type])}.`,
      )
    if (value.type === 'number') {
      const { least, most, step, default: fallback } = value
      if (least === undefined || most === undefined || fallback === undefined) return
      if (least > most) {
        add(i, 'least', '"least" must not be more than "most".')
        return
      }
      if (fallback < least || fallback > most)
        add(i, 'default', `The default must be from ${show(least)} to ${show(most)}. Got ${show(fallback)}.`)
      else if (step !== undefined && !onStep(fallback, least, step))
        add(
          i,
          'default',
          `The default must be ${show(least)} plus a whole number of steps of ${show(step)}. Got ${show(fallback)}.`,
        )
    } else if (value.type === 'choice') {
      const ids = (value.from ?? []).map((option) => option.id)
      if (value.default !== undefined && !ids.includes(value.default))
        add(i, 'default', `The default must be one of: ${list(ids)}. Got "${value.default}".`)
      const options = new Set<string>()
      ;(value.from ?? []).forEach((option, j) => {
        if (options.has(option.id))
          ctx.addIssue({
            code: 'custom',
            path: ['values', i, 'from', j, 'id'],
            message: `"${option.id}" is used twice. Each option needs its own id.`,
          })
        options.add(option.id)
      })
    } else if (value.type === 'path') {
      if (value.least !== undefined && value.most !== undefined && value.least > value.most)
        add(i, 'least', '"least" must not be more than "most".')
    }
  })
}

/**
 * A thing's values with its character's defaults filled in: what the thing wrote, and for each declared value it left
 * out, the declaration's default. A value with no default (a link, a path, a way into a level) and none written is
 * absent. A thing with values its character does not declare keeps them: the checks report them, not this.
 */
export function withDefaults(
  character: { readonly values?: readonly ValueDeclaration[] | undefined },
  thing: { readonly values?: Readonly<Record<string, ThingValue>> | undefined },
): Readonly<Record<string, ThingValue>> {
  const filled: Record<string, ThingValue> = { ...thing.values }
  for (const declaration of character.values ?? []) {
    if (Object.hasOwn(filled, declaration.id)) continue
    if (declaration.type === 'number' || declaration.type === 'switch' || declaration.type === 'choice')
      filled[declaration.id] = declaration.default
    else if (declaration.type === 'words' && declaration.default !== undefined)
      filled[declaration.id] = declaration.default
  }
  return filled
}
