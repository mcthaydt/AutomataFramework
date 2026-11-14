// What a game's controls may say. These are plain words an author reads, so each message says what to change.
import { expect, test } from 'vitest'
import {
  type ControlEntry,
  type Controls,
  checkControls,
  controlsFromList,
} from '#src/features/input/input.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'

const only = (action: string, label = 'Jump', keys: string[] = ['Space']): Controls => ({
  [action]: { label, keys, side: 'right' },
})

test('the fixture controls are fine', () => {
  expect(() => checkControls(fixtureControls)).not.toThrow()
})

test('an action name has to be small letters, numbers and dashes', () => {
  expect(() => checkControls(only('Jump!'))).toThrow(
    '"Jump!" cannot be an action name. Use small letters, numbers and dashes, like "jump" or "fire-left".',
  )
  expect(() => checkControls(only('fire-left'))).not.toThrow()
})

test('every button needs a label of a few letters', () => {
  expect(() => checkControls(only('jump', ''))).toThrow(
    'The action "jump" needs a label, the word on its button, like "Jump".',
  )
  expect(() => checkControls(only('jump', 'Jump up and away'))).toThrow(
    'The label "Jump up and away" is too long for a button. Use 12 letters or fewer.',
  )
})

test('one key cannot do two things', () => {
  const twice: Controls = {
    jump: { label: 'Jump', keys: ['Space'], side: 'right' },
    fire: { label: 'Fire', keys: ['KeyF', 'Space'], side: 'right' },
  }
  expect(() => checkControls(twice)).toThrow(
    'The key Space is used for both "jump" and "fire". Give each action its own key.',
  )
})

test('there is a most number of actions', () => {
  const many: Controls = Object.fromEntries(
    Array.from({ length: 17 }, (_, i) => [
      `a${i}`,
      { label: 'Go', keys: [`Key${i}`], side: 'right' as const },
    ]),
  )
  expect(() => checkControls(many)).toThrow('A game can have at most 16 actions; this one has 17.')
})

test('a button is in the left or the right corner', () => {
  const wrong = { jump: { label: 'Jump', keys: ['Space'], side: 'Left' } } as unknown as Controls
  expect(() => checkControls(wrong)).toThrow('The action "jump" has side "Left". Use "left" or "right".')
  const missing = { jump: { label: 'Jump', keys: ['Space'] } } as unknown as Controls
  expect(() => checkControls(missing)).toThrow(
    'The action "jump" has side "undefined". Use "left" or "right".',
  )
})

test('the keys are a list of key names', () => {
  const none = { jump: { label: 'Jump', side: 'right' } } as unknown as Controls
  expect(() => checkControls(none)).toThrow(
    'The action "jump" needs its keys as a list of key names, like ["Space"]. Use [] for none.',
  )
  const text = { jump: { label: 'Jump', keys: 'Space', side: 'right' } } as unknown as Controls
  expect(() => checkControls(text)).toThrow(
    'The action "jump" needs its keys as a list of key names, like ["Space"]. Use [] for none.',
  )
  const numbers = { jump: { label: 'Jump', keys: [32], side: 'right' } } as unknown as Controls
  expect(() => checkControls(numbers)).toThrow(
    'The action "jump" needs its keys as a list of key names, like ["Space"]. Use [] for none.',
  )
})

test('controls with no gamepad buttons and no shared keys are still fine', () => {
  expect(() => checkControls(only('jump'))).not.toThrow()
})

test('the keys kept for menus are refused', () => {
  expect(() => checkControls(only('jump', 'Jump', ['Escape']))).toThrow(
    'The key Escape is kept for the game\'s menus. Give "jump" another key.',
  )
  const shared: Controls = {
    jump: { label: 'Jump', keys: ['Space'], side: 'right', shared: [['Tab'], ['KeyJ']] },
  }
  expect(() => checkControls(shared)).toThrow(
    'The key Tab is kept for the game\'s menus. Give "jump" another key.',
  )
})

test('a gamepad button has to be one the game knows, and not one kept for menus', () => {
  const pad = (names: string[]): Controls => ({
    jump: { label: 'Jump', keys: ['Space'], side: 'right', pad: names as never },
  })
  expect(() => checkControls(pad(['turbo']))).toThrow(
    '"turbo" is not a gamepad button the game knows. Use a name like "south", "dpad-left" or "left-stick-up".',
  )
  expect(() => checkControls(pad(['start']))).toThrow(
    'The gamepad button start is kept for the game\'s menus. Give "jump" another button.',
  )
  expect(() => checkControls(pad(['south', 'left-stick-up']))).not.toThrow()
})

