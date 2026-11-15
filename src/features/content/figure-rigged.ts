// A rigged figure's file, `"format": 2` (plan R, Task 2): a person made from sliders instead of parts. The same `figure`
// kind reads it and the free figure (`figure.ts`), told apart by `format`. This file is the format 2 types, its schema
// and the checks that need nothing but the file; what it names in other files (its palette) is `figure-check.ts`.
import { z } from '../../lib/zod.ts'
import {
  FACE_ABOUT,
  FACE_KEYS,
  FACE_SLIDERS,
  FACE_STYLES,
  PERSON_SLIDERS,
  type Slider,
} from './figure-sliders.ts'
import { Id } from './ids.ts'
import { unique } from './shared.ts'

/** A person's sliders: every one is optional, and one left out is at its normal (`PERSON_SLIDERS`). */
export interface PersonSliders {
  /** In pixels, from the ground to the top of the head. */
  readonly height?: number | undefined
  readonly build?: number | undefined
  readonly legs?: number | undefined
  readonly arms?: number | undefined
  readonly shoulders?: number | undefined
  readonly hips?: number | undefined
  readonly fat?: number | undefined
  readonly muscle?: number | undefined
  readonly head?: number | undefined
  readonly neck?: number | undefined
  readonly neckLength?: number | undefined
  readonly hands?: number | undefined
  readonly feet?: number | undefined
  readonly posture?: number | undefined
  readonly hunch?: number | undefined
  /** In degrees. */
  readonly headTilt?: number | undefined
  readonly age?: number | undefined
  readonly chunk?: number | undefined
}

/** A face's styles and numbers; every one is optional. */
export interface FaceChoices {
  readonly eyes?: string | undefined
  readonly eyeSize?: number | undefined
  readonly eyeSpacing?: number | undefined
  readonly eyeTilt?: number | undefined
  readonly brows?: string | undefined
  readonly browWeight?: number | undefined
  readonly mouth?: string | undefined
  readonly nose?: number | undefined
  readonly cheeks?: number | undefined
  readonly jaw?: number | undefined
}

/** The colours of a rigged figure, each the id of a ramp in its palette. */
export interface RiggedPaints {
  readonly skin: string
  /** Left out means no cap of hair is drawn (a hair piece or a hat still may be). */
  readonly hair?: string | undefined
  /** Left out means the eyes are drawn in the palette's ink. */
  readonly eyes?: string | undefined
}

/** The paints a variant changes. */
export interface RiggedVariantPaints {
  readonly skin?: string | undefined
  readonly hair?: string | undefined
  readonly eyes?: string | undefined
}

/** The same figure in other colours. Player 2 is drawn in the first variant, and so on. */
export interface RiggedVariant {
  readonly id: string
  readonly paints?: RiggedVariantPaints | undefined
}

/**
 * A figure file once read, `"format": 2`: a person built on a skeleton from sliders, painted by the framework in the
 * ramps of a palette. Sizes are in pixels of the picture; `tile` says how many make one tile.
 */
export interface RiggedFigure {
  readonly format: 2
  readonly id: string
  readonly body: 'person'
  /** How many pixels of the picture make one tile of the game. */
  readonly tile: number
  /** One pose's size in pixels. */
  readonly frame: { readonly w: number; readonly h: number }
  readonly sliders?: PersonSliders | undefined
  readonly face?: FaceChoices | undefined
  readonly paints: RiggedPaints
  /** The palette its colours are named in; left out means the framework's own. */
  readonly palette?: string | undefined
  /** An edge one pixel wide round the figure: each colour's darkest shade, or one near-black. */
  readonly outline?: 'dark' | 'ink' | undefined
  readonly variants?: readonly RiggedVariant[] | undefined
}

/** The names a view has, which a variant may not take: a frame is named `front/idle-1` for a view. */
const VIEW_NAMES: readonly string[] = ['side', 'front', 'back']

const whole = (what: string, min: number, max: number): z.ZodInt =>
  z.int().min(min).max(max).describe(`${what}, in pixels.`)

/** One slider as the schema reads it: a number in its range, with its sentence. */
const numberOf = (one: Slider): z.ZodOptional<z.ZodNumber> =>
  z.number().min(one.min).max(one.max).describe(one.about).optional()

/** An object of optional numbers made from a table, written in the table's order. */
const sliders: z.ZodType<PersonSliders, PersonSliders> = z.strictObject(
  Object.fromEntries(PERSON_SLIDERS.map((one) => [one.id, numberOf(one)])),
) as unknown as z.ZodType<PersonSliders, PersonSliders>

const faceShape = (): Record<string, z.ZodType> => {
  const shape: Record<string, z.ZodType> = {}
  for (const key of FACE_KEYS) {
    const slide = FACE_SLIDERS.find((one) => one.id === key)
    if (slide !== undefined) {
      shape[key] = numberOf(slide)
      continue
    }
    const kind = key as keyof typeof FACE_STYLES
    shape[key] = z
      .enum(FACE_STYLES[kind] as unknown as [string, ...string[]])
      .describe(FACE_ABOUT[kind])
      .optional()
  }
  return shape
}

