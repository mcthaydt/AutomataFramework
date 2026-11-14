// What a person reads about a room. One assertion per line of the plan's table, and no word of the machinery.
import { expect, test } from 'vitest'
import { ONLINE_PROBLEMS, type OnlineProblem, type OnlineStatus, onlineWords } from '#src/features/net/net.ts'

test('waiting for one more player says how to share the code', () => {
  expect(onlineWords({ state: 'waiting', code: 'K7QX', missing: 1 })).toBe(
    'Waiting for 1 more player. Share this code so a friend can join: K7QX',
  )
})

test('waiting for several players', () => {
  expect(onlineWords({ state: 'waiting', code: 'K7QX', missing: 3 })).toBe(
    'Waiting for 3 more players. Share this code so friends can join: K7QX',
  )
})

test('playing with everyone here says nothing', () => {
  expect(onlineWords({ state: 'playing', away: [] })).toBe('')
})

test('a player who is away is named, and the game goes on', () => {
  expect(onlineWords({ state: 'playing', away: [2] })).toBe(
    'Player 2 lost their connection. The game goes on.',
  )
  expect(onlineWords({ state: 'playing', away: [1, 3] })).toBe(
    'Players 1 and 3 lost their connection. The game goes on.',
  )
  expect(onlineWords({ state: 'playing', away: [1, 2, 4] })).toBe(
    'Players 1, 2 and 4 lost their connection. The game goes on.',
  )
})

test('reconnecting', () => {
  expect(onlineWords({ state: 'reconnecting' })).toBe('Connection lost. Trying to get you back in.')
})

const ended: Record<OnlineProblem, string> = {
  'different-version':
    'This game is a different version from the room. Reload the page to get the newest one, then join again.',
  'room-full': 'That room is full. Start a new room, or ask for another code.',
  'no-room': 'No room has that code. Check the code and try again.',
  'server-full': 'The server has no space for another room right now. Try again in a minute.',
  'bad-room': 'That room could not be made. Check the level and the number of players.',
  'no-server': 'Could not reach the game server. Check your internet and try again.',
  lost: 'The connection was lost and could not be got back. Start or join a room to play again.',
}

test('every way a room can end has its words', () => {
  expect(Object.keys(ended).sort()).toEqual([...ONLINE_PROBLEMS].sort())
  for (const problem of ONLINE_PROBLEMS)
    expect(onlineWords({ state: 'ended', problem }), problem).toBe(ended[problem])
})

test('no words of the machinery', () => {
  const statuses: OnlineStatus[] = [
    { state: 'waiting', code: 'K7QX', missing: 1 },
    { state: 'waiting', code: 'K7QX', missing: 2 },
    { state: 'playing', away: [2] },
    { state: 'playing', away: [1, 2] },
    { state: 'reconnecting' },
    ...ONLINE_PROBLEMS.map((problem): OnlineStatus => ({ state: 'ended', problem })),
  ]
  for (const status of statuses)
    expect(onlineWords(status).toLowerCase(), JSON.stringify(status)).not.toMatch(
      /socket|server tick|desync|rollback|\bsync\b|\bseat\b/,
    )
})
