import { z } from 'zod'
import { Id } from './ids.ts'

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
}

/** What a person may write: `upright` can be left out, and then it is false. */
export interface CharacterInput extends Omit<Character, 'upright'> {
  readonly upright?: boolean | undefined
}

const MAX_SIZE = 16

/** One side of the box: more than nothing, and small enough to fit on a screen. */
const side = (what: string): z.ZodNumber => z.number().gt(0).max(MAX_SIZE).describe(what)

/** The rules for a character file; unknown keys are refused. */
export const CharacterSchema: z.ZodType<Character, CharacterInput> = z.strictObject({
  format: z.literal(1).describe('The version of this file format. Always 1.'),
  id: Id.describe('A name for this character, like "hero". It matches the file name.'),
  body: z.enum(['dynamic', 'fixed']).describe('"dynamic" moves and falls; "fixed" stays where it is put.'),
  size: z
    .strictObject({
      w: side('How wide the character is, in tiles.'),
      h: side('How tall the character is, in tiles.'),
    })
    .describe('The size of the character, in tiles.'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Write a colour as # and six digits, like #e4572e.')
    .describe('The colour it is drawn in, as # and six digits, like #e4572e.'),
  upright: z
    .boolean()
    .default(false)
    .describe('True if the character stays on its feet and cannot be tipped over. Left out means false.'),
})
