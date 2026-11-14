// One entity's parts, shared by the level (which spawns the heroes the game starts with) and by `join` (which spawns
// one mid-game). One list of parts, so the hero who joins is the hero the level would have made.
import { Player } from '../commands/commands.ts'
import type { Character, GameContent } from '../content/content.ts'
import { BodyKind, body, collider, transform } from '../physics/physics.ts'
import type { SpawnPart } from '../sim/sim.ts'
import { colourNumber } from './colours.ts'
import { Look, Thing } from './components.ts'

/** The parts every character-shaped entity gets: where, how it moves, its box and how it looks. */
export function characterParts(character: Character, at: { x: number; y: number }): SpawnPart[] {
  return [
    transform(at),
    body(character.body === 'dynamic' ? BodyKind.dynamic : BodyKind.fixed, {
      fixedRotation: character.upright,
    }),
    collider.cuboid(character.size.w / 2, character.size.h / 2),
    [Look, { w: character.size.w, h: character.size.h, color: colourNumber(character.color) }],
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
    ...characterParts(hero, start),
    [Thing, { id: `player-${number}`, character: content.project.hero }],
    [Player, { number }],
  ]
}
