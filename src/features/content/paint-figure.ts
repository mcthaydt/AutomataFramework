// Paints a figure into a sheet of pictures, one per pose and one more set for each variant. Only whole-number work and
// `dmath`'s `sin` and `cos`, so the bytes are the same in Node and in every browser: no `Math.sin`, no canvas, no clock.
//
// The old painter's rules are kept (AutomataFrameworkFailed@ed8592e8, extensions/figures/src/shared/paint/raster.ts and
// paint-style.ts): a pixel is painted or clear, never half; the outline is one pixel wide round the whole figure and is
// drawn last; a figure's pose is placed by its frame, so a figure stands on its feet where its parts put them.
import type { IndexedPicture } from '../../lib/png.ts'
import { cos, sin } from '../sim/sim.ts'
import type { FigureFile, FigurePart, FigurePose } from './figure.ts'
import { createPicture, type Picture, rgb } from './pixels.ts'
import { figureSheet } from './sheet.ts'

/** The sine and cosine of a turn in degrees; a quarter turn is exact, so a block turned on its end has no stray edge. */
function trig(degrees: number): { s: number; c: number } {
  const turned = ((degrees % 360) + 360) % 360
  if (turned === 0) return { s: 0, c: 1 }
  if (turned === 90) return { s: 1, c: 0 }
  if (turned === 180) return { s: 0, c: -1 }
  if (turned === 270) return { s: -1, c: 0 }
  const radians = degrees * (Math.PI / 180)
  return { s: sin(radians), c: cos(radians) }
}

/** Paints one part, as one pose moves it, into `frame`. Everything of it outside the frame is cut off. */
function paintPart(frame: Picture, part: FigurePart, pose: FigurePose, colour: number): void {
  const move = pose.moves.find((m) => m.part === part.id)
  const cx = part.x + (move?.dx ?? 0)
  const cy = part.y + (move?.dy ?? 0)
  const { s, c } = trig((part.turn ?? 0) + (move?.turn ?? 0))
  const halfW = part.w / 2
  const halfH = part.h / 2
  // The box that holds the part however it is turned: the part's corners are at most this far from its middle.
  const reachX = Math.abs(halfW * c) + Math.abs(halfH * s)
  const reachY = Math.abs(halfW * s) + Math.abs(halfH * c)
  const left = Math.max(0, Math.floor(cx - reachX))
  const right = Math.min(frame.width - 1, Math.ceil(cx + reachX))
  const top = Math.max(0, Math.floor(cy - reachY))
  const bottom = Math.min(frame.height - 1, Math.ceil(cy + reachY))
  for (let row = top; row <= bottom; row++) {
    for (let column = left; column <= right; column++) {
      // The middle of the pixel, turned back by the part's turn about the part's middle.
      const dx = column + 0.5 - cx
      const dy = row + 0.5 - cy
      const lx = dx * c + dy * s
      const ly = dy * c - dx * s
      const inside =
        part.shape === 'block'
          ? Math.abs(lx) <= halfW && Math.abs(ly) <= halfH
          : (lx / halfW) * (lx / halfW) + (ly / halfH) * (ly / halfH) <= 1
      if (inside) frame.set(column, row, colour)
    }
  }
}

/** Puts `colour` on every clear pixel that has a painted one directly above, below, left or right of it. */
function outlineFrame(frame: Picture, colour: number): void {
  const before = createPicture(frame.width, frame.height, [])
  before.draw(frame, 0, 0)
  for (let row = 0; row < frame.height; row++) {
    for (let column = 0; column < frame.width; column++) {
      if (before.get(column, row) !== 0) continue
      const next =
        before.get(column, row - 1) !== 0 ||
        before.get(column, row + 1) !== 0 ||
        before.get(column - 1, row) !== 0 ||
        before.get(column + 1, row) !== 0
      if (next) frame.set(column, row, colour)
    }
  }
}

/**
 * The picture of a figure: every pose, then every variant's poses, laid out as `figureSheet` says. The palette is
 * clear, then the paints in order, then the outline if there is one, then each variant's paints in order.
 */
export function paintFigure(figure: FigureFile): IndexedPicture {
  const sheet = figureSheet(figure)
  const palette: number[] = [0]
  const base = new Map<string, number>()
  for (const paint of figure.paints) {
    palette.push(rgb(paint.color))
    base.set(paint.id, palette.length - 1)
  }
  let outline = 0
  if (figure.outline !== undefined) {
    palette.push(rgb(figure.outline))
    outline = palette.length - 1
  }
  // One colour table for the figure itself and one for each variant: the figure's own, with the variant's paints on top.
  const looks = [base]
  for (const variant of figure.variants ?? []) {
    const look = new Map(base)
    for (const paint of variant.paints) {
      palette.push(rgb(paint.color))
      look.set(paint.id, palette.length - 1)
    }
    looks.push(look)
  }

  const picture = createPicture(sheet.w, sheet.h, palette)
  let n = 0
  for (const look of looks) {
    for (const pose of figure.poses) {
      const frame = createPicture(figure.frame.w, figure.frame.h, palette)
      for (const part of figure.parts) paintPart(frame, part, pose, look.get(part.paint) ?? 0)
      if (outline !== 0) outlineFrame(frame, outline)
      const at = sheet.frames[n++]
      if (at !== undefined) picture.draw(frame, at.x, at.y)
    }
  }
  return picture.done()
}
