import { z } from '../../lib/zod.ts'
import { colour } from './colour.ts'
import { noPose } from './figure.ts'
import { Id } from './ids.ts'
import { noSuch, unique } from './shared.ts'
import type { ContentTypeInfo } from './type-info.ts'

/**
 * One way a character moves, as a run of poses of its figure: shown in order at `fps` pictures a second, and round
 * again when `loop` is true. The framework plays `idle`, `run`, `jump`, `fall` and `land` by how the character moves; any
 * other clip, like `push` or `talk`, plays when the game or a cutscene asks for it.
 */
export interface Clip {
  readonly id: string
  readonly poses: readonly string[]
  readonly fps: number
  readonly loop: boolean
}

/** A character file once read: what one kind of thing is. Without a `figure` it is drawn as a coloured box. */
export interface Character {
  readonly format: 1
  readonly id: string
  /** `dynamic` bodies move and fall; `fixed` ones stay where they are put. */
  readonly body: 'dynamic' | 'fixed'
  /** Width and height in tiles. */
  readonly size: { readonly w: number; readonly h: number }
  /** `#rrggbb`. */
  readonly color: string
  /** True when the character stays on its feet and cannot be tipped over. */
  readonly upright: boolean
  /** What this is to the game's rules and to behaviour files, like "crate", "spark" or "door". */
  readonly kind?: string | undefined
  /** The figure it is drawn from. Without one it is the coloured box. */
  readonly figure?: string | undefined
  /** The ways it moves, as runs of its figure's poses. Left out, it shows the figure's first pose. */
  readonly clips?: readonly Clip[] | undefined
  /** The behaviour file that decides what it does. */
  readonly behaviour?: string | undefined
  /** The tuning file whose numbers decide how it moves. */
  readonly tuning?: string | undefined
  /**
   * `sense`: things pass through it and the game is told when one touches it. `take`: the same, and it is taken away
   * when a hero touches it. Needs a `kind`, and a `fixed` body.
   */
  readonly touch?: 'sense' | 'take' | undefined
}

/** What a person may write: `upright` can be left out, and then it is false. */
export interface CharacterInput extends Omit<Character, 'upright'> {
  readonly upright?: boolean | undefined
}

const MAX_SIZE = 16

const clip = z.strictObject({
  id: Id.describe('A name for this clip, used once in this character, like "run".'),
  poses: z
    .array(Id)
    .min(1)
    .max(64)
    .describe('The poses of the character\'s figure it shows, in order, by id, like ["run-1", "run-2"].'),
  fps: z.int().min(1).max(60).describe('How many pictures a second it shows, from 1 to 60.'),
  loop: z.boolean().describe('True to go round again at the end, false to hold the last picture.'),
})

/** One side of the box: more than nothing, and small enough to fit on a screen. */
const side = (what: string): z.ZodNumber => z.number().gt(0).max(MAX_SIZE).describe(what)

/** The rules for a character file; unknown keys are refused. */
export const CharacterSchema: z.ZodType<Character, CharacterInput> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: Id.describe('A name for this character, like "hero". It matches the file name.'),
    body: z.enum(['dynamic', 'fixed']).describe('"dynamic" moves and falls; "fixed" stays where it is put.'),
    size: z
      .strictObject({
        w: side('How wide the character is, in tiles.'),
        h: side('How tall the character is, in tiles.'),
      })
      .describe('The size of the character, in tiles.'),
    color: colour('The colour it is drawn in', '#e4572e'),
    upright: z
      .boolean()
      .default(false)
      .describe('True if the character stays on its feet and cannot be tipped over. Left out means false.'),
    kind: Id.describe(
      'What this is to the game\'s rules and to behaviour files, like "crate", "spark" or "door".',
    ).optional(),
    figure: Id.describe(
      'The figure it is drawn from, by id, like "hero". Left out means the coloured box.',
    ).optional(),
    clips: z
      .array(clip)
      .max(32)
      .describe(
        'The ways it moves, as runs of its figure\'s poses. "idle", "run", "jump", "fall" and "land" play by how it moves; any other, like "push" or "talk", plays when the game or a cutscene asks. Left out means the first pose.',
      )
      .optional(),
    behaviour: Id.describe('The behaviour file that decides what it does, by id, like "critter".').optional(),
    tuning: Id.describe('The tuning file whose numbers decide how it moves, by id, like "hero".').optional(),
    touch: z
      .enum(['sense', 'take'])
      .describe(
        '"sense": things pass through it and the game is told when one touches it, like a door. "take": the same, and it is taken away when a hero touches it, like a spark.',
      )
      .optional(),
  })
  .superRefine((character, ctx) => {
    unique(character.clips ?? [], 'id', 'clip', ['clips'], ctx)
    if (character.clips !== undefined && character.clips.length > 0 && character.figure === undefined)
      ctx.addIssue({
        code: 'custom',
        path: ['clips'],
        message: 'Clips play a figure\'s poses, so this character needs a "figure" too.',
      })
    if (character.touch === undefined) return
    if (character.kind === undefined)
      ctx.addIssue({
        code: 'custom',
        path: ['kind'],
        message: 'A character that is touched needs a "kind", so the game can say what was touched.',
      })
    if (character.body === 'dynamic')
      ctx.addIssue({
        code: 'custom',
        path: ['body'],
        message:
          'A character that is touched lets everything through, so it would fall out of the level. Make its body "fixed".',
      })
  })

/** The character's row of the content table. */
export const characterInfo: ContentTypeInfo<Character, CharacterInput> = {
  schema: CharacterSchema,
  title: 'Character',
  plural: 'characters',
  editor: 'characters',
  part: 'clips',
  noun: 'character',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the character a name like "hero".',
    body: 'Write "dynamic" if it moves and falls, or "fixed" if it stays put.',
    size: 'Write the size in tiles, like { "w": 1, "h": 1 }.',
    'size.w': 'Write how wide it is, in tiles.',
    'size.h': 'Write how tall it is, in tiles.',
    color: 'Write the colour as # and six digits, like #e4572e.',
    'clips.id': 'Give the clip a name like "run".',
    'clips.poses': 'List the poses it shows, like ["run-1", "run-2"].',
    'clips.fps': 'Write how many pictures a second it shows, like 8.',
    'clips.loop': 'Write true to go round again at the end, or false to hold the last picture.',
  },
  check(character, game, report) {
    if (character.behaviour !== undefined && !game.has('behaviour', character.behaviour))
      report('behaviour', noSuch('behaviour', character.behaviour, game.ids('behaviour')))
    if (character.tuning !== undefined && !game.has('tuning', character.tuning))
      report('tuning', noSuch('tuning', character.tuning, game.ids('tuning')))
    if (character.figure === undefined) return
    if (!game.has('figure', character.figure)) {
      report('figure', noSuch('figure', character.figure, game.ids('figure')))
      return
    }
    const figure = game.get('figure', character.figure)
    if (figure === undefined) return
    const poses = new Set(figure.poses.map((pose) => pose.id))
    character.clips?.forEach((one, i) => {
      one.poses.forEach((pose, j) => {
        if (!poses.has(pose)) report(`clips[${i}].poses[${j}]`, noPose(figure, pose))
      })
    })
  },
}