test('one gamepad button cannot do two things', () => {
  const twice: Controls = {
    jump: { label: 'Jump', keys: ['Space'], side: 'right', pad: ['south'] },
    fire: { label: 'Fire', keys: ['KeyF'], side: 'right', pad: ['west', 'south'] },
  }
  expect(() => checkControls(twice)).toThrow(
    'The gamepad button south is used for both "jump" and "fire". Give each action its own button.',
  )
})

test('a shared keyboard needs keys for every action, or for none', () => {
  const some: Controls = {
    left: { label: 'Left', keys: ['KeyA'], side: 'left' },
    jump: { label: 'Jump', keys: ['Space'], side: 'right', shared: [['KeyW'], ['ArrowUp']] },
  }
  expect(() => checkControls(some)).toThrow(
    'The action "left" has no keys for a shared keyboard. Give every action "shared" keys, or none of them.',
  )
})

test('shared keys are two lists of key names, one for each person', () => {
  const wrong = (shared: unknown): Controls =>
    ({ jump: { label: 'Jump', keys: ['Space'], side: 'right', shared } }) as unknown as Controls
  const message =
    'The action "jump" needs "shared" as two lists of key names, one for each person, like [["KeyW"], ["ArrowUp"]].'
  expect(() => checkControls(wrong([['KeyW']]))).toThrow(message)
  expect(() => checkControls(wrong('KeyW'))).toThrow(message)
  expect(() => checkControls(wrong([['KeyW'], 'ArrowUp']))).toThrow(message)
})

test('each person sharing a keyboard has their own keys', () => {
  const both: Controls = {
    jump: { label: 'Jump', keys: ['Space'], side: 'right', shared: [['KeyW'], ['ArrowUp']] },
    left: { label: 'Left', keys: ['KeyA'], side: 'left', shared: [['KeyA'], ['KeyW']] },
  }
  expect(() => checkControls(both)).toThrow(
    'The key KeyW is on both halves of a shared keyboard. Each person needs their own keys.',
  )
  const twice: Controls = {
    jump: { label: 'Jump', keys: ['Space'], side: 'right', shared: [['KeyW'], ['ArrowUp']] },
    left: { label: 'Left', keys: ['KeyA'], side: 'left', shared: [['KeyW'], ['ArrowLeft']] },
  }
  expect(() => checkControls(twice)).toThrow(
    'On a shared keyboard, the key KeyW is used for both "jump" and "left". Give each action its own key.',
  )
  const empty = (shared: [string[], string[]]): Controls => ({
    jump: { label: 'Jump', keys: ['Space'], side: 'right', shared },
  })
  expect(() => checkControls(empty([[], ['ArrowUp']]))).toThrow(
    'The action "jump" has no key for the first person on a shared keyboard. Give it one.',
  )
  expect(() => checkControls(empty([['KeyW'], []]))).toThrow(
    'The action "jump" has no key for the second person on a shared keyboard. Give it one.',
  )
})

test('a key may be a key of the whole keyboard and of a shared half', () => {
  expect(() => checkControls(fixtureControls)).not.toThrow()
})

const fixtureList: ControlEntry[] = Object.entries(fixtureControls).map(([action, control]) => ({
  action,
  ...control,
}))

test("a list of controls is the controls, in the list's order, with no action name left inside", () => {
  const controls = controlsFromList(fixtureList)
  expect(controls).toEqual(fixtureControls)
  expect(Object.keys(controls)).toEqual(['left', 'right', 'jump'])
  expect('action' in (controls.jump ?? {})).toBe(false)
})

test('an action listed twice is refused, and so is a list that cannot be played', () => {
  const [left] = fixtureList
  expect(() => controlsFromList([...fixtureList, left as ControlEntry])).toThrow(
    '"left" is listed twice. Each action is listed once.',
  )
  expect(() => controlsFromList([{ action: 'jump', label: '', keys: ['Space'], side: 'right' }])).toThrow(
    'The action "jump" needs a label, the word on its button, like "Jump".',
  )
})
