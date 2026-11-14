// What a room says, as keys and values: one assertion per row of the plan's table, and no sentence at all (the words
// are `locale`'s: `tests/features/locale/online.test.ts` holds every English sentence).
import { expect, test } from 'vitest'
import { ONLINE_PROBLEMS, type OnlineStatus, onlineMessage } from '#src/features/net/net.ts'

test('waiting for one more player names the code', () => {
  expect(onlineMessage({ state: 'waiting', code: 'K7QX', missing: 1 })).toEqual({
    key: 'automata.online.waiting.one',
    values: { code: 'K7QX' },
  })
})

test('waiting for several players names how many and the code', () => {
  expect(onlineMessage({ state: 'waiting', code: 'K7QX', missing: 3 })).toEqual({
    key: 'automata.online.waiting.many',
    values: { count: 3, code: 'K7QX' },
  })
})

test('playing with everyone here is nothing to say', () => {
  expect(onlineMessage({ state: 'playing', away: [] })).toBeUndefined()
})

test('a player who is away is named, and a list of them is a list', () => {
  expect(onlineMessage({ state: 'playing', away: [2] })).toEqual({
    key: 'automata.online.away.one',
    values: { players: [2] },
  })
  expect(onlineMessage({ state: 'playing', away: [1, 2, 4] })).toEqual({
    key: 'automata.online.away.many',
    values: { players: [1, 2, 4] },
  })
})

test('reconnecting has no values', () => {
  expect(onlineMessage({ state: 'reconnecting' })).toEqual({ key: 'automata.online.reconnecting' })
})

test('every way a room can end has a key of its own', () => {
  const keys = ONLINE_PROBLEMS.map((problem) => onlineMessage({ state: 'ended', problem })?.key)
  expect(keys).toEqual(ONLINE_PROBLEMS.map((problem) => `automata.online.ended.${problem}`))
  expect(new Set(keys).size).toBe(ONLINE_PROBLEMS.length)
})

test('a status says the same thing twice, with nothing shared between the answers', () => {
  const status: OnlineStatus = { state: 'playing', away: [3] }
  expect(onlineMessage(status)).toEqual(onlineMessage(status))
})
