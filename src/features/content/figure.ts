import { z } from '../../lib/zod.ts'
import { colour } from './colour.ts'
import { Id } from './ids.ts'
import { list, noSuch, unique } from './shared.ts'
import { MAX_PICTURE_SIDE, SHEET_COLUMNS } from './sheet.ts'
import type { ContentTypeInfo } from './type-info.ts'

/** One colour a figure's parts use, named for what it is for (`body`, `trim`, `ink`), never for how it looks. */
export interface FigurePaint {
  readonly id: string
  readonly color: string
}

/** A block or a round, in the frame's pixels. `x` and `y` are its middle; it may be turned about its middle. */
export interface FigurePart {
  readonly id: string
  readonly shape: 'block' | 'round'
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly paint: string
  readonly turn?: number | undefined
}

/** How one part is moved in one pose: shifted by `dx` and `dy` pixels and turned further by `turn` degrees. */
export interface FigureMove {
  readonly part: string
  readonly dx?: number | undefined
  readonly dy?: number | undefined
  readonly turn?: number | undefined
}

/** One way the figure can stand: the figure as its parts say, with these parts moved. */
export interface FigurePose {
  readonly id: string
  readonly moves: readonly FigureMove[]
}

/** The same figure in other colours: the paints that change. Player 2 is drawn in the first variant, and so on. */
export interface FigureVariant {
  readonly id: string
  readonly paints: readonly FigurePaint[]
}

/**
 * A figure file once read: a picture made of parts, and the poses it can take. It paints a character, a tile or a prop,
 * and it is drawn facing right. Sizes and places are in pixels of the picture; `tile` says how many make one tile.
 */
export interface FigureFile {
  readonly format: 1
  readonly id: string
  /** How many pixels of the picture make one tile of the game. */
  readonly tile: number
  /** One pose's size in pixels. */
  readonly frame: { readonly w: number; readonly h: number }
  /** An edge one pixel wide round the whole figure, in this colour. */
  readonly outline?: string | undefined
  readonly paints: readonly FigurePaint[]
  /** Drawn first to last, so the first is at the back. */
  readonly parts: readonly FigurePart[]
  readonly poses: readonly FigurePose[]
  readonly variants?: readonly FigureVariant[] | undefined
}

/** `The figure "hero" has no pose called "runn". It has: idle, run-1, run-2.` The one sentence for a pose that is not there. */
export function noPose(figure: Pick<FigureFile, 'id' | 'poses'>, pose: string): string {
  return `The figure "${figure.id}" has no pose called "${pose}". It has: ${list(figure.poses.map((p) => p.id))}.`
}

const whole = (what: string, min: number, max: number): z.ZodInt =>
  z.int().min(min).max(max).describe(`${what}, in pixels.`)

const paint = z.strictObject({
  id: Id.describe('A name for this colour, for what it is for, like "body", "trim" or "ink".'),
  color: colour('The colour', '#f37f94'),
})

const part = z.strictObject({
  id: Id.describe('A name for this part, used once in this figure, like "head".'),
  shape: z
    .enum(['block', 'round'])
    .describe('"block" is a rectangle; "round" is an ellipse that fills the same box.'),
  x: z
    .number()
    .min(0)
    .max(128)
    .describe("Where the part's middle is, in pixels from the left edge of the frame."),
  y: z
    .number()
    .min(0)
    .max(128)
    .describe("Where the part's middle is, in pixels from the top edge of the frame."),
  w: z.number().gt(0).max(128).describe('How wide the part is, in pixels.'),
  h: z.number().gt(0).max(128).describe('How tall the part is, in pixels.'),
  paint: Id.describe('Which of the figure\'s paints it is drawn in, by id, like "body".'),
  turn: z
    .number()
    .min(-180)
    .max(180)
    .describe('How far it is turned clockwise about its middle, in degrees. Left out means not turned.')
    .optional(),
})

const move = z.strictObject({
  part: Id.describe('Which part moves, by id, like "head".'),
  dx: z
    .number()
    .min(-128)
    .max(128)
    .describe('How far it moves right (left if below 0), in pixels. Left out means not at all.')
    .optional(),
  dy: z
    .number()
    .min(-128)
    .max(128)
    .describe('How far it moves down (up if below 0), in pixels. Left out means not at all.')
    .optional(),
  turn: z
    .number()
    .min(-180)
    .max(180)
    .describe(
      "How much further it turns clockwise, in degrees, added to the part's own. Left out means none.",
    )
    .optional(),
})

const pose = z.strictObject({
  id: Id.describe('A name for this pose, used once in this figure, like "idle" or "run-1".'),
  moves: z
    .array(move)
    .max(32)
    .describe('The parts that move in this pose. Write [] for the figure just as its parts say.'),
})

const variant = z.strictObject({
  id: Id.describe('A name for these colours, used once in this figure, like "two".'),
  paints: z
    .array(paint)
    .min(1)
    .max(16)
    .describe('Only the paints that change, each with the id it has in the figure and its new colour.'),
})

/** How many pictures a figure's sheet holds: every pose, once for the figure and once for each variant. */
function frameCount(figure: Partial<FigureFile>): number {
  return (figure.poses?.length ?? 0) * (1 + (figure.variants?.length ?? 0))
}

