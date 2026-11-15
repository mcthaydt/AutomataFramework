// What "How to play" lists (plan Q, Task 7b): Walk and Jump always, the extra moves only for a hero that has them, the
// device in use deciding the words, and "Pause" last.
import { expect, test } from 'vitest'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { type HowMoves, howRows } from '#src/features/screens/how-rows.ts'

const en = frameworkWords('en')
const NONE: HowMoves = { doubleJump: false, wallJump: false, dash: false }
const ALL: HowMoves = { doubleJump: true, wallJump: true, dash: true }

/** The first input of an action, as `input.inputsFor(1, action)[0]` gives it. */
const keys =
  (table: Record<string, string>) =>
  (action: string): string | undefined =>
    table[action]

const KEYBOARD = keys({
  left: 'ArrowLeft',
  right: 'ArrowRight',
  jump: 'Space',
  dash: 'ShiftLeft',
})
const PAD = keys({ jump: 'south', dash: 'r2' })

const said = (rows: ReturnType<typeof howRows>): string[] => rows.map((row) => `${row.move}: ${row.how}`)

test('keys, a plain hero: Walk is "Arrow keys", Jump is its key, Pause is Escape; no other row', () => {
  expect(
    said(howRows({ device: 'keyboard', moves: NONE, first: KEYBOARD, swapped: false, words: en })),
  ).toEqual(['Walk: Arrow keys', 'Jump: Space', 'Pause: Escape'])
})

test("a hero with every move has the three more rows, in the table's order", () => {
  expect(
    said(howRows({ device: 'keyboard', moves: ALL, first: KEYBOARD, swapped: false, words: en })),
  ).toEqual([
    'Walk: Arrow keys',
    'Jump: Space',
    'Jump again in the air: Space',
    'Jump off a wall: Space',
    'Dash: Shift',
    'Pause: Escape',
  ])
})

test('a gamepad: Walk is "The stick", Jump is its button\'s name, Pause is the start button', () => {
  expect(said(howRows({ device: 'gamepad', moves: ALL, first: PAD, swapped: false, words: en }))).toEqual([
    'Walk: The stick',
    'Jump: the bottom button',
    'Jump again in the air: the bottom button',
    'Jump off a wall: the bottom button',
    'Dash: the right trigger',
    'Pause: the start button',
  ])
})

test('touch: slide left, tap right; swapped: slide right, tap left; a dash is the dash button', () => {
  const plain = howRows({ device: 'touch', moves: ALL, first: () => undefined, swapped: false, words: en })
  expect(said(plain)).toEqual([
    'Walk: Slide your left thumb',
    'Jump: Tap with your right thumb',
    'Jump again in the air: Tap with your right thumb',
    'Jump off a wall: Tap with your right thumb',
    'Dash: Tap the dash button',
    'Pause: The button in the corner',
  ])
  const swapped = howRows({ device: 'touch', moves: NONE, first: () => undefined, swapped: true, words: en })
  expect(said(swapped).slice(0, 2)).toEqual([
    'Walk: Slide your right thumb',
    'Jump: Tap with your left thumb',
  ])
})

test('a changed key is the one named', () => {
  const changed = keys({ left: 'KeyA', right: 'KeyD', jump: 'KeyW' })
  expect(
    said(howRows({ device: 'keyboard', moves: NONE, first: changed, swapped: false, words: en })),
  ).toEqual(['Walk: A / D', 'Jump: W', 'Pause: Escape'])
})

test("a hero with no moves lists the game's own controls", () => {
  const own = [
    { move: 'Left', how: 'A' },
    { move: 'Push', how: 'E' },
  ]
  expect(
    said(howRows({ device: 'keyboard', moves: undefined, first: KEYBOARD, swapped: false, words: en, own })),
  ).toEqual(['Left: A', 'Push: E', 'Pause: Escape'])
  // With no list to give, or on touch, the plain Walk and Jump stand in.
  expect(
    said(howRows({ device: 'keyboard', moves: undefined, first: KEYBOARD, swapped: false, words: en })),
  ).toEqual(['Walk: Arrow keys', 'Jump: Space', 'Pause: Escape'])
  expect(
    said(
      howRows({ device: 'touch', moves: undefined, first: () => undefined, swapped: false, words: en, own }),
    ),
  ).toEqual([
    'Walk: Slide your left thumb',
    'Jump: Tap with your right thumb',
    'Pause: The button in the corner',
  ])
})
