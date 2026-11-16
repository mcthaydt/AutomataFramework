import type { GameContent } from '../content/content.ts'

/**
 * Whether any level of the game lists a joint. It switches joints on for the whole game: a sim's schema hash covers
 * every component, so a game with no joint keeps exactly the sim it had before joints existed.
 */
export function usesJoints(content: GameContent): boolean {
  return Object.values(content.levels).some((level) => (level.joints?.length ?? 0) > 0)
}

/**
 * The kinds of every character with `touch`, each list sorted and without repeats. Two characters may share a kind
 * and differ in `touch` (a small spark that is taken, a big one that is only sensed), so a kind may be in both lists.
 */
export function touchKinds(content: GameContent): {
  readonly sense: readonly string[]
  readonly take: readonly string[]
} {
  const kinds = (touch: 'sense' | 'take'): string[] => [
    ...new Set(
      Object.values(content.characters).flatMap((c) =>
        c.touch === touch && c.kind !== undefined ? [c.kind] : [],
      ),
    ),
  ]
  const sorted = (list: string[]): string[] => list.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  return { sense: sorted(kinds('sense')), take: sorted(kinds('take')) }
}

/**
 * Whether the game has any figure to show or any camera to run: a character with a `figure`, or a level with a `view`.
 * It switches the sprite component on for the whole game, so a game with neither keeps exactly the sim it had.
 */
export function usesSprites(content: GameContent): boolean {
  return (
    Object.values(content.characters).some((character) => character.figure !== undefined) ||
    Object.values(content.levels).some((level) => level.view !== undefined)
  )
}

/**
 * Whether the project's hero is one the framework moves: its character file has `moves`. It switches the built-in
 * hero's plugin, the move state and what bodies touch on for the whole game, so a game whose hero has no `moves` keeps
 * exactly the sim it had.
 */
export function usesMoves(content: GameContent): boolean {
  return content.characters[content.project.hero]?.moves !== undefined
}

/**
 * Whether any character declares `values` (plan W): a number, a switch, a link, a path or a door's way into a level that
 * its placed things hold. It switches the `where` plugin on for the whole game, so a game with none keeps exactly the
 * sim it had.
 */
export function usesValues(content: GameContent): boolean {
  return Object.values(content.characters).some((character) => (character.values?.length ?? 0) > 0)
}

/**
 * Whether any character is a switch (`switch`) or can be opened (`opens`). It switches the `switches` plugin, and so
 * its components, events and the `facts` command, on for the whole game, so a game with none keeps the sim it had.
 */
export function usesSwitches(content: GameContent): boolean {
  return Object.values(content.characters).some(
    (character) => character.switch !== undefined || character.opens !== undefined,
  )
}

/**
 * Whether the project says `lost = "hero.fell"`, and nothing else. It joins the fall plugin to the sim, which gives a
 * hero that falls out of the level an event to lose it by. A hero needs no `moves` to fall. A game with no `lost`, or
 * one that names an event of its own rules, keeps exactly the sim it had.
 */
export function usesFalls(content: GameContent): boolean {
  return content.project.lost === 'hero.fell'
}

/**
 * Whether any thing of any level is drawn `behind` or `in-front`. It switches the draw component on for the whole game,
 * so a game whose things are all drawn with the hero keeps exactly the sim it had.
 */
export function usesDraw(content: GameContent): boolean {
  return Object.values(content.levels).some((level) =>
    level.things.some((thing) => thing.draw === 'behind' || thing.draw === 'in-front'),
  )
}

/**
 * Whether any character names a `weight`. It switches the `Mass` component on for the whole game, so a game whose
 * characters name none keeps exactly the sim it had.
 */
export function usesWeights(content: GameContent): boolean {
  return Object.values(content.characters).some((character) => character.weight !== undefined)
}
