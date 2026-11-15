// The world file (plan W, task 3): where each level sits on the world map. Levels that touch along a side and are
// open there join into one place, so the file never says how levels join, only where they are. No file names a side:
// `check`'s sentences say "left", "right", "top" and "bottom", for a 2D level.
import { z } from '../../lib/zod.ts'
import { Id } from './ids.ts'
import type { LevelPoint } from './level.ts'
import { layoutFor } from './places.ts'
import { noSuch } from './shared.ts'
import type { ContentTypeInfo } from './type-info.ts'

/** A world file once read: each level it places, and where its top left corner is on the map, in tiles. */
export interface WorldFile {
  readonly format: 1
  readonly id: string
  readonly levels: readonly { readonly level: string; readonly at: LevelPoint }[]
}

const placed = z.strictObject({
  level: Id.describe('Which level this is, by its id, like "room-1".'),
  at: z
    .strictObject({
      x: z.number().describe('Where the level\'s left edge is on the map, in tiles.'),
      y: z.number().describe('Where the level\'s top edge is on the map, in tiles.'),
    })
    .describe(
      'Where the level\'s top left corner is on the map, in tiles. Levels that touch along a side, and are open there, join into one place.',
    ),
})

/** The rules for a world file; unknown keys are refused, and a level may be placed once. */
export const WorldSchema: z.ZodType<WorldFile, WorldFile> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: Id.describe('A name for this world, like "world". It matches the file name.'),
    levels: z
      .array(placed)
      .max(1024)
      .describe('The levels on the map, each with where it sits. Levels left out are not on the map.'),
  })
  .superRefine((world, ctx) => {
    const seen = new Set<string>()
    ;(world.levels ?? []).forEach((entry, i) => {
      if (seen.has(entry.level))
        ctx.addIssue({
          code: 'custom',
          path: ['levels', i, 'level'],
          message: `"${entry.level}" is already on the map.`,
        })
      seen.add(entry.level)
    })
  })

/** The world's row of the content table. */
export const worldInfo: ContentTypeInfo<WorldFile, WorldFile> = {
  schema: WorldSchema,
  title: 'World',
  plural: 'worlds',
  editor: 'world',
  part: 'map',
  noun: 'world',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the world a name like "world".',
    levels: 'Write the levels on the map, like [{ "level": "room-1", "at": { "x": 0, "y": 0 } }].',
    'levels.level': 'Say which level this is, like "room-1".',
    'levels.at': 'Say where its top left corner is on the map, like { "x": 0, "y": 0 }.',
    'levels.at.x': 'Say where its left edge is on the map, in tiles.',
    'levels.at.y': 'Say where its top edge is on the map, in tiles.',
  },
  check(world, game, report) {
    world.levels.forEach((entry, i) => {
      if (!game.has('level', entry.level))
        report(`levels[${i}].level`, noSuch('level', entry.level, game.ids('level')))
    })
    for (const problem of layoutFor(world, game)?.problems ?? [])
      report(`levels[${problem.entry}].at`, problem.message)
  },
}
