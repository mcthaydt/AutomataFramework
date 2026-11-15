// What to tell a player about moving, in their words and for the device they are using now: "Arrow keys to move. Space
// to jump." at a keyboard, "The stick to move. The bottom button to jump." on a gamepad. A touch screen says nothing
// here: the thumbs carry their own hints. Pure functions of words, so a test needs no page.
import type { Words } from '../../lib/message.ts'
import type { DeviceKind } from '../input/input.ts'

/** The words of the keys and gamepad inputs that have some of their own. Anything else says itself. */
const INPUT_WORDS: Readonly<Record<string, string>> = {
  ArrowDown: 'automata.key.arrow-down',
  ArrowLeft: 'automata.key.arrow-left',
  ArrowRight: 'automata.key.arrow-right',
  ArrowUp: 'automata.key.arrow-up',
  Space: 'automata.key.space',
  ShiftLeft: 'automata.key.shift',
  ShiftRight: 'automata.key.shift',
  south: 'automata.pad.south',
  west: 'automata.pad.west',
  r2: 'automata.pad.r2',
}

/**
 * A key or a gamepad input as a person says it: `ArrowLeft` is "Left arrow", `KeyA` is "A", `south` is "the bottom
 * button". A letter or a digit says itself, and so does an input with no word of its own (`north`).
 */
export function inputName(input: string, words: Words): string {
  const key = INPUT_WORDS[input]
  if (key !== undefined) return words(key)
  const letter = /^(?:Key|Digit)(.)$/.exec(input)
  return letter?.[1] ?? input
}

/** A sentence begins with a capital in the languages that have them; the rest of it is left alone. */
const sentence = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * What to tell a player about walking and jumping (and dashing, in a game that has it) on the device they use. `first`
 * gives the first key or button of an action, as `input.inputsFor(player, action)[0]`, or `undefined` for one with none.
 * On touch it is the empty text.
 */
export function playHint(options: {
  readonly device: DeviceKind
  readonly first: (action: string) => string | undefined
  readonly dash: boolean
  readonly words: Words
}): string {
  const { device, first, dash, words } = options
  if (device === 'touch') return ''
  const left = first('left')
  const right = first('right')
  const jump = first('jump')
  const dashes = dash ? first('dash') : undefined
  const keys =
    device === 'gamepad'
      ? [words('automata.hint.stick')]
      : left === 'ArrowLeft' && right === 'ArrowRight'
        ? [words('automata.hint.arrows')]
        : [left, right].flatMap((code) => (code === undefined ? [] : [inputName(code, words)]))
  const parts = [
    ...(keys.length === 0 ? [] : [words('automata.hint.move', { keys })]),
    ...(jump === undefined ? [] : [words('automata.hint.jump', { key: inputName(jump, words) })]),
    ...(dashes === undefined ? [] : [words('automata.hint.dash', { input: inputName(dashes, words) })]),
  ]
  return parts.map(sentence).join(' ')
}

/** How to do each new move with a thumb and with a key or button: the words, and the action whose input is named. */
const TEACH = {
  'double-jump': {
    action: 'jump',
    touch: 'automata.teach.double-jump.touch',
    press: 'automata.teach.double-jump.press',
  },
  'wall-jump': {
    action: 'jump',
    touch: 'automata.teach.wall-jump.touch',
    press: 'automata.teach.wall-jump.press',
  },
  dash: { action: 'dash', touch: 'automata.thumbs.dash-hint', press: 'automata.teach.dash.press' },
} as const

/**
 * How to do one new move on the device in use: the sentence a level shows where the move is first needed. At a
 * keyboard or a gamepad it names the input the player uses now; with none to name, it is the empty text.
 */
export function teachHint(options: {
  readonly move: 'double-jump' | 'wall-jump' | 'dash'
  readonly device: DeviceKind
  readonly first: (action: string) => string | undefined
  readonly words: Words
}): string {
  const { move, device, first, words } = options
  const how = TEACH[move]
  if (device === 'touch') return sentence(words(how.touch))
  const input = first(how.action)
  return input === undefined ? '' : sentence(words(how.press, { input: inputName(input, words) }))
}
