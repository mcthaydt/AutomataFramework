import { expect, test } from 'vitest'
import { frameworkWords, inputName, playHint, teachHint } from '#src/features/locale/locale.ts'

const en = frameworkWords('en')
const es = frameworkWords('es')

/** The first input of each action, as `input.inputsFor(player, action)[0]` says. */
const firsts =
  (table: Readonly<Record<string, string>>) =>
  (action: string): string | undefined =>
    table[action]

const KEYS = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'Space', dash: 'ShiftLeft' }
const PAD = { left: 'dpad-left', right: 'dpad-right', jump: 'south', dash: 'west' }

test('a key or a gamepad input is said as a person says it', () => {
  expect(inputName('ArrowLeft', en)).toBe('Left arrow')
  expect(inputName('KeyA', en)).toBe('A')
  expect(inputName('Digit3', en)).toBe('3')
  expect(inputName('Space', en)).toBe('Space')
  expect(inputName('ShiftRight', en)).toBe('Shift')
  expect(inputName('south', en)).toBe('the bottom button')
  expect(inputName('south', es)).toBe('el botón de abajo')
  // An input with no word of its own says its name as written.
  expect(inputName('north', en)).toBe('north')
})

test('at a keyboard with the framework controls the hint is arrow keys and space', () => {
  const hint = playHint({ device: 'keyboard', first: firsts(KEYS), dash: false, words: en })
  expect(hint).toBe('Arrow keys to move. Space to jump.')
})

test('in a game with dash the hint says the dash key too', () => {
  const hint = playHint({ device: 'keyboard', first: firsts(KEYS), dash: true, words: en })
  expect(hint).toBe('Arrow keys to move. Space to jump. Shift to dash.')
})

test('a changed key is named, not the default', () => {
  const hint = playHint({
    device: 'keyboard',
    first: firsts({ left: 'KeyA', right: 'KeyD', jump: 'KeyW' }),
    dash: false,
    words: en,
  })
  expect(hint).toBe('A and D to move. W to jump.')
})

test('on a gamepad the stick moves and the buttons are named, each sentence starting with a capital', () => {
  expect(playHint({ device: 'gamepad', first: firsts(PAD), dash: false, words: en })).toBe(
    'The stick to move. The bottom button to jump.',
  )
  expect(playHint({ device: 'gamepad', first: firsts(PAD), dash: true, words: en })).toBe(
    'The stick to move. The bottom button to jump. The left button to dash.',
  )
})

test('on a touch screen there is nothing to say: the thumbs carry their own hints', () => {
  expect(playHint({ device: 'touch', first: firsts(KEYS), dash: true, words: en })).toBe('')
})

test('the hint is in the words it is given', () => {
  expect(playHint({ device: 'keyboard', first: firsts(KEYS), dash: true, words: es })).toBe(
    'Las flechas para moverte. Espacio para saltar. Mayús para impulsarte.',
  )
})

test('each new move is taught in the way of the device in use, in English and in Spanish', () => {
  const teach = (
    move: 'double-jump' | 'wall-jump' | 'dash',
    device: 'keyboard' | 'touch' | 'gamepad',
    words = en,
  ): string => teachHint({ move, device, first: firsts(device === 'gamepad' ? PAD : KEYS), words })
  expect(teach('double-jump', 'touch')).toBe('Tap again in the air')
  expect(teach('double-jump', 'keyboard')).toBe('Press Space again in the air')
  expect(teach('double-jump', 'gamepad')).toBe('Press the bottom button again in the air')
  expect(teach('wall-jump', 'touch')).toBe('Tap while you slide down a wall')
  expect(teach('wall-jump', 'keyboard')).toBe('Press Space while you slide down a wall')
  expect(teach('dash', 'touch')).toBe('Flick to dash')
  expect(teach('dash', 'keyboard')).toBe('Press Shift to dash')
  expect(teach('dash', 'gamepad')).toBe('Press the left button to dash')
  expect(teach('double-jump', 'touch', es)).toBe('Toca otra vez en el aire')
  expect(teach('double-jump', 'keyboard', es)).toBe('Pulsa Espacio otra vez en el aire')
  expect(teach('dash', 'keyboard', es)).toBe('Pulsa Mayús para impulsarte')
})

test('with no input to name there is nothing to teach at a keyboard', () => {
  expect(teachHint({ move: 'dash', device: 'keyboard', first: () => undefined, words: en })).toBe('')
})
