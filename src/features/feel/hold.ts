// A hold: the game (or only its picture) standing still for a few ticks, counted down in seconds of frame time.
import { MAX_FREEZE_TICKS } from './limits.ts'

/** What is left under a billionth of a second is none, so a sum of frame times never leaves a sliver. */
const EPSILON = 1e-9

export interface Hold {
  /** Seconds left; 0 when none. */
  readonly left: number
  /**
   * Asks for `ticks` more of hold: the later of what is left and `ticks`, and never past `MAX_FREEZE_TICKS` from the
   * moment the hold began. Extending a hold never moves that limit, so a stream of freezes cannot hold for good.
   * Once a hold is over, the next one starts a new one.
   */
  start(ticks: number): void
  /** Spends `seconds` and answers how many were spent: `min(seconds, left)`. */
  spend(seconds: number): number
  clear(): void
}

export function createHold(tickHz: number): Hold {
  const limit = MAX_FREEZE_TICKS / tickHz
  let left = 0
  /** The most that may be left: the limit from the moment the hold began, less what has been spent since. */
  let cap = 0
  return {
    get left() {
      return left
    },
    start(ticks) {
      const want = Math.min(ticks, MAX_FREEZE_TICKS) / tickHz
      if (!(want > 0)) return
      if (left <= 0) {
        left = want
        cap = limit
      } else left = Math.min(Math.max(left, want), cap)
    },
    spend(seconds) {
      const spent = Math.min(seconds, left)
      if (!(spent > 0)) return 0
      left -= spent
      cap -= spent
      if (left < EPSILON) {
        left = 0
        cap = 0
      }
      return spent
    },
    clear() {
      left = 0
      cap = 0
    },
  }
}
