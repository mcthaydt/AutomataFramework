// The camera: where in the level the screen looks. Plain functions of numbers, so they are tested without a page. A
// `Shot` is the part of the level the screen must show; `placeCamera` turns it into a `Fit` (a scale and an offset)
// the stage draws with, and shows more of the level where the screen is wider or taller than the shot.
import type { Fit } from './fit.ts'

/** The part of the level the screen must show: its middle and its size, in tiles. */
export interface Shot {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** A size in tiles. */
interface Size {
  readonly w: number
  readonly h: number
}

/** How far a step of the camera goes towards where it is going: 15% of the way. */
const EASE = 0.15
/** The room kept round the heroes on every side, in tiles. */
const ROOM = 2

/** A number that is not a number (or not finite) is nothing at all. */
const finite = (n: number): number => (Number.isFinite(n) ? n : 0)

/** `n` kept within `low` to `high`; a range with nothing in it (`high` below `low`) gives its middle. */
const within = (n: number, low: number, high: number): number =>
  high < low ? (low + high) / 2 : Math.min(high, Math.max(low, n))

/**
 * The shot that holds every hero. With nobody, it is the level's middle at the view's size. Otherwise it is the smallest
 * box round the heroes with 2 tiles to spare on every side, as wide as the wider of that and the view and as tall as
 * the taller, but never wider or taller than `view.most` (the whole level when that is left out). Its middle is the
 * box's, moved as little as it must be to stay inside the level. A hero whose place is not a number is left out.
 */
export function frameHeroes(
  level: Size,
  view: Size & { readonly most?: Size | undefined },
  heroes: readonly { readonly x: number; readonly y: number }[],
): Shot {
  const lw = Math.max(0, finite(level.w))
  const lh = Math.max(0, finite(level.h))
  const seen = heroes.filter((h) => Number.isFinite(h.x) && Number.isFinite(h.y))
  const vw = Math.max(0, finite(view.w))
  const vh = Math.max(0, finite(view.h))
  if (seen.length === 0) return { x: lw / 2, y: lh / 2, w: vw, h: vh }
  const left = Math.min(...seen.map((h) => h.x))
  const right = Math.max(...seen.map((h) => h.x))
  const top = Math.min(...seen.map((h) => h.y))
  const bottom = Math.max(...seen.map((h) => h.y))
  const mostW = view.most === undefined ? lw : Math.max(0, finite(view.most.w))
  const mostH = view.most === undefined ? lh : Math.max(0, finite(view.most.h))
  const w = Math.min(Math.max(vw, right - left + 2 * ROOM), mostW)
  const h = Math.min(Math.max(vh, bottom - top + 2 * ROOM), mostH)
  return {
    x: within((left + right) / 2, w / 2, lw - w / 2),
    y: within((top + bottom) / 2, h / 2, lh - h / 2),
    w,
    h,
  }
}

/** One step from `from` towards `to`: each of the four numbers goes 15% of the way. */
export function easeShot(from: Shot, to: Shot): Shot {
  return {
    x: from.x + (to.x - from.x) * EASE,
    y: from.y + (to.y - from.y) * EASE,
    w: from.w + (to.w - from.w) * EASE,
    h: from.h + (to.h - from.h) * EASE,
  }
}

/** The shot `t` of the way from `a` to `b`, `t` being 0 to 1. Used to draw between two steps. */
export function blendShot(a: Shot, b: Shot, t: number): Shot {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    w: a.w + (b.w - a.w) * t,
    h: a.h + (b.h - a.h) * t,
  }
}

/**
 * Where the level goes in `box` so the screen shows `shot`: the scale is the largest at which the whole shot fits, and
 * whatever more of the level then fits is shown too. Along a side where the level is smaller than what the screen
 * shows it is centred; along the other the screen never looks past the level's edge. A box, a level or a shot with no
 * size is `{ scale: 0, left: 0, top: 0 }`, as in `fitWorld`, never NaN.
 */
export function placeCamera(box: Size, level: Size, shot: Shot): Fit {
  if (!(box.w > 0 && box.h > 0 && level.w > 0 && level.h > 0 && shot.w > 0 && shot.h > 0))
    return { scale: 0, left: 0, top: 0 }
  const scale = Math.min(box.w / shot.w, box.h / shot.h)
  // How many tiles the screen shows each way, and where its left and top edges are in the level.
  const seenW = box.w / scale
  const seenH = box.h / scale
  const edgeX = within(finite(shot.x) - seenW / 2, 0, level.w - seenW)
  const edgeY = within(finite(shot.y) - seenH / 2, 0, level.h - seenH)
  return {
    scale,
    // `0 -` keeps a still camera at +0 rather than -0.
    left: level.w <= seenW ? (box.w - level.w * scale) / 2 : 0 - edgeX * scale,
    top: level.h <= seenH ? (box.h - level.h * scale) / 2 : 0 - edgeY * scale,
  }
}

/**
 * Where the bottom-left corner of a backdrop layer is on the canvas, in CSS pixels. With `drift` 1 it is the level's own
 * bottom-left corner, so the layer moves with the level. With `drift` 0 it stays where that corner would be if the camera
 * were at the level's left and bottom: far mountains do not move. In between it is the blend.
 */
export function layerShift(drift: number, fit: Fit, level: Size, box: Size): { x: number; y: number } {
  const now = { x: fit.left, y: fit.top + level.h * fit.scale }
  // The corner with the camera at the level's left and bottom: at the box's left and bottom edges, or where the level
  // is centred when it is smaller than the box.
  const home = {
    x: level.w * fit.scale <= box.w ? fit.left : 0,
    y: level.h * fit.scale <= box.h ? now.y : box.h,
  }
  const t = Math.min(1, Math.max(0, finite(drift)))
  return { x: home.x + (now.x - home.x) * t, y: home.y + (now.y - home.y) * t }
}
