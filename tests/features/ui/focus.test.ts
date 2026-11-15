import { expect, test } from 'vitest'
import { type Box, nextFocus } from '#src/features/ui/focus.ts'

const box = (x: number, y: number, w = 100, h = 48): Box => ({ x, y, w, h })

test('in a column down goes to the next, up to the one before, and the ends stay', () => {
  const column = [box(0, 0), box(0, 60), box(0, 120)]
  expect(nextFocus(column, 0, 'down')).toBe(1)
  expect(nextFocus(column, 1, 'down')).toBe(2)
  expect(nextFocus(column, 2, 'down')).toBe(2)
  expect(nextFocus(column, 2, 'up')).toBe(1)
  expect(nextFocus(column, 0, 'up')).toBe(0)
})

test('in a column left and right have nowhere to go', () => {
  const column = [box(0, 0), box(0, 60)]
  expect(nextFocus(column, 0, 'left')).toBe(0)
  expect(nextFocus(column, 1, 'right')).toBe(1)
})

test('in a row right goes to the next and left to the one before, and the ends stay', () => {
  const row = [box(0, 0), box(110, 0), box(220, 0)]
  expect(nextFocus(row, 0, 'right')).toBe(1)
  expect(nextFocus(row, 1, 'right')).toBe(2)
  expect(nextFocus(row, 2, 'right')).toBe(2)
  expect(nextFocus(row, 2, 'left')).toBe(1)
  expect(nextFocus(row, 0, 'left')).toBe(0)
  expect(nextFocus(row, 1, 'down')).toBe(1)
})

test('in a grid of two columns and three rows each way goes to the neighbour and never wraps', () => {
  // 0 1
  // 2 3
  // 4 5
  const grid = [0, 1, 2].flatMap((row) => [box(0, row * 60), box(110, row * 60)])
  expect(nextFocus(grid, 0, 'right')).toBe(1)
  expect(nextFocus(grid, 0, 'down')).toBe(2)
  expect(nextFocus(grid, 3, 'left')).toBe(2)
  expect(nextFocus(grid, 3, 'up')).toBe(1)
  expect(nextFocus(grid, 3, 'down')).toBe(5)
  expect(nextFocus(grid, 5, 'down')).toBe(5)
  expect(nextFocus(grid, 5, 'right')).toBe(5)
  expect(nextFocus(grid, 0, 'left')).toBe(0)
})

test('from a wide button over two narrow ones, down goes to the one whose middle is nearer', () => {
  // The wide one's middle is at 100; the left one's is at 40 and the right one's at 150.
  const boxes = [box(0, 0, 200), box(0, 60, 80), box(100, 60, 100)]
  expect(nextFocus(boxes, 0, 'down')).toBe(2)
  // And up from either goes back to the wide one.
  expect(nextFocus(boxes, 1, 'up')).toBe(0)
  expect(nextFocus(boxes, 2, 'up')).toBe(0)
})

test('a straight line beats a nearer diagonal', () => {
  // Below the first: one a little to the side but close, and one straight under but further.
  const boxes = [box(0, 0), box(70, 55), box(0, 100)]
  expect(nextFocus(boxes, 0, 'down')).toBe(2)
})

test('nothing in that direction answers where it is, and so does an index with no box', () => {
  expect(nextFocus([], 0, 'down')).toBe(0)
  expect(nextFocus([box(0, 0)], 0, 'down')).toBe(0)
  expect(nextFocus([box(0, 0), box(0, 60)], 5, 'down')).toBe(5)
})
