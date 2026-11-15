// Who is playing (plan U, Task 4): player 1 from the start, others join with what they brought, numbers are given
// lowest first and given back, and nobody joins a party that is full or with a device that is already taken.
import { expect, test } from 'vitest'
import { createParty } from '#src/features/flow/flow.ts'

const numbers = (party: ReturnType<typeof createParty>): number[] => party.members().map((m) => m.player)

test('a party has player 1 from the start, with no claim, and the room it was made with', () => {
  const party = createParty(3)
  expect(party.members()).toEqual([{ player: 1, claim: undefined }])
  expect(party.room).toBe(3)
})

test('numbers are given lowest first', () => {
  const party = createParty(4)
  expect(party.join('pad-0')).toBe(2)
  expect(party.join('pad-1')).toBe(3)
  expect(party.join('keyboard')).toBe(4)
  expect(party.members()).toEqual([
    { player: 1, claim: undefined },
    { player: 2, claim: 'pad-0' },
    { player: 3, claim: 'pad-1' },
    { player: 4, claim: 'keyboard' },
  ])
})

test('a number given back is the next one given', () => {
  const party = createParty(4)
  party.join('pad-0')
  party.join('pad-1')
  expect(party.leave(2)).toBe(true)
  expect(numbers(party)).toEqual([1, 3])
  expect(party.join('pad-2')).toBe(2)
  expect(numbers(party)).toEqual([1, 2, 3])
})

test('a device joins once: a second join with the same claim changes nothing', () => {
  const party = createParty(4)
  expect(party.join('pad-0')).toBe(2)
  expect(party.join('pad-0')).toBeUndefined()
  expect(numbers(party)).toEqual([1, 2])
})

test('a full party refuses another player and changes nothing', () => {
  const party = createParty(2)
  expect(party.join('pad-0')).toBe(2)
  expect(party.join('pad-1')).toBeUndefined()
  expect(party.members()).toHaveLength(2)
})

test('a game for one player has no room for anyone else', () => {
  const party = createParty(1)
  expect(party.join('pad-0')).toBeUndefined()
  expect(numbers(party)).toEqual([1])
})

test('player 1 never leaves, and nobody who is not there can', () => {
  const party = createParty(3)
  expect(party.leave(1)).toBe(false)
  expect(party.leave(2)).toBe(false)
  expect(party.leave(7)).toBe(false)
  expect(numbers(party)).toEqual([1])
})

test('a claim given back can be used again', () => {
  const party = createParty(3)
  party.join('pad-0')
  party.leave(2)
  expect(party.join('pad-0')).toBe(2)
})
