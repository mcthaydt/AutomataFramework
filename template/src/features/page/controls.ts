// The controls: which keys, gamepad buttons and on-screen buttons make which action. The hero's rules read the action
// names (`left`, `right`, `jump`); the framework turns keys, buttons and fingers into them. A player can change the keys
// and the buttons while playing, and the page keeps what they chose.
import type { Controls, Words } from '@automataframework/framework'

export const CONTROLS: Controls = {
  left: {
    label: 'Left',
    keys: ['ArrowLeft', 'KeyA'],
    side: 'left',
    pad: ['dpad-left', 'left-stick-left'],
    shared: [['KeyA'], ['ArrowLeft']],
  },
  right: {
    label: 'Right',
    keys: ['ArrowRight', 'KeyD'],
    side: 'left',
    pad: ['dpad-right', 'left-stick-right'],
    shared: [['KeyD'], ['ArrowRight']],
  },
  jump: {
    label: 'Jump',
    keys: ['Space', 'ArrowUp'],
    side: 'right',
    pad: ['south'],
    shared: [['KeyW'], ['ArrowUp']],
  },
}

/**
 * A key's name as a person says it, in the player's language: `ArrowLeft` is "Left arrow", `KeyA` is "A", `Space` is
 * "Space". Only the keys with words of their own are in the messages; a letter or a digit says itself.
 */
export function keyName(code: string, words: Words): string {
  const arrow = /^Arrow(Left|Right|Up|Down)$/.exec(code)
  if (arrow !== null) return words(`key.arrow-${(arrow[1] ?? '').toLowerCase()}`)
  if (code === 'Space') return words('key.space')
  const letter = /^(?:Key|Digit)(.)$/.exec(code)
  return letter?.[1] ?? code
}

/**
 * What to tell a player at a keyboard, from the keys in use now (`first` gives the first key of an action, or
 * `undefined` for one with none), in the player's language: "Arrow keys to move. Space to jump."
 */
export function hintFor(first: (action: string) => string | undefined, words: Words): string {
  const left = first('left')
  const right = first('right')
  const jump = first('jump')
  const keys =
    left === 'ArrowLeft' && right === 'ArrowRight'
      ? [words('hint.arrows')]
      : [left, right].flatMap((code) => (code === undefined ? [] : [keyName(code, words)]))
  const parts = [
    ...(keys.length === 0 ? [] : [words('hint.move', { keys })]),
    ...(jump === undefined ? [] : [words('hint.jump', { key: keyName(jump, words) })]),
  ]
  return parts.join(' ')
}
