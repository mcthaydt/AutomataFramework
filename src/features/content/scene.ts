// A scene: one place in a game, in one JSON file. Slice 1 holds its ground: solid tiles, slopes, ledges and back walls,
// each painted from a photo, a tileset or a flat colour in the scene's own paints. A level only names the scene it plays
// in and says what moves and starts there; the scene is where the place is.
import { z } from '../../lib/zod.ts'
import { colour } from './colour.ts'
import { Id } from './ids.ts'
import { PHOTO_NAME } from './photo.ts'
import { PHOTO_LIBRARY } from './photo-library.ts'
import { GROUND_SHAPES, type GroundShape, gapsUnder, slopeRuns } from './scene-ground.ts'
import { list, noSuch, unique, variants } from './shared.ts'
import { groundPageTiles, MAX_PICTURE_SIDE } from './sheet.ts'
import type { ContentTypeInfo } from './type-info.ts'

/** One colour the scene is painted in, with a name for what it is for. */
export interface ScenePaint {
  readonly id: string
  readonly color: string
}

/** Another material on a material's top: `deep` pixels of it along the surface. */
export interface MaterialTop {
  readonly material: string
  readonly deep: number
}

/** A photo, turned into the scene's paints. */
export interface PhotoMaterial {
  readonly id: string
  readonly kind: 'photo'
  readonly photo: string
  readonly ladder?: readonly string[] | undefined
  readonly accent?: readonly string[] | undefined
  readonly match?: number | undefined
  readonly top?: MaterialTop | undefined
  readonly edge?: string | undefined
  readonly scale?: number | undefined
  readonly turn?: boolean | undefined
  readonly wear?: number | undefined
  readonly seed?: number | undefined
  readonly flatten?: number | undefined
  readonly facet?: number | undefined
  readonly contrast?: number | undefined
  readonly hue?: number | undefined
  readonly cluster?: number | undefined
}

/** One kind of tile of a tileset, drawn from the tileset's own picture. */
export interface TilesMaterial {
  readonly id: string
  readonly kind: 'tiles'
  readonly tileset: string
  readonly tile: string
}

/** One of the scene's paints, all over. */
export interface FlatMaterial {
  readonly id: string
  readonly kind: 'flat'
  readonly paint: string
  readonly top?: MaterialTop | undefined
  readonly edge?: string | undefined
}

export type SceneMaterial = PhotoMaterial | TilesMaterial | FlatMaterial

/** What a letter in the ground's rows stands for. */
export interface SceneLetter {
  readonly letter: string
  readonly material: string
  readonly shape: GroundShape
}

export interface SceneGround {
  /** The boxes' color when no picture is drawn. Left out: the framework's slate. */
  readonly color?: string | undefined
  /** One box a row of solid tiles, as an old level had: only `automata scene from-level` writes it. */
  readonly oneBoxPerRow?: true | undefined
  readonly letters: readonly SceneLetter[]
  readonly rows: readonly string[]
}

/** A scene file once read. */
export interface SceneFile {
  readonly format: 1
  readonly id: string
  readonly seed: number
  readonly tile: number
  readonly size: { readonly w: number; readonly h: number }
  readonly sky?: string | undefined
  readonly backdrop?: string | undefined
  readonly paints: readonly ScenePaint[]
  readonly materials: readonly SceneMaterial[]
  readonly ground: SceneGround
}

/** The letters a scene's rows may use: `!` to `~`, less the `.` that always means empty air. */
const LETTER = /^[!-~]$/

const paintId = Id.describe('One of the scene\'s paints, by id, like "grass".')

const top = z.strictObject({
  material: Id.describe(
    'The material drawn along the surface, by id. It must be a photo or a flat material.',
  ),
  deep: z.int().min(1).max(64).describe('How many pixels deep it is. At most one tile.'),
})

