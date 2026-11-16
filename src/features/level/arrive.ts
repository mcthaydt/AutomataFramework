// Where the heroes come in when a level is opened (plan W, task 8). A door is a sensor, and a body made inside a sensor
// raises its `touched` on the first step, so a hero is never put inside a door it comes in by: it comes in beside it,
// clear of its box, on the side toward the middle of the level, and failing that on the other side, and failing that at
// its own start. All spots are in the sim's tiles: the opened level's offset in the place is already added.
import type { Character, GameContent, Level } from '../content/content.ts'
import { boxesOverlap, type TurnedBox } from './overlap.ts'
import { solidOf } from './place.ts'
import type { SimLevel } from './where.ts'

/** Where the heroes come in: beside a thing of the level (a door they came through), or at a spot in its own tiles. */
export type Arrive = { readonly thing: string } | { readonly x: number; readonly y: number }

/** A hero's middle, in the sim's tiles. */
export interface Spot {
  readonly x: number
  readonly y: number
}

/** The gap between a door's edge and the hero beside it: more than the 0.01 tile a box must overlap by to count. */
const CLEAR = 0.05

/** A box that does not turn. */
const box = (x: number, y: number, size: { readonly w: number; readonly h: number }): TurnedBox => ({
  x,
  y,
  hw: size.w / 2,
  hh: size.h / 2,
  rotation: 0,
})

/** True when a hero of `size` standing at (x, y) of `level` (the level's own tiles) is somewhere a hero may be put. */
function fits(content: GameContent, level: Level, size: Character['size'], x: number, y: number): boolean {
  const hero = box(x, y, size)
  const rows = level.tiles.length
  const cols = level.tiles[0]?.length ?? 0
  if (x - hero.hw < 0 || x + hero.hw > cols || y - hero.hh < 0 || y + hero.hh > rows) return false
  const solid = solidOf(content, level)
  for (let row = Math.floor(y - hero.hh); row < Math.ceil(y + hero.hh); row++)
    for (let col = Math.floor(x - hero.hw); col < Math.ceil(x + hero.hw); col++) {
      const letter = level.tiles[row]?.[col]
      if (
        letter !== undefined &&
        solid(letter) &&
        boxesOverlap(hero, box(col + 0.5, row + 0.5, { w: 1, h: 1 }))
      )
        return false
    }
  // A thing that leads into another level is a door: a hero put on it would take it before anyone moved.
  return !level.things.some((thing) => {
    const character = content.characters[thing.character]
    if (character === undefined) return false
    const leads = (character.values ?? []).some(
      (v) => v.type === 'leads-to' && thing.values?.[v.id] !== undefined,
    )
    return leads && boxesOverlap(hero, box(thing.x, thing.y, character.size))
  })
}

/**
 * Where each of `players` comes in, in the sim's tiles. With no `arrive` that is each player's start in the opened
 * level. With `{ thing }` it is beside that thing, near side then far side, player 1 nearest and each later player as
 * much further out as their start is further from player 1's; with `{ x, y }` it is that spot (in the opened level's own
 * tiles), each later player as far from it as their start is from player 1's. A spot is used when the hero fits there
 * (inside the level, in no solid tile, on no door); when none does, or the level has no such thing, the hero's own start
 * is used. A player the level has no start for is left out, and `spawnLevel` says so in its own words.
 */
export function arrivalSpots(
  content: GameContent,
  levels: readonly SimLevel[],
  opened: string,
  players: readonly number[],
  arrive?: Arrive,
): ReadonlyMap<number, Spot> {
  const spots = new Map<number, Spot>()
  const level = content.levels[opened]
  const hero = content.characters[content.project.hero]
  if (level === undefined || hero === undefined) return spots
  const offset = levels.find((l) => l.level === opened) ?? { x: 0, y: 0 }
  const first = level.starts.find((s) => s.player === 1) ?? level.starts[0]
  const thing =
    arrive !== undefined && 'thing' in arrive ? level.things.find((t) => t.id === arrive.thing) : undefined
  const door = thing === undefined ? undefined : content.characters[thing.character]
  const middle = (level.tiles[0]?.length ?? 0) / 2

  for (const number of [...new Set(players)].sort((a, b) => a - b)) {
    const start = level.starts.find((s) => s.player === number)
    if (start === undefined || first === undefined) continue
    const own: Spot = { x: start.x, y: start.y }
    const tries: Spot[] = []
    if (thing !== undefined && door !== undefined) {
      // Player n stands further from the thing than player 1 by how far their starts are apart along x.
      const side = thing.x <= middle ? 1 : -1
      const reach = door.size.w / 2 + hero.size.w / 2 + CLEAR + Math.abs(start.x - first.x)
      const y = thing.y + door.size.h / 2 - hero.size.h / 2
      tries.push({ x: thing.x + side * reach, y }, { x: thing.x - side * reach, y })
    } else if (arrive !== undefined && 'x' in arrive) {
      tries.push({ x: arrive.x + (start.x - first.x), y: arrive.y + (start.y - first.y) })
    }
    const chosen = tries.find((t) => fits(content, level, hero.size, t.x, t.y)) ?? own
    spots.set(number, { x: chosen.x + offset.x, y: chosen.y + offset.y })
  }
  return spots
}
