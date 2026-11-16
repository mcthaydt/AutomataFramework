// The marks a picture of a level carries on top of its art: lines, rings, filled boxes and numbered badges. Whole numbers
// only, in the painter's way (no `Math` call whose last bit an engine may choose, no clock, no files), so a picture is the
// same bytes in Node and in every browser. A mark outside the picture is cut off, as in `pixels.ts`.
import type { Picture } from './pixels.ts'

/** A box in pixels: its top left corner and its size. */
export interface Box {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** Fills a box with one colour. */
export function fill(picture: Picture, box: Box, colour: number): void {
  for (let row = 0; row < box.h; row++)
    for (let column = 0; column < box.w; column++) picture.set(box.x + column, box.y + row, colour)
}

/** A line one pixel wide from one pixel to another, both ends painted (Bresenham's, which has one answer for a line). */
export function line(picture: Picture, x0: number, y0: number, x1: number, y1: number, colour: number): void {
  let x = Math.round(x0)
  let y = Math.round(y0)
  const endX = Math.round(x1)
  const endY = Math.round(y1)
  const dx = Math.abs(endX - x)
  const dy = -Math.abs(endY - y)
  const sx = x < endX ? 1 : -1
  const sy = y < endY ? 1 : -1
  let error = dx + dy
  for (;;) {
    picture.set(x, y, colour)
    if (x === endX && y === endY) return
    const twice = 2 * error
    if (twice >= dy) {
      error += dy
      x += sx
    }
    if (twice <= dx) {
      error += dx
      y += sy
    }
  }
}

/** A ring one pixel wide, `radius` pixels from its middle (the midpoint circle: eight pixels at a time). */
export function ring(picture: Picture, cx: number, cy: number, radius: number, colour: number): void {
  const r = Math.max(0, Math.round(radius))
  let x = r
  let y = 0
  let error = 1 - r
  while (x >= y) {
    for (const [px, py] of [
      [x, y],
      [y, x],
      [-y, x],
      [-x, y],
      [-x, -y],
      [-y, -x],
      [y, -x],
      [x, -y],
    ] as const)
      picture.set(cx + px, cy + py, colour)
    y++
    if (error < 0) error += 2 * y + 1
    else {
      x--
      error += 2 * (y - x) + 1
    }
  }
}

/** The digits, three pixels wide and five tall: each row is three bits, the left one first. */
const DIGITS: readonly (readonly number[])[] = [
  [0b111, 0b101, 0b101, 0b101, 0b111],
  [0b010, 0b110, 0b010, 0b010, 0b111],
  [0b111, 0b001, 0b111, 0b100, 0b111],
  [0b111, 0b001, 0b111, 0b001, 0b111],
  [0b101, 0b101, 0b111, 0b001, 0b001],
  [0b111, 0b100, 0b111, 0b001, 0b111],
  [0b111, 0b100, 0b111, 0b101, 0b111],
  [0b111, 0b001, 0b001, 0b001, 0b001],
  [0b111, 0b101, 0b111, 0b101, 0b111],
  [0b111, 0b101, 0b111, 0b001, 0b111],
]

/** The size of a badge for a number, without painting it: 3 pixels a digit, 1 between, 1 of paper all round. */
export function badgeSize(n: number, scale = 1): { readonly w: number; readonly h: number } {
  const digits = String(Math.max(0, Math.round(n))).length
  return { w: (digits * 4 + 1) * scale, h: 7 * scale }
}

/**
 * A filled box of `paper` with the number `n` in `ink`, its top left corner at `x`, `y`, and the box it fills so a caller
 * can keep badges apart. `scale` makes every pixel of it that many across, for a picture too large to read digits that
 * are three pixels wide.
 */
export function badge(
  picture: Picture,
  x: number,
  y: number,
  n: number,
  ink: number,
  paper: number,
  scale = 1,
): { readonly w: number; readonly h: number } {
  const size = badgeSize(n, scale)
  fill(picture, { x, y, ...size }, paper)
  const digits = String(Math.max(0, Math.round(n)))
  for (let i = 0; i < digits.length; i++) {
    const glyph = DIGITS[Number(digits[i])] ?? []
    glyph.forEach((bits, row) => {
      for (let column = 0; column < 3; column++) {
        if (((bits >> (2 - column)) & 1) === 0) continue
        const at = { x: x + (1 + i * 4 + column) * scale, y: y + (1 + row) * scale, w: scale, h: scale }
        fill(picture, at, ink)
      }
    })
  }
  return size
}
