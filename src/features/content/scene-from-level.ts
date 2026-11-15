// A scene from an old level: the ground a level wrote in its own rows, moved into a scene file, and the level pointing at
// it. Nothing about how the level plays changes: the same rows, the same colours, and the same boxes (one a row for a
// level the old way, joined ones for a tileset or a hero the framework moves), so a recorded play of it still plays and
// hashes as it did.
import type { Level } from './level.ts'
import type { GameContent } from './load.ts'
import type { SceneFile, SceneLetter, SceneMaterial } from './scene.ts'
import { noSuch } from './shared.ts'

/** The scene's tile, in pixels, for a scene made from a level: the size the framework's own tilesets use. */
const TILE = 16

/** How many materials a scene holds at most, which is how many kinds of tile a tileset may have to be moved into one. */
const MAX_MATERIALS = 32

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
  const heroMoves = content.characters[content.project.hero]?.moves !== undefined

  let materials: SceneMaterial[]
  let letters: SceneLetter[]
  if (old.tileset === undefined || tileset === undefined) {
    materials = [{ id: 'ground', kind: 'flat', paint: 'ground' }]
    letters = [{ letter: '#', material: 'ground', shape: 'solid' }]
  } else {
    if (tileset.tiles.length > MAX_MATERIALS)
      throw new Error(
        `The tileset "${old.tileset}" has ${tileset.tiles.length} kinds of tile, and a scene holds ${MAX_MATERIALS} materials at most. Take out kinds of tile the level does not use, or write the scene by hand.`,
      )
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
    ...(old.sky === undefined ? {} : { sky: old.sky }),
    ...(old.backdrop === undefined ? {} : { backdrop: old.backdrop }),
    // A scene needs a paint, and a tileset's material draws none of its own: the colour is the ground's anyway.
    paints: [{ id: 'ground', color }],
    materials,
    ground: {
      ...(old.ground === undefined ? {} : { color: old.ground }),
      // A level with no tileset spawned one box a row, unless the hero is one the framework moves, which joined its
      // boxes; keeping what it did is what keeps its recorded play as it was.
      ...(old.tileset === undefined && !heroMoves ? { oneBoxPerRow: true as const } : {}),
      letters,
      rows,
    },
  }
  const level: Level = {
    format: 1,
    id: old.id,
    scene: sceneId,
    ...(old.view === undefined ? {} : { view: old.view }),
    things: old.things,
    starts: old.starts,
    ...(old.joints === undefined ? {} : { joints: old.joints }),
  }
  return { scene, level }
}
