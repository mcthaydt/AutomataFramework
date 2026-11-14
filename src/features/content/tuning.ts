import { z } from 'zod'
import {
  ACTION_NAME,
  MAX_ACTIONS,
  PAD_BUTTONS,
  PAD_STICKS,
  type PadInput,
  RESERVED_KEYS,
  RESERVED_PAD,
} from '../commands/commands.ts'
import { Id } from './ids.ts'
import { unique } from './shared.ts'
import type { ContentTypeInfo } from './type-info.ts'

/** One number a person can change, with the range a slider gets. */
export interface TuningNumber {
  readonly id: string
  /** What the number does, in plain words. */
  readonly about: string
  readonly value: number
  readonly min: number
  readonly max: number
  /** How far one nudge moves it. */
  readonly step: number
}

/** The two lists of keys a shared keyboard gives: the first person's and the second's. */
export type SharedKeys = readonly [readonly string[], readonly string[]]

/** One action's controls as a tuning file lists them: the same fields as the input feature's `ControlEntry`. */
export interface TuningControl {
  readonly action: string
  /** The word on the touch button. */
  readonly label: string
  /** `KeyboardEvent.code` names, like "Space". */
  readonly keys: readonly string[]
  readonly side: 'left' | 'right'
  readonly pad?: readonly PadInput[] | undefined
  readonly shared?: SharedKeys | undefined
}

/** A tuning file once read: the numbers that decide how something plays, and the game's controls. */
export interface TuningFile {
  readonly format: 1
  readonly id: string
  readonly numbers: readonly TuningNumber[]
  readonly controls?: readonly TuningControl[] | undefined
}

const PAD_NAMES: readonly string[] = [...PAD_BUTTONS, ...PAD_STICKS]
const MAX_KEYS = 8
const MAX_LABEL = 12

const keyNames = (what: string): z.ZodArray<z.ZodString> =>
  z.array(z.string().min(1).describe('A key name.')).max(MAX_KEYS).describe(what)

const number = z.strictObject({
  id: Id.describe('A name for this number, like "run-speed".'),
  about: z.string().min(1).max(200).describe('What the number does, in plain words.'),
  value: z.number().describe('How much it is now.'),
  min: z.number().describe('The least it can be.'),
  max: z.number().describe('The most it can be.'),
  step: z.number().gt(0).describe('How far one nudge moves it.'),
})

/** A gamepad name the game knows. The sentence is the input feature's own, with the name that was written. */
const padName = z.string().refine((name) => PAD_NAMES.includes(name), {
  error: (issue) =>
    `"${String(issue.input)}" is not a gamepad button the game knows. Use a name like "south", "dpad-left" or "left-stick-up".`,
})

const control = z.strictObject({
  action: z
    .string()
    .regex(ACTION_NAME, 'Use small letters, numbers and dashes, like "jump".')
    .describe('The name of the action, like "jump".'),
  label: z.string().max(MAX_LABEL).describe(`The word on the touch button, up to ${MAX_LABEL} letters.`),
  keys: keyNames('The keys that do it, as KeyboardEvent.code names, like ["Space"].'),
  side: z.enum(['left', 'right']).describe('Which thumb the touch button sits under.'),
  pad: z
    .array(padName.describe('A gamepad button or stick direction.'))
    .max(4)
    .optional()
    .describe(
      `Gamepad buttons and stick directions that do it. Names: ${[...PAD_BUTTONS, ...PAD_STICKS].join(', ')}.`,
    ),
  shared: z
    .tuple([keyNames("The first person's keys."), keyNames("The second person's keys.")])
    .optional()
    .describe('The keys for two people on one keyboard: the first person’s list, then the second’s.'),
})

const PERSON = ['first', 'second'] as const

/** A control as the schema reads it: gamepad names are text until the check below has refused the unknown ones. */
type ReadControl = Omit<TuningControl, 'pad'> & { readonly pad?: readonly string[] | undefined }

/** Number checks: ids, ranges. */
function checkNumbers(numbers: readonly TuningNumber[], ctx: z.core.$RefinementCtx): void {
  unique(numbers, 'id', 'number', ['numbers'], ctx)
  numbers.forEach((n, i) => {
    if (n.min >= n.max)
      ctx.addIssue({ code: 'custom', path: ['numbers', i, 'min'], message: '"min" must be less than "max".' })
    else if (n.value < n.min || n.value > n.max)
      ctx.addIssue({
        code: 'custom',
        path: ['numbers', i, 'value'],
        message: `${n.value} is outside this number's range, ${n.min} to ${n.max}.`,
      })
  })
}

/**
 * Control checks, in the same words as the input feature's `checkControls`, so a file and a game's code are told the
 * same thing when they slip in the same way.
 */
