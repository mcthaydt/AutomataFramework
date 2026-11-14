import { MAX_PLAYERS } from '../commands/commands.ts'
import type { Character, GameContent } from '../content/content.ts'
import { BodyKind, body, collider, transform } from '../physics/physics.ts'
import type { Sim } from '../sim/sim.ts'
import { groundOf } from './colours.ts'
import { Look, Thing } from './components.ts'
import { characterParts, heroParts } from './hero.ts'
import { mindParts } from './mind.ts'
import { tileRuns } from './tile-runs.ts'

/** The level cannot be spawned as asked: an unknown level, or a player the level has no start point for. */
export class LevelError extends Error {}

/** "player 1", "players 1 and 2", "players 1, 2 and 3". */
function who(numbers: readonly number[]): string {
  const last = numbers[numbers.length - 1]
  return numbers.length === 1 ? `player ${last}` : `players ${numbers.slice(0, -1).join(', ')} and ${last}`
}

/**
 * Puts a level into `sim`, in a fixed order so the same level always gives the same entity ids: the tile runs, then
 * the things in the order of the file, then one hero per player, lowest number first. Throws a `LevelError` that
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
  for (const run of tileRuns(level.tiles, isSolid))
    sim.spawn([
      transform({ x: run.col + run.length / 2, y: run.row + 0.5 }),
      body(BodyKind.fixed),
      collider.cuboid(run.length / 2, 0.5),
      [Look, { w: run.length, h: 1, color: ground }],
    ])
  for (const thing of level.things) {
    const kind = character(thing.character, `Thing "${thing.id}"`)
    // Only a thing with a behaviour has a mind, and never a hero: `heroParts` does not add one.
    sim.spawn([
      ...characterParts(kind, thing),
      [Thing, { id: thing.id, character: thing.character }],
      ...mindParts(kind),
    ])
  }
  // The hero's character must exist; the level is known to have each player's start point, checked above.
  character(content.project.hero, 'The hero')
  for (const number of numbers) sim.spawn(heroParts(content, levelId, number) ?? [])
}
