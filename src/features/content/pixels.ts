// A picture as numbers, for the painter: a grid of palette places, where 0 is always clear. Painting a pixel outside the
// grid does nothing and reading one gives 0, so a part cut off at a frame's edge needs no special care.
import type { IndexedPicture } from '../../lib/png.ts'

/** A grid the painter writes to and reads from. */
export interface Picture {
  readonly width: number
  readonly height: number
  /** Paints one pixel with a place in the palette. Outside the picture it does nothing. */
  set(x: number, y: number, colour: number): void
  /** The place in the palette a pixel holds; 0 (clear) outside the picture. */
  get(x: number, y: number): number
  /** Copies every pixel of `from` into this picture with its top left corner at `x`, `y`. */
  draw(from: Picture, x: number, y: number): void
  /** The picture, ready to be written as a PNG. */
  done(): IndexedPicture
}

/** An empty picture `width` by `height`; `palette` is `0xrrggbb` per place, and place 0 is ignored. */
export function createPicture(width: number, height: number, palette: readonly number[]): Picture {
  const pixels = new Uint8Array(width * height)
  const inside = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height
  const picture: Picture = {
    width,
    height,
    set(x, y, colour) {
      if (inside(x, y)) pixels[y * width + x] = colour
    },
    get(x, y) {
      return inside(x, y) ? (pixels[y * width + x] as number) : 0
    },
    draw(from, x, y) {
      for (let row = 0; row < from.height; row++) {
        for (let column = 0; column < from.width; column++)
          picture.set(x + column, y + row, from.get(column, row))
      }
    },
    done() {
      return { width, height, palette, pixels }
    },
  }
  return picture
}

/** `#rrggbb` as the number `0xrrggbb`. */
export function rgb(colour: string): number {
  return Number.parseInt(colour.slice(1), 16)
}
