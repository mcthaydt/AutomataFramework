import { describe, expect, test } from 'vitest'
import { type Level, layoutWorld, openTile, type WorldFile } from '#src/features/content/content.ts'

/** A level of these rows; it needs nothing else for the map. */
const level = (id: string, tiles: string[]): Level => ({
  format: 1,
  id,
  tiles,
  things: [],
  starts: [{ player: 1, x: 0, y: 0 }],
})

/** Four tiles wide and three tall, open on the left and the right at the top two rows. */
const OPEN_SIDES = ['....', '....', '####']
/** The same size, open on the top and the bottom at the middle two columns. */
const OPEN_ENDS = ['#..#', '#..#', '#..#']
const SOLID = ['####', '####', '####']

const world = (...placed: [string, number, number][]): WorldFile => ({
  format: 1,
  id: 'world',
  levels: placed.map(([id, x, y]) => ({ level: id, at: { x, y } })),
})

const map = (levels: Record<string, string[]>): Record<string, Level> =>
  Object.fromEntries(Object.entries(levels).map(([id, tiles]) => [id, level(id, tiles)]))

const layout = (levels: Record<string, string[]>, ...placed: [string, number, number][]) =>
  layoutWorld(world(...placed), map(levels), openTile(undefined))

describe('levels side by side', () => {
  test('are joined along the rows where both are open, and make one place', () => {
    const joined = layout({ l: OPEN_SIDES, r: OPEN_SIDES }, ['l', 0, 0], ['r', 4, 0])
    expect(joined.joins).toEqual([{ a: 'l', b: 'r', along: 'y', from: 0, to: 2 }])
    expect(joined.problems).toEqual([])
    expect(joined.places).toEqual({
      l: [
        { level: 'l', x: 0, y: 0 },
        { level: 'r', x: 4, y: 0 },
      ],
    })
  })

  test('are joined whichever of them is listed first', () => {
    const joined = layout({ l: OPEN_SIDES, r: OPEN_SIDES }, ['r', 4, 0], ['l', 0, 0])
    expect(joined.joins).toEqual([{ a: 'l', b: 'r', along: 'y', from: 0, to: 2 }])
  })

  test('two walls are a wall: nothing is joined and nothing is wrong', () => {
    const joined = layout({ l: SOLID, r: SOLID }, ['l', 0, 0], ['r', 4, 0])
    expect(joined).toEqual({ joins: [], places: {}, problems: [] })
  })

  test('touch only at a corner, or with a gap of one tile, are not joined', () => {
    expect(layout({ l: OPEN_SIDES, r: OPEN_SIDES }, ['l', 0, 0], ['r', 4, 3]).joins).toEqual([])
    expect(layout({ l: OPEN_SIDES, r: OPEN_SIDES }, ['l', 0, 0], ['r', 5, 0]).joins).toEqual([])
  })

  test('one open and one solid is a problem at the open level, in words that say what to open', () => {
    const left = ['#..#', '#..#', '####']
    const open = ['....', '....', '####']
    expect(layout({ l: open, r: left }, ['l', 0, 0], ['r', 4, 0]).problems).toEqual([
      {
        entry: 0,
        message:
          "l's right edge is open at rows 0 to 1, but r, which touches it, is solid there. Open r's left edge at those rows, or move it.",
      },
    ])
    expect(layout({ l: left, r: open }, ['l', 0, 0], ['r', 4, 0]).problems).toEqual([
      {
        entry: 1,
        message:
          "r's left edge is open at rows 0 to 1, but l, which touches it, is solid there. Open l's right edge at those rows, or move it.",
      },
    ])
  })

  test('a single open row is said as a row', () => {
    const openAtRowOne = ['####', '###.', '####']
    expect(layout({ l: openAtRowOne, r: SOLID }, ['l', 0, 0], ['r', 4, 0]).problems).toEqual([
      {
        entry: 0,
        message:
          "l's right edge is open at row 1, but r, which touches it, is solid there. Open r's left edge at that row, or move it.",
      },
    ])
  })

  test("a different height says the neighbour's own rows", () => {
    const joined = layout({ l: ['####', '....', '####'], r: OPEN_SIDES }, ['l', 0, 0], ['r', 4, 1])
    expect(joined.joins).toEqual([{ a: 'l', b: 'r', along: 'y', from: 1, to: 2 }])
    expect(joined.problems).toEqual([
      {
        entry: 1,
        message:
          "r's left edge is open at row 1, but l, which touches it, is solid there. Open l's right edge at row 2, or move it.",
      },
    ])
  })
})

