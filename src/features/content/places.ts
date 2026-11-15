// Which levels join into one place (plan W, task 3). A level sits on the world map at a place of its own; two levels
// that touch along a side are joined along the stretch where both are open, and levels joined one to the next make
// a place. Pure: it reads levels and a world file and answers with joins, places and what is wrong, so `check`, the
// loader and `automata world` all say the same thing.
import type { Level } from './level.ts'
import type { TilesetFile } from './tileset.ts'
import type { Listed } from './type-info.ts'
import type { WorldFile } from './world.ts'

/** One joined level: where its corner is, in whole tiles from its place's own corner (never less than 0). */
export interface PlaceLevel {
  readonly level: string
  readonly x: number
  readonly y: number
}

/**
 * One stretch two levels share and are both open on. `along` is the axis the stretch runs along; `from` and `to` are
 * map tiles on it, `to` not included. `a` is the left (or top) level and `b` the right (or bottom) one.
 */
export interface Join {
  readonly a: string
  readonly b: string
  readonly along: 'x' | 'y'
  readonly from: number
  readonly to: number
}

/** What the map says: the joins, the places they make and what is wrong. */
export interface WorldLayout {
  readonly joins: readonly Join[]
  /** Only places of two or more levels, keyed by their first level id in code-unit order; each list sorted by level id. */
  readonly places: Readonly<Record<string, readonly PlaceLevel[]>>
  /** What is wrong, each at the world file's `levels[entry].at`. */
  readonly problems: readonly { readonly entry: number; readonly message: string }[]
}

/** Says whether the tile at a column and row of a level (counted from its own top left) lets a hero through. */
export type IsOpen = (level: Level, col: number, row: number) => boolean

