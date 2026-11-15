// When the hints of the thumb scheme show.
import { expect, test } from 'vitest'
import { HINT_IDLE_MS, HINT_USES, hintsShown } from '#src/features/input/thumb-hints.ts'

const ALL = { walk: true, jump: true, dash: true }
const NONE = { walk: false, jump: false, dash: false }

test('each hint shows for its first three uses and not after', () => {
  expect(HINT_USES).toBe(3)
  expect(hintsShown({ walk: 0, jump: 0, dash: 0 }, 0, true)).toEqual(ALL)
  expect(hintsShown({ walk: 2, jump: 3, dash: 2 }, 1000, true)).toEqual({ ...ALL, jump: false })
  expect(hintsShown({ walk: 3, jump: 9, dash: 3 }, 1000, true)).toEqual(NONE)
})

test('all come back after 20 seconds with no touch', () => {
  const done = { walk: 5, jump: 5, dash: 5 }
  expect(hintsShown(done, HINT_IDLE_MS - 1, true)).toEqual(NONE)
  expect(hintsShown(done, HINT_IDLE_MS, true)).toEqual(ALL)
})

test('the dash hint never shows in a game without dash', () => {
  expect(hintsShown({ walk: 0, jump: 0, dash: 0 }, 0, false).dash).toBe(false)
  expect(hintsShown({ walk: 9, jump: 9, dash: 9 }, HINT_IDLE_MS, false).dash).toBe(false)
})
