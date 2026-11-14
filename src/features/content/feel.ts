import { z } from 'zod'
import { colour } from './colour.ts'
import { Id } from './ids.ts'
import { EventName, ticks } from './shared.ts'
import type { ContentTypeInfo } from './type-info.ts'

/** A burst of dust, in tiles and ticks. */
export interface Dust {
  readonly count: number
  readonly color: string
  /** Tiles a second. */
  readonly speed: number
  /** How long a speck lasts, in ticks. */
  readonly life: number
}

/** The picture shaking, in tiles. */
export interface Shake {
  readonly strength: number
  readonly ticks: number
}

/** The game holding still for a moment, in ticks. */
export interface Freeze {
  readonly ticks: number
}

/** A feel file once read: what happens on screen when one event fires. One effect per file. */
export interface FeelFile {
  readonly format: 1
  readonly id: string
  readonly on: string
  readonly dust?: Dust | undefined
  readonly shake?: Shake | undefined
  readonly freeze?: Freeze | undefined
}

/** A shake of more than one tile or a freeze of more than half a second would make a game unreadable. */
const dust = z.strictObject({
  count: z.int().min(1).max(64).describe('How many specks of dust.'),
  color: colour('The colour of the dust', '#e8dcc0'),
  speed: z.number().gt(0).max(32).describe('How fast the specks fly out, in tiles a second.'),
  life: ticks('How long a speck lasts', 120),
})
const shake = z.strictObject({
  strength: z.number().gt(0).max(1).describe('How far the picture shakes, in tiles. At most 1.'),
  ticks: ticks('How long it shakes', 60),
})
const freeze = z.strictObject({ ticks: ticks('How long the game holds still', 30) })

/** The rules for a feel file; unknown keys are refused. */
export const FeelSchema: z.ZodType<FeelFile, FeelFile> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: Id.describe('A name for this feel, like "land-dust". It matches the file name.'),
    on: EventName.describe('The event that sets it off, like "hero.landed".'),
    dust: dust.optional().describe('A burst of dust. Left out means none.'),
    shake: shake.optional().describe('The picture shakes. Left out means no shake.'),
    freeze: freeze.optional().describe('The game holds still for a moment. Left out means no freeze.'),
  })
  .superRefine((feel, ctx) => {
    if (feel.dust === undefined && feel.shake === undefined && feel.freeze === undefined)
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'Say what happens: add "dust", "shake" or "freeze".',
      })
  })

/** The feel's row of the content table. */
export const feelInfo: ContentTypeInfo<FeelFile, FeelFile> = {
  schema: FeelSchema,
  title: 'Feel',
  plural: 'feels',
  editor: 'feel',
  part: 'feel',
  noun: 'feel',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the feel a name like "land-dust".',
    on: 'Write the event that sets it off, like "hero.landed".',
    'dust.count': 'Write how many specks, like 8.',
    'dust.color': 'Write the colour as # and six digits, like #e8dcc0.',
    'dust.speed': 'Write how fast they fly out, in tiles a second, like 2.',
    'dust.life': 'Write how many ticks a speck lasts, like 20.',
    'shake.strength': 'Write how far the picture shakes, in tiles, like 0.1.',
    'shake.ticks': 'Write how many ticks it shakes, like 10.',
    'freeze.ticks': 'Write how many ticks the game holds still, like 4.',
  },
}
