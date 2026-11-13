import { expect, test } from 'vitest'
import { levelSize, tileRuns } from '#src/features/level/level.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'

test('tileRuns joins neighbours in a row and keeps rows apart', () =>
  expect(tileRuns(['##.#', '....', '####'])).toEqual([
    { row: 0, col: 0, length: 2 },
    { row: 0, col: 3, length: 1 },
    { row: 2, col: 0, length: 4 },
  ]))

test('an empty map has no runs, and a map of one solid tile has one', () => {
  expect(tileRuns(['....', '....'])).toEqual([])
  expect(tileRuns(['.#.'])).toEqual([{ row: 0, col: 1, length: 1 }])
})

test('a run that reaches the end of its row is kept', () =>
  expect(tileRuns(['..##'])).toEqual([{ row: 0, col: 2, length: 2 }]))

test('levelSize is the width of a row and the number of rows', async () => {
  const game = await loadFixtureGame()
  expect(levelSize(game.levels['level-1'] as NonNullable<(typeof game.levels)[string]>)).toEqual({
    w: 16,
    h: 9,
  })
})
