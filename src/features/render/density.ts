// How many device pixels make one CSS pixel on the screen the game is on. It changes when a window is dragged to a
// sharper or a softer screen, or the page is zoomed; the canvas keeps up by asking this, so the picture stays sharp
// without a reload. A port, so a test can move the density by hand.

/** The screen's pixel density, and a way to hear when it changes. */
export interface Density {
  /** The density now: 1 on an ordinary screen, 2 on a sharp one. */
  now(): number
  /** Calls `listener` after each change until the function it gives back is called. */
  onChange(listener: () => void): () => void
}

/** A density that is not above zero, or is not a number, is 1: a canvas with no pixels is never what anyone wanted. */
export function sane(density: number): number {
  return Number.isFinite(density) && density > 0 ? density : 1
}

/**
 * The page's own: `window.devicePixelRatio`. A page hears of a change through a media query for the density it has now,
 * which stops matching when the density moves; the query is made again for the new density after each change.
 */
export const pageDensity: Density = {
  now: () => window.devicePixelRatio,
  onChange(listener) {
    let query: MediaQueryList | undefined
    let stopped = false
    const watch = (): void => {
      query = window.matchMedia?.(`(resolution: ${window.devicePixelRatio}dppx)`)
      // A page (or a test) whose `matchMedia` gives something that cannot be listened to has nothing to hear.
      query?.addEventListener?.('change', changed, { once: true })
    }
    function changed(): void {
      if (stopped) return
      listener()
      watch()
    }
    watch()
    return () => {
      stopped = true
      query?.removeEventListener?.('change', changed)
    }
  },
}
