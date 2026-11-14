import { z } from 'zod'
import { colour } from './colour.ts'
import { Id } from './ids.ts'
import { noSuch } from './shared.ts'
import type { ContentTypeInfo } from './type-info.ts'

/** A character file once read: what one kind of thing is. M1 draws it as a coloured box. */
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
  },
  check(character, game, report) {
    if (character.behaviour !== undefined && !game.has('behaviour', character.behaviour))
      report('behaviour', noSuch('behaviour', character.behaviour, game.ids('behaviour')))
    if (character.tuning !== undefined && !game.has('tuning', character.tuning))
      report('tuning', noSuch('tuning', character.tuning, game.ids('tuning')))
  },
}
