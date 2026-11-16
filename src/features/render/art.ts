// A game's painted pictures, loaded for one level: the tileset's picture, the backdrop's, and the picture of every figure
// a character or a prop names. Each is read through `readPicture` (a page reads files its own way), turned into a
// texture with sharp pixels, and checked against the file that painted it before anything is drawn, so a picture that
// is missing, old or the wrong size stops the game with one sentence that says what to run, instead of a blank box.
//
// Each picture in a sheet (a pose, a tile's square, a backdrop's strip) is copied out into a texture of its own. Cut
// from one shared texture, a picture whose edge falls part way across a screen pixel showed a thin line of its
// neighbour in the sheet: with antialiasing on, that pixel is coloured from the middle of the pixel, which is past
// the picture's edge, so it read the next square over (the dark line by a tile in the 1180 by 820 and 1280 by 720
// pictures of plan A's build). A texture of its own ends at the picture's own edge, so nothing past it can be read.
import 'pixi.js/unsafe-eval'
import { ImageSource, Texture } from 'pixi.js'
import {
  type BackdropFile,
  backdropSheet,
  type FigureFile,
  figureSheet,
  type GameContent,
  paintedPath,
} from '../content/content.ts'
import { groundBoxes, type SimLevel, type TileBox, tileBoxes } from '../level/level.ts'
import { tilePictures } from './tiles.ts'

/**
 * Reads one picture of the game by its path, like `content/figures/hero.png`. Rejects when there is none: a `fetch`
 * answers a missing file with a page that says so, so check `response.ok` and throw, or a missing picture is reported
 * as one a browser cannot read.
 */
export type ReadPicture = (path: string) => Promise<Blob>

/** A picture is missing, old or wrong. The message says what to run. */
export class ArtError extends Error {}

/** One picture of a figure: the texture and how big it is drawn, in tiles. */
export interface Picture {
  readonly texture: Texture
  readonly w: number
  readonly h: number
}

/** One tile of the level, drawn from its square of the tileset's picture. */
export interface TileSprite {
  readonly col: number
  readonly row: number
  readonly texture: Texture
}

/** One layer of the backdrop: a strip that repeats sideways. `height` is in tiles, `drift` is 0 (still) to 1 (with the level). */
export interface BackdropLayerArt {
  readonly id: string
  readonly texture: Texture
  readonly height: number
  readonly drift: number
}

/** A figure standing on a layer: `x` and `up` are in tiles from the level's left edge and the bottom of the layer's strip. */
export interface BackdropPropArt extends Picture {
  /** The index in `layers` of the layer it stands on and moves with. */
  readonly layer: number
  readonly x: number
  readonly up: number
}

/** The backdrop of a level, loaded. `width` is how many tiles wide a layer is before it repeats. */
export interface BackdropArt {
  readonly width: number
  readonly layers: readonly BackdropLayerArt[]
  readonly props: readonly BackdropPropArt[]
}

/** What one level needs, loaded and checked. */
export interface Art {
  /**
   * The picture a character shows: its figure in `pose` (the first pose when it is empty), in the variant of hero
   * number `player` (player 2 wears the first variant, 3 the second, 4 the third) when the figure has one. `undefined`
   * for a character with no figure.
   */
  figure(character: string, pose: string, player: number): Picture | undefined
  /** The level's tiles, when it has a tileset with its picture. */
  readonly tiles: readonly TileSprite[]
  /** The boxes the level's solid tiles make. When tiles are drawn from pictures these boxes are not drawn. */
  readonly ground: readonly TileBox[]
  /** The opened level's backdrop (the first level's when a place was loaded). */
  readonly backdrop: BackdropArt | undefined
  /** The backdrop of a level of the place that was loaded, or `undefined` for one with none (or that was not loaded). */
  backdropOf(level: string): BackdropArt | undefined
  /** Frees every texture. Safe to call twice. */
  destroy(): void
}

/**
 * True when the level has a tileset or a backdrop, or any character has a figure: when there is art to load. With `levels`
 * (a place of joined levels), when any of them has.
 */
export function needsPictures(content: GameContent, level?: string, levels?: readonly SimLevel[]): boolean {
  const shown = levels === undefined ? [level ?? content.project.start] : levels.map((l) => l.level)
  return (
    shown.some((id) => {
      const here = content.levels[id]
      return here?.tileset !== undefined || here?.backdrop !== undefined
    }) || Object.values(content.characters).some((character) => character.figure !== undefined)
  )
}

/** Colours exactly as painted: no colour space and no premultiplied alpha, so a texel is the bytes the painter wrote. */
const EXACT: ImageBitmapOptions = { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }

