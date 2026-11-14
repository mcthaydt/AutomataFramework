import { z } from '../../lib/zod.ts'
import { colour } from './colour.ts'
import { noPose } from './figure.ts'
import { Id } from './ids.ts'
import { noSuch, unique } from './shared.ts'
import { MAX_PICTURE_SIDE, stripHeight } from './sheet.ts'
import type { ContentTypeInfo } from './type-info.ts'

/** What a layer is painted as: a flat band, rolling hills, pointed mountains or soft clouds. */
export type LayerKind = 'flat' | 'hills' | 'mountains' | 'clouds'

/** One strip of a backdrop. It stands on the level's bottom edge and repeats sideways. */
export interface BackdropLayer {
  readonly id: string
  readonly kind: LayerKind
  readonly color: string
  /** How high it reaches, in tiles above the level's bottom edge. */
  readonly height: number
  /** 0 stays still on the screen, like far mountains; 1 moves with the level. */
  readonly drift: number
}

/** A figure standing on a layer, drawn by the renderer and moving with the layer. */
export interface BackdropProp {
  readonly id: string
  readonly figure: string
  /** Left out means the figure's first pose. */
  readonly pose?: string | undefined
  readonly layer: string
  /** Where the middle of its foot is, in tiles from the level's left edge. */
  readonly x: number
  /** How far its foot is above the level's bottom edge, in tiles. */
  readonly up: number
}

/** A backdrop file once read: what is behind a level, as layers that repeat sideways, back to front. */
export interface BackdropFile {
  readonly format: 1
  readonly id: string
  /** Another number gives another painting of the same description. */
  readonly seed: number
  /** How many pixels of the picture make one tile of the game. */
  readonly tile: number
  /** How many tiles wide a layer is before it repeats. */
  readonly width: number
  readonly layers: readonly BackdropLayer[]
  readonly props: readonly BackdropProp[]
}

const layer = z.strictObject({
  id: Id.describe('A name for this layer, used once in this backdrop, like "hills".'),
  kind: z
    .enum(['flat', 'hills', 'mountains', 'clouds'])
    .describe('How it is painted: "flat" is a band, then "hills", "mountains" or "clouds".'),
  color: colour('The colour of the layer', '#afd472'),
  height: z.number().gt(0).max(64).describe("How high it reaches, in tiles above the level's bottom edge."),
  drift: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'How much it moves with the level: 0 stays still on the screen like far mountains, 1 moves with it.',
    ),
})

const prop = z.strictObject({
  id: Id.describe('A name for this prop, used once in this backdrop, like "tree-1".'),
  figure: Id.describe('Which figure stands there, by id, like "tree".'),
  pose: Id.describe("Which of the figure's poses. Left out means its first.").optional(),
  layer: Id.describe('The layer it stands on and moves with, by id, like "hills".'),
  x: z
    .number()
    .min(0)
    .max(256)
    .describe("Where the middle of its foot is, in tiles from the level's left edge."),
  up: z.number().min(0).max(64).describe("How far its foot is above the level's bottom edge, in tiles."),
})

/** The checks that look across fields. Written to cope with a half-read file, since it may run beside other problems. */
function checkBackdrop(backdrop: Partial<BackdropFile>, ctx: z.core.$RefinementCtx): void {
  const add = (path: readonly PropertyKey[], message: string): void =>
    ctx.addIssue({ code: 'custom', path: [...path], message })
  const layers = backdrop.layers ?? []
  const props = backdrop.props ?? []
  unique(layers, 'id', 'layer', ['layers'], ctx)
  unique(props, 'id', 'prop', ['props'], ctx)
  const layerIds = layers.map((l) => l.id)
  props.forEach((p, i) => {
    if (!layerIds.includes(p.layer))
      add(['props', i, 'layer'], noSuch('layer', p.layer, layerIds, 'This backdrop'))
  })
  const { tile, width } = backdrop
  if (tile === undefined) return
  if (width !== undefined && width * tile > MAX_PICTURE_SIDE)
    add(
      ['width'],
      `This backdrop's picture would be ${width * tile} pixels wide. A picture can be ${MAX_PICTURE_SIDE} at most: use a smaller "width" or "tile".`,
    )
  const tall = layers.reduce((total, l) => total + stripHeight(l.height, tile), 0)
  if (tall > MAX_PICTURE_SIDE)
    add(
      ['layers'],
      `This backdrop's picture would be ${tall} pixels tall. A picture can be ${MAX_PICTURE_SIDE} at most: use lower layers or a smaller "tile".`,
    )
}

/** The rules for a backdrop file; unknown keys are refused. */
export const BackdropSchema: z.ZodType<BackdropFile, BackdropFile> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: Id.describe('A name for this backdrop, like "valley". It matches the file name.'),
    seed: z
      .int()
      .min(0)
      .max(4294967295)
      .describe('Change this number for another painting of the same description.'),
    tile: z.int().min(4).max(64).describe('How many pixels of the picture make one tile of the game.'),
    width: z.int().min(4).max(128).describe('How many tiles wide a layer is before it repeats.'),
    layers: z
      .array(layer)
      .min(1)
      .max(8)
      .describe(
        'The layers, back to front. Each stands on the bottom edge of the level and repeats sideways.',
      ),
    props: z
      .array(prop)
      .max(256)
      .describe('Figures that stand on a layer, like trees on hills. Write [] for none.'),
  })
  .superRefine(checkBackdrop)

/** The backdrop's row of the content table. */
export const backdropInfo: ContentTypeInfo<BackdropFile, BackdropFile> = {
  schema: BackdropSchema,
  title: 'Backdrop',
  plural: 'backdrops',
  editor: 'world',
  part: 'environment',
  noun: 'backdrop',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the backdrop a name like "valley".',
    seed: 'Write a whole number, like 7. Another number gives another painting.',
    tile: 'Write how many pixels make one tile of the game, like 8.',
    width: 'Write how many tiles wide a layer is before it repeats, like 32.',
    layers: 'List at least one layer, each with an id, a kind, a color, a height and a drift.',
    'layers.id': 'Give the layer a name like "hills".',
    'layers.kind': 'Write "flat", "hills", "mountains" or "clouds".',
    'layers.color': 'Write the colour as # and six digits, like #afd472.',
    'layers.height': 'Write how high it reaches, in tiles, like 3.',
    'layers.drift': 'Write how much it moves with the level, from 0 to 1.',
    props: 'Write [] if nothing stands on the layers.',
    'props.id': 'Give the prop a name like "tree-1".',
    'props.figure': 'Write which figure stands there, like "tree".',
    'props.layer': 'Write which layer it stands on, like "hills".',
    'props.x': "Write where the middle of its foot is, in tiles from the level's left edge.",
    'props.up': "Write how far its foot is above the level's bottom edge, in tiles, like 0.",
  },
  check(backdrop, game, report) {
    backdrop.props.forEach((p, i) => {
      if (!game.has('figure', p.figure)) {
        report(`props[${i}].figure`, noSuch('figure', p.figure, game.ids('figure')))
        return
      }
      const figure = game.get('figure', p.figure)
      if (figure !== undefined && p.pose !== undefined && !figure.poses.some((pose) => pose.id === p.pose))
        report(`props[${i}].pose`, noPose(figure, p.pose))
    })
  },
}
