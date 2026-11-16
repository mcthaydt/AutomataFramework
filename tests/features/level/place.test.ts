// A place's pure parts (plan W, task 8): which levels a sim holds, which one a spot is in, a level moved to its offset and
// the place's solid tiles as one grid. Every test runs on the links game, where room 2 and room 3 are one place.
import { expect, test } from 'vitest'
import type { Level } from '#src/features/content/content.ts'
import { levelAt, levelsOf, placeSize, shiftLevel, solidGrid } from '#src/features/level/level.ts'
import { loadLinksGame } from '../../fixtures/links-game/read.ts'

test('levelsOf: a lone level is itself at (0, 0); room-2 and room-3 give both, with room-3 at (16, 0)', async () => {
  const content = await loadLinksGame()
  expect(levelsOf(content, 'room-1')).toEqual([{ level: 'room-1', x: 0, y: 0, w: 16, h: 9 }])
  const both = [
    { level: 'room-2', x: 0, y: 0, w: 16, h: 9 },
    { level: 'room-3', x: 16, y: 0, w: 16, h: 9 },
  ]
  expect(levelsOf(content, 'room-2')).toEqual(both)
  expect(levelsOf(content, 'room-3')).toEqual(both)
  // A level the game does not have is size 0 by 0: the caller says what is missing.
  expect(levelsOf(content, 'nowhere')).toEqual([{ level: 'nowhere', x: 0, y: 0, w: 0, h: 0 }])
})

test('levelAt: (15.99, 5) is room-2, (16, 5) is room-3, (40, 5) is none', async () => {
  const levels = levelsOf(await loadLinksGame(), 'room-2')
  expect(levelAt(levels, 15.99, 5)).toBe('room-2')
  expect(levelAt(levels, 16, 5)).toBe('room-3')
  expect(levelAt(levels, 40, 5)).toBeUndefined()
  // The top and left edges are in, the bottom edge is out.
  expect(levelAt(levels, 0, 0)).toBe('room-2')
  expect(levelAt(levels, 5, 9)).toBeUndefined()
})

test('placeSize is the box that holds every level', async () => {
  const content = await loadLinksGame()
  expect(placeSize(levelsOf(content, 'room-2'))).toEqual({ w: 32, h: 9 })
  expect(placeSize(levelsOf(content, 'room-1'))).toEqual({ w: 16, h: 9 })
})

test('shiftLevel moves things, starts, joints and path points, and nothing else', async () => {
  const content = await loadLinksGame()
  const room = content.levels['room-2'] as Level
  const level: Level = {
    ...room,
    joints: [
      { id: 'pin-1', kind: 'pin', thing: 'crate-1', x: 5.5, y: 7.5, turn: { min: -10, max: 10 } },
      { id: 'rope-1', kind: 'rope', thing: 'crate-1', from: { x: 5, y: 7 }, to: { x: 5, y: 3 }, slack: 1 },
    ],
  }
  const moved = shiftLevel(level, content, 16, 2)
  expect(moved.things.find((t) => t.id === 'crate-1')).toMatchObject({ x: 21.5, y: 9.5 })
  expect(moved.things.find((t) => t.id === 'critter-1')?.values).toEqual({
    walk: [
      { x: 23.5, y: 9.5 },
      { x: 25.5, y: 9.5 },
    ],
  })
  // A value that is not a path is not moved: the button's link is a list of ids.
  expect(moved.things.find((t) => t.id === 'button-1')?.values).toEqual({ opens: ['gate-1'], stays: true })
  expect(moved.starts).toEqual([
    { player: 1, x: 18.5, y: 9.5 },
    { player: 2, x: 19.5, y: 9.5 },
  ])
  expect(moved.joints).toEqual([
    { id: 'pin-1', kind: 'pin', thing: 'crate-1', x: 21.5, y: 9.5, turn: { min: -10, max: 10 } },
    { id: 'rope-1', kind: 'rope', thing: 'crate-1', from: { x: 21, y: 9 }, to: { x: 21, y: 5 }, slack: 1 },
  ])
  // Nothing else: the tiles, the id and the original are as they were.
  expect(moved.tiles).toEqual(room.tiles)
  expect(moved.id).toBe(room.id)
  expect(room.things.find((t) => t.id === 'crate-1')).toMatchObject({ x: 5.5, y: 7.5 })
})

test('solidGrid: the floor of the place is one unbroken row of 32, and rows 5 to 7 are open at columns 15 and 16', async () => {
  const content = await loadLinksGame()
  const grid = solidGrid(content, levelsOf(content, 'room-2'))
  expect(grid).toHaveLength(9)
  expect(grid.every((row) => row.length === 32)).toBe(true)
  expect(grid[8]).toBe('#'.repeat(32))
  for (const row of [5, 6, 7]) {
    expect(grid[row]?.[15]).toBe('.')
    expect(grid[row]?.[16]).toBe('.')
  }
  // Above the opening the two levels' walls stand side by side.
  expect(grid[0]?.slice(14, 18)).toBe('.##.')
})

test('solidGrid: where there is no level it is open air', async () => {
  const content = await loadLinksGame()
  const levels = [
    { level: 'room-1', x: 0, y: 0, w: 16, h: 9 },
    { level: 'room-3', x: 20, y: 0, w: 16, h: 9 },
  ]
  const grid = solidGrid(content, levels)
  expect(grid[8]?.slice(14, 22)).toBe('##....##')
})