/** The checks that look across fields. Written to cope with a half-read file, since it may run beside other problems. */
function checkFigure(figure: Partial<FigureFile>, ctx: z.core.$RefinementCtx): void {
  const add = (path: readonly PropertyKey[], message: string): void =>
    ctx.addIssue({ code: 'custom', path: [...path], message })
  const paints = figure.paints ?? []
  const parts = figure.parts ?? []
  const poses = figure.poses ?? []
  const variants = figure.variants ?? []
  unique(paints, 'id', 'paint', ['paints'], ctx)
  unique(parts, 'id', 'part', ['parts'], ctx)
  unique(poses, 'id', 'pose', ['poses'], ctx)
  unique(variants, 'id', 'variant', ['variants'], ctx)

  const paintIds = paints.map((p) => p.id)
  const partIds = parts.map((p) => p.id)
  const frame = figure.frame
  parts.forEach((p, i) => {
    if (!paintIds.includes(p.paint))
      add(['parts', i, 'paint'], noSuch('paint', p.paint, paintIds, 'This figure'))
    if (frame !== undefined && p.x > frame.w)
      add(['parts', i, 'x'], `${p.x} is outside the frame, which is ${frame.w} pixels wide.`)
    if (frame !== undefined && p.y > frame.h)
      add(['parts', i, 'y'], `${p.y} is outside the frame, which is ${frame.h} pixels tall.`)
  })
  poses.forEach((pos, i) => {
    const seen = new Set<string>()
    pos.moves.forEach((m, j) => {
      const at = ['poses', i, 'moves', j] as const
      if (!partIds.includes(m.part)) add([...at, 'part'], noSuch('part', m.part, partIds, 'This figure'))
      else if (seen.has(m.part))
        add([...at, 'part'], `"${m.part}" is moved twice in this pose. Put its moves together.`)
      seen.add(m.part)
      if (m.dx === undefined && m.dy === undefined && m.turn === undefined)
        add(at, 'Say how the part moves: add "dx", "dy" or "turn".')
    })
  })
  variants.forEach((v, i) => {
    unique(v.paints, 'id', 'paint', ['variants', i, 'paints'], ctx)
    v.paints.forEach((p, j) => {
      if (!paintIds.includes(p.id))
        add(['variants', i, 'paints', j, 'id'], noSuch('paint', p.id, paintIds, 'This figure'))
    })
  })

  if (frame !== undefined && poses.length > 0) {
    const tall = Math.ceil(frameCount(figure) / SHEET_COLUMNS) * frame.h
    if (tall > MAX_PICTURE_SIDE)
      add(
        ['poses'],
        `This figure's picture would be ${tall} pixels tall. A picture can be ${MAX_PICTURE_SIDE} at most: use fewer poses or variants, or a smaller frame.`,
      )
  }
}

/** The rules for a figure file; unknown keys are refused. */
export const FigureSchema: z.ZodType<FigureFile, FigureFile> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: Id.describe('A name for this figure, like "hero". It matches the file name.'),
    tile: whole('How many pixels of the picture make one tile of the game', 4, 64),
    frame: z
      .strictObject({
        w: whole('How wide one pose is', 4, 128),
        h: whole('How tall one pose is', 4, 128),
      })
      .describe('The size of one pose, in pixels.'),
    outline: colour(
      'An edge one pixel wide round the whole figure',
      '#111314',
      'Left out means no edge.',
    ).optional(),
    paints: z
      .array(paint)
      .min(1)
      .max(16)
      .describe('The colours the parts use, each named for what it is for.'),
    parts: z
      .array(part)
      .min(1)
      .max(32)
      .describe('The parts, drawn first to last, so the first is at the back.'),
    poses: z
      .array(pose)
      .min(1)
      .max(64)
      .describe("The ways the figure can stand. Each one is a picture in the figure's sheet."),
    variants: z
      .array(variant)
      .max(8)
      .describe(
        "The same figure in other colours. Player 2's hero is drawn in the first, player 3's in the second, player 4's in the third. Left out means none.",
      )
      .optional(),
  })
  .superRefine(checkFigure)

/** The figure's row of the content table. */
export const figureInfo: ContentTypeInfo<FigureFile, FigureFile> = {
  schema: FigureSchema,
  title: 'Figure',
  plural: 'figures',
  editor: 'characters',
  part: 'figure',
  noun: 'figure',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the figure a name like "hero".',
    tile: 'Write how many pixels make one tile of the game, like 16.',
    frame: 'Write the size of one pose in pixels, like { "w": 24, "h": 24 }.',
    'frame.w': 'Write how wide one pose is, in pixels, like 24.',
    'frame.h': 'Write how tall one pose is, in pixels, like 24.',
    paints: 'List the colours the parts use, each with an id and a color.',
    'paints.id': 'Give the colour a name for what it is for, like "body".',
    'paints.color': 'Write the colour as # and six digits, like #f37f94.',
    parts: 'List at least one part, each with an id, a shape, a place, a size and a paint.',
    'parts.id': 'Give the part a name like "head".',
    'parts.shape': 'Write "block" or "round".',
    'parts.x': 'Write where its middle is, in pixels from the left of the frame.',
    'parts.y': 'Write where its middle is, in pixels from the top of the frame.',
    'parts.w': 'Write how wide it is, in pixels.',
    'parts.h': 'Write how tall it is, in pixels.',
    'parts.paint': 'Write which of the paints it uses, like "body".',
    poses: 'List at least one pose, like { "id": "idle", "moves": [] }.',
    'poses.id': 'Give the pose a name like "idle".',
    'poses.moves': 'Write [] for the figure just as its parts say.',
    'poses.moves.part': 'Write which part moves, like "head".',
    'variants.id': 'Give these colours a name like "two".',
    'variants.paints': 'List the paints that change, each with an id and a color.',
    'variants.paints.id': 'Write which of the figure\'s paints changes, like "body".',
    'variants.paints.color': 'Write the new colour as # and six digits, like #afd472.',
  },
}