describe('levels one above the other', () => {
  test('are joined along the columns where both are open', () => {
    const joined = layout({ t: OPEN_ENDS, b: OPEN_ENDS }, ['t', 0, 0], ['b', 0, 3])
    expect(joined.joins).toEqual([{ a: 't', b: 'b', along: 'x', from: 1, to: 3 }])
    expect(joined.places).toEqual({
      b: [
        { level: 'b', x: 0, y: 3 },
        { level: 't', x: 0, y: 0 },
      ],
    })
  })

  test('one open and one solid is said with columns, top and bottom', () => {
    expect(layout({ t: OPEN_ENDS, b: SOLID }, ['t', 0, 0], ['b', 0, 3]).problems).toEqual([
      {
        entry: 0,
        message:
          "t's bottom edge is open at columns 1 to 2, but b, which touches it, is solid there. Open b's top edge at those columns, or move it.",
      },
    ])
  })
})

describe('a place of three, and a map that moves', () => {
  const row = { a: OPEN_SIDES, b: OPEN_SIDES, c: OPEN_SIDES }

  test('three in a row make one place, named for the first by id', () => {
    const joined = layout(row, ['c', 8, 0], ['a', 0, 0], ['b', 4, 0])
    expect(joined.joins).toHaveLength(2)
    expect(joined.places).toEqual({
      a: [
        { level: 'a', x: 0, y: 0 },
        { level: 'b', x: 4, y: 0 },
        { level: 'c', x: 8, y: 0 },
      ],
    })
  })

  test("a place's offsets are from its own corner, whatever the map's numbers are", () => {
    const here = layout(row, ['a', 0, 0], ['b', 4, 0], ['c', 8, 0])
    const there = layout(row, ['a', 100, -7], ['b', 104, -7], ['c', 108, -7])
    expect(there.places).toEqual(here.places)
  })
})

describe('levels that sit wrongly', () => {
  test('on top of one another', () => {
    expect(layout({ a: OPEN_SIDES, b: OPEN_SIDES }, ['a', 0, 0], ['b', 2, 0]).problems).toEqual([
      { entry: 1, message: 'b sits on top of a on the map. Move one so they do not overlap.' },
    ])
  })

  test('touching, but not in whole tiles', () => {
    const joined = layout({ a: OPEN_SIDES, b: OPEN_SIDES }, ['a', 0, 0], ['b', 4, 0.5])
    expect(joined.joins).toEqual([])
    expect(joined.problems).toEqual([
      { entry: 1, message: 'b touches a, so where it sits must be in whole tiles. Got y 0.5.' },
    ])
  })

  test('a level the map names but the game does not have is left to the loader', () => {
    expect(layout({ a: OPEN_SIDES }, ['a', 0, 0], ['gone', 4, 0])).toEqual({
      joins: [],
      places: {},
      problems: [],
    })
  })
})

describe('what is open', () => {
  test('a "." is open and a "#" is solid; with no tileset every other letter is open', () => {
    const open = openTile(undefined)
    const lvl = level('x', ['#.a'])
    expect([0, 1, 2].map((col) => open(lvl, col, 0))).toEqual([false, true, true])
    expect(open(lvl, 3, 0)).toBe(false)
    expect(open(lvl, 0, 1)).toBe(false)
  })

  test("a tileset says which of a level's letters are solid", () => {
    const tileset = {
      format: 1,
      id: 'meadow',
      image: 'art/tiles.png',
      tileSize: 16,
      columns: 2,
      tiles: [
        { id: 'grass', letter: 'g', solid: true, pictures: [{ frame: 0 }] },
        { id: 'flower', letter: 'f', solid: false, pictures: [{ frame: 1 }] },
      ],
    }
    const open = openTile({ meadow: tileset as never })
    const lvl = { ...level('x', ['gf.']), tileset: 'meadow' }
    expect([0, 1, 2].map((col) => open(lvl, col, 0))).toEqual([false, true, true])
  })
})
