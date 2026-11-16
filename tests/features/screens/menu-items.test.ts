// What the main menu offers: every combination of the three facts.
import { expect, test } from 'vitest'
import { type MenuItem, menuItems } from '#src/features/screens/menu-items.ts'

const COMBINATIONS: readonly [boolean, boolean, boolean, readonly MenuItem[]][] = [
  [false, false, false, ['play', 'settings', 'how']],
  [false, false, true, ['play', 'settings', 'how', 'quit']],
  [false, true, false, ['play', 'add-player', 'settings', 'how']],
  [false, true, true, ['play', 'add-player', 'settings', 'how', 'quit']],
  [true, false, false, ['continue', 'new', 'saves', 'settings', 'how']],
  [true, false, true, ['continue', 'new', 'saves', 'settings', 'how', 'quit']],
  [true, true, false, ['continue', 'new', 'saves', 'add-player', 'settings', 'how']],
  [true, true, true, ['continue', 'new', 'saves', 'add-player', 'settings', 'how', 'quit']],
]

test.each(COMBINATIONS)('saved %s, room %s, can quit %s', (saved, room, canQuit, items) => {
  expect(menuItems({ saved, room, canQuit })).toEqual(items)
})
