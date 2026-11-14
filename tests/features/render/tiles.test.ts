import { expect, test } from 'vitest'
import type { Level, TilesetFile } from '#src/features/content/content.ts'
import { tilePictures } from '#src/features/render/tiles.ts'

const level = (tiles: string[]): Level =>
  ({ format: 1, id: 'a', tileset: 'meadow', tiles, things: [], starts: [] }) as unknown as Level

/** Grass shows its top with air above, its left edge with air to the left, and plain grass otherwise. */
const meadow = (): TilesetFile => ({
  format: 1,
  id: 'meadow',
  image: 'content/figures/meadow.png',
  tileSize: 16,
  columns: 4,
  tiles: [
    {
      id: 'grass',
      letter: 'G',
      solid: true,
      pictures: [{ frame: 0, when: { up: 'other' } }, { frame: 1, when: { left: 'other' } }, { frame: 2 }],
    },
    { id: 'flowers', letter: '~', solid: false, pictures: [{ frame: 3 }] },
  ],
})

const frames = (tiles: string[]): number[][] => {
  const placed = tilePictures(level(tiles), meadow())
  return tiles.map((text, row) =>
    [...text].map((_, col) => placed.find((p) => p.row === row && p.col === col)?.frame ?? -1),
  )
}

test('grass with air above shows its top, grass under grass shows plain grass', () =>
  expect(frames(['...', 'GGG', 'GGG'])).toEqual([
    [-1, -1, -1],
    [0, 0, 0],
    [2, 2, 2],
  ]))

test('the first picture that fits wins, and the last is drawn when none does', () => {
  // Air above and air to the left: the top, which comes first, wins over the edge.
  expect(frames(['...', '.GG', '.GG'])).toEqual([
    [-1, -1, -1],
    [-1, 0, 0],
    [-1, 1, 2],
  ])
  // Nothing fits the first two tiles of the top row, so each gets the plain grass the kind ends with.
  expect(frames(['GGG', '.GG', '.GG'])).toEqual([
    [2, 2, 2],
    [-1, 1, 2],
    [-1, 1, 2],
  ])
})

test("the level's edge counts as more of the same tile", () =>
  expect(frames(['GG', 'GG'])).toEqual([
    [2, 2],
    [2, 2],
  ]))

test('a . and a letter the tileset lacks are not drawn', () =>
  expect(frames(['.?', '~G'])).toEqual([
    [-1, -1],
    [3, 0],
  ]))
