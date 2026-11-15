// One entity's parts, shared by the level (which spawns the heroes the game starts with) and by `join` (which spawns
// one mid-game). One list of parts, so the hero who joins is the hero the level would have made.
import { Player } from '../commands/commands.ts'
import type { Character, GameContent } from '../content/content.ts'
import { BodyKind, body, collider, Ground, Touching, transform } from '../physics/physics.ts'
import type { SpawnPart } from '../sim/sim.ts'
import { colourNumber } from './colours.ts'
import { Look, Thing } from './components.ts'
import { MOVE_START } from './move-step.ts'
import { Moves } from './moves.ts'
import { Sprite } from './sprite.ts'
import { usesMoves, usesSlopes, usesSprites } from './uses.ts'

/** A moved hero's friction in a game with a slope; the ground's own average with it is 1.25, steeper than any slope it stands on. */
const SLOPE_GRIP = 2

/**
 * The parts every character-shaped entity gets: where, how it moves, its box and how it looks, and (in a game with
 * figures) a sprite, which is `player`'s hero's or, for 0, nobody's.
 */
export function characterParts(
  character: Character,
  at: { x: number; y: number },
  sprites: boolean,
  player = 0,
  /** Friction for the box, where the game wants other than the framework's (a hero on slopes). */
  friction?: number,
): SpawnPart[] {
  return [
    transform(at),
    body(character.body === 'dynamic' ? BodyKind.dynamic : BodyKind.fixed, {
      fixedRotation: character.upright,
    }),
    // A touched character lets things through: the game is told, and nothing is pushed.
    collider.cuboid(character.size.w / 2, character.size.h / 2, {
      sensor: character.touch !== undefined,
      ...(friction === undefined ? {} : { friction }),
    }),
    [Look, { w: character.size.w, h: character.size.h, color: colourNumber(character.color) }],
    ...(sprites ? [[Sprite, { character: character.id, player, face: 1 }] as const] : []),
  ]
}

/**
 * The parts of player `number`'s hero at that player's start point in the level. `undefined` when the level, the
 * hero's character or that player's start point does not exist.
 */
export function heroParts(content: GameContent, levelId: string, number: number): SpawnPart[] | undefined {
  const start = content.levels[levelId]?.starts.find((s) => s.player === number)
  const hero = content.characters[content.project.hero]
  if (start === undefined || hero === undefined) return undefined
  return [
    // A hero in a game with a slope grips it: with the ground's own friction the pair holds a slope of 45 degrees (a
    // friction of 1), which a lone 0.5 would let it slide down. Only such a game has the grip, so no other hash moves.
    ...characterParts(hero, start, usesSprites(content), number, usesMoves(content) && usesSlopes(content) ? SLOPE_GRIP : undefined),
    [Thing, { id: `player-${number}`, character: content.project.hero }],
    [Player, { number }],
    // A hero the framework moves remembers how, and is told what it stands on and leans against, and, in a game with a
    // slope, which way the ground it stands on leans (flat to begin with).
    ...(usesMoves(content)
      ? [
          [Moves, { ...MOVE_START }] as const,
          Touching,
          ...(usesSlopes(content) ? [[Ground, { nx: 0, ny: -1 }] as const] : []),
        ]
      : []),
  ]
}
