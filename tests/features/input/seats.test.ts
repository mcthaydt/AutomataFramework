// Who holds which device: one seat per player, and the first player holds whatever nobody else brought.
import { expect, test } from 'vitest'
import type { Claim } from '#src/features/input/seats.ts'
import { seatsFor } from '#src/features/input/seats.ts'

const claims = (entries: [number, Claim][]): Map<number, Claim> => new Map(entries)

test('one player holds everything', () => {
  expect(seatsFor([1], new Map(), [0, 2])).toEqual([
    { player: 1, devices: ['keyboard', 'touch', 'pad-0', 'pad-2'], connected: true },
  ])
})

test('a second player with a pad holds only that pad', () => {
  expect(seatsFor([1, 2], claims([[2, 'pad-2']]), [0, 2])).toEqual([
    { player: 1, devices: ['keyboard', 'touch', 'pad-0'], connected: true },
    { player: 2, devices: ['pad-2'], connected: true },
  ])
})

test('sharing the keyboard splits it', () => {
  expect(seatsFor([1, 2], claims([[2, 'keyboard']]), [0])).toEqual([
    { player: 1, devices: ['keyboard-1', 'touch', 'pad-0'], connected: true },
    { player: 2, devices: ['keyboard-2'], connected: true },
  ])
})

test('four players', () => {
  const seats = seatsFor(
    [1, 2, 3, 4],
    claims([
      [2, 'pad-0'],
      [3, 'pad-1'],
      [4, 'keyboard'],
    ]),
    [0, 1, 2],
  )
  expect(seats.map((seat) => seat.devices)).toEqual([
    ['keyboard-1', 'touch', 'pad-2'],
    ['pad-0'],
    ['pad-1'],
    ['keyboard-2'],
  ])
})

test('an unplugged pad leaves its player with nothing, marked not connected', () => {
  expect(seatsFor([1, 2], claims([[2, 'pad-1']]), [0])[1]).toEqual({
    player: 2,
    devices: [],
    connected: false,
  })
})

test('a player with no claim holds nothing, and is not "not connected"', () => {
  expect(seatsFor([1, 2], new Map(), [0])[1]).toEqual({ player: 2, devices: [], connected: true })
})

test('when the first player leaves, the next one holds everything left, and the keyboard is whole again', () => {
  const seats = seatsFor(
    [2, 3],
    claims([
      [2, 'keyboard'],
      [3, 'pad-0'],
    ]),
    [0, 1],
  )
  expect(seats[0]).toEqual({ player: 2, devices: ['keyboard', 'touch', 'pad-1'], connected: true })
  expect(seats[1]).toEqual({ player: 3, devices: ['pad-0'], connected: true })
})

test('a claim for someone who is not playing is ignored', () => {
  expect(seatsFor([1], claims([[2, 'keyboard']]), [0])[0]?.devices).toEqual(['keyboard', 'touch', 'pad-0'])
})

test('nobody playing is no seats', () => {
  expect(seatsFor([], new Map(), [0])).toEqual([])
})