/** A level on the map: where its corner is and how many tiles it covers. */
interface Box {
  readonly entry: number
  readonly id: string
  readonly level: Level
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

/** What one stretch of shared edge is, tile by tile: both open (a join), only one open (a problem), or a wall. */
type Seam = 'join' | 'first' | 'second' | 'wall'

/**
 * The loader's `isOpen`: a tile is open when it is not solid. A level's `.` is always open; its `#` is solid, or with
 * a tileset a letter is solid when the tileset says so. A tileset that did not read counts every letter but `#` as open.
 */
export function openTile(tilesets: Readonly<Record<string, TilesetFile>> | undefined): IsOpen {
  return (level, col, row) => {
    const letter = level.tiles[row]?.[col]
    if (letter === undefined) return false
    if (letter === '.') return true
    const tileset = level.tileset === undefined ? undefined : tilesets?.[level.tileset]
    if (tileset === undefined) return letter !== '#'
    return !tileset.tiles.some((tile) => tile.letter === letter && tile.solid)
  }
}

const whole = (n: number): boolean => Number.isInteger(n)

/** The two boxes as (first, second): `p` then `q` when `pFirst`, else `q` then `p`. */
const ordered = (p: Box, q: Box, pFirst: boolean): [Box, Box] => (pFirst ? [p, q] : [q, p])

/** `row 5`, `rows 5 to 7`. */
function range(unit: 'row' | 'column', from: number, to: number): string {
  return from === to ? `${unit} ${from}` : `${unit}s ${from} to ${to}`
}

/** Works out which levels touch, where they join, and what is wrong with how they sit. */
export function layoutWorld(
  world: WorldFile,
  levels: Readonly<Record<string, Level>>,
  isOpen: IsOpen,
): WorldLayout {
  const boxes: Box[] = []
  world.levels.forEach((entry, index) => {
    const level = Object.hasOwn(levels, entry.level) ? levels[entry.level] : undefined
    if (level === undefined) return
    boxes.push({
      entry: index,
      id: entry.level,
      level,
      x0: entry.at.x,
      y0: entry.at.y,
      x1: entry.at.x + (level.tiles[0]?.length ?? 0),
      y1: entry.at.y + level.tiles.length,
    })
  })

  const joins: Join[] = []
  const problems: { entry: number; message: string }[] = []
  const wholeTiles = (box: Box, other: Box): void => {
    const x = world.levels[box.entry]?.at.x ?? 0
    const y = world.levels[box.entry]?.at.y ?? 0
    const off = [...(whole(x) ? [] : [`x ${x}`]), ...(whole(y) ? [] : [`y ${y}`])]
    if (off.length > 0)
      problems.push({
        entry: box.entry,
        message: `${box.id} touches ${other.id}, so where it sits must be in whole tiles. Got ${off.join(', ')}.`,
      })
  }

  boxes.forEach((a, i) => {
    for (const b of boxes.slice(i + 1)) {
      const across = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
      const down = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
      if (across > 0 && down > 0) {
        problems.push({
          entry: b.entry,
          message: `${b.id} sits on top of ${a.id} on the map. Move one so they do not overlap.`,
        })
        wholeTiles(a, b)
        wholeTiles(b, a)
        continue
      }
      const beside = (a.x1 === b.x0 || b.x1 === a.x0) && down > 0
      const stacked = (a.y1 === b.y0 || b.y1 === a.y0) && across > 0
      if (!beside && !stacked) continue
      if ([a, b].some((box) => !whole(box.x0) || !whole(box.y0))) {
        wholeTiles(a, b)
        wholeTiles(b, a)
        continue
      }
      // `first` is the left (or top) one of the two.
      const [first, second] = ordered(a, b, beside ? a.x1 === b.x0 : a.y1 === b.y0)
      scan(first, second, beside ? 'y' : 'x')
    }
  })

  /** Walks the edge two touching levels share, one tile at a time, and says what it finds. */
  function scan(first: Box, second: Box, along: 'x' | 'y'): void {
    const lo = along === 'y' ? Math.max(first.y0, second.y0) : Math.max(first.x0, second.x0)
    const hi = along === 'y' ? Math.min(first.y1, second.y1) : Math.min(first.x1, second.x1)
    const seamAt = (k: number): Seam => {
      const open =
        along === 'y'
          ? [
              isOpen(first.level, first.x1 - first.x0 - 1, k - first.y0),
              isOpen(second.level, 0, k - second.y0),
            ]
          : [
              isOpen(first.level, k - first.x0, first.y1 - first.y0 - 1),
              isOpen(second.level, k - second.x0, 0),
            ]
      if (open[0] && open[1]) return 'join'
      return open[0] ? 'first' : open[1] ? 'second' : 'wall'
    }
    let start = lo
    while (start < hi) {
      const seam = seamAt(start)
      let end = start + 1
      while (end < hi && seamAt(end) === seam) end++
      if (seam === 'join') joins.push({ a: first.id, b: second.id, along, from: start, to: end })
      else if (seam !== 'wall') {
        const open = seam === 'first' ? first : second
        const solid = seam === 'first' ? second : first
        const unit = along === 'y' ? 'row' : 'column'
        const side = (box: Box): string =>
          along === 'y' ? (box === first ? 'right' : 'left') : box === first ? 'bottom' : 'top'
        const offset = (box: Box): number => (along === 'y' ? box.y0 : box.x0)
        const here = range(unit, start - offset(open), end - 1 - offset(open))
        const there = range(unit, start - offset(solid), end - 1 - offset(solid))
        const those =
          here === there ? (end - start === 1 ? `that ${unit}` : `those ${unit}s`) : there
        problems.push({
          entry: open.entry,
          message: `${open.id}'s ${side(open)} edge is open at ${here}, but ${solid.id}, which touches it, is solid there. Open ${solid.id}'s ${side(solid)} edge at ${those}, or move it.`,
        })
      }
      start = end
    }
  }

  return { joins, places: placesOf(boxes, joins), problems: problems.sort((p, q) => p.entry - q.entry) }
}

/** The places the joins make: levels joined one to the next, each at its offset from the place's top left corner. */
function placesOf(boxes: readonly Box[], joins: readonly Join[]): Record<string, readonly PlaceLevel[]> {
  const group = new Map<string, string>(boxes.map((box) => [box.id, box.id]))
  const root = (id: string): string => {
    let at = id
    for (let up = group.get(at); up !== undefined && up !== at; up = group.get(at)) at = up
    return at
  }
  for (const join of joins) group.set(root(join.a), root(join.b))
  const members = new Map<string, Box[]>()
  for (const box of boxes) members.set(root(box.id), [...(members.get(root(box.id)) ?? []), box])
  const places: Record<string, readonly PlaceLevel[]> = {}
  for (const joined of members.values()) {
    if (joined.length < 2) continue
    const left = Math.min(...joined.map((box) => box.x0))
    const top = Math.min(...joined.map((box) => box.y0))
    const levels = joined
      .map((box) => ({ level: box.id, x: box.x0 - left, y: box.y0 - top }))
      .sort((p, q) => (p.level < q.level ? -1 : p.level > q.level ? 1 : 0))
    const [firstLevel] = levels
    if (firstLevel !== undefined) places[firstLevel.level] = levels
  }
  return places
}

/**
 * The layout of a world file against the rest of the game, or `undefined` when a level it names, or the tileset of
 * one, did not read: a check skips what it cannot see.
 */
export function layoutFor(world: WorldFile, game: Listed): WorldLayout | undefined {
  const levels: Record<string, Level> = Object.create(null)
  const tilesets: Record<string, TilesetFile> = Object.create(null)
  for (const entry of world.levels) {
    const level = game.get('level', entry.level)
    if (level === undefined) return undefined
    levels[entry.level] = level
    if (level.tileset === undefined) continue
    const tileset = game.get('tileset', level.tileset)
    if (tileset === undefined) return undefined
    tilesets[level.tileset] = tileset
  }
  return layoutWorld(world, levels, openTile(tilesets))
}
