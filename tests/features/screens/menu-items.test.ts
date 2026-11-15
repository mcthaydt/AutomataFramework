// What the main menu offers: every combination of the three facts.
import { expect, test } from 'vitest'
import { type MenuItem, menuItems } from '#src/features/screens/menu-items.ts'

const COMBINATIONS: readonly [boolean, boolean, boolean, readonly MenuItem[]][] = [
  [false, false, false, ['play', 'settings']],
  [false, false, true, ['play', 'settings', 'quit']],
  [false, true, false, ['play', 'add-player', 'settings']],
  [false, true, true, ['play', 'add-player', 'settings', 'quit']],
  [true, false, false, ['continue', 'new', 'saves', 'settings']],
  [true, false, true, ['continue', 'new', 'saves', 'settings', 'quit']],
  [true, true, false, ['continue', 'new', 'saves', 'add-player', 'settings']],
  [true, true, true, ['continue', 'new', 'saves', 'add-player', 'settings', 'quit']],
]

test.each(COMBINATIONS)('saved %s, room %s, can quit %s', (saved, room, canQuit, items) => {
  expect(menuItems({ saved, room, canQuit })).toEqual(items)
})