const photoMaterial = z.strictObject({
  id: Id.describe('A name for this material, like "earth".'),
  kind: z.literal('photo').describe('"photo": a photo, turned into the scene\'s paints.'),
  photo: z
    .string()
    .max(64)
    .regex(PHOTO_NAME, 'Write the photo\'s name, like "dirt" or "brickYellow".')
    .describe("The photo's name: one of this game's own photos, or one of the library's."),
  ladder: z
    .array(paintId)
    .min(2)
    .max(6)
    .optional()
    .describe('The photo\'s light as steps on these paints, dark to light. Write this or "match".'),
  accent: z
    .array(paintId)
    .min(2)
    .max(6)
    .optional()
    .describe("A second ladder, as long as the first, for where the photo's colour parts from the rest."),
  match: z
    .int()
    .min(2)
    .max(8)
    .optional()
    .describe('Instead of "ladder": keep this many of the photo\'s own colours, each as the nearest paint.'),
  top: top.optional().describe('Another material along the top of the ground.'),
  edge: paintId.optional().describe('A one-pixel line in this paint where the ground meets air.'),
  scale: z.number().min(0.25).max(8).optional().describe('How many times bigger the photo is. Left out: 1.'),
  turn: z.boolean().optional().describe('True turns the photo a quarter turn. Left out: false.'),
  wear: z.number().min(0).max(1).optional().describe('0 is new, 1 is derelict. Left out: 0.3.'),
  seed: z.int().min(0).max(4294967295).optional().describe('Moves where the photo wears. Left out: 0.'),
  flatten: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('How much slow change of light is taken out of the photo. Left out: 0.85.'),
  facet: z
    .int()
    .min(0)
    .max(4)
    .optional()
    .describe('How much the photo is smoothed into patches. Left out: 1.'),
  contrast: z
    .number()
    .min(0.01)
    .max(0.5)
    .optional()
    .describe('The lightness one step of the ladder spans. Only with "ladder". Left out: 0.07.'),
  hue: z
    .number()
    .min(0)
    .max(0.5)
    .optional()
    .describe('How far a colour must part from the rest to take the "accent" paints. Left out: 0.06.'),
  cluster: z
    .int()
    .min(1)
    .max(64)
    .optional()
    .describe('The smallest patch the clean-up keeps, in pixels. Left out: 4.'),
})

const tilesMaterial = z.strictObject({
  id: Id.describe('A name for this material, like "stone".'),
  kind: z.literal('tiles').describe('"tiles": one kind of tile of a tileset, drawn from its picture.'),
  tileset: Id.describe('The tileset, by id, like "meadow".'),
  tile: Id.describe('The tileset\'s kind of tile, by id, like "stone".'),
})

const flatMaterial = z.strictObject({
  id: Id.describe('A name for this material, like "turf".'),
  kind: z.literal('flat').describe('"flat": one of the scene\'s paints, all over.'),
  paint: paintId,
  top: top.optional().describe('Another material along the top of the ground.'),
  edge: paintId.optional().describe('A one-pixel line in this paint where the ground meets air.'),
})

const letter = z.strictObject({
  letter: z
    .string()
    .regex(LETTER, 'Write one letter, digit or sign from ! to ~, like "G".')
    .describe('The letter the rows use for this tile, like "G".'),
  material: Id.describe('What the tile is made of, by material id.'),
  shape: z
    .enum(GROUND_SHAPES)
    .describe('The tile\'s shape: "solid", "slope-up", "ledge", "back" and the rest.'),
})

/** True when a shape is a slope, whole or half. */
const isSlope = (shape: GroundShape): boolean => shape.startsWith('slope') || shape.startsWith('half')

/** The size in pixels the whole ground's picture would be, and the pages it is cut into. */
function pictureSize(
  size: { readonly w: number; readonly h: number },
  tile: number,
): { width: number; height: number; pages: number } {
  const pageTiles = groundPageTiles(tile)
  const pages = Math.ceil(size.w / pageTiles)
  return { width: Math.min(size.w, pageTiles) * tile, height: pages * size.h * tile, pages }
}

