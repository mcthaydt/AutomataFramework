// The steps of the default flow as one pure function (plan U, Task 3): warnings if needed, the language picker, the
// splash, the main menu, the game with its pause, and back to the menu. One test for each row of the plan's table,
// then the walks a visit makes.
import { expect, test } from 'vitest'
import {
  advance,
  FLOW_START,
  type FlowEvent,
  type FlowFacts,
  type FlowState,
  type FlowStep,
  type Over,
} from '#src/features/flow/flow.ts'

/** A game with nothing to warn about, a player who has a language, and one level. */
const FACTS: FlowFacts = { warnings: false, readable: true, asked: true, first: 'level-1', next: undefined }

/** The state after `event`, with these facts changed from `FACTS`. */
const go = (state: FlowState, event: FlowEvent, facts: Partial<FlowFacts> = {}): FlowState =>
  advance(state, event, { ...FACTS, ...facts })

/** The state after these events in order, one set of facts for all of them. */
const walk = (events: readonly FlowEvent[], facts: Partial<FlowFacts> = {}, from = FLOW_START): FlowState =>
  events.reduce((state, event) => go(state, event, facts), from)

/** A state of the machine, its flags as a first visit has them. */
const at = (step: FlowStep, more: Partial<FlowState> = {}): FlowState => ({
  step,
  warned: false,
  taken: false,
  attempt: 0,
  ...more,
})

const loaded = (watch: boolean): FlowEvent => ({ type: 'loaded', watch })
const play = (level: string): FlowEvent => ({ type: 'play', level })
const open = (over: Over): FlowEvent => ({ type: 'open', over })
type Tap = 'take-over' | 'warned' | 'picked' | 'splash-over' | 'pause' | 'resume'
const tap = (type: Tap): FlowEvent => ({ type })
const done = { type: 'level-done' } as const
const next = { type: 'next' } as const
const leave = { type: 'leave' } as const
const back = { type: 'back' } as const
const lost = { type: 'level-lost' } as const
const again = { type: 'again' } as const

const STEPS: readonly FlowStep[] = [
  'loading',
  'watching',
  'warnings',
  'picking',
  'splash',
  'menu',
  'playing',
  'paused',
  'done',
  'lost',
  'problem',
]

test('the flow starts loading, with nothing warned, nothing taken over and nothing started', () =>
  expect(FLOW_START).toEqual({ step: 'loading', warned: false, taken: false, attempt: 0 }))

// The table, a row each.

test('loading, loaded watching: watching', () => expect(go(FLOW_START, loaded(true))).toEqual(at('watching')))

test('loading, loaded not watching: the entry, here the splash', () =>
  expect(go(FLOW_START, loaded(false))).toEqual(at('splash')))

test('watching, take-over: the entry with taken, here the level itself', () =>
  expect(go(at('watching'), tap('take-over'))).toEqual(
    at('playing', { level: 'level-1', taken: true, attempt: 1 }),
  ))

test('warnings, warned: the entry with warned, here the splash', () =>
  expect(go(at('warnings'), tap('warned'), { warnings: true })).toEqual(at('splash', { warned: true })))

test('picking, picked: the entry, here the splash', () =>
  expect(go(at('picking'), tap('picked'))).toEqual(at('splash')))

test('splash, splash-over: the menu', () => expect(go(at('splash'), tap('splash-over'))).toEqual(at('menu')))

test('menu, play: that level', () =>
  expect(go(at('menu'), play('level-2'))).toEqual(at('playing', { level: 'level-2', attempt: 1 })))

test('menu or paused, open: the same step with a screen on top', () => {
  expect(go(at('menu'), open('settings'))).toEqual(at('menu', { over: 'settings' }))
  const paused = at('paused', { level: 'level-1' })
  expect(go(paused, open('players'))).toEqual({ ...paused, over: 'players' })
})

test('menu or paused with a screen on top, back: the same step with none', () => {
  expect(go(at('menu', { over: 'saves' }), back)).toEqual(at('menu'))
  const paused = at('paused', { level: 'level-1' })
  expect(go({ ...paused, over: 'settings' }, back)).toEqual(paused)
})

test('menu with the saved games on top, play: that level, and the screen goes', () =>
  expect(go(at('menu', { over: 'saves' }), play('level-2'))).toEqual(
    at('playing', { level: 'level-2', attempt: 1 }),
  ))

test('playing, pause: paused, on the same level', () =>
  expect(go(at('playing', { level: 'level-1' }), tap('pause'))).toEqual(at('paused', { level: 'level-1' })))

test('paused, resume: playing', () =>
  expect(go(at('paused', { level: 'level-1' }), tap('resume'))).toEqual(at('playing', { level: 'level-1' })))

test('paused with a screen on top: pause and resume change nothing', () => {
  const state = at('paused', { level: 'level-1', over: 'settings' })
  expect(go(state, tap('pause'))).toBe(state)
  expect(go(state, tap('resume'))).toBe(state)
})

