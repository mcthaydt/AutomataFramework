// The rows of the controls part of the settings: what each action says and which key or button it has now.
import { expect, test } from 'vitest'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { controlRows } from '#src/features/screens/settings-rows.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'

const es = frameworkWords('es')
const input = { controls: () => fixtureControls }

test("one keyboard row for each action, in the game's order, and one gamepad row for each that has a button", () => {
  const rows = controlRows(input, es, false)
  expect(rows.keyboard.map((row) => [row.action, row.slot, row.label, row.input])).toEqual([
    ['left', 'keys', 'Left', es('automata.key.arrow-left')],
    ['right', 'keys', 'Right', es('automata.key.arrow-right')],
    ['jump', 'keys', 'Jump', es('automata.key.space')],
  ])
  expect(rows.gamepad.map((row) => [row.action, row.slot, row.input])).toEqual([
    ['left', 'pad', 'dpad-left'],
    ['right', 'pad', 'dpad-right'],
    ['jump', 'pad', es('automata.pad.south')],
  ])
})

test('two people on one keyboard: a row for each half, named by the person', () => {
  const rows = controlRows(input, es, true)
  expect(rows.keyboard.map((row) => [row.slot, row.label, row.input])).toEqual([
    ['shared-1', `Left, ${es('automata.players.name', { player: 1 })}`, 'A'],
    ['shared-2', `Left, ${es('automata.players.name', { player: 2 })}`, es('automata.key.arrow-left')],
    ['shared-1', `Right, ${es('automata.players.name', { player: 1 })}`, 'D'],
    ['shared-2', `Right, ${es('automata.players.name', { player: 2 })}`, es('automata.key.arrow-right')],
    ['shared-1', `Jump, ${es('automata.players.name', { player: 1 })}`, 'W'],
    ['shared-2', `Jump, ${es('automata.players.name', { player: 2 })}`, es('automata.key.arrow-up')],
  ])
})

test('a game with no gamepad buttons has no gamepad rows, and an action with no keys says nothing for it', () => {
  const rows = controlRows(
    { controls: () => ({ jump: { label: 'Jump', keys: [], side: 'right' as const } }) },
    es,
    false,
  )
  expect(rows.gamepad).toEqual([])
  expect(rows.keyboard).toEqual([{ action: 'jump', slot: 'keys', label: 'Jump', input: '' }])
})

test("the game's own word for an action wins over its label", () => {
  const said = (key: string): string => (key === 'controls.jump' ? 'Saltar' : key)
  expect(controlRows(input, said, false).keyboard.map((row) => row.label)).toEqual(['Left', 'Right', 'Saltar'])
})