const face: z.ZodType<FaceChoices, FaceChoices> = z.strictObject(faceShape()) as unknown as z.ZodType<
  FaceChoices,
  FaceChoices
>

const paints = z.strictObject({
  skin: Id.describe('The colour of the skin, as the id of a colour in the palette, like "tan".'),
  hair: Id.describe(
    'The colour of the hair, as the id of a colour in the palette. Left out means no hair is drawn.',
  ).optional(),
  eyes: Id.describe(
    "The colour of the eyes, as the id of a colour in the palette. Left out means the palette's ink.",
  ).optional(),
})

const variantPaints = z.strictObject({
  skin: Id.describe('The skin in these colours, as the id of a colour in the palette.').optional(),
  hair: Id.describe('The hair in these colours, as the id of a colour in the palette.').optional(),
  eyes: Id.describe('The eyes in these colours, as the id of a colour in the palette.').optional(),
})

const variant = z.strictObject({
  id: Id.describe('A name for these colours, used once in this figure, like "two".'),
  paints: variantPaints
    .describe('Only the colours that change, each as the id of a colour in the palette.')
    .optional(),
})

/** The tallest a figure of this frame may stand: the ground row and the edge's row are not for the figure. */
const HEIGHT_NORMAL = PERSON_SLIDERS.find((one) => one.id === 'height')?.normal ?? 24
const SMALLEST_HEIGHT = PERSON_SLIDERS.find((one) => one.id === 'height')?.min ?? 8

/** The checks that need nothing but the file. Written to cope with a half-read file, since it may run beside other problems. */
function checkRiggedFile(figure: Partial<RiggedFigure>, ctx: z.core.$RefinementCtx): void {
  const add = (path: readonly PropertyKey[], message: string): void =>
    ctx.addIssue({ code: 'custom', path: [...path], message })
  const frame = figure.frame
  if (frame !== undefined) {
    const written = figure.sliders?.height
    const tall = written ?? HEIGHT_NORMAL
    const most = frame.h - 2
    if (tall > most) {
      const where = written === undefined ? (['frame', 'h'] as const) : (['sliders', 'height'] as const)
      if (most < SMALLEST_HEIGHT)
        add(
          where,
          `A frame ${frame.h} pixels tall is too short for a figure. Make the frame at least ${SMALLEST_HEIGHT + 2} pixels tall.`,
        )
      else if (written === undefined)
        add(
          where,
          `A figure with no "height" stands ${tall} pixels tall, but its frame is ${frame.h}. Write a "height" of ${most} or less, or make the frame taller.`,
        )
      else
        add(
          where,
          `This figure is ${tall} pixels tall but its frame is ${frame.h}. Make "height" ${most} or less, or the frame taller.`,
        )
    }
  }
  const variants = figure.variants ?? []
  unique(variants, 'id', 'variant', ['variants'], ctx)
  variants.forEach((one, i) => {
    if (VIEW_NAMES.includes(one.id))
      add(
        ['variants', i, 'id'],
        `"${one.id}" is the name of a view. Give these colours another name, like "two".`,
      )
  })
}

/** The rules for a rigged figure file; unknown keys are refused. `figure.ts` reads this and the free figure as one kind. */
export const RiggedFigureSchema: z.ZodType<RiggedFigure, RiggedFigure> & z.core.$ZodTypeDiscriminable = z
  .strictObject({
    format: z
      .literal(2)
      .describe('The version of this file format. Always 2 for a figure built from sliders.'),
    id: Id.describe('A name for this figure, like "keeper". It matches the file name.'),
    body: z.literal('person').describe('What it is built on. Always "person" for now.'),
    tile: whole('How many pixels of the picture make one tile of the game', 4, 64),
    frame: z
      .strictObject({
        w: whole('How wide one pose is', 4, 128),
        h: whole('How tall one pose is', 4, 128),
      })
      .describe('The size of one pose, in pixels.'),
    sliders: sliders
      .describe(
        'How the body is shaped, each from 0 to 1 except "height". A slider left out is at its normal.',
      )
      .optional(),
    face: face
      .describe('The face: its styles and its numbers, each from 0 to 1. Anything left out is at its normal.')
      .optional(),
    paints: paints.describe('The colours it is painted in, each the id of a colour in the palette.'),
    palette: Id.describe(
      "The palette its colours are named in. Left out means the framework's own.",
    ).optional(),
    outline: z
      .enum(['dark', 'ink'])
      .describe(
        'An edge one pixel wide round the figure: "dark" is each colour\'s darkest shade, "ink" is one near-black. Left out means no edge.',
      )
      .optional(),
    variants: z
      .array(variant)
      .max(8)
      .describe(
        "The same figure in other colours. Player 2's figure is drawn in the first, player 3's in the second, player 4's in the third. Left out means none.",
      )
      .optional(),
  })
  .superRefine(checkRiggedFile)
