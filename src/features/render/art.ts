// A game's painted pictures, loaded for one level: the tileset's picture, the backdrop's, and the picture of every figure
// a character or a prop names. Each is read through `readPicture` (a page reads files its own way), turned into a
// texture with sharp pixels, and checked against the file that painted it before anything is drawn, so a picture that
// is missing, old or the wrong size stops the game with one sentence that says what to run, instead of a blank box.
import 'pixi.js/unsafe-eval'
import { ImageSource, Rectangle, Texture } from 'pixi.js'
import {
  type BackdropFile,
  backdropSheet,
  type FigureFile,
  figureSheet,
  type GameContent,
  paintedPath,
} from '../content/content.ts'
import { type TileBox, tileBoxes } from '../level/level.ts'
import { tilePictures } from './tiles.ts'

/** Reads one picture of the game by its path, like `content/figures/hero.png`. Rejects when there is none. */
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
  readonly backdrop: BackdropArt | undefined
  /** Frees every texture. Safe to call twice. */
  destroy(): void
}

/** True when the level has a tileset or a backdrop, or any character has a figure: when there is art to load. */
export function needsPictures(content: GameContent, level?: string): boolean {
  const here = content.levels[level ?? content.project.start]
  return (
    here?.tileset !== undefined ||
    here?.backdrop !== undefined ||
    Object.values(content.characters).some((character) => character.figure !== undefined)
  )
}

/** The picture at `path` as a bitmap with its colours exactly as painted, or an `ArtError` that says what is wrong. */
async function decode(path: string, readPicture: ReadPicture): Promise<ImageBitmap> {
  let blob: Blob
  try {
    blob = await readPicture(path)
  } catch {
    throw new ArtError(`The picture ${path} is missing. Run "automata art" to paint it.`)
  }
  try {
    return await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
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
 * Loads and checks the art of a level (the project's `start` unless `level` says). Throws an `ArtError` for the first
 * picture that is missing, unreadable or not the size its file makes it; nothing is left loaded when it throws.
 */
export async function loadArt(options: {
  content: GameContent
  level?: string
  readPicture: ReadPicture
}): Promise<Art> {
  const { content, readPicture } = options
  const level = content.levels[options.level ?? content.project.start]
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

  const source = (bitmap: ImageBitmap): ImageSource => {
    bitmaps.push(bitmap)
    const made = new ImageSource({ resource: bitmap, scaleMode: 'nearest' })
    sources.push(made)
    return made
  }
  const cut = (from: ImageSource, x: number, y: number, w: number, h: number): Texture => {
    const texture = new Texture({ source: from, frame: new Rectangle(x, y, w, h) })
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
    // The tileset's picture, cut into the tiles the level uses.
    let tiles: TileSprite[] = []
    let ground: TileBox[] = []
    const tileset = level?.tileset === undefined ? undefined : content.tilesets?.[level.tileset]
    if (level !== undefined && tileset !== undefined) {
      const bitmap = await decode(tileset.image, readPicture)
      const wide = tileset.columns * tileset.tileSize
      if (bitmap.width !== wide)
        throw new ArtError(
          `The tileset "${tileset.id}" says its picture is ${tileset.columns} tiles of ${tileset.tileSize} pixels wide, which is ${wide}, but ${tileset.image} is ${bitmap.width} pixels wide.`,
        )
      const squares = tileset.columns * Math.floor(bitmap.height / tileset.tileSize)
      const used = Math.max(-1, ...tileset.tiles.flatMap((tile) => tile.pictures.map((one) => one.frame)))
      if (used >= squares)
        throw new ArtError(
          `The tileset "${tileset.id}" uses picture ${used}, but its picture has only ${squares} squares, 0 to ${squares - 1}.`,
        )
      const picture = source(bitmap)
      const squareOf = new Map<number, Texture>()
      const square = (frame: number): Texture => {
        let texture = squareOf.get(frame)
        if (texture === undefined) {
          const size = tileset.tileSize
          texture = cut(
            picture,
            (frame % tileset.columns) * size,
            Math.floor(frame / tileset.columns) * size,
            size,
            size,
          )
          squareOf.set(frame, texture)
        }
        return texture
      }
      tiles = tilePictures(level, tileset).map(({ col, row, frame }) => ({
        col,
        row,
        texture: square(frame),
      }))
      const solid = new Set(tileset.tiles.filter((tile) => tile.solid).map((tile) => tile.letter))
      ground = tileBoxes(level.tiles, (letter) => solid.has(letter))
    }

    // Every figure a character or a backdrop's prop names, loaded once.
    const backdropFile: BackdropFile | undefined =
      level?.backdrop === undefined ? undefined : content.backdrops?.[level.backdrop]
    const figureIds = [
      ...new Set([
        ...Object.values(content.characters).flatMap((character) =>
          character.figure === undefined ? [] : [character.figure],
        ),
        ...(backdropFile?.props.map((prop) => prop.figure) ?? []),
      ]),
    ].sort()
    const figures = new Map<string, FigureArt>()
    for (const id of figureIds) {
      const figure = content.figures?.[id]
      const path = paintedPath(content, 'figure', id)
      if (figure === undefined || path === undefined)
        throw new ArtError(`The figure "${id}" has no file in this game, so it cannot be drawn.`)
      const bitmap = await decode(path, readPicture)
      const sheet = figureSheet(figure)
      sized(path, bitmap, sheet.w, sheet.h, 'figure file')
      const picture = source(bitmap)
      figures.set(id, {
        figure,
        frames: new Map(sheet.frames.map((f) => [f.name, cut(picture, f.x, f.y, f.w, f.h)])),
      })
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

    // The backdrop's strips and the props that stand on them.
    let backdrop: BackdropArt | undefined
    if (backdropFile !== undefined) {
      const path = paintedPath(content, 'backdrop', backdropFile.id)
      if (path === undefined)
        throw new ArtError(`The backdrop "${backdropFile.id}" has no file in this game.`)
      const bitmap = await decode(path, readPicture)
      const sheet = backdropSheet(backdropFile)
      sized(path, bitmap, sheet.w, sheet.h, 'backdrop file')
      const picture = source(bitmap)
      const layers = backdropFile.layers.map((layer, i) => {
        const at = sheet.frames[i] as (typeof sheet.frames)[number]
        return {
          id: layer.id,
          texture: cut(picture, at.x, at.y, at.w, at.h),
          height: at.h / backdropFile.tile,
          drift: layer.drift,
        }
      })
      const props = backdropFile.props.flatMap((prop) => {
        const shown = pictureOf(prop.figure, prop.pose ?? '', 1)
        const layer = layers.findIndex((l) => l.id === prop.layer)
        return shown === undefined || layer < 0 ? [] : [{ ...shown, layer, x: prop.x, up: prop.up }]
      })
      backdrop = { width: backdropFile.width, layers, props }
    }

    return {
      figure: (character, pose, player) => {
        const id = content.characters[character]?.figure
        return id === undefined ? undefined : pictureOf(id, pose, player)
      },
      tiles,
      ground,
      backdrop,
      destroy,
    }
  } catch (error) {
    destroy()
    throw error
  }
}
