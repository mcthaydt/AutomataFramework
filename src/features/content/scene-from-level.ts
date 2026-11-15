// A scene from an old level: the ground a level wrote in its own rows, moved into a scene file, and the level pointing at
// it. Nothing about how the level plays changes: the same rows, the same colours, and for a level with no tileset the same
// one box a row, so a recorded play of it still plays and hashes as it did.
import type { Level } from './level.ts'
import type { GameContent } from './load.ts'
import type { SceneFile, SceneLetter, SceneMaterial } from './scene.ts'
import { noSuch } from './shared.ts'

/** The scene's tile, in pixels, for a scene made from a level: the size the framework's own tilesets use. */
const TILE = 16

/** The ground colour a level has when it says none, and so a scene made from it. */
const SLATE = '#3b4a5a'

/** The scene an old level's ground is, and the level pointing at it. Throws if the level already has a scene. */
export function sceneFromLevel(
  content: GameContent,
  levelId: string,
  sceneId: string,
): { scene: SceneFile; level: Level } {
  const old = content.levels[levelId]
  if (old === undefined) throw new Error(noSuch('level', levelId, Object.keys(content.levels)))
  if (old.scene !== undefined) throw new Error(`Level "${levelId}" already has a scene, "${old.scene}".`)
  const rows = old.tiles ?? []
  const color = old.ground ?? SLATE
  const tileset = old.tileset === undefined ? undefined : content.tilesets?.[old.tileset]

  let materials: SceneMaterial[]
  let letters: SceneLetter[]
  if (old.tileset === undefined || tileset === undefined) {
    materials = [{ id: 'ground', kind: 'flat', paint: 'ground' }]
    letters = [{ letter: '#', material: 'ground', shape: 'solid' }]
  } else {
    // One material for each kind of tile, and a letter for it: solid when the kind is, a wall to look at when not.
    const tilesetId = old.tileset
    materials = tileset.tiles.map((kind) => ({
      id: kind.id,
      kind: 'tiles',
      tileset: tilesetId,
      tile: kind.id,
    }))
    letters = tileset.tiles.map((kind) => ({
      letter: kind.letter,
      material: kind.id,
      shape: kind.solid ? 'solid' : 'back',
    }))
  }

  const scene: SceneFile = {
    format: 1,
    id: sceneId,
    seed: 0,
    tile: TILE,
    size: { w: rows[0]?.length ?? 0, h: rows.length },
    sky: old.sky,
    backdrop: old.backdrop,
    // A scene needs a paint, and a tileset's material draws none of its own: the colour is the ground's anyway.
    paints: [{ id: 'ground', color }],
    materials,
    ground: {
      color: old.ground,
      // A level with no tileset spawned one box a row; keeping that is what keeps its recorded play as it was.
      oneBoxPerRow: old.tileset === undefined ? true : undefined,
      letters,
      rows,
    },
  }
  const level: Level = {
    format: 1,
    id: old.id,
    scene: sceneId,
    view: old.view,
    things: old.things,
    starts: old.starts,
    joints: old.joints,
  }
  return { scene, level }
}