function checkControls(controls: readonly ReadControl[], ctx: z.core.$RefinementCtx): void {
  const add = (path: readonly PropertyKey[], message: string): void =>
    ctx.addIssue({ code: 'custom', path: [...path], message })
  const seenAction = new Set<string>()
  const keyOwner = new Map<string, string>()
  const padOwner = new Map<string, string>()
  const halfOwner: Map<string, string>[] = [new Map(), new Map()]
  const halfOf = new Map<string, number>()
  const withShared = controls.filter((c) => c.shared !== undefined).length

  controls.forEach((c, i) => {
    const at = ['controls', i] as const
    if (seenAction.has(c.action))
      add([...at, 'action'], `"${c.action}" is listed twice. Each action is listed once.`)
    seenAction.add(c.action)
    if (c.label.trim() === '')
      add([...at, 'label'], `The action "${c.action}" needs a label, the word on its button, like "Jump".`)

    for (const [j, key] of c.keys.entries()) {
      if (RESERVED_KEYS.includes(key)) {
        add(
          [...at, 'keys', j],
          `The key ${key} is kept for the game's menus. Give "${c.action}" another key.`,
        )
        continue
      }
      const other = keyOwner.get(key)
      if (other !== undefined && other !== c.action)
        add(
          [...at, 'keys', j],
          `The key ${key} is used for both "${other}" and "${c.action}". Give each action its own key.`,
        )
      keyOwner.set(key, c.action)
    }

    for (const [j, name] of (c.pad ?? []).entries()) {
      // An unknown name is the schema's own problem, said there.
      if (!PAD_NAMES.includes(name)) continue
      if ((RESERVED_PAD as readonly string[]).includes(name)) {
        add(
          [...at, 'pad', j],
          `The gamepad button ${name} is kept for the game's menus. Give "${c.action}" another button.`,
        )
        continue
      }
      const other = padOwner.get(name)
      if (other !== undefined && other !== c.action)
        add(
          [...at, 'pad', j],
          `The gamepad button ${name} is used for both "${other}" and "${c.action}". Give each action its own button.`,
        )
      padOwner.set(name, c.action)
    }

    if (c.shared === undefined) {
      if (withShared > 0)
        add(
          at,
          `The action "${c.action}" has no keys for a shared keyboard. Give every action "shared" keys, or none of them.`,
        )
      return
    }
    for (const [h, half] of c.shared.entries()) {
      if (half.length === 0)
        add(
          [...at, 'shared', h],
          `The action "${c.action}" has no key for the ${PERSON[h]} person on a shared keyboard. Give it one.`,
        )
      for (const [j, key] of half.entries()) {
        if (RESERVED_KEYS.includes(key)) {
          add(
            [...at, 'shared', h, j],
            `The key ${key} is kept for the game's menus. Give "${c.action}" another key.`,
          )
          continue
        }
        const otherHalf = halfOf.get(key)
        if (otherHalf !== undefined && otherHalf !== h)
          add(
            [...at, 'shared', h, j],
            `The key ${key} is on both halves of a shared keyboard. Each person needs their own keys.`,
          )
        halfOf.set(key, h)
        const other = halfOwner[h]?.get(key)
        if (other !== undefined && other !== c.action)
          add(
            [...at, 'shared', h, j],
            `On a shared keyboard, the key ${key} is used for both "${other}" and "${c.action}". Give each action its own key.`,
          )
        halfOwner[h]?.set(key, c.action)
      }
    }
  })
}

/** The checks that look across fields. Written to cope with a half-read file, since it may run beside other problems. */
function checkTuning(
  tuning: {
    readonly numbers?: readonly TuningNumber[]
    readonly controls?: readonly ReadControl[] | undefined
  },
  ctx: z.core.$RefinementCtx,
): void {
  checkNumbers(tuning.numbers ?? [], ctx)
  checkControls(tuning.controls ?? [], ctx)
}

/** The rules for a tuning file; unknown keys are refused. */
export const TuningSchema: z.ZodType<TuningFile, TuningFile> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: Id.describe('A name for this tuning, like "hero". It matches the file name.'),
    numbers: z.array(number).min(1).max(64).describe('The numbers a person can change, each with its range.'),
    controls: z
      .array(control)
      .max(MAX_ACTIONS)
      .optional()
      .describe(
        "The game's controls: keys, gamepad buttons and the touch button of each action. Left out means none.",
      ),
  })
  .superRefine(checkTuning) as unknown as z.ZodType<TuningFile, TuningFile>
// The cast: the schema reads gamepad names as text and refuses any that are not in `PAD_NAMES`, which the type system
// cannot see, so `pad` is `string[]` to it and `PadInput[]` to everyone else.

/** Each number's value by its id: how a game's code reads a tuning. A frozen map with no prototype. */
export function tuningNumbers(tuning: TuningFile): Readonly<Record<string, number>> {
  const numbers: Record<string, number> = Object.create(null)
  for (const n of tuning.numbers) numbers[n.id] = n.value
  return Object.freeze(numbers)
}

/** The tuning's row of the content table. */
export const tuningInfo: ContentTypeInfo<TuningFile, TuningFile> = {
  schema: TuningSchema,
  title: 'Tuning',
  plural: 'tunings',
  editor: 'feel',
  part: 'tuner',
  noun: 'tuning',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the tuning a name like "hero".',
    numbers: 'List at least one number, each with an id, about, value, min, max and step.',
    'numbers.id': 'Give the number a name like "run-speed".',
    'numbers.about': 'Say in a few words what the number does.',
    'numbers.value': 'Write how much it is now.',
    'numbers.min': 'Write the least it can be.',
    'numbers.max': 'Write the most it can be.',
    'numbers.step': 'Write how far one nudge moves it, like 0.5.',
    'controls.action': 'Give the action a name like "jump".',
    'controls.label': 'Write the word on the touch button, like "Jump".',
    'controls.keys': 'Write the keys as a list, like ["Space"]. Use [] for none.',
    'controls.side': 'Write "left" or "right": which thumb the touch button sits under.',
  },
}