/** The checks that look across fields. Written to cope with a half-read file, since it may run beside other problems. */
function checkScene(scene: Partial<SceneFile>, ctx: z.core.$RefinementCtx): void {
  const add = (path: readonly PropertyKey[], message: string): void =>
    ctx.addIssue({ code: 'custom', path: [...path], message })
  const paints = scene.paints ?? []
  const materials = scene.materials ?? []
  const letters = scene.ground?.letters ?? []
  unique(paints, 'id', 'paint', ['paints'], ctx)
  unique(materials, 'id', 'material', ['materials'], ctx)
  const paintIds = paints.map((p) => p?.id)
  const materialIds = materials.map((m) => m?.id)
  const knownPaints = paintIds.filter((id): id is string => id !== undefined)
  const knownMaterials = materialIds.filter((id): id is string => id !== undefined)
  const paintAt = (path: readonly PropertyKey[], id: string | undefined): void => {
    if (id !== undefined && !knownPaints.includes(id))
      add(path, noSuch('paint', id, knownPaints, 'This scene'))
  }

  materials.forEach((m, i) => {
    if (m === undefined) return
    if (m.kind === 'flat') paintAt(['materials', i, 'paint'], m.paint)
    if (m.kind === 'tiles') return
    paintAt(['materials', i, 'edge'], m.edge)
    if (m.top !== undefined) {
      const target = materials.find((other) => other?.id === m.top?.material)
      const topPath = ['materials', i, 'top', 'material']
      if (m.top.material === m.id) add(topPath, 'A material cannot be its own top.')
      else if (target === undefined)
        add(topPath, noSuch('material', m.top.material, knownMaterials, 'This scene'))
      else if (target.kind === 'tiles') add(topPath, 'The top must be a photo or a flat material.')
      if (scene.tile !== undefined && m.top.deep > scene.tile)
        add(
          ['materials', i, 'top', 'deep'],
          `The top can be ${scene.tile} pixels deep at most, one tile. Write ${scene.tile} or less.`,
        )
    }
    if (m.kind !== 'photo') return
    if ((m.ladder === undefined) === (m.match === undefined))
      add(
        ['materials', i],
        'Write "ladder" (a list of paints, dark to light) or "match" (a number of colors), not both.',
      )
    m.ladder?.forEach((id, j) => {
      paintAt(['materials', i, 'ladder', j], id)
    })
    m.accent?.forEach((id, j) => {
      paintAt(['materials', i, 'accent', j], id)
    })
    if (m.accent !== undefined && m.ladder === undefined)
      add(
        ['materials', i, 'accent'],
        '"accent" goes with "ladder", not "match". Remove it, or write a "ladder".',
      )
    else if (m.accent !== undefined && m.ladder !== undefined && m.accent.length !== m.ladder.length)
      add(['materials', i, 'accent'], `"accent" must list ${m.ladder.length} paints, as "ladder" does.`)
    if (m.contrast !== undefined && m.ladder === undefined)
      add(
        ['materials', i, 'contrast'],
        '"contrast" goes with "ladder", not "match". Remove it, or write a "ladder".',
      )
  })

  const owner = new Map<string, string>()
  letters.forEach((entry, i) => {
    if (entry === undefined) return
    if (entry.letter === '.')
      add(['ground', 'letters', i, 'letter'], 'The letter . always means empty air. Pick another letter.')
    else if (owner.has(entry.letter))
      add(
        ['ground', 'letters', i, 'letter'],
        `The letter "${entry.letter}" is already used by the tile "${owner.get(entry.letter)}". Each tile needs its own letter.`,
      )
    else owner.set(entry.letter, entry.material)
    if (entry.material !== undefined && !knownMaterials.includes(entry.material))
      add(
        ['ground', 'letters', i, 'material'],
        noSuch('material', entry.material, knownMaterials, 'This scene'),
      )
    const material = materials.find((m) => m?.id === entry.material)
    if (material?.kind === 'tiles' && entry.shape !== undefined && isSlope(entry.shape))
      add(
        ['ground', 'letters', i, 'shape'],
        "A slope needs a photo or a flat material: a tileset's tile is a whole square.",
      )
  })

  const { size, tile } = scene
  const rows = scene.ground?.rows
  if (size !== undefined && rows !== undefined) {
    if (rows.length !== size.h)
      add(
        ['ground', 'rows'],
        `This scene is ${size.h} tiles tall but has ${rows.length} rows. Write ${size.h} rows.`,
      )
    rows.forEach((row, i) => {
      if (typeof row !== 'string') return
      if (row.length !== size.w)
        add(
          ['ground', 'rows', i],
          `This row has ${row.length} tiles but the scene is ${size.w} wide. Every row must be ${size.w} long.`,
        )
      const unknown = [...row].find((c) => c !== '.' && !owner.has(c))
      if (unknown !== undefined)
        add(
          ['ground', 'rows', i],
          `The letter "${unknown}" is not in this scene's letters. It has: ${list([...owner.keys()])}.`,
        )
    })
  }
  if (size !== undefined && tile !== undefined) {
    const { width, height, pages } = pictureSize(size, tile)
    if (height > MAX_PICTURE_SIDE)
      add(
        ['size'],
        `This scene's ground picture would be ${width} by ${height} pixels, cut into ${pages} pages stacked ${height} pixels tall. A picture can be ${MAX_PICTURE_SIDE} at most: use a smaller "tile", or a smaller scene.`,
      )
  }

  // A slope stands on ground: every tile under its line must be solid, or a foot catches between two tiles.
  const grid = { letters, rows: rows ?? [] }
  const wellFormed =
    size !== undefined &&
    rows !== undefined &&
    rows.length === size.h &&
    rows.every((r) => typeof r === 'string' && r.length === size.w)
  if (wellFormed && letters.every((l) => l?.shape !== undefined))
    for (const run of slopeRuns(grid)) {
      const [gap] = gapsUnder(grid, run)
      if (gap !== undefined)
        add(
          ['ground', 'rows', gap.row],
          `The slope that starts at column ${run.col} needs solid ground under it. The tile at column ${gap.col}, row ${gap.row} is not solid: fill it, or shorten the slope.`,
        )
    }
}

