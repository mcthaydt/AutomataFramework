// The steps of the default flow as one pure function: warnings if needed, the language picker, the splash, the main
// menu, the game with its pause, and back to the menu (the Owner's order, 2026-11-14). It decides nothing the page
// knows better: whether there is anything to warn about, whether a warning can be read yet and whether the player has
// a language come in as `FlowFacts`, so a test walks a whole visit with no page. A level can be lost as well as won
// (plan Q): `lost` is a step beside `done`, not a new place in the order.
import type { Arrive } from '../level/level.ts'

/** Where a visit is. `loading` is before the game has been read; `problem` is the end of a visit that went wrong. */
export type FlowStep =
  | 'loading'
  | 'watching'
  | 'warnings'
  | 'picking'
  | 'splash'
  | 'menu'
  | 'playing'
  | 'paused'
  | 'done'
  | 'lost'
  | 'problem'

/** A screen opened on top of the main menu or the pause screen. */
export type Over = 'settings' | 'saves' | 'players' | 'how'

/** One moment of a visit. States are never changed: `advance` answers a new one, or the very same one. */
export interface FlowState {
  readonly step: FlowStep
  /** The screen on top of `menu` or `paused`. */
  readonly over?: Over
  /** The level being played, in `playing`, `paused`, `done` and `lost`. */
  readonly level?: string
  /** Where the heroes come in, in `playing` and `paused`: beside the door they came through, or where they left off. */
  readonly arrive?: Arrive
  /** The level was opened by a door, mid-move, so nothing waits for a first press. Only a door sets it. */
  readonly door?: true
  /** The warnings have been shown this visit. */
  readonly warned: boolean
  /** A watching visitor took over: the splash and the menu are skipped once. */
  readonly taken: boolean
  /**
   * How many times a level has been started this visit. It goes up on every fresh start (Play, Try again, Start again,
   * Next level, Continue, a door), never on "Keep playing", so a page can tell a fresh start from a resume.
   */
  readonly attempt: number
}

/** What the machine may not decide for itself. */
export interface FlowFacts {
  /** There is something to warn about. */
  readonly warnings: boolean
  /** There is a language to say a warning in now: the game has the device's language, or the player has chosen. */
  readonly readable: boolean
  /** The player has chosen a language. */
  readonly asked: boolean
  /** The level the main menu's first action opens. */
  readonly first: string
  /** The level after the one being played, if any. */
  readonly next: string | undefined
}

/** What happened. */
export type FlowEvent =
  | { readonly type: 'loaded'; readonly watch: boolean }
  | { readonly type: 'take-over' }
  | { readonly type: 'warned' }
  | { readonly type: 'picked' }
  | { readonly type: 'splash-over' }
  | { readonly type: 'play'; readonly level: string; readonly arrive?: Arrive }
  | { readonly type: 'pause' }
  | { readonly type: 'resume' }
  | { readonly type: 'level-done' }
  | { readonly type: 'level-lost' }
  /** Start the level being played afresh. */
  | { readonly type: 'again' }
  | { readonly type: 'door'; readonly level: string; readonly arrive?: Arrive }
  | { readonly type: 'next' }
  | { readonly type: 'leave' }
  | { readonly type: 'open'; readonly over: Over }
  | { readonly type: 'back' }
  | { readonly type: 'broke' }

/** A visit that has not begun. */
export const FLOW_START: FlowState = { step: 'loading', warned: false, taken: false, attempt: 0 }

/**
 * `step` with what a visit carries from step to step (what has been warned, who took over, how many levels have been
 * started) and nothing else.
 */
const to = (
  state: FlowState,
  step: FlowStep,
  more: { readonly level?: string; readonly arrive?: Arrive; readonly door?: true } = {},
): FlowState => ({
  step,
  ...more,
  warned: state.warned,
  taken: state.taken,
  attempt: state.attempt,
})

/** A level started afresh: every arrow into `playing` but a resume goes through here and counts one more. */
const playing = (
  state: FlowState,
  level: string,
  more: { readonly arrive?: Arrive; readonly door?: true } = {},
): FlowState => ({ ...to(state, 'playing', { level, ...more }), attempt: state.attempt + 1 })

/** The level, and the way in and the door, a state carries from `playing` to `paused` and back. */
const held = (state: FlowState): { readonly arrive?: Arrive; readonly door?: true } => ({
  ...(state.arrive === undefined ? {} : { arrive: state.arrive }),
  ...(state.door === undefined ? {} : { door: state.door }),
})

