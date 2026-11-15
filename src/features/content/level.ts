import { z } from '../../lib/zod.ts'
import { colour } from './colour.ts'
import { Id } from './ids.ts'
import { type Add, checkLevelBody, pathText } from './level-checks.ts'
import { list, noSuch, variants } from './shared.ts'
import type { ContentTypeInfo } from './type-info.ts'

/** A thing standing in a level: one placed copy of a character. `x` and `y` are its centre, in tiles. */
export interface LevelThing {
  readonly id: string
  readonly character: string
  readonly x: number
  readonly y: number
}

/** Where a player's hero begins. `player` (1 to 4) is the number its commands carry as their source. */
export interface LevelStart {
  readonly player: number
  readonly x: number
  readonly y: number
}

/** A place in a level, in tiles from its left and top edges. */
export interface LevelPoint {
  readonly x: number
  readonly y: number
}

/**
 * Something that holds a thing to the level or to another thing. A `pin` turns the thing about one point (a seesaw's
 * plank on its pin), within `turn` degrees of how it was placed when that is given. A `rope` lets the thing go no
 * further than the rope reaches (a swing's platform on its ropes): `from` is where it is tied to the thing, `to`
 * where its other end is tied, to the `holder` or, with no holder, to the level; `slack` is how much longer the rope
 * is than the gap between its ends. Left out, `holder` means the level itself.
 */
export type LevelJoint =
  | {
      readonly id: string
      readonly kind: 'pin'
      readonly thing: string
      readonly holder?: string | undefined
      readonly x: number
      readonly y: number
      readonly turn?: { readonly min: number; readonly max: number } | undefined
    }
  | {
      readonly id: string
      readonly kind: 'rope'
      readonly thing: string
      readonly holder?: string | undefined
      readonly from: LevelPoint
      readonly to: LevelPoint
      readonly slack?: number | undefined
    }

/**
 * How much of a level the screen shows while the players are close together, in tiles: `w` by `h`. As they spread the
 * camera pulls back, as far as `most` (the whole level when it is left out). Beyond that a player who is left behind is
 * pulled along by the game's rules, which read `most` too, so the limit is one number both sides use.
 */
export interface LevelView {
  readonly w: number
  readonly h: number
  readonly most?: { readonly w: number; readonly h: number } | undefined
}

/**
 * A level file once read. One string per row of tiles, `#` for solid and `.` for empty (or, with a tileset, one letter
 * per tile of it); y points down. `sky` and
 * `ground` are `#rrggbb` and may be left out, and then the level has the framework's own light blue and slate.
 */
export interface Level {
  readonly format: 1
  readonly id: string
  /** The scene the level is played in: its ground, its sky and its backdrop. A level has this or `tiles`. */
  readonly scene?: string | undefined
  /** The tileset whose letters the rows use. Without one, `#` is solid and `.` is empty. */
  readonly tileset?: string | undefined
  /** The backdrop behind it. Left out means only the sky. */
  readonly backdrop?: string | undefined
  readonly sky?: string | undefined
  readonly ground?: string | undefined
  /** Switches the camera on. Left out, the whole level is always in view. */
  readonly view?: LevelView | undefined
  /** The level's own map, for a level with no scene. */
  readonly tiles?: readonly string[] | undefined
  readonly things: readonly LevelThing[]
  readonly starts: readonly LevelStart[]
  /** Pins and ropes that hold things. Left out, nothing is held. */
  readonly joints?: readonly LevelJoint[] | undefined
}

const MAX_SIDE = 256

const thing = z.strictObject({
  id: Id.describe('A name for this thing, used once in this level, like "crate-1".'),
  character: Id.describe('Which character this thing is, by the id in its character file, like "crate".'),
  x: z.number().describe('Where the middle of the thing is, in tiles from the left edge.'),
  y: z.number().describe('Where the middle of the thing is, in tiles from the top edge.'),
})

const start = z.strictObject({
  player: z.int().min(1).max(4).describe('Which player starts here: 1, 2, 3 or 4.'),
  x: z.number().describe('Where the hero starts, in tiles from the left edge.'),
  y: z.number().describe('Where the hero starts, in tiles from the top edge.'),
})

