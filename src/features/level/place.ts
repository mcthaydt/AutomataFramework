// A place: levels that join along an edge, built into one world (plan W, task 8). These are the pure parts, with no
// sim in them: which levels a sim holds, which of them a spot is in, the place's size, a level moved to its offset and
// the place's solid tiles as one grid, so a floor that runs on through a seam is one box.
import type {
  GameContent,
  Level,
  LevelJoint,
  LevelPoint,
  LevelThing,
  ThingValue,
} from '../content/content.ts'
import { levelSize } from './tile-runs.ts'
import type { SimLevel } from './where.ts'

/** Code-unit order, which is how the content sorts a place's levels: `localeCompare` could differ between engines. */
const byLevel = (a: SimLevel, b: SimLevel): number => (a.level < b.level ? -1 : a.level > b.level ? 1 : 0)

/**
 * The levels the sim holds when `opened` is opened: its place's, sorted by level id, each at its offset from the
 * place's corner; or `opened` alone at (0, 0). A level the game does not have is size 0 by 0, so the caller can still
 * say what is missing in its own words.
 */
export function levelsOf(content: GameContent, opened: string): readonly SimLevel[] {
  const place = Object.values(content.places ?? {}).find((joined) => joined.some((l) => l.level === opened))
  const sized = (id: string, x: number, y: number): SimLevel => {
    const level = content.levels[id]
    return { level: id, x, y, ...(level === undefined ? { w: 0, h: 0 } : levelSize(level)) }
  }
  if (place === undefined) return [sized(opened, 0, 0)]
  return place.map((l) => sized(l.level, l.x, l.y)).sort(byLevel)
}

/** The level whose box holds the spot (left and top edges in, right and bottom out), or undefined in none. */
export function levelAt(levels: readonly SimLevel[], x: number, y: number): string | undefined {
  return levels.find((l) => x >= l.x && x < l.x + l.w && y >= l.y && y < l.y + l.h)?.level
}

/** The width and height of the box that holds every level, from the place's corner. */
export function placeSize(levels: readonly SimLevel[]): { readonly w: number; readonly h: number } {
  return {
    w: Math.max(0, ...levels.map((l) => l.x + l.w)),
    h: Math.max(0, ...levels.map((l) => l.y + l.h)),
  }
}

const shiftPoint = (p: LevelPoint, dx: number, dy: number): LevelPoint => ({ x: p.x + dx, y: p.y + dy })

function shiftJoint(joint: LevelJoint, dx: number, dy: number): LevelJoint {
  return joint.kind === 'pin'
    ? { ...joint, x: joint.x + dx, y: joint.y + dy }
    : { ...joint, from: shiftPoint(joint.from, dx, dy), to: shiftPoint(joint.to, dx, dy) }
}

/** A thing with every path value it holds moved; a path is a value its character declares with the type `path`. */
function shiftThing(thing: LevelThing, content: GameContent, dx: number, dy: number): LevelThing {
  const paths = new Set(
    (content.characters[thing.character]?.values ?? []).filter((v) => v.type === 'path').map((v) => v.id),
  )
  const values =
    thing.values === undefined
      ? undefined
      : Object.fromEntries(
          Object.entries(thing.values).map(([id, held]): [string, ThingValue] => [
            id,
            paths.has(id) && Array.isArray(held)
              ? (held as LevelPoint[]).map((p) => shiftPoint(p, dx, dy))
              : held,
          ]),
        )
  return { ...thing, x: thing.x + dx, y: thing.y + dy, ...(values === undefined ? {} : { values }) }
}

/**
 * The level with every place in it moved by (dx, dy): things, starts, joints' places and every path value's points.
 * Nothing else changes, and the tiles stay the level's own (the place's grid puts them at the offset).
 */
export function shiftLevel(level: Level, content: GameContent, dx: number, dy: number): Level {
  return {
    ...level,
    things: level.things.map((t) => shiftThing(t, content, dx, dy)),
    starts: level.starts.map((s) => ({ ...s, x: s.x + dx, y: s.y + dy })),
    ...(level.joints === undefined ? {} : { joints: level.joints.map((j) => shiftJoint(j, dx, dy)) }),
  }
}

/** Which letters of a level are solid: its tileset's solid tiles, or `#` for a level with none. */
export function solidOf(content: GameContent, level: Level): (letter: string) => boolean {
  const tileset = level.tileset === undefined ? undefined : content.tilesets?.[level.tileset]
  if (tileset === undefined) return (letter) => letter === '#'
  const letters = new Set(tileset.tiles.filter((tile) => tile.solid).map((tile) => tile.letter))
  return (letter) => letters.has(letter)
}

/**
 * The place's solid tiles as rows of `#` and `.`, from the place's corner: `.` where there is no level, so a gap in the
 * map is open air, never a wall. `tileBoxes` then joins a floor across a seam into one box.
 */
export function solidGrid(content: GameContent, levels: readonly SimLevel[]): readonly string[] {
  const size = placeSize(levels)
  const rows = Array.from({ length: size.h }, () => Array.from({ length: size.w }, () => '.'))
  for (const l of levels) {
    const level = content.levels[l.level]
    if (level === undefined) continue
    const solid = solidOf(content, level)
    level.tiles.forEach((text, row) => {
      for (let col = 0; col < text.length; col++) {
        const cell = rows[l.y + row]
        if (cell !== undefined && solid(text[col] as string)) cell[l.x + col] = '#'
      }
    })
  }
  return rows.map((row) => row.join(''))
}