/** Try again and Start again bring the heroes in where they came in, and the level waits for a first press. */
const again = (state: FlowState): { readonly arrive?: Arrive } =>
  state.arrive === undefined ? {} : { arrive: state.arrive }

/** The main menu, and the visit is no longer a taken-over watch. */
const menu = (state: FlowState): FlowState => ({
  step: 'menu',
  warned: state.warned,
  taken: false,
  attempt: state.attempt,
})

/**
 * The one rule every arrow into the opening steps shares: the warnings when there are some to say and they can be
 * read; else the picker when there is no language; else the warnings (now there is a language to say them in); else,
 * for a taken-over watch, the level itself; else the splash.
 */
function enter(state: FlowState, facts: FlowFacts): FlowState {
  const owed = facts.warnings && !state.warned
  if (owed && facts.readable) return to(state, 'warnings')
  if (!facts.asked) return to(state, 'picking')
  if (owed) return to(state, 'warnings')
  if (state.taken) return playing(state, facts.first)
  return to(state, 'splash')
}

/** Opening a screen on the menu or the pause screen, and closing it again; `undefined` for any other event. */
function screens(state: FlowState, event: FlowEvent): FlowState | undefined {
  if (state.over === undefined && event.type === 'open') return { ...state, over: event.over }
  if (state.over !== undefined && event.type === 'back') {
    const { over: _closed, ...rest } = state
    return rest
  }
  return undefined
}

/**
 * The state after `event`. An event that means nothing in `state` gives back the very same object, so a caller that
 * is told twice (two players through one door) can tell nothing happened by comparing.
 */
export function advance(state: FlowState, event: FlowEvent, facts: FlowFacts): FlowState {
  if (state.step === 'problem') return state
  if (event.type === 'broke') return to(state, 'problem')
  switch (state.step) {
    case 'loading':
      if (event.type !== 'loaded') return state
      return event.watch ? to(state, 'watching') : enter(state, facts)
    case 'watching':
      return event.type === 'take-over' ? enter({ ...state, taken: true }, facts) : state
    case 'warnings':
      return event.type === 'warned' ? enter({ ...state, warned: true }, facts) : state
    case 'picking':
      return event.type === 'picked' ? enter(state, facts) : state
    case 'splash':
      return event.type === 'splash-over' ? menu(state) : state
    case 'menu': {
      const shown = screens(state, event)
      if (shown !== undefined) return shown
      const canPlay = state.over === undefined || state.over === 'saves'
      if (event.type !== 'play' || !canPlay) return state
      return playing(state, event.level, event.arrive === undefined ? {} : { arrive: event.arrive })
    }
    case 'playing': {
      const level = state.level === undefined ? {} : { level: state.level }
      if (event.type === 'pause') return to(state, 'paused', { ...level, ...held(state) })
      // A door is a way straight into the next level, with no screen between (the Owner, 2026-11-15). It is always a
      // new state, so the flow starts a level for it, and a level it opens is opened mid-move.
      if (event.type === 'door')
        return playing(state, event.level, {
          door: true,
          ...(event.arrive === undefined ? {} : { arrive: event.arrive }),
        })
      if (event.type === 'level-done') return to(state, 'done', level)
      // A lost level keeps where the heroes came in, so Try again brings them in where Continue would.
      if (event.type === 'level-lost')
        return to(state, 'lost', { ...level, ...(state.arrive === undefined ? {} : { arrive: state.arrive }) })
      return state
    }
    case 'paused': {
      const shown = screens(state, event)
      if (shown !== undefined) return shown
      if (event.type === 'leave') return menu(state)
      if (state.over !== undefined || state.level === undefined) return state
      // Keep playing is not a fresh start, so it does not count; Start again is one.
      if (event.type === 'resume') return to(state, 'playing', { level: state.level, ...held(state) })
      return event.type === 'again' ? playing(state, state.level, again(state)) : state
    }
    case 'lost':
      if (event.type === 'leave') return menu(state)
      return event.type === 'again' && state.level !== undefined ? playing(state, state.level, again(state)) : state
    case 'done':
      if (event.type === 'leave') return menu(state)
      if (event.type !== 'next') return state
      return facts.next === undefined ? menu(state) : playing(state, facts.next)
    default:
      return state
  }
}