const point = (what: string) =>
  z.strictObject({
    x: z.number().describe(`${what}, in tiles from the left edge.`),
    y: z.number().describe(`${what}, in tiles from the top edge.`),
  })

const heldBy = {
  id: Id.describe('A name for this joint, used once in this level, like "seesaw".'),
  thing: Id.describe('Which thing is held, by its id in this level, like "plank-1".'),
  holder: Id.describe(
    'The thing that holds it, by its id in this level. Left out means the level itself holds it.',
  ).optional(),
}

const pin = z.strictObject({
  ...heldBy,
  kind: z.literal('pin').describe('"pin": the thing turns about one point, as a seesaw does.'),
  x: z.number().describe('Where the pin is, in tiles from the left edge.'),
  y: z.number().describe('Where the pin is, in tiles from the top edge.'),
  turn: z
    .strictObject({
      min: z.number().min(-180).max(180).describe('The furthest it may turn one way, in degrees: 0 or less.'),
      max: z
        .number()
        .min(-180)
        .max(180)
        .describe('The furthest it may turn the other way, in degrees: 0 or more.'),
    })
    .describe('How far the thing may turn from how it was placed. Left out means it turns freely.')
    .optional(),
})

const rope = z.strictObject({
  ...heldBy,
  kind: z
    .literal('rope')
    .describe('"rope": the thing can go no further than the rope reaches, as a swing does.'),
  from: point('Where the rope is tied to the thing'),
  to: point('Where the other end is tied, to the holder or to the level'),
  slack: z
    .number()
    .min(0)
    .max(64)
    .describe('How much longer the rope is than the gap between its ends, in tiles. Left out means none.')
    .optional(),
})

const sizeInTiles = (what: string): z.ZodNumber => z.number().gt(0).max(256).describe(`${what}, in tiles.`)

const screen = z.strictObject({
  w: sizeInTiles('How wide a part of the level the screen shows while the players are close together'),
  h: sizeInTiles('How tall a part of the level the screen shows while the players are close together'),
  most: z
    .strictObject({
      w: sizeInTiles('The widest the camera pulls back to as the players spread'),
      h: sizeInTiles('The tallest the camera pulls back to as the players spread'),
    })
    .describe(
      'The most of the level the camera pulls back to as the players spread. Left out means the whole level.',
    )
    .optional(),
})

/** One row of the map. Which letters it may hold depends on the tileset, so `checkLevel` looks at them. */
const row = z.string().min(1).max(MAX_SIDE)

/** `scene` is the one place a level's ground comes from, and `tiles` the other: a level has exactly one of the two. */
const FROM_SCENE = ['tileset', 'backdrop', 'sky', 'ground'] as const

/**
 * The checks that look across fields: a scene or tiles and not both, every row as long as the first, ids and player
 * numbers used once, and everything inside the map. Written to cope with a half-read file, since it may run beside
 * other problems. A level with a scene is only as big as the scene, which is checked once the game is read.
 */
