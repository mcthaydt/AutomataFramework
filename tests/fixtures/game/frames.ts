// Animation frames driven by hand, so a test decides what time it is and no test ever waits on a real display. Every
// request is kept and delivered, in the order asked, each once: the game's loop and the input's pad reading both ask
// for frames, and one must never cancel the other.
import type { Frames } from '#src/lib/frames.ts'

export interface ManualFrames extends Frames {
  /** True while a frame has been asked for and not yet delivered or cancelled. */
  readonly pending: boolean
  /** Delivers every asked-for frame at this timestamp (ms). Does nothing when none is pending. */
  at(ms: number): void
  /** Delivers them `ms` after the last time delivered. */
  advance(ms: number): void
}

export function manualFrames(): ManualFrames {
  let nextId = 1
  let waiting: { id: number; callback: (ms: number) => void }[] = []
  let now = 0
  // Cancelled while the frame they were due in was being delivered.
  const cancelled = new Set<number>()
  return {
    get pending() {
      return waiting.length > 0
    },
    request(callback) {
      const id = nextId++
      waiting.push({ id, callback })
      return id
    },
    cancel(id) {
      cancelled.add(id)
      waiting = waiting.filter((frame) => frame.id !== id)
    },
    at(ms) {
      // What was asked for before now is delivered; what those callbacks ask for waits for the next frame.
      const due = waiting
      waiting = []
      now = ms
      for (const frame of due) {
        // One cancelled by an earlier callback of this same frame is not delivered.
        if (cancelled.delete(frame.id)) continue
        frame.callback(ms)
      }
      cancelled.clear()
    },
    advance(ms) {
      this.at(now + ms)
    },
  }
}
