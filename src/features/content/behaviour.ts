import { z } from 'zod'
import { Id } from './ids.ts'
import { list, ticks, unique, variants } from './shared.ts'
import type { ContentTypeInfo, Listed, Report } from './type-info.ts'

/** What a rule looks at. `near` and `far` look for the nearest thing of a kind, in tiles. */
export type Sense =
  | { readonly sense: 'near'; readonly kind: string; readonly within: number }
  | { readonly sense: 'far'; readonly kind: string; readonly beyond: number }
  | { readonly sense: 'blocked' }
  | { readonly sense: 'on-ground' }

/** What a rule makes the character do. Speeds are in tiles a second. */
export type Act =
  | { readonly act: 'stay' }
  | { readonly act: 'wander'; readonly speed: number; readonly turnEvery: number }
  | { readonly act: 'flee'; readonly from: string; readonly speed: number }
  | { readonly act: 'follow'; readonly to: string; readonly speed: number }
  | { readonly act: 'jump'; readonly speed: number }

/** One rule: when every sense in `when` holds, the character does `do`. */
export interface BehaviourRule {
  readonly id: string
  readonly when: readonly Sense[]
  readonly do: Act
}

/** A behaviour file once read: how a character decides. Each tick the first rule whose `when` all holds is followed. */
export interface BehaviourFile {
  readonly format: 1
  readonly id: string
  readonly rules: readonly BehaviourRule[]
}

const tiles = (what: string): z.ZodNumber => z.number().gt(0).max(64).describe(what)
const speed = z.number().gt(0).max(32).describe('How fast, in tiles a second.')
const kind = (what: string): z.ZodString => Id.describe(what)

const sense = variants('sense', [
  z.strictObject({
    sense: z.literal('near').describe('Looks for the nearest thing of a kind.'),
    kind: kind('The kind of thing to look for, like "hero".'),
    within: tiles('It fits when that thing is closer than this, in tiles.'),
  }),
  z.strictObject({
    sense: z.literal('far').describe('Looks for the nearest thing of a kind.'),
    kind: kind('The kind of thing to look for, like "hero".'),
    beyond: tiles('It fits when that thing is farther away than this, in tiles.'),
  }),
  z.strictObject({ sense: z.literal('blocked').describe('Fits when something is in the way ahead.') }),
  z.strictObject({ sense: z.literal('on-ground').describe('Fits when the character stands on something.') }),
])

const act = variants('act', [
  z.strictObject({ act: z.literal('stay').describe('Stands still.') }),
  z.strictObject({
    act: z.literal('wander').describe('Walks one way, and turns around now and then.'),
    speed,
    turnEvery: ticks('How long it walks before it turns around', 3600),
  }),
  z.strictObject({
    act: z.literal('flee').describe('Runs away from the nearest thing of a kind.'),
    from: kind('The kind of thing to run away from, like "hero".'),
    speed,
  }),
  z.strictObject({
    act: z.literal('follow').describe('Walks toward the nearest thing of a kind.'),
    to: kind('The kind of thing to walk toward, like "hero".'),
    speed,
  }),
  z.strictObject({ act: z.literal('jump').describe('Jumps.'), speed }),
])

const rule = z.strictObject({
  id: Id.describe('A name for this rule, like "run-away".'),
  when: z
    .array(sense)
    .max(4)
    .describe(
      'What must all be true for this rule. An empty list always fits, and belongs on the last rule.',
    ),
  do: act.describe('What the character does.'),
})

/** The checks that look across fields. Written to cope with a half-read file, since it may run beside other problems. */
function checkBehaviour(behaviour: Partial<BehaviourFile>, ctx: z.core.$RefinementCtx): void {
  const rules = behaviour.rules ?? []
  unique(rules, 'id', 'rule', ['rules'], ctx)
  rules.forEach((one, i) => {
    const last = i === rules.length - 1
    if (last && one.when.length > 0)
      ctx.addIssue({
        code: 'custom',
        path: ['rules', i, 'when'],
        message: 'The last rule is what the character does when nothing else fits, so its "when" must be [].',
      })
    if (!last && one.when.length === 0)
      ctx.addIssue({
        code: 'custom',
        path: ['rules', i, 'when'],
        message: 'This rule always fits, so the rules after it are never reached. Move it to the end.',
      })
  })
}

/** The kinds a behaviour names, in the order it names them, each with where it is written. */
function namedKinds(behaviour: BehaviourFile): { path: string; kind: string }[] {
  return behaviour.rules.flatMap((one, i) => [
    ...one.when.flatMap((s, j) =>
      s.sense === 'near' || s.sense === 'far' ? [{ path: `rules[${i}].when[${j}].kind`, kind: s.kind }] : [],
    ),
    ...(one.do.act === 'flee' ? [{ path: `rules[${i}].do.from`, kind: one.do.from }] : []),
    ...(one.do.act === 'follow' ? [{ path: `rules[${i}].do.to`, kind: one.do.to }] : []),
  ])
}

/**
 * Every kind a behaviour names must be the `kind` of some character. The kinds are a list over the whole game, so one
 * character file that did not read would make every behaviour that names its kind look wrong: with a broken character
 * the check is skipped, as the loader skips what it cannot see.
 */
function checkKinds(behaviour: BehaviourFile, game: Listed, report: Report): void {
  const characters = game.ids('character').map((id) => game.get('character', id))
  if (characters.some((c) => c === undefined)) return
  const kinds = [...new Set(characters.flatMap((c) => (c?.kind === undefined ? [] : [c.kind])))]
  for (const { path, kind: name } of namedKinds(behaviour))
    if (!kinds.includes(name))
      report(path, `There is no character of the kind "${name}". This game's kinds are: ${list(kinds)}.`)
}

/** The rules for a behaviour file; unknown keys are refused. */
export const BehaviourSchema: z.ZodType<BehaviourFile, BehaviourFile> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: Id.describe('A name for this behaviour, like "critter". It matches the file name.'),
    rules: z
      .array(rule)
      .min(1)
      .max(32)
      .describe('The rules, first to last. Each tick the first rule whose "when" all holds is followed.'),
  })
  .superRefine(checkBehaviour)

/** The behaviour's row of the content table. */
export const behaviourInfo: ContentTypeInfo<BehaviourFile, BehaviourFile> = {
  schema: BehaviourSchema,
  title: 'Behaviour',
  plural: 'behaviours',
  editor: 'characters',
  part: 'schematic',
  noun: 'behaviour',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the behaviour a name like "critter".',
    rules: 'List at least one rule, each with an id, a "when" and a "do".',
    'rules.id': 'Give the rule a name like "run-away".',
    'rules.when': 'Write [] if the rule always fits.',
    'rules.do': 'Say what the character does, like { "act": "stay" }.',
    'rules.when.kind': 'Say which kind of thing to look for, like "hero".',
    'rules.when.within': 'Say how close, in tiles, like 3.',
    'rules.when.beyond': 'Say how far, in tiles, like 8.',
    'rules.do.speed': 'Say how fast, in tiles a second, like 2.',
    'rules.do.turnEvery': 'Say how many ticks it walks before it turns around, like 90.',
    'rules.do.from': 'Say which kind of thing to run away from, like "hero".',
    'rules.do.to': 'Say which kind of thing to walk toward, like "hero".',
  },
  check: checkKinds,
}
