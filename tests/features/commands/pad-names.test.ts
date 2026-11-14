// The names a game's controls use for a gamepad: one list for the content checks and the pad reader.
import { expect, test } from 'vitest'
import { PAD_BUTTONS, PAD_STICKS } from '#src/features/commands/commands.ts'

test('a standard gamepad has seventeen buttons, in the standard order', () => {
  expect(PAD_BUTTONS).toHaveLength(17)
  expect(PAD_BUTTONS[0]).toBe('south')
  expect(PAD_BUTTONS[9]).toBe('start')
  expect(PAD_BUTTONS.slice(12, 16)).toEqual(['dpad-up', 'dpad-down', 'dpad-left', 'dpad-right'])
  expect(PAD_BUTTONS[16]).toBe('home')
})

test('no name is both a button and a stick direction', () => {
  const buttons = new Set<string>(PAD_BUTTONS)
  expect(PAD_STICKS.filter((name) => buttons.has(name))).toEqual([])
})