test('playing, level-done: done, on the same level', () =>
  expect(go(at('playing', { level: 'level-1' }), done)).toEqual(at('done', { level: 'level-1' })))

test('done, next with a next level: playing it', () =>
  expect(go(at('done', { level: 'level-1' }), next, { next: 'level-2' })).toEqual(
    at('playing', { level: 'level-2', attempt: 1 }),
  ))

test('done, next with none after: the menu, and a taken-over visit is over', () =>
  expect(go(at('done', { level: 'level-2', taken: true }), next)).toEqual(at('menu')))

test('paused or done, leave: the menu, and a taken-over visit is over', () => {
  expect(go(at('paused', { level: 'level-1', taken: true }), leave)).toEqual(at('menu'))
  expect(go(at('done', { level: 'level-1' }), leave)).toEqual(at('menu'))
})

test('leaving for the menu keeps what has been warned', () =>
  expect(go(at('paused', { level: 'level-1', warned: true }), leave)).toEqual(at('menu', { warned: true })))

test('broke, from any step but problem: problem', () => {
  for (const step of STEPS.filter((s) => s !== 'problem'))
    expect(go(at(step), { type: 'broke' }), step).toEqual(at('problem'))
})

test('problem: nothing changes it, and the very same object comes back', () => {
  const state = at('problem')
  const events: FlowEvent[] = [loaded(false), tap('pause'), next, play('level-1'), { type: 'broke' }]
  for (const event of events) expect(go(state, event), event.type).toBe(state)
})

// What the entry does with the facts.

test('the entry says the warnings first when they can be read', () =>
  expect(go(FLOW_START, loaded(false), { warnings: true, asked: false })).toEqual(at('warnings')))

test('the entry asks for a language before warnings that cannot be read yet', () =>
  expect(go(FLOW_START, loaded(false), { warnings: true, readable: false, asked: false })).toEqual(
    at('picking'),
  ))

// The walks.

test('a first visit with a device the game speaks: warnings, picker, splash, menu', () => {
  const facts = { warnings: true, readable: true, asked: false }
  const first = go(FLOW_START, loaded(false), facts)
  expect(first.step).toBe('warnings')
  const warned = go(first, tap('warned'), facts)
  expect(warned).toEqual(at('picking', { warned: true }))
  const picked = go(warned, tap('picked'), { ...facts, asked: true })
  expect(picked).toEqual(at('splash', { warned: true }))
  expect(go(picked, tap('splash-over')).step).toBe('menu')
})

test('a first visit with a device the game does not speak: picker, warnings, splash, menu', () => {
  const first = go(FLOW_START, loaded(false), { warnings: true, readable: false, asked: false })
  expect(first.step).toBe('picking')
  // The player chooses; now there is a language to say the warnings in.
  const picked = go(first, tap('picked'), { warnings: true, readable: true, asked: true })
  expect(picked.step).toBe('warnings')
  const warned = go(picked, tap('warned'), { warnings: true })
  expect(warned).toEqual(at('splash', { warned: true }))
  expect(go(warned, tap('splash-over')).step).toBe('menu')
})

test('a later visit with nothing to warn about: splash, menu', () => {
  expect(walk([loaded(false)]).step).toBe('splash')
  expect(walk([loaded(false), tap('splash-over')]).step).toBe('menu')
})

test('a watcher who takes over on a first visit: picker, then the level, never the splash or the menu', () => {
  const watching = walk([loaded(true)], { asked: false })
  expect(watching.step).toBe('watching')
  const taking = go(watching, tap('take-over'), { asked: false })
  expect(taking).toEqual(at('picking', { taken: true }))
  expect(go(taking, tap('picked'))).toEqual(at('playing', { level: 'level-1', taken: true, attempt: 1 }))
})

test('a watcher who takes over on a later visit goes straight into the level', () =>
  expect(walk([loaded(true), tap('take-over')])).toEqual(
    at('playing', { level: 'level-1', taken: true, attempt: 1 }),
  ))

test('the warnings show once a visit: leaving a level for the menu never shows them again', () => {
  const facts = { warnings: true }
  const visit = [loaded(false), tap('warned'), tap('splash-over'), play('level-1'), tap('pause'), leave]
  const menu = walk(visit, facts)
  expect(menu).toEqual(at('menu', { warned: true, attempt: 1 }))
  // Taking a level and finishing it comes back to the menu with them still counted as shown.
  expect(walk([play('level-1'), done, next], facts, menu)).toEqual(at('menu', { warned: true, attempt: 2 }))
})

test('a whole visit: menu, play, pause, resume, finish both levels, back to the menu', () => {
  const visit = [loaded(false), tap('splash-over'), play('level-1'), tap('pause'), tap('resume'), done]
  const first = walk(visit, { next: 'level-2' })
  expect(first).toEqual(at('done', { level: 'level-1', attempt: 1 }))
  const second = go(first, next, { next: 'level-2' })
  expect(second).toEqual(at('playing', { level: 'level-2', attempt: 2 }))
  expect(go(go(second, done), next)).toEqual(at('menu', { attempt: 2 }))
})

