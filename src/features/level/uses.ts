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
