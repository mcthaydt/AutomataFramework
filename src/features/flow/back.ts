// The browser's Back button means something in a game (plan Q, call 11): while a level is played, Back pauses it; on the
// pause screen, Well done and You lost it goes to the main menu; over a screen on top it closes that screen; on the main
// menu it leaves the page, as it always did. A page's history entry is how Back is heard: one is pushed whenever Back
// means something and none is held, and one that is held while Back means nothing is let go. So there are never two
// entries, and the page is never left by a Back the game could have used.
import type { FlowEvent, FlowState } from './steps.ts'

/** The page's history, given so that a test hands its own. */
export interface BackSeams {
  /** Pushes an entry marked as the game's. */
  readonly push: () => void
  /** Lets an entry the game pushed go, with no one hearing the pop it makes. */
  readonly drop: () => void
  /** Calls `listener` when Back is pressed (the page's `popstate`); answers the way to stop. */
  readonly on: (listener: () => void) => () => void
}

/** What Back means in `state`: the event the flow is told, or `undefined` for nothing (the page may be left). */
export function backMeans(state: FlowState): FlowEvent | undefined {
  if (state.over !== undefined) return { type: 'back' }
  if (state.step === 'playing') return { type: 'pause' }
  if (state.step === 'paused' || state.step === 'done' || state.step === 'lost') return { type: 'leave' }
  return undefined
}

/** The page's own history. */
const pageSeams: BackSeams = {
  push: () => history.pushState({ automataBack: true }, ''),
  drop: () => history.back(),
  on(listener) {
    window.addEventListener('popstate', listener)
    return () => window.removeEventListener('popstate', listener)
  },
}

/**
 * Hears Back and tells the flow. Answers the function that stops listening; an entry still held stays in the history.
 */
export function wireBack(options: {
  readonly state: () => FlowState
  readonly dispatch: (event: FlowEvent) => void
  readonly onState: (listener: (state: FlowState) => void) => () => void
  readonly seams?: BackSeams
}): () => void {
  const seams = options.seams ?? pageSeams
  let held = false
  /** An entry is held exactly while Back means something. */
  const sync = (state: FlowState): void => {
    const wanted = backMeans(state) !== undefined
    if (wanted && !held) {
      held = true
      seams.push()
    } else if (!wanted && held) {
      held = false
      seams.drop()
    }
  }
  const stopPops = seams.on(() => {
    // A pop with no entry held is not the game's: Back leaving the page, or a forward.
    if (!held) return
    held = false
    const event = backMeans(options.state())
    if (event !== undefined) options.dispatch(event)
    sync(options.state())
  })
  const stopState = options.onState(sync)
  sync(options.state())
  return () => {
    stopPops()
    stopState()
  }
}

/** Whether Back is the game's when nobody says: only in a page that is not framed, as a frame's history is the page's. */
export function backDefault(page: { readonly top: unknown; readonly self: unknown }): boolean {
  return page.top === page.self
}
