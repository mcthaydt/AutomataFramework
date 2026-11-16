// One entity's parts, shared by the level (which spawns the heroes the game starts with) and by `join` (which spawns
// one mid-game). One list of parts, so the hero who joins is the hero the level would have made.
import { Player } from '../commands/commands.ts'
import { type Character, type GameContent, type LevelThing, withDefaults } from '../content/content.ts'
import { BodyKind, body, collider, mass, Touching, transform } from '../physics/physics.ts'
import type { SpawnPart } from '../sim/sim.ts'
import { colourNumber } from './colours.ts'
import { Look, Thing } from './components.ts'
import { In } from './entered.ts'
import { MOVE_START } from './move-step.ts'
import { Moves } from './moves.ts'
import { levelAt, levelsOf } from './place.ts'
import { Sprite } from './sprite.ts'
import { Open, Pressed } from './switches.ts'
import { usesMoves, usesSprites } from './uses.ts'

/**
 * The parts every character-shaped entity gets: where, how it moves, its box and how it looks, and (in a game with
 * figures) a sprite, which is `player`'s hero's or, for 0, nobody's.
 */
export function characterParts(
  character: Character,
  at: { readonly x: number; readonly y: number; readonly values?: LevelThing['values'] },
  sprites: boolean,
  player = 0,
): SpawnPart[] {
  return [
    transform(at),
    body(character.body === 'dynamic' ? BodyKind.dynamic : BodyKind.fixed, {
      fixedRotation: character.upright,
    }),
    // A touched character lets things through: the game is told, and nothing is pushed.
    collider.cuboid(character.size.w / 2, character.size.h / 2, { sensor: character.touch !== undefined }),
    [Look, { w: character.size.w, h: character.size.h, color: colourNumber(character.color) }],
    ...(sprites ? [[Sprite, { character: character.id, player, face: 1 }] as const] : []),
    // A switch knows whether it is pressed and a gate whether it is open, only in a game that has either.
    ...(character.switch !== undefined ? [Pressed] : []),
    ...(character.opens !== undefined ? [Open] : []),
    // A character that names a weight weighs its thing's own value, or the value's default: read once, at spawn.
    ...(character.weight !== undefined ? [mass(withDefaults(character, at)[character.weight] as number)] : []),
  ]
}

/**
 * The parts of player `number`'s hero at that player's start point in the level, or at `at` when it is given (where a
 * hero comes in beside a door, or in a place: `arrivalSpots` says). `undefined` when the level, the hero's character or
 * that player's start point does not exist.
 */
export function heroParts(
  content: GameContent,
  levelId: string,
  number: number,
  at?: { readonly x: number; readonly y: number },
): SpawnPart[] | undefined {
  const start = content.levels[levelId]?.starts.find((s) => s.player === number)
  const hero = content.characters[content.project.hero]
  if (start === undefined || hero === undefined) return undefined
  // In a place of two or more levels a hero knows which level it is in: the one its spot is in.
  const levels = levelsOf(content, levelId)
  const spot = at ?? start
  const inLevel = levels.length > 1 ? (levelAt(levels, spot.x, spot.y) ?? levelId) : undefined
  return [
    ...characterParts(hero, at ?? start, usesSprites(content), number),
    [Thing, { id: `player-${number}`, character: content.project.hero }],
    [Player, { number }],
    ...(inLevel === undefined ? [] : [[In, { level: inLevel }] as const]),
    // A hero the framework moves remembers how, and is told what it stands on and leans against.
    ...(usesMoves(content) ? [[Moves, { ...MOVE_START }] as const, Touching] : []),
  ]
}
