// What one seat is holding, from what is down on every device.
import { expect, test } from 'vitest'
import type { PadInput } from '#src/features/commands/commands.ts'
import { type Down, heldBy } from '#src/features/input/held.ts'
import type { Seat } from '#src/features/input/seats.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'

const nothing: Down = { keys: new Set(), touch: new Set(), pads: new Map() }
const seat = (...devices: Seat['devices']): Seat => ({ player: 1, devices, connected: true })
const pads = (entries: [number, PadInput[]][]): Down['pads'] =>
  new Map(entries.map(([index, names]) => [index, new Set(names)]))

test('keys, touch and a pad all count for the one player, each action once', () => {
  const down: Down = {
    keys: new Set(['ArrowRight', 'KeyD']),
    touch: new Set(['jump']),
    pads: pads([[0, ['south', 'dpad-right']]]),
  }
  expect(heldBy(seat('keyboard', 'touch', 'pad-0'), fixtureControls, down)).toEqual(['jump', 'right'])
})

test("on a shared keyboard each person's keys move only their own hero", () => {
  const down: Down = { ...nothing, keys: new Set(['KeyD']) }
  expect(heldBy(seat('keyboard-1'), fixtureControls, down)).toEqual(['right'])
  expect(heldBy(seat('keyboard-2'), fixtureControls, down)).toEqual([])
  expect(heldBy(seat('keyboard-2'), fixtureControls, { ...nothing, keys: new Set(['ArrowUp']) })).toEqual([
    'jump',
  ])
})

test('a pad moves only the player who holds it', () => {
  const down: Down = { ...nothing, pads: pads([[1, ['dpad-left']]]) }
  expect(heldBy(seat('pad-1'), fixtureControls, down)).toEqual(['left'])
  expect(heldBy(seat('pad-0'), fixtureControls, down)).toEqual([])
})

test('a stick direction is held like a button', () => {
  const down: Down = { ...nothing, pads: pads([[0, ['left-stick-right']]]) }
  expect(heldBy(seat('pad-0'), fixtureControls, down)).toEqual(['right'])
})

test('an action with no pad buttons is never held by a pad', () => {
  const plain = { jump: { label: 'Jump', keys: ['Space'], side: 'right' as const } }
  expect(heldBy(seat('pad-0'), plain, { ...nothing, pads: pads([[0, ['south']]]) })).toEqual([])
})

test('a seat with no devices holds nothing', () => {
  expect(
    heldBy(seat(), fixtureControls, {
      keys: new Set(['KeyD']),
      touch: new Set(['jump']),
      pads: pads([[0, ['south']]]),
    }),
  ).toEqual([])
})
