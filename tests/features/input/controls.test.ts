// What a game's controls may say. These are plain words an author reads, so each message says what to change.
import { expect, test } from 'vitest'
import { type Controls, checkControls } from '#src/features/input/input.ts'
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
