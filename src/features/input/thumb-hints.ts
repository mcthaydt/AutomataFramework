// When the on-screen hints of the thumb scheme show: each until its move has been done a few times, and all of them
// again when a player has not touched the screen for a while. Pure: the page says how often and how long ago.

/** A hint is shown until its move has been done this many times. */
export const HINT_USES = 3
/** With no touch for this long, every hint comes back. */
export const HINT_IDLE_MS = 20_000

/**
 * Which hints show. The dash hint never shows in a game whose hero cannot dash (`dash` false).
 */
export function hintsShown(
  uses: { readonly walk: number; readonly jump: number; readonly dash: number },
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
