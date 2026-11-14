// Where each picture of a figure's or a backdrop's sheet is. The painter lays its pixels out by these numbers, the
// renderer cuts the sheet up by them, and the atlas file beside each picture says them in the frames-and-meta shape
// PixiJS and TexturePacker read. Any painter a figure may one day have gives this same layout, so clips, sprites and the
// renderer never learn which painter ran.
import type { BackdropFile } from './backdrop.ts'
import type { FigureFile } from './figure.ts'

/** How many pictures go in a row of a figure's sheet. */
export const SHEET_COLUMNS = 8

/** The most pixels wide or tall a painted picture may be. */
export const MAX_PICTURE_SIDE = 2048

/** One picture in a sheet: its name and the box it fills, in pixels from the sheet's top left corner. */
export interface Frame {
  readonly name: string
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** A painted picture's size and the boxes in it. */
export interface Sheet {
  readonly w: number
  readonly h: number
  readonly frames: readonly Frame[]
}

/** How many pixels tall a backdrop layer's strip is: its height in tiles, and never less than one pixel. */
export function stripHeight(height: number, tile: number): number {
  return Math.max(1, Math.round(height * tile))
}

/**
 * The frames of a figure: its poses in order, then each variant's poses in order, named `<pose>` and
 * `<variant>/<pose>`. Frame `n` is in column `n % 8` and row `floor(n / 8)`.
 */
export function figureSheet(figure: FigureFile): Sheet {
  const names = figure.poses.map((pose) => pose.id)
  const all = [...names, ...(figure.variants ?? []).flatMap((v) => names.map((name) => `${v.id}/${name}`))]
  const { w, h } = figure.frame
  const frames = all.map((name, n) => ({
    name,
    x: (n % SHEET_COLUMNS) * w,
    y: Math.floor(n / SHEET_COLUMNS) * h,
    w,
    h,
  }))
  return { w: Math.min(all.length, SHEET_COLUMNS) * w, h: Math.ceil(all.length / SHEET_COLUMNS) * h, frames }
}

/** The frames of a backdrop: one strip a layer, named by the layer's id, the first layer at the top. */
export function backdropSheet(backdrop: BackdropFile): Sheet {
  const w = backdrop.width * backdrop.tile
  let y = 0
  const frames = backdrop.layers.map((layer) => {
    const h = stripHeight(layer.height, backdrop.tile)
    const frame = { name: layer.id, x: 0, y, w, h }
    y += h
    return frame
  })
  return { w, h: y, frames }
}

/** A box in a picture, in pixels. */
interface Box {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** What an atlas file holds: every frame by name, and which picture it is for. */
export interface Atlas {
  readonly frames: Readonly<Record<string, { readonly frame: Box }>>
  readonly meta: {
    readonly image: string
    readonly size: { readonly w: number; readonly h: number }
    readonly scale: '1'
  }
}

/** The atlas of a sheet. `image` is the picture's file name, with no folder. */
export function atlasOf(sheet: Sheet, image: string): Atlas {
  const frames: Record<string, { frame: Box }> = {}
  for (const f of sheet.frames) frames[f.name] = { frame: { x: f.x, y: f.y, w: f.w, h: f.h } }
  return { frames, meta: { image, size: { w: sheet.w, h: sheet.h }, scale: '1' } }
}
