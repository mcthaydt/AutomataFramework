// The picture of a scene's ground, painted whole: every tile of every row at once, so a photo runs across tiles with no
// seam and the painter can work out each edge. A pixel is ground or air by its tile's shape, takes its material's paint, and
// then (when its material says so) a top and an edge. Everything is whole numbers and exact arithmetic, and the photos come
// in from outside, so the bytes are the same in Node and in every browser (see the painter rules in tests/architecture).
import type { IndexedPicture } from '../../lib/png.ts'
import { createRng, deriveSeed } from '../sim/sim.ts'
import type { PhotoPixels, Photos } from './photo-library.ts'
import { type MaterialTile, materialTile } from './photo-tile.ts'
import { createPicture, rgb } from './pixels.ts'
import type { PhotoMaterial, SceneFile, SceneMaterial } from './scene.ts'
import { covers, shapesOf } from './scene-ground.ts'
import { sceneSheet } from './sheet.ts'

/** Thrown by `paintScene` when `photos` has no photo a material names. The message names the material and the photo. */
export class MissingPhotoError extends Error {}

/** A cell of the ground's grid that is not ground. */
const NONE = -1

/**
 * The picture of a scene's ground, laid out as `sceneSheet` says, in the scene's paints (place i + 1 is paint i). A tile
 * whose material is a tileset's is left clear: the renderer draws it from the tileset's own picture.
 */
export function paintScene(scene: SceneFile, photos: Photos): IndexedPicture {
  const { tile } = scene
  const width = scene.size.w * tile
  const height = scene.size.h * tile
  const sheet = sceneSheet(scene)
  const palette = [0, ...scene.paints.map((paint) => rgb(paint.color))]
  const picture = createPicture(sheet.w, sheet.h, palette)

  const materialIndex = new Map(scene.materials.map((material, i) => [material.id, i] as const))
  const paintIndex = new Map(scene.paints.map((paint, i) => [paint.id, i] as const))
  // Every photo a material names has to be there before anything is painted.
  for (const material of scene.materials)
    if (material.kind === 'photo' && photos(material.photo) === undefined)
      throw new MissingPhotoError(
        `The material "${material.id}" uses the photo "${material.photo}", and no such photo was given to the painter.`,
      )

  const tiles = new Map<string, MaterialTile>()
  const tileOf = (material: PhotoMaterial): MaterialTile => {
    let made = tiles.get(material.id)
    if (made === undefined) {
      made = materialTile(material, scene.paints, tile, photos(material.photo) as PhotoPixels)
      tiles.set(material.id, made)
    }
    return made
  }
  /** The palette place of a material's paint at a pixel of the whole scene; 0 (clear) for a tileset's tile. */
  const paintOf = (material: SceneMaterial, x: number, y: number): number => {
    if (material.kind === 'tiles') return 0
    if (material.kind === 'flat') return (paintIndex.get(material.paint) ?? -1) + 1
    const made = tileOf(material)
    return (made.places[(y % made.height) * made.width + (x % made.width)] ?? 0) + 1
  }
  /** For a photo material with a ladder: each paint's place one step down the ladder it is on (the first stays). */
  const stepDown = (material: SceneMaterial): Map<number, number> => {
    const down = new Map<number, number>()
    if (material.kind !== 'photo') return down
    for (const rungs of [material.ladder, material.accent])
      rungs?.forEach((id, k) => {
        const here = paintIndex.get(id)
        const below = paintIndex.get(rungs[k - 1] ?? id)
        if (here !== undefined && below !== undefined) down.set(here, below)
      })
    return down
  }

  // Which tile is which shape and material.
  const byLetter = new Map(scene.ground.letters.map((entry) => [entry.letter, entry] as const))
  const shapeAt = shapesOf(scene.ground)
  const owner = new Int16Array(width * height).fill(NONE)
  const behind = new Int16Array(width * height).fill(NONE)
  for (let row = 0; row < scene.size.h; row++)
    for (let col = 0; col < scene.size.w; col++) {
      const shape = shapeAt(col, row)
      const entry = byLetter.get(scene.ground.rows[row]?.[col] ?? '.')
      const material = entry === undefined ? undefined : materialIndex.get(entry.material)
      if (shape === undefined || material === undefined) continue
      for (let j = 0; j < tile; j++)
        for (let i = 0; i < tile; i++) {
          const at = (row * tile + j) * width + col * tile + i
          if (shape === 'back') behind[at] = material
          else if (covers(shape, (i + 0.5) / tile, (j + 0.5) / tile)) owner[at] = material
        }
    }

  // How deep each material's top is at each column: its `deep`, one less or one more, drawn once per column left to right.
  const topDeep = new Map<number, Int8Array>()
  scene.materials.forEach((material, m) => {
    if (material.kind === 'tiles' || material.top === undefined) return
    const rng = createRng(deriveSeed(scene.seed, material.id))
    const columns = new Int8Array(width)
    for (let x = 0; x < width; x++) columns[x] = material.top.deep - 1 + rng.int(3)
    topDeep.set(m, columns)
  })

  const painted = new Uint8Array(width * height)
  const downOf = scene.materials.map(stepDown)
  for (let x = 0; x < width; x++) {
    // How many pixels of one material's ground lie between this pixel and the air above it, counting this one as 0 at the
    // surface, or NONE when something else is above (the scene's top edge counts as air).
    let depth = NONE
    for (let y = 0; y < height; y++) {
      const at = y * width + x
      const m = owner[at] as number
      const back = behind[at] as number
      if (m === NONE) {
        depth = NONE
        if (back !== NONE) {
          const material = scene.materials[back] as SceneMaterial
          const place = paintOf(material, x, y)
          const lower = downOf[back]?.get(place - 1)
          painted[at] = lower === undefined ? place : lower + 1
        }
        continue
      }
      const above = y === 0 ? NONE : (owner[at - width] as number)
      depth = above === NONE ? 0 : above === m && depth !== NONE ? depth + 1 : NONE
      const material = scene.materials[m] as SceneMaterial
      let place = paintOf(material, x, y)
      if (material.kind !== 'tiles' && material.top !== undefined && depth !== NONE) {
        const top = materialIndex.get(material.top.material)
        if (top !== undefined && depth < (topDeep.get(m)?.[x] ?? 0))
          place = paintOf(scene.materials[top] as SceneMaterial, x, y)
      }
      painted[at] = place
    }
  }

  // The edge: a ground pixel with air or a back wall on one of its four sides. The scene's own border is not air.
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const at = y * width + x
      const m = owner[at] as number
      const material = m === NONE ? undefined : scene.materials[m]
      if (material === undefined || material.kind === 'tiles' || material.edge === undefined) continue
      const open = (nx: number, ny: number): boolean =>
        nx >= 0 && ny >= 0 && nx < width && ny < height && owner[ny * width + nx] === NONE
      if (open(x - 1, y) || open(x + 1, y) || open(x, y - 1) || open(x, y + 1))
        painted[at] = (paintIndex.get(material.edge) ?? -1) + 1
    }

  // Out onto the pages: page p holds the columns from p * pageWidth, and sits p pages down.
  const pageWidth = sheet.w
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const place = painted[y * width + x] as number
      if (place === 0) continue
      const page = Math.floor(x / pageWidth)
      picture.set(x - page * pageWidth, y + page * height, place)
    }
  return picture.done()
}
