// Where the painted pages of a scene's ground go in the level. A pure function of the scene, so it is tested without a page:
// the picture of a wide scene is cut into pages (a picture has a largest side), and the stage places each one.
import { groundPageTiles, type SceneFile, sceneSheet } from '../content/content.ts'

/** One page of a scene's ground: its frame in the scene's picture, and where it goes in the level, in tiles. */
interface GroundPage {
  /** The frame's name in the scene's atlas, `ground/0` first. */
  readonly frame: string
  /** The column of the level its left edge is at. */
  readonly col: number
  readonly w: number
  readonly h: number
}

/** The pages of `scene`'s ground, left to right. */
export function groundPages(scene: SceneFile): GroundPage[] {
  const perPage = groundPageTiles(scene.tile)
  return sceneSheet(scene).frames.map((frame, page) => ({
    frame: frame.name,
    col: page * perPage,
    w: frame.w / scene.tile,
    h: frame.h / scene.tile,
  }))
}
