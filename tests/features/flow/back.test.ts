// What Back means, and how it is heard (plan Q, call 11), with a history of the test's own and the flow's real steps.
import { expect, test } from 'vitest'
import { type BackSeams, backDefault, backMeans, wireBack } from '#src/features/flow/back.ts'
import {
  advance,
  FLOW_START,
  type FlowEvent,
  type FlowFacts,
  type FlowState,
} from '#src/features/flow/steps.ts'

const FACTS: FlowFacts = { warnings: false, readable: true, asked: true, first: 'level-1', next: 'level-2' }

/** A visit on the real steps and a history that counts what it is asked. */
function visit() {
  let state: FlowState = FLOW_START
  const listeners = new Set<(state: FlowState) => void>()
  const pops = new Set<() => void>()
  const log = { pushed: 0, dropped: 0 }
  /** The entries of the history that are the game's, as the browser would hold them. */
  let entries = 0
  const seams: BackSeams = {
    push: () => {
      log.pushed += 1
      entries += 1
    },
    drop: () => {
      log.dropped += 1
      entries -= 1
    },
    on: (listener) => {
      pops.add(listener)
      return () => pops.delete(listener)
    },
  }
  const dispatch = (event: FlowEvent): void => {
    const next = advance(state, event, FACTS)
    if (next === state) return
    state = next
    for (const listener of [...listeners]) listener(next)
  }
  const stop = wireBack({
    state: () => state,
    dispatch,
    onState: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    seams,
  })
  /** The Back button: the browser takes the page's top entry, if it is the game's, and says so. */
  const back = (): boolean => {
    if (entries === 0) return false
    entries -= 1
    for (const listener of [...pops]) listener()
    return true
  }
  return {
    dispatch,
    back,
    stop,
    log,
    state: () => state,
    entries: () => entries,
    listening: () => pops.size + listeners.size,
    /** Up to the main menu. */
    toMenu() {
      dispatch({ type: 'loaded', watch: false })
      dispatch({ type: 'splash-over' })
    },
    /** From the menu into a level. */
    play() {
      dispatch({ type: 'play', level: 'level-1' })
    },
  }
}

const at = (step: FlowState['step'], over?: FlowState['over']): FlowState => ({
  step,
  ...(over === undefined ? {} : { over }),
  warned: false,
  taken: false,
  attempt: 0,
})

test.each([
  ['playing', at('playing'), { type: 'pause' }],
  ['paused', at('paused'), { type: 'leave' }],
  ['done', at('done'), { type: 'leave' }],
  ['lost', at('lost'), { type: 'leave' }],
  ['settings over the menu', at('menu', 'settings'), { type: 'back' }],
  ['how over pause', at('paused', 'how'), { type: 'back' }],
  ['the menu', at('menu'), undefined],
  ['loading', at('loading'), undefined],
  ['the language picker', at('picking'), undefined],
  ['the splash', at('splash'), undefined],
  ['a problem', at('problem'), undefined],
])('Back on %s', (_name, state, means) => expect(backMeans(state)).toEqual(means))

test('Back while playing pauses, and the page is still here', () => {
  const v = visit()
  v.toMenu()
  v.play()
  expect(v.state().step).toBe('playing')
  expect(v.entries()).toBe(1)
  expect(v.back()).toBe(true)
  expect(v.state().step).toBe('paused')
  expect(v.entries()).toBe(1)
})

test('Back on pause is the menu; Back on the menu is left to the page', () => {
  const v = visit()
  v.toMenu()
  v.play()
  v.back()
  v.back()
  expect(v.state().step).toBe('menu')
  expect(v.entries()).toBe(0)
  // No entry of the game's: the browser's own Back leaves the page.
  expect(v.back()).toBe(false)
})

test('Back with Settings open on pause closes Settings and stays paused', () => {
  const v = visit()
  v.toMenu()
  v.play()
  v.back()
  v.dispatch({ type: 'open', over: 'settings' })
  expect(v.entries()).toBe(1)
  v.back()
  expect(v.state()).toMatchObject({ step: 'paused' })
  expect(v.state().over).toBeUndefined()
  expect(v.entries()).toBe(1)
})

test('Back on Settings opened from the menu closes it, and the next Back leaves', () => {
  const v = visit()
  v.toMenu()
  v.dispatch({ type: 'open', over: 'settings' })
  expect(v.entries()).toBe(1)
  v.back()
  expect(v.state()).toMatchObject({ step: 'menu' })
  expect(v.entries()).toBe(0)
  expect(v.back()).toBe(false)
})

test('Back while loading and on the language picker is not caught', () => {
  const v = visit()
  expect(v.entries()).toBe(0)
  expect(v.back()).toBe(false)
  v.dispatch({ type: 'picked' })
  expect(v.log.pushed).toBe(0)
})

test('Back twice in one frame while playing: paused, then the menu; never two entries', () => {
  const v = visit()
  v.toMenu()
  v.play()
  v.back()
  v.back()
  expect(v.state().step).toBe('menu')
  expect(v.entries()).toBe(0)
  // Two entries were pushed in all, one for each time Back meant something, and none was ever held together with another.
  expect(v.log.pushed).toBe(2)
})

test('Play, Back, Back to the menu, Play again, Back: paused, not gone', () => {
  const v = visit()
  v.toMenu()
  v.play()
  v.back()
  v.back()
  v.play()
  expect(v.entries()).toBe(1)
  expect(v.back()).toBe(true)
  expect(v.state().step).toBe('paused')
})

test('lose, Back to the menu, Continue, Back: paused, not gone', () => {
  const v = visit()
  v.toMenu()
  v.play()
  v.dispatch({ type: 'level-lost' })
  expect(v.state().step).toBe('lost')
  v.back()
  expect(v.state().step).toBe('menu')
  v.play()
  v.back()
  expect(v.state().step).toBe('paused')
})

test('a button that leaves for the menu lets the entry go, so the next Back leaves the page', () => {
  const v = visit()
  v.toMenu()
  v.play()
  v.dispatch({ type: 'pause' })
  v.dispatch({ type: 'leave' })
  expect(v.state().step).toBe('menu')
  expect(v.entries()).toBe(0)
  expect(v.back()).toBe(false)
})

test('Well done, Back: the menu', () => {
  const v = visit()
  v.toMenu()
  v.play()
  v.dispatch({ type: 'level-done' })
  v.back()
  expect(v.state().step).toBe('menu')
})

test('after stop() nothing is listened to', () => {
  const v = visit()
  expect(v.listening()).toBeGreaterThan(0)
  v.stop()
  expect(v.listening()).toBe(0)
})

test('backDefault: true when top is self, false when it is not', () => {
  const page = {}
  expect(backDefault({ top: page, self: page })).toBe(true)
  expect(backDefault({ top: {}, self: page })).toBe(false)
})
