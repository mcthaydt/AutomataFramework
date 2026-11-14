import { MAX_PLAYERS } from '../commands/commands.ts'
import type { Character, GameContent } from '../content/content.ts'
import { BodyKind, body, collider, transform } from '../physics/physics.ts'
import type { Sim } from '../sim/sim.ts'
import { groundOf } from './colours.ts'
import { Look, Thing } from './components.ts'
import { characterParts, heroParts } from './hero.ts'
import { jointParts, type Placed } from './joints.ts'
import { tileBoxes, tileRuns } from './tile-runs.ts'
import { usesSprites } from './uses.ts'

/** The level cannot be spawned as asked: an unknown level, or a player the level has no start point for. */
export class LevelError extends Error {}

/** "player 1", "players 1 and 2", "players 1, 2 and 3". */
function who(numbers: readonly number[]): string {
  const last = numbers[numbers.length - 1]
  return numbers.length === 1 ? `player ${last}` : `players ${numbers.slice(0, -1).join(', ')} and ${last}`
}

/**
 * Puts a level into `sim`, in a fixed order so the same level always gives the same entity ids: the tile runs, then
 * the things in the order of the file, then the level's anchor (one fixed body with no collider, only when a joint has
 * no holder), then the joints in the order of the file, then one hero per player, lowest number first. A level's own
 * entities so get the same ids whoever plays. Throws a `LevelError` that
 * says what to fix if the level, a character or a player's start point is missing.
 */
export function spawnLevel(
  sim: Sim,
  content: GameContent,
  levelId: string,
  players: readonly number[],
): void {
  const level = content.levels[levelId]
  if (level === undefined)
    throw new LevelError(
      `There is no level called "${levelId}". This game has: ${Object.keys(content.levels).sort().join(', ')}.`,
    )
  const numbers = [...new Set(players)].sort((a, b) => a - b)
  const bad = numbers.find((n) => !Number.isInteger(n) || n < 1 || n > MAX_PLAYERS)
  if (bad !== undefined) throw new LevelError(`Players are numbered 1 to ${MAX_PLAYERS}, but one is ${bad}.`)
  const have = level.starts.map((s) => s.player).sort((a, b) => a - b)
  const missing = numbers.find((n) => !have.includes(n))
  if (missing !== undefined)
    throw new LevelError(
      `Level "${levelId}" has a start point for ${who(have)} only. Add one for player ${missing}.`,
    )
  const character = (id: string, what: string): Character => {
    const found = content.characters[id]
    if (found === undefined) throw new LevelError(`${what} is "${id}", and this game has no such character.`)
    return found
  }

  const ground = groundOf(level)
  const sprites = usesSprites(content)
  // A level with a tileset takes "solid" from it; the content a game was loaded from always has the tileset, so it is
  // only a hand-built content that can be missing it, and then nothing is guessed.
  let isSolid: ((letter: string) => boolean) | undefined
  if (level.tileset !== undefined) {
    const tileset = content.tilesets?.[level.tileset]
    if (tileset === undefined)
      throw new LevelError(
        `Level "${levelId}" uses the tileset "${level.tileset}", and this game has no such tileset.`,
      )
    const letters = new Set(tileset.tiles.filter((tile) => tile.solid).map((tile) => tile.letter))
    isSolid = (letter) => letters.has(letter)
  }
  // A level with a tileset joins stacked tiles of one width into one box, so a wall has no seams; a level without one
  // keeps one box a row, as every game recorded before tilesets does.
  const solids =
    level.tileset === undefined
      ? tileRuns(level.tiles, isSolid).map((run) => ({ row: run.row, col: run.col, w: run.length, h: 1 }))
      : tileBoxes(level.tiles, isSolid)
  for (const box of solids)
    sim.spawn([
      transform({ x: box.col + box.w / 2, y: box.row + box.h / 2 }),
      body(BodyKind.fixed),
      collider.cuboid(box.w / 2, box.h / 2),
      [Look, { w: box.w, h: box.h, color: ground }],
    ])
  const placed = new Map<string, Placed>()
  for (const thing of level.things)
    placed.set(thing.id, {
      sid: sim.spawn([
        ...characterParts(character(thing.character, `Thing "${thing.id}"`), thing, sprites),
        [Thing, { id: thing.id, character: thing.character }],
      ]),
      x: thing.x,
      y: thing.y,
    })
  const joints = level.joints ?? []
  // The level itself, as a joint's holder: a fixed body at the corner, so a place on the level is its own offset.
  const anchor: Placed | undefined = joints.some((j) => j.holder === undefined)
    ? { sid: sim.spawn([transform(), body(BodyKind.fixed)]), x: 0, y: 0 }
    : undefined
  for (const j of joints) {
    const find = (id: string, how: string): Placed => {
      const found = placed.get(id)
      if (found === undefined)
        throw new LevelError(`Joint "${j.id}" ${how} "${id}", and level "${levelId}" has no such thing.`)
      return found
    }
    const holder = j.holder === undefined ? (anchor as Placed) : find(j.holder, 'is held by')
    sim.spawn([jointParts(j, find(j.thing, 'holds'), holder)])
  }
  // The hero's character must exist; the level is known to have each player's start point, checked above.
  character(content.project.hero, 'The hero')
  for (const number of numbers) sim.spawn(heroParts(content, levelId, number) ?? [])
}
