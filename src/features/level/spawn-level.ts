import { MAX_PLAYERS, Player } from '../commands/commands.ts'
import type { Character, GameContent } from '../content/content.ts'
import { BodyKind, body, collider, transform } from '../physics/physics.ts'
import type { Sim, SpawnPart } from '../sim/sim.ts'
import { Look, Thing, TILE_COLOR } from './components.ts'
import { tileRuns } from './tile-runs.ts'

/** The level cannot be spawned as asked: an unknown level, or a player the level has no start point for. */
export class LevelError extends Error {}

/** "player 1", "players 1 and 2", "players 1, 2 and 3". */
function who(numbers: readonly number[]): string {
  const last = numbers[numbers.length - 1]
  return numbers.length === 1 ? `player ${last}` : `players ${numbers.slice(0, -1).join(', ')} and ${last}`
}

/** The parts every character-shaped entity gets: where, how it moves, its box and how it looks. */
function characterParts(character: Character, at: { x: number; y: number }): SpawnPart[] {
  return [
    transform(at),
    body(character.body === 'dynamic' ? BodyKind.dynamic : BodyKind.fixed, {
      fixedRotation: character.upright,
    }),
    collider.cuboid(character.size.w / 2, character.size.h / 2),
    [
      Look,
      { w: character.size.w, h: character.size.h, color: Number.parseInt(character.color.slice(1), 16) },
    ],
  ]
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

  for (const run of tileRuns(level.tiles))
    sim.spawn([
      transform({ x: run.col + run.length / 2, y: run.row + 0.5 }),
      body(BodyKind.fixed),
      collider.cuboid(run.length / 2, 0.5),
      [Look, { w: run.length, h: 1, color: TILE_COLOR }],
    ])
  for (const thing of level.things)
    sim.spawn([
      ...characterParts(character(thing.character, `Thing "${thing.id}"`), thing),
      [Thing, { id: thing.id, character: thing.character }],
    ])
  const hero = character(content.project.hero, 'The hero')
  for (const number of numbers) {
    const start = level.starts.find((s) => s.player === number) as { x: number; y: number }
    sim.spawn([
      ...characterParts(hero, start),
      [Thing, { id: `player-${number}`, character: content.project.hero }],
      [Player, { number }],
    ])
  }
}