/** The rules for a scene file; unknown keys are refused. */
export const SceneSchema: z.ZodType<SceneFile, SceneFile> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: Id.describe('A name for this scene, like "meadow". It matches the file name.'),
    seed: z
      .int()
      .min(0)
      .max(4294967295)
      .describe('Change this number for another painting of the same description.'),
    tile: z.int().min(4).max(64).describe('How many pixels of the picture make one tile of the game.'),
    size: z
      .strictObject({
        w: z.int().min(1).max(256).describe('How many tiles wide the scene is.'),
        h: z.int().min(1).max(256).describe('How many tiles tall the scene is.'),
      })
      .describe('How big the scene is, in tiles.'),
    sky: colour('The colour of the sky behind the ground', '#9fd3f0', 'Left out: a light blue.').optional(),
    backdrop: Id.optional().describe('A backdrop file drawn behind the ground, by id. Left out: none.'),
    paints: z
      .array(
        z.strictObject({
          id: Id.describe('A name for this paint, like "grass".'),
          color: colour('The paint', '#5fa04a'),
        }),
      )
      .min(1)
      .max(64)
      .describe('The colours the scene is painted in, each named for what it is for.'),
    materials: z
      .array(variants('kind', [photoMaterial, tilesMaterial, flatMaterial]))
      .min(1)
      .max(32)
      .describe("What the ground can be made of: a photo, a tileset's tile, or one paint."),
    ground: z
      .strictObject({
        color: colour('The colour of the ground when no picture is drawn', '#3b4a5a').optional(),
        oneBoxPerRow: z.literal(true).optional().describe('Only "automata scene from-level" writes this.'),
        letters: z
          .array(letter)
          .max(93)
          .describe('What each letter in the rows stands for. "." is always air.'),
        rows: z
          .array(z.string())
          .min(1)
          .max(256)
          .describe('The ground, one string a row, top row first, one letter a tile.'),
      })
      .describe("The scene's ground."),
  })
  .superRefine(checkScene)