function checkLevel(level: Partial<Level>, ctx: z.core.$RefinementCtx): void {
  const add: Add = (path, message) => ctx.addIssue({ code: 'custom', path: [...path], message })
  if (level.scene !== undefined && level.tiles !== undefined)
    add(
      ['scene'],
      'This level has a scene and its own tiles. A level with a scene takes its ground from the scene: remove "tiles".',
    )
  else if (level.scene === undefined && level.tiles === undefined)
    add(['scene'], 'This level has no ground. Name a scene, like "scene": "meadow", or write "tiles".')
  if (level.scene !== undefined)
    for (const key of FROM_SCENE)
      if (level[key] !== undefined)
        add(
          [key],
          `A level with a scene takes this from the scene. Remove "${key}", and set it in the scene "${level.scene}".`,
        )
  const tiles = level.tiles ?? []
  // Naming the first wrong letter tells a person where to look.
  const wrong = level.tileset === undefined ? /[^#.]/ : /[^!-~]/
  tiles.forEach((tileRow, i) => {
    const found = wrong.exec(tileRow)
    if (found)
      add(
        ['tiles', i],
        level.tileset === undefined
          ? `Use only # (solid) and . (empty). Found "${found[0]}".`
          : `Use one letter per tile, with no spaces. Found "${found[0]}".`,
      )
  })
  const width = tiles[0]?.length ?? 0
  const height = tiles.length
  tiles.forEach((tileRow, i) => {
    if (i > 0 && tileRow.length !== width)
      add(
        ['tiles', i],
        `This row has ${tileRow.length} tiles but the first row has ${width}. Every row must be the same length.`,
      )
  })
  // Places are held to the level's own tiles only when they are its ground; a scene's size is checked with the game.
  const ownGround = level.scene === undefined && level.tiles !== undefined
  checkLevelBody(level, width, height, add, ownGround ? 'all' : 'names')
}

/** The rules for a level file; unknown keys are refused, so a misspelling is caught instead of ignored. */
export const LevelSchema: z.ZodType<Level, Level> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: Id.describe('A name for this level, like "level-1". It matches the file name.'),
    scene: Id.describe(
      'The scene the level is played in, by the id in its file, like "meadow". The ground, sky and backdrop come from it, so a level with a scene has no "tiles".',
    ).optional(),
    tileset: Id.describe(
      'The tileset whose letters the rows use, by the id in its file, like "meadow". Left out means # is solid and . is empty.',
    ).optional(),
    backdrop: Id.describe(
      'The backdrop behind the level, by the id in its file, like "valley". Left out means only the sky.',
    ).optional(),
    sky: colour(
      'The colour behind the level, which also fills the bars beside it',
      '#9fd3f0',
      'Left out means that light blue.',
    ).optional(),
    ground: colour('The colour of the solid tiles', '#3b4a5a', 'Left out means that slate.').optional(),
    view: screen
      .describe(
        'How much of the level the screen shows, which switches the camera on: it follows the players and pulls back as they spread. Left out means the whole level is always in view.',
      )
      .optional(),
    tiles: z
      .array(row)
      .min(1)
      .max(MAX_SIDE)
      .describe(
        'The map, one text row per line, top to bottom. # is solid ground and . is empty air. With a tileset, each letter is one of its tiles. Left out when the level names a "scene".',
      )
      .optional(),
    things: z.array(thing).max(1024).describe('The things standing in the level, like crates. Can be empty.'),
    starts: z.array(start).min(1).max(4).describe('Where each player begins. At least one is needed.'),
    joints: z
      .array(variants('kind', [pin, rope]))
      .max(256)
      .describe(
        'Pins and ropes that hold things: a seesaw turning on its pin, a swing hung from ropes. Left out means nothing is held.',
      )
      .optional(),
  })
  .superRefine(checkLevel)

