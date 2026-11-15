// The photo library: the 38 CC0 photos a scene's materials are made from, as the package ships them in `photos/`.
// Only the records are here (the pictures are files, because a browser fetches them and Node reads them); the painter is
// handed each photo's pixels by id (`Photos`), so it reads no file itself and the same photo gives the same tile
// wherever it is painted.
import { deepFreeze } from '../../lib/deep-freeze.ts'
import type { RgbaPicture } from '../../lib/png-read.ts'
import { sortedEntries } from '../../lib/sorted.ts'
import records from './library/photos.json' with { type: 'json' }

/** One photo's record: its file in `photos/`, the tiles it spans, and where it came from. */
export interface PhotoRecord {
  /** The file's name in the package's `photos/` folder, like `brick.png`. */
  readonly file: string
  /** Tiles the photo spans, wide and tall: how big it looks beside a tile, so a brick is the size of a brick. */
  readonly size: { readonly w: number; readonly h: number }
  readonly source: string
  readonly licence: string
  readonly credit: string
}

/** Every library photo by id, sorted. Frozen. */
export const PHOTO_LIBRARY: Readonly<Record<string, PhotoRecord>> = deepFreeze(
  Object.fromEntries(sortedEntries(records as Readonly<Record<string, PhotoRecord>>)),
)

/** A photo ready for the pipeline: its pixels and the tiles it spans. */
export interface PhotoPixels extends RgbaPicture {
  readonly size: { readonly w: number; readonly h: number }
}

/** Gives a photo by id (the game's own first, then the library's), or undefined. */
export type Photos = (id: string) => PhotoPixels | undefined
