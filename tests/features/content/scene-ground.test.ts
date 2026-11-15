// The ground's shapes as plain geometry: which points a shape covers, where its surface is, and how slope tiles join
// into runs that a collider and a check can take as one line.
import { expect, test } from 'vitest'
import {
  covers,
  GROUND_SHAPES,
  type GroundShape,
  gapsUnder,
  LEDGE_DEEP,
  shapesOf,
  slopeRuns,
  surfaceAt,
} from '#src/features/content/content.ts'

/** The nine shapes, in the order the format lists them. */
test('there are nine shapes', () => {
  expect(GROUND_SHAPES).toEqual([
    'solid',
    'slope-up',
    'slope-down',
    'half-up-low',
    'half-up-high',
    'half-down-high',
    'half-down-low',
    'ledge',
    'back',
  ])
  expect(LEDGE_DEEP).toBe(0.25)
})

/** For each shape: is the top left, top right, bottom left, bottom right corner and the middle inside it. */
const COVERS: Readonly<Record<GroundShape, readonly boolean[]>> = {
  solid: [true, true, true, true, true],
  'slope-up': [false, true, true, true, true],
  'slope-down': [true, false, true, true, true],
  'half-up-low': [false, false, true, true, false],
  'half-up-high': [false, true, true, true, true],
  'half-down-high': [true, false, true, true, true],
  'half-down-low': [false, false, true, true, false],
  ledge: [true, true, false, false, false],
  back: [false, false, false, false, false],
}

test('each shape covers the corners and the middle of its tile as it should', () => {
  const points = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
    [0.5, 0.5],
  ] as const
  for (const shape of GROUND_SHAPES) {
    expect(
      points.map(([x, y]) => covers(shape, x, y)),
      shape,
    ).toEqual([...COVERS[shape]])
  }
})

test('a ledge is only its top quarter', () => {
  expect(covers('ledge', 0.5, 0.24)).toBe(true)
  expect(covers('ledge', 0.5, 0.25)).toBe(false)
})

test('the surface of each shape across its tile', () => {
  expect(surfaceAt('solid', 0.3)).toBe(0)
  expect(surfaceAt('slope-up', 0)).toBe(1)
  expect(surfaceAt('slope-up', 1)).toBe(0)
  expect(surfaceAt('slope-down', 0)).toBe(0)
  expect(surfaceAt('slope-down', 1)).toBe(1)
  expect(surfaceAt('half-up-low', 0)).toBe(1)
  expect(surfaceAt('half-up-low', 1)).toBe(0.5)
  expect(surfaceAt('half-up-high', 0.5)).toBe(0.25)
  expect(surfaceAt('half-down-high', 1)).toBe(0.5)
  expect(surfaceAt('half-down-low', 0)).toBe(0.5)
  expect(surfaceAt('half-down-low', 1)).toBe(1)
})

const LETTERS = [
  { letter: '#', shape: 'solid' },
  { letter: '/', shape: 'slope-up' },
  { letter: '\\', shape: 'slope-down' },
  { letter: 'l', shape: 'half-up-low' },
  { letter: 'h', shape: 'half-up-high' },
  { letter: 'H', shape: 'half-down-high' },
  { letter: 'L', shape: 'half-down-low' },
] as const

const grid = (...rows: string[]) => ({ letters: LETTERS, rows })

test('shapesOf gives the shape of a tile, and nothing for air or outside the scene', () => {
  const at = shapesOf(grid('./', '#.'))
  expect(at(1, 0)).toBe('slope-up')
  expect(at(0, 1)).toBe('solid')
  expect(at(0, 0)).toBeUndefined()
  expect(at(5, 0)).toBeUndefined()
  expect(at(0, -1)).toBeUndefined()
  expect(at(-1, 0)).toBeUndefined()
})

test('three slope-up tiles on a line are one run, which starts at its lowest tile', () => {
  expect(slopeRuns(grid('....', '../.', './#.', '/##.'))).toEqual([
    { col: 0, row: 3, w: 3, rise: 3, leftY: 4 },
  ])
})

test('four half-up tiles are one run of two tiles up, starting with the low half', () => {
  expect(slopeRuns(grid('....', '..lh', 'lh##', '####'))).toEqual([
    { col: 0, row: 2, w: 4, rise: 2, leftY: 3 },
  ])
})

test('slope-down runs start at their highest tile and are named by their lowest', () => {
  expect(slopeRuns(grid('....', '\\...', '#\\..', '##\\.'))).toEqual([
    { col: 0, row: 3, w: 3, rise: -3, leftY: 1 },
  ])
  expect(slopeRuns(grid('....', 'HL..', '##HL', '####'))).toEqual([
    { col: 0, row: 2, w: 4, rise: -2, leftY: 1 },
  ])
})

test('a half tile with no partner is a run of one tile, and two out of order are two runs', () => {
  expect(slopeRuns(grid('....', '.h..', '####'))).toEqual([{ col: 1, row: 1, w: 1, rise: 0.5, leftY: 1.5 }])
  expect(slopeRuns(grid('....', '.l..', '####'))).toEqual([{ col: 1, row: 1, w: 1, rise: 0.5, leftY: 2 }])
  expect(slopeRuns(grid('....', 'hl..', '####'))).toEqual([
    { col: 0, row: 1, w: 1, rise: 0.5, leftY: 1.5 },
    { col: 1, row: 1, w: 1, rise: 0.5, leftY: 2 },
  ])
})

test('two runs that touch at a peak are two runs, left to right', () => {
  expect(slopeRuns(grid('....', './\\.', '/..\\', '####'))).toEqual([
    { col: 0, row: 2, w: 2, rise: 2, leftY: 3 },
    { col: 2, row: 2, w: 2, rise: -2, leftY: 1 },
  ])
})

test('a slope with air under its third tile names that tile', () => {
  const g = grid('....', '../.', './..', '/##.')
  const [run] = slopeRuns(g)
  expect(run && gapsUnder(g, run)).toEqual([{ col: 2, row: 2 }])
})

test('a slope with solid ground under its whole line has no gaps', () => {
  const g = grid('....', '../.', './#.', '/##.')
  const [run] = slopeRuns(g)
  expect(run && gapsUnder(g, run)).toEqual([])
})

test('a half-down run asks for the two tiles under its first pair, top row first', () => {
  const g = grid('....', 'HL..', '..HL', '####')
  const [run] = slopeRuns(g)
  expect(run && gapsUnder(g, run)).toEqual([
    { col: 0, row: 2 },
    { col: 1, row: 2 },
  ])
})