test('level-done while done, pause while a screen is on top, play while playing: the same object back', () => {
  const finished = at('done', { level: 'level-1' })
  expect(go(finished, done)).toBe(finished)
  const settings = at('menu', { over: 'settings' })
  expect(go(settings, tap('pause'))).toBe(settings)
  const playing = at('playing', { level: 'level-1' })
  expect(go(playing, play('level-2'))).toBe(playing)
  // A press that belongs to another step means nothing here.
  const splash = at('splash')
  expect(go(splash, next)).toBe(splash)
  expect(go(splash, tap('pause'))).toBe(splash)
})

// Losing, starting again and asking how to play (plan Q, Task 3).

const ROWS: readonly (readonly [string, FlowState, FlowEvent, FlowState])[] = [
  [
    'playing, level-lost: lost, the same level',
    at('playing', { level: 'level-1', attempt: 1 }),
    lost,
    at('lost', { level: 'level-1', attempt: 1 }),
  ],
  [
    'lost, again: playing the same level, one more attempt',
    at('lost', { level: 'level-1', attempt: 1 }),
    again,
    at('playing', { level: 'level-1', attempt: 2 }),
  ],
  [
    'lost, leave: the menu, and a taken-over visit is over',
    at('lost', { level: 'level-1', attempt: 1, taken: true }),
    leave,
    at('menu', { attempt: 1 }),
  ],
  [
    'paused, again: playing the same level, one more attempt',
    at('paused', { level: 'level-1', attempt: 1 }),
    again,
    at('playing', { level: 'level-1', attempt: 2 }),
  ],
]

test.each(ROWS)('%s', (_, from, event, expected) => expect(go(from, event)).toEqual(expected))

test('paused with a screen on top, again: the very same object', () => {
  const state = at('paused', { level: 'level-1', over: 'settings', attempt: 1 })
  expect(go(state, again)).toBe(state)
})

test('menu or paused, open how: the same step with the screen on top', () => {
  expect(go(at('menu'), open('how'))).toEqual(at('menu', { over: 'how' }))
  const paused = at('paused', { level: 'level-1' })
  expect(go(paused, open('how'))).toEqual({ ...paused, over: 'how' })
})

test.each(STEPS)("%s given level-lost, and given again: only the table's rows change anything", (step) => {
  const state = at(step, { level: 'level-1' })
  if (step === 'playing') expect(go(state, lost).step, 'level-lost').toBe('lost')
  else expect(go(state, lost), 'level-lost').toBe(state)
  if (step === 'lost' || step === 'paused') expect(go(state, again).step, 'again').toBe('playing')
  else expect(go(state, again), 'again').toBe(state)
})

test('leave for the menu and play again: attempt keeps counting, it does not start over', () => {
  const menu = walk([play('level-1'), tap('pause'), leave])
  expect(menu).toEqual(at('menu', { attempt: 1 }))
  expect(go(menu, play('level-1')).attempt).toBe(2)
})

test('lose, try again, lose, try again, win: attempt is 1, 2, 3 and the step ends at done', () => {
  const first = go(at('menu'), play('level-1'))
  expect(first.attempt).toBe(1)
  const second = go(go(first, lost), again)
  expect(second.attempt).toBe(2)
  const third = go(go(second, lost), again)
  expect(third.attempt).toBe(3)
  expect(go(third, done)).toEqual(at('done', { level: 'level-1', attempt: 3 }))
})

test('pause, Keep playing: attempt does not change', () => {
  const playing = go(at('menu'), play('level-1'))
  expect(go(go(playing, tap('pause')), tap('resume')).attempt).toBe(playing.attempt)
})

test('pause, Start again: attempt goes up and the step is playing', () => {
  const paused = go(go(at('menu'), play('level-1')), tap('pause'))
  expect(go(paused, again)).toEqual(at('playing', { level: 'level-1', attempt: 2 }))
})

test('level-lost while lost or done gives the very same object back', () => {
  for (const step of ['lost', 'done'] as const) {
    const state = at(step, { level: 'level-1' })
    expect(go(state, lost), step).toBe(state)
    expect(go(state, done), step).toBe(state)
    expect(go(state, tap('pause')), step).toBe(state)
  }
})

test('Next level and Continue each add one to attempt', () => {
  expect(go(at('done', { level: 'level-1', attempt: 3 }), next, { next: 'level-2' }).attempt).toBe(4)
  // Continue is Play on the level the saved game names.
  expect(go(at('menu', { attempt: 3 }), play('level-2')).attempt).toBe(4)
})

test('menu, done, playing and every step before the menu given again: the very same object', () => {
  for (const step of [
    'loading',
    'watching',
    'warnings',
    'picking',
    'splash',
    'menu',
    'playing',
    'done',
  ] as const) {
    const state = at(step, { level: 'level-1' })
    expect(go(state, again), step).toBe(state)
  }
})
