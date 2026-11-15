// A game's own photo: a record beside a PNG, the same record the library keeps for its own. A scene's `photo` material
// names a photo by id, and the game's own come before the library's, so a game may put its own picture under a library
// name. The record says where the picture came from, so a team that ships the game can show its licences.
import { decodePng, PngError } from '../../lib/png-read.ts'
import { z } from '../../lib/zod.ts'
import type { ContentTypeInfo } from './type-info.ts'

/** The most pixels wide or tall a game's own photo may be: more would only make the painter slower. */
export const MAX_PHOTO_SIDE = 256

/** A photo's name: a library photo like `brickYellow`, or a game's own like `moss`. */
export const PHOTO_NAME: RegExp = /^[a-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*$/

/** A game's photo once read: where its picture is, how big it looks beside a tile, and where it came from. */
export interface PhotoFile {
  readonly format: 1
  readonly id: string
  /** The PNG's path from the game's root, like `content/photos/moss.png`. */
  readonly image: string
  /** Tiles the photo spans, wide and tall: how big it looks beside a tile. */
  readonly size: { readonly w: number; readonly h: number }
  readonly source: string
  readonly licence: string
  readonly credit: string
}

const IMAGE = /^[A-Za-z0-9][A-Za-z0-9_./-]*\.png$/

const words = (what: string, missing: string): z.ZodString =>
  z.string().min(1, missing).max(200).describe(what)

/** The rules for a photo file; unknown keys are refused. */
export const PhotoSchema: z.ZodType<PhotoFile, PhotoFile> = z.strictObject({
  format: z.literal(1).describe('The version of this file format. Always 1.'),
  id: z
    .string()
    .max(64)
    .regex(PHOTO_NAME, 'Write the photo\'s name, like "moss" or "brickYellow".')
    .describe('A name for this photo, like "moss". It matches the file name.'),
  image: z
    .string()
    .max(200)
    .regex(IMAGE, 'Write the picture\'s path in the game, ending in .png, like "content/photos/moss.png".')
    .refine((path) => !path.split('/').includes('..'), 'The path may not go up a folder: remove "..".')
    .describe("The photo's PNG, as a path from the game's root, like \"content/photos/moss.png\"."),
  size: z
    .strictObject({
      w: z.number().gt(0).max(16).describe('How many tiles wide the photo looks, like 1.'),
      h: z.number().gt(0).max(16).describe('How many tiles tall the photo looks, like 1.'),
    })
    .describe('How big the photo looks beside a tile. 1 by 1 is one tile.'),
  source: words(
    'Where the photo came from: a name or a link.',
    'Write where the photo came from, like "my own photo".',
  ),
  licence: words('The photo\'s licence, like "CC0".', 'Write its licence, like "CC0".'),
  credit: words(
    'Who made the photo, as they want to be named.',
    'Write who made it, like "Dana, taken in the garden".',
  ),
})

/**
 * What is wrong with a game's own photo's picture, or undefined: not a PNG the reader takes, or over 256 a side. The bytes
 * are the file at `photo.image`, or undefined when there is none.
 */
export function photoPictureProblem(photo: PhotoFile, bytes: Uint8Array | undefined): string | undefined {
  if (bytes === undefined) return `There is no picture at "${photo.image}". Put the photo there.`
  try {
    const { width, height } = decodePng(bytes)
    if (width > MAX_PHOTO_SIDE || height > MAX_PHOTO_SIDE)
      return `This photo is ${width} by ${height} pixels. A photo can be ${MAX_PHOTO_SIDE} at most: make it smaller.`
    return undefined
  } catch (error) {
    if (error instanceof PngError) return error.message
    throw error
  }
}

/** The photo's row of the content table. */
export const photoInfo: ContentTypeInfo<PhotoFile, PhotoFile> = {
  schema: PhotoSchema,
  title: 'Photo',
  plural: 'photos',
  editor: 'world',
  part: 'scenes',
  noun: 'photo',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the photo a name like "moss".',
    image: 'Write where the picture is, like "content/photos/moss.png".',
    size: 'Write how big the photo looks in tiles, like { "w": 1, "h": 1 }.',
    'size.w': 'Write how many tiles wide the photo looks, like 1.',
    'size.h': 'Write how many tiles tall the photo looks, like 1.',
    source: 'Write where the photo came from, like "my own photo".',
    licence: 'Write its licence, like "CC0".',
    credit: 'Write who made it, like "Dana, taken in the garden".',
  },
}