/** The level's row of the content table. */
export const levelInfo: ContentTypeInfo<Level, Level> = {
  schema: LevelSchema,
  title: 'Level',
  plural: 'levels',
  editor: 'world',
  part: 'levels',
  noun: 'level',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the level a name like "level-1".',
    scene: 'Write which scene the level is played in, like "meadow".',
    tiles: 'Write the map as a list of text rows, using # for solid and . for empty.',
    things: 'Write [] if the level has no things in it.',
    'things.id': 'Give the thing a name like "crate-1".',
    'things.character': 'Say which character it is, like "crate".',
    'things.x': 'Say where the middle of it is, in tiles from the left.',
    'things.y': 'Say where the middle of it is, in tiles from the top.',
    starts: 'A level needs at least one start point.',
    'starts.player': 'Say which player starts here: 1, 2, 3 or 4.',
    'starts.x': 'Say where the hero starts, in tiles from the left.',
    'starts.y': 'Say where the hero starts, in tiles from the top.',
    'view.w': 'Write how many tiles wide the screen shows, like 16.',
    'view.h': 'Write how many tiles tall the screen shows, like 9.',
    'view.most.w': 'Write the most tiles wide the camera pulls back to, like 32.',
    'view.most.h': 'Write the most tiles tall the camera pulls back to, like 18.',
    'joints.id': 'Give the joint a name like "seesaw".',
    'joints.thing': 'Say which thing is held, like "plank-1".',
    'joints.x': 'Say where the pin is, in tiles from the left.',
    'joints.y': 'Say where the pin is, in tiles from the top.',
    'joints.turn.min': 'Say the furthest it may turn one way, in degrees, like -25.',
    'joints.turn.max': 'Say the furthest it may turn the other way, in degrees, like 25.',
    'joints.from': 'Say where the rope is tied to the thing, like { "x": 7, "y": 6 }.',
    'joints.from.x': 'Say where the rope is tied to the thing, in tiles from the left.',
    'joints.from.y': 'Say where the rope is tied to the thing, in tiles from the top.',
    'joints.to': 'Say where the other end is tied, like { "x": 7, "y": 2 }.',
    'joints.to.x': 'Say where the other end is tied, in tiles from the left.',
    'joints.to.y': 'Say where the other end is tied, in tiles from the top.',
  },
  check(level, game, report) {
    if (level.backdrop !== undefined && !game.has('backdrop', level.backdrop))
      report('backdrop', noSuch('backdrop', level.backdrop, game.ids('backdrop')))
    if (level.scene !== undefined) {
      if (!game.has('scene', level.scene)) report('scene', noSuch('scene', level.scene, game.ids('scene')))
      else {
        const scene = game.get('scene', level.scene)
        // The scene's size is the level's size, so what the level places has to be inside it.
        if (scene !== undefined)
          checkLevelBody(
            level,
            scene.size.w,
            scene.size.h,
            (path, message) => report(pathText(path), message),
            'places',
          )
      }
    }
    if (level.tileset !== undefined) {
      if (!game.has('tileset', level.tileset))
        report('tileset', noSuch('tileset', level.tileset, game.ids('tileset')))
      else {
        const tileset = game.get('tileset', level.tileset)
        const letters = new Set(tileset?.tiles.map((tile) => tile.letter))
        if (tileset !== undefined)
          level.tiles?.forEach((tileRow, r) => {
            const letter = [...tileRow].find((c) => c !== '.' && !letters.has(c))
            if (letter !== undefined)
              report(
                `tiles[${r}]`,
                `The letter "${letter}" is not in the tileset "${tileset.id}". It has: ${list([...letters])}.`,
              )
          })
      }
    }
    level.things.forEach((thing, i) => {
      if (!game.has('character', thing.character))
        report(`things[${i}].character`, noSuch('character', thing.character, game.ids('character')))
    })
    // A fixed thing never moves, so a joint that holds it to the level, or to another fixed thing, holds nothing.
    const fixedCharacter = (id: string | undefined): string | undefined => {
      const character = level.things.find((t) => t.id === id)?.character
      return character !== undefined && game.get('character', character)?.body === 'fixed'
        ? character
        : undefined
    }
    const characterOf = (id: string | undefined): string | undefined =>
      level.things.find((t) => t.id === id)?.character
    level.joints?.forEach((joint, i) => {
      const held = fixedCharacter(joint.thing)
      const holder = joint.holder === undefined ? undefined : fixedCharacter(joint.holder)
      if (held !== undefined && holder !== undefined)
        report(
          `joints[${i}].thing`,
          `The characters "${held}" and "${holder}" are both "fixed", so neither moves and this joint holds nothing. Make one of them "dynamic", or remove this joint.`,
        )
      else if (held !== undefined && joint.holder === undefined)
        report(
          `joints[${i}].thing`,
          `The character "${held}" is "fixed", so it never moves and cannot be joined to the level. Make it "dynamic", or remove this joint.`,
        )
      // An upright thing keeps its rotation locked, so a pin on it holds it still: it can never turn.
      const character = characterOf(joint.thing)
      if (
        joint.kind === 'pin' &&
        character !== undefined &&
        game.get('character', character)?.upright === true
      )
        report(
          `joints[${i}].thing`,
          `The character "${character}" is "upright", so it cannot turn on a pin. Set "upright" to false, or hold it with a rope.`,
        )
    })
  },
}
