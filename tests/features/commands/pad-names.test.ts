import { expect, test } from 'vitest'
import { PAD_BUTTONS, PAD_STICKS, RESERVED_KEYS, RESERVED_PAD } from '#src/features/commands/commands.ts'

test('a standard gamepad has 17 buttons, named in the order of Gamepad.buttons', () => {
  expect(PAD_BUTTONS).toHaveLength(17)
  expect(PAD_BUTTONS[0]).toBe('south')
  expect(PAD_BUTTONS[9]).toBe('start')
  expect(PAD_BUTTONS.slice(12, 16)).toEqual(['dpad-up', 'dpad-down', 'dpad-left', 'dpad-right'])
  expect(PAD_BUTTONS[16]).toBe('home')
})

test('each stick has four directions, and no name is in both lists', () => {
  expect(PAD_STICKS).toHaveLength(8)
  expect(PAD_BUTTONS.filter((name) => (PAD_STICKS as readonly string[]).includes(name))).toEqual([])
})

test('the keys and buttons kept for menus are real names', () => {
  expect(RESERVED_KEYS).toEqual(['Escape', 'Tab'])
  expect(RESERVED_PAD.every((name) => (PAD_BUTTONS as readonly string[]).includes(name))).toBe(true)
})
