// When the on-screen hints of the thumb scheme show: each until its move has been done a few times, and all of them
// again when a player has not touched the screen for a while. Pure: the page says how often and how long ago.

/** A hint is shown until its move has been done this many times. */
export const HINT_USES = 3

/** How many times each move has been done, for the hints: the whole of what a game keeps between visits. */
export interface HintUses {
  readonly walk: number
  readonly jump: number
  readonly dash: number
}

/**
 * Counts as a game saved them, made safe: each is a whole number from 0 to `HINT_USES` (a hint has nothing more to
 * count past that), and anything that is not a count, or a whole thing that is not an object, is 0. A saved file
 * somebody edited by hand never throws and never shows a hint for ever.
 */
export function hintUsesOf(saved: unknown): HintUses {
  const count = (value: unknown): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0
    return Math.min(HINT_USES, Math.max(0, Math.floor(value)))
  }
  const from = typeof saved === 'object' && saved !== null ? (saved as Record<string, unknown>) : {}
  return { walk: count(from.walk), jump: count(from.jump), dash: count(from.dash) }
}
/** With no touch for this long, every hint comes back. */
export const HINT_IDLE_MS = 20_000

/**
 * Which hints show. The dash hint never shows in a game whose hero cannot dash (`dash` false).
 */
export function hintsShown(
  uses: HintUses,
  msSinceTouch: number,
  dash: boolean,
): { readonly walk: boolean; readonly jump: boolean; readonly dash: boolean } {
  const idle = msSinceTouch >= HINT_IDLE_MS
  return {
    walk: idle || uses.walk < HINT_USES,
    jump: idle || uses.jump < HINT_USES,
    dash: dash && (idle || uses.dash < HINT_USES),
  }
}