/** The picture at `path` as a bitmap with its colours exactly as painted, or an `ArtError` that says what is wrong. */
async function decode(path: string, readPicture: ReadPicture): Promise<ImageBitmap> {
  let blob: Blob
  try {
    blob = await readPicture(path)
  } catch {
    throw new ArtError(`The picture ${path} is missing. Run "automata art" to paint it.`)
  }
  try {
    return await createImageBitmap(blob, EXACT)
  } catch {
    throw new ArtError(`${path} is not a picture a browser can read.`)
  }
}

/** One figure's pictures by name (`idle`, `two/idle`), cut from its sheet. */
interface FigureArt {
  readonly figure: FigureFile
  readonly frames: ReadonlyMap<string, Texture>
}

/**
 * Loads and checks the art of a level (the project's `start` unless `level` says). With `levels`, the art of a place of
 * joined levels: each level's tiles and ground are put at its offset, and each level's backdrop is loaded (`backdropOf`);
 * `level` is then the one `backdrop` is. Throws an `ArtError` for the first picture that is missing, unreadable or not
 * the size its file makes it; nothing is left loaded when it throws.
 */
export async function loadArt(options: {
  content: GameContent
  level?: string
  levels?: readonly SimLevel[]
  readPicture: ReadPicture
}): Promise<Art> {
  const { content, readPicture } = options
  const opened = options.level ?? content.project.start
  const levels: readonly SimLevel[] = options.levels ?? [{ level: opened, x: 0, y: 0, w: 0, h: 0 }]
  const sources: ImageSource[] = []
  const textures: Texture[] = []
  const bitmaps: ImageBitmap[] = []
  let destroyed = false
  const destroy = (): void => {
    if (destroyed) return
    destroyed = true
    for (const texture of textures) texture.destroy(false)
    for (const source of sources) source.destroy()
    for (const bitmap of bitmaps) bitmap.close()
  }

  /** A picture of the game, read and kept, so it is closed with the rest even when a check below stops the load. */
  const read = async (path: string): Promise<ImageBitmap> => {
    const bitmap = await decode(path, readPicture)
    bitmaps.push(bitmap)
    return bitmap
  }
  /** One picture of a sheet, copied out into a texture of its own with sharp pixels (see the top of this file). */
  const cut = async (from: ImageBitmap, x: number, y: number, w: number, h: number): Promise<Texture> => {
    const piece = await createImageBitmap(from, x, y, w, h, EXACT)
    bitmaps.push(piece)
    const made = new ImageSource({ resource: piece, scaleMode: 'nearest' })
    sources.push(made)
    const texture = new Texture({ source: made })
    textures.push(texture)
    return texture
  }
  const sized = (path: string, bitmap: ImageBitmap, w: number, h: number, from: string): void => {
    if (bitmap.width !== w || bitmap.height !== h)
      throw new ArtError(
        `The picture ${path} is ${bitmap.width} by ${bitmap.height} pixels, but its ${from} makes it ${w} by ${h}. Run "automata art" to paint it again.`,
      )
  }

  try {
    // The tileset pictures, cut into the tiles the levels use. A tileset two levels share is read and cut once.
    const tiles: TileSprite[] = []
    const squares = new Map<string, { bitmap: ImageBitmap; cut: Map<number, Texture> }>()
    for (const where of levels) {
      const level = content.levels[where.level]
      const tileset = level?.tileset === undefined ? undefined : content.tilesets?.[level.tileset]
      if (level === undefined || tileset === undefined) continue
      let sheet = squares.get(tileset.id)
      if (sheet === undefined) {
        const bitmap = await read(tileset.image)
        const wide = tileset.columns * tileset.tileSize
        if (bitmap.width !== wide)
          throw new ArtError(
            `The tileset "${tileset.id}" says its picture is ${tileset.columns} tiles of ${tileset.tileSize} pixels wide, which is ${wide}, but ${tileset.image} is ${bitmap.width} pixels wide.`,
          )
        const count = tileset.columns * Math.floor(bitmap.height / tileset.tileSize)
        const used = Math.max(-1, ...tileset.tiles.flatMap((tile) => tile.pictures.map((one) => one.frame)))
        if (used >= count)
          throw new ArtError(
            `The tileset "${tileset.id}" uses picture ${used}, but its picture has only ${count} squares, 0 to ${count - 1}.`,
          )
        sheet = { bitmap, cut: new Map() }
        squares.set(tileset.id, sheet)
      }
      // Each square the level uses, cut once.
      const size = tileset.tileSize
      for (const { col, row, frame } of tilePictures(level, tileset)) {
        let square = sheet.cut.get(frame)
        if (square === undefined) {
          square = await cut(
            sheet.bitmap,
            (frame % tileset.columns) * size,
            Math.floor(frame / tileset.columns) * size,
            size,
            size,
          )
          sheet.cut.set(frame, square)
        }
        tiles.push({ col: col + where.x, row: row + where.y, texture: square })
      }
    }
    // The boxes the tiles are drawn over. A level alone has the boxes of its own solid tiles; a place has the parts of the
    // boxes the sim makes (a floor that runs through a seam is one body there, drawn as each level's part).
    let ground: TileBox[] = []
    if (options.levels === undefined || levels.length < 2) {
      const level = content.levels[opened]
      const tileset = level?.tileset === undefined ? undefined : content.tilesets?.[level.tileset]
      if (level !== undefined && tileset !== undefined) {
        const solid = new Set(tileset.tiles.filter((tile) => tile.solid).map((tile) => tile.letter))
        ground = tileBoxes(level.tiles, (letter) => solid.has(letter))
      }
    } else {
      const tiled = new Set(
        levels.filter((l) => content.levels[l.level]?.tileset !== undefined).map((l) => l.level),
      )
      ground = groundBoxes(content, levels).flatMap(({ parts }) =>
        parts.filter((part) => tiled.has(part.level)),
      )
    }

    // Every figure a character or a backdrop's prop names, loaded once; and each backdrop the levels name, in the order of
    // the levels.
    const backdropFiles = new Map<string, BackdropFile>()
    for (const where of levels) {
      const id = content.levels[where.level]?.backdrop
      const file = id === undefined ? undefined : content.backdrops?.[id]
      if (file !== undefined) backdropFiles.set(file.id, file)
    }
    const figureIds = [
      ...new Set([
        ...Object.values(content.characters).flatMap((character) =>
          character.figure === undefined ? [] : [character.figure],
        ),
        ...[...backdropFiles.values()].flatMap((file) => file.props.map((prop) => prop.figure)),
      ]),
    ].sort()
    const figures = new Map<string, FigureArt>()
    for (const id of figureIds) {
      const figure = content.figures?.[id]
      const path = paintedPath(content, 'figure', id)
      if (figure === undefined || path === undefined)
        throw new ArtError(`The figure "${id}" has no file in this game, so it cannot be drawn.`)
      const bitmap = await read(path)
      const sheet = figureSheet(figure)
      sized(path, bitmap, sheet.w, sheet.h, 'figure file')
      const frames = new Map<string, Texture>()
      for (const f of sheet.frames) frames.set(f.name, await cut(bitmap, f.x, f.y, f.w, f.h))
      figures.set(id, { figure, frames })
    }
    const pictureOf = (id: string, pose: string, player: number): Picture | undefined => {
      const found = figures.get(id)
      if (found === undefined) return undefined
      const { figure, frames } = found
      const name = pose === '' || !frames.has(pose) ? (figure.poses[0]?.id ?? '') : pose
      const variant = player >= 2 ? figure.variants?.[player - 2] : undefined
      const texture =
        (variant === undefined ? undefined : frames.get(`${variant.id}/${name}`)) ?? frames.get(name)
      if (texture === undefined) return undefined
      return { texture, w: texture.frame.width / figure.tile, h: texture.frame.height / figure.tile }
    }

    // Each backdrop's strips and the props that stand on them, loaded once however many levels share it.
    const backdrops = new Map<string, BackdropArt>()
    for (const backdropFile of backdropFiles.values()) {
      const path = paintedPath(content, 'backdrop', backdropFile.id)
      if (path === undefined)
        throw new ArtError(`The backdrop "${backdropFile.id}" has no file in this game.`)
      const bitmap = await read(path)
      const sheet = backdropSheet(backdropFile)
      sized(path, bitmap, sheet.w, sheet.h, 'backdrop file')
      const layers: BackdropLayerArt[] = []
      for (const [i, layer] of backdropFile.layers.entries()) {
        const at = sheet.frames[i] as (typeof sheet.frames)[number]
        layers.push({
          id: layer.id,
          texture: await cut(bitmap, at.x, at.y, at.w, at.h),
          height: at.h / backdropFile.tile,
          drift: layer.drift,
        })
      }
      const props = backdropFile.props.flatMap((prop) => {
        const shown = pictureOf(prop.figure, prop.pose ?? '', 1)
        const layer = layers.findIndex((l) => l.id === prop.layer)
        return shown === undefined || layer < 0 ? [] : [{ ...shown, layer, x: prop.x, up: prop.up }]
      })
      backdrops.set(backdropFile.id, { width: backdropFile.width, layers, props })
    }
    const backdropOf = (id: string): BackdropArt | undefined => {
      const named = content.levels[id]?.backdrop
      return named === undefined ? undefined : backdrops.get(named)
    }

    return {
      figure: (character, pose, player) => {
        const id = content.characters[character]?.figure
        return id === undefined ? undefined : pictureOf(id, pose, player)
      },
      tiles,
      ground,
      backdrop: backdropOf(opened),
      backdropOf,
      destroy,
    }
  } catch (error) {
    destroy()
    throw error
  }
}
