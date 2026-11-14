import { z } from 'zod'
import { Id } from './ids.ts'
import { picturePath, unique } from './shared.ts'
import type { ContentTypeInfo } from './type-info.ts'

/** What the neighbour on one side of a tile must be for a picture to be drawn: the same kind of tile, or another. */
export type Neighbour = 'same' | 'other'

/** Which neighbours a picture needs. A side left out does not matter. */
export interface TileWhen {
  readonly up?: Neighbour | undefined
  readonly down?: Neighbour | undefined
  readonly left?: Neighbour | undefined
  readonly right?: Neighbour | undefined
}

/** One way a tile can look: a square of the picture, drawn when its neighbours fit. */
export interface TilePicture {
  /** Which square of the picture, counted left to right and top to bottom from 0. */
  readonly frame: number
  readonly when?: TileWhen | undefined
}

/** One kind of tile: the letter a level's rows use for it, whether it is solid, and how it looks. */
export interface TileKind {
  readonly id: string
  readonly letter: string
  readonly solid: boolean
  /** The first picture whose `when` fits is drawn; the last one has no `when` and is drawn when none fits. */
  readonly pictures: readonly TilePicture[]
}

/** A tileset file once read: one picture cut into equal squares, and what each kind of tile is. */
export interface TilesetFile {
  readonly format: 1
  readonly id: string
  readonly image: string
  readonly tileSize: number
  readonly columns: number
  readonly tiles: readonly TileKind[]
}

/** The letters a level's rows may use: `!` to `~`, less the `.` that always means empty air. */
const LETTER = /^[!-~]$/

const side = z.enum(['same', 'other'])

const picture = z.strictObject({
  frame: z
    .int()
    .min(0)
    .max(4095)
    .describe('Which square of the picture to draw, counted left to right and top to bottom from 0.'),
  when: z
    .strictObject({
      up: side.optional().describe('"same" if the tile above is this kind of tile, "other" if not.'),
      down: side.optional().describe('"same" if the tile below is this kind of tile, "other" if not.'),
      left: side.optional().describe('"same" if the tile on the left is this kind of tile, "other" if not.'),
      right: side
        .optional()
        .describe('"same" if the tile on the right is this kind of tile, "other" if not.'),
    })
    .optional()
    .describe(
      'What the neighbours must be for this picture to be drawn. Left out means always. The last picture has none.',
    ),
})

const tile = z.strictObject({
  id: Id.describe('A name for this kind of tile, like "grass".'),
  letter: z
    .string()
    .regex(LETTER, 'Write one letter, digit or sign from ! to ~, like "G".')
    .describe('The letter a level uses for this tile in its rows, like "G".'),
  solid: z
    .boolean()
    .describe('True if things stand on this tile and bump into it, false if they pass through.'),
  pictures: z
    .array(picture)
    .min(1)
    .max(16)
    .describe(
      'How the tile looks. The first picture whose "when" fits is drawn; the last is the one drawn otherwise.',
    ),
})

/** The checks that look across fields. Written to cope with a half-read file, since it may run beside other problems. */
function checkTileset(tileset: Partial<TilesetFile>, ctx: z.core.$RefinementCtx): void {
  const tiles = tileset.tiles ?? []
  unique(tiles, 'id', 'tile', ['tiles'], ctx)
  const owner = new Map<string, string>()
  tiles.forEach((kind, i) => {
    if (kind.letter === '.')
      ctx.addIssue({
        code: 'custom',
        path: ['tiles', i, 'letter'],
        message: 'The letter . always means empty air. Pick another letter.',
      })
    else if (owner.has(kind.letter))
      ctx.addIssue({
        code: 'custom',
        path: ['tiles', i, 'letter'],
        message: `The letter "${kind.letter}" is already used by the tile "${owner.get(kind.letter)}". Each tile needs its own letter.`,
      })
    else owner.set(kind.letter, kind.id)
    const last = kind.pictures.length - 1
    if (kind.pictures[last]?.when !== undefined)
      ctx.addIssue({
        code: 'custom',
        path: ['tiles', i, 'pictures', last, 'when'],
        message: 'The last picture is the one drawn when no other fits, so it cannot have a "when".',
      })
  })
}

/** The rules for a tileset file; unknown keys are refused. */
export const TilesetSchema: z.ZodType<TilesetFile, TilesetFile> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: Id.describe('A name for this tileset, like "meadow". It matches the file name.'),
    image: picturePath('The picture every tile is cut from'),
    tileSize: z.int().min(4).max(256).describe("One tile's side in the picture, in pixels."),
    columns: z.int().min(1).max(64).describe('How many tiles wide the picture is.'),
    tiles: z.array(tile).min(1).max(93).describe('Every kind of tile this tileset has.'),
  })
  .superRefine(checkTileset)

/** The tileset's row of the content table. */
export const tilesetInfo: ContentTypeInfo<TilesetFile, TilesetFile> = {
  schema: TilesetSchema,
  title: 'Tileset',
  plural: 'tilesets',
  editor: 'world',
  part: 'tiles',
  noun: 'tileset',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the tileset a name like "meadow".',
    image: 'Write where the picture is, like "art/meadow.png".',
    tileSize: 'Write how wide one tile is in the picture, in pixels, like 16.',
    columns: 'Write how many tiles wide the picture is, like 4.',
    tiles: 'List the kinds of tile, each with an id, a letter, solid and pictures.',
    'tiles.id': 'Give the tile a name like "grass".',
    'tiles.letter': 'Write the letter a level uses for this tile, like "G".',
    'tiles.solid': 'Write true if things stand on this tile, or false if they pass through.',
    'tiles.pictures': 'List at least one picture, like [{ "frame": 0 }].',
    'tiles.pictures.frame': 'Say which square of the picture to draw, counted from 0.',
  },
}