/** The scene's row of the content table. */
export const sceneInfo: ContentTypeInfo<SceneFile, SceneFile> = {
  schema: SceneSchema,
  title: 'Scene',
  plural: 'scenes',
  editor: 'world',
  part: 'scenes',
  noun: 'scene',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the scene a name like "meadow".',
    seed: 'Write a whole number, like 7. Another number gives another painting.',
    tile: 'Write how many pixels make one tile, like 16.',
    size: 'Write how big the scene is in tiles, like { "w": 32, "h": 18 }.',
    'size.w': 'Write how many tiles wide the scene is, like 32.',
    'size.h': 'Write how many tiles tall the scene is, like 18.',
    paints: 'List at least one paint, like [{ "id": "grass", "color": "#5fa04a" }].',
    'paints.id': 'Give the paint a name like "grass".',
    'paints.color': 'Write the colour as # and six digits, like #5fa04a.',
    materials: 'List at least one material, like [{ "id": "turf", "kind": "flat", "paint": "grass" }].',
    'materials.id': 'Give the material a name like "earth".',
    'materials.kind': 'Write "photo", "tiles" or "flat".',
    'materials.photo': 'Write the photo\'s name, like "dirt".',
    'materials.tileset': 'Write which tileset, like "meadow".',
    'materials.tile': 'Write which kind of tile of the tileset, like "stone".',
    'materials.paint': 'Write which of the scene\'s paints, like "grass".',
    'materials.top.material': 'Write which material goes on top, like "turf".',
    'materials.top.deep': 'Write how many pixels deep, like 4.',
    ground: 'Write the ground: its letters and its rows.',
    'ground.letters': 'List what each letter stands for. Write [] for none.',
    'ground.letters.letter': 'Write the letter the rows use, like "G".',
    'ground.letters.material': 'Write which material the tile is made of, like "earth".',
    'ground.letters.shape': 'Write "solid", "slope-up", "slope-down", "ledge" or "back".',
    'ground.rows': 'Write one string a row, top row first, like ["....", "GGGG"].',
  },
  check(scene, game, report) {
    if (scene.backdrop !== undefined && !game.has('backdrop', scene.backdrop))
      report('backdrop', noSuch('backdrop', scene.backdrop, game.ids('backdrop')))
    scene.materials.forEach((material, i) => {
      if (
        material.kind === 'photo' &&
        !game.has('photo', material.photo) &&
        !Object.hasOwn(PHOTO_LIBRARY, material.photo)
      )
        report(
          `materials[${i}].photo`,
          `There is no photo called "${material.photo}". This game has: ${list(game.ids('photo'))}. The library has: ${list(Object.keys(PHOTO_LIBRARY))}.`,
        )
      if (material.kind === 'tiles') {
        if (!game.has('tileset', material.tileset)) {
          report(`materials[${i}].tileset`, noSuch('tileset', material.tileset, game.ids('tileset')))
          return
        }
        const tileset = game.get('tileset', material.tileset)
        if (tileset !== undefined && !tileset.tiles.some((t) => t.id === material.tile))
          report(
            `materials[${i}].tile`,
            `The tileset "${material.tileset}" has no tile called "${material.tile}". It has: ${list(tileset.tiles.map((t) => t.id))}.`,
          )
      }
    })
  },
}
