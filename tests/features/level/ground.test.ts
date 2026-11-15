// A scene's ground as colliders in plain tiles: boxes from the solid tiles, a slope for each run of slope tiles, a ledge
// for each run of ledge tiles, in that order.
import { expect, test } from 'vitest'
import type { GroundShape } from '#src/features/content/content.ts'
import { type GroundSource, groundColliders } from '#src/features/level/ground.ts'
import { tileBoxes, tileRuns } from '#src/features/level/tile-runs.ts'

const LETTERS: Record<string, GroundShape> = {
  G: 'solid',
  '#': 'solid',
  S: 'slope-up',
  D: 'slope-down',
  l: 'half-up-low',
  h: 'half-up-high',
  d: 'half-down-high',
  m: 'half-down-low',
  E: 'ledge',
  b: 'back',
}

/** A ground of `rows`, with a letter for each shape the tests use. */
function groundOf(rows: string[], oneBoxPerRow = false): GroundSource {
  return {
    letters: Object.entries(LETTERS).map(([letter, shape]) => ({ letter, shape })),
    rows,
    ...(oneBoxPerRow ? { oneBoxPerRow: true as const } : {}),
  }
}

test('a # scene with one box a row gives the runs of a level with rows, one box each', () => {
  const rows = ['.##.', '####', '#..#']
  const colliders = groundColliders(groundOf(rows, true))
  expect(colliders).toEqual(
    tileRuns(rows).map((run) => ({ kind: 'box', col: run.col, row: run.row, w: run.length, h: 1 })),
  )
})

test('without one box a row, the boxes are the joined boxes of a level with a tileset', () => {
  const rows = ['##..', '##..', '####']
  const colliders = groundColliders(groundOf(rows))
  expect(colliders).toEqual(tileBoxes(rows).map((box) => ({ kind: 'box', ...box })))
  expect(colliders).toEqual([
    { kind: 'box', col: 0, row: 0, w: 2, h: 2 },
    { kind: 'box', col: 0, row: 2, w: 4, h: 1 },
  ])
})

test('a slope of three tiles is one triangle, and the solid tiles under its line are in no box', () => {
  const colliders = groundColliders(groundOf(['..S', '.SG', 'SGG', 'GGG']))
  expect(colliders).toEqual([
    { kind: 'box', col: 0, row: 3, w: 3, h: 1 },
    { kind: 'slope', col: 0, row: 0, w: 3, h: 3, rises: 1 },
  ])
})

test('a slope that goes down the other way rises to the left', () => {
  const colliders = groundColliders(groundOf(['D..', 'GD.', 'GGD', 'GGG']))
  expect(colliders).toEqual([
    { kind: 'box', col: 0, row: 3, w: 3, h: 1 },
    { kind: 'slope', col: 0, row: 0, w: 3, h: 3, rises: -1 },
  ])
})

test('a half slope of four tiles is one triangle two tiles high', () => {
  const colliders = groundColliders(groundOf(['dm..', 'GGdm', 'GGGG']))
  expect(colliders).toEqual([
    { kind: 'box', col: 0, row: 2, w: 4, h: 1 },
    { kind: 'slope', col: 0, row: 0, w: 4, h: 2, rises: -1 },
  ])
})

test('a lone half tile is a slope half a tile high, and a box for the half tile under it', () => {
  // `h` is a half-up-high tile: its surface is 0.5 down on the left and level with the top on the right.
  expect(groundColliders(groundOf(['h', 'G']))).toEqual([
    { kind: 'box', col: 0, row: 1, w: 1, h: 1 },
    { kind: 'slope', col: 0, row: 0, w: 1, h: 0.5, rises: 1 },
    { kind: 'box', col: 0, row: 0.5, w: 1, h: 0.5 },
  ])
  // A `half-up-low` tile has its whole foot on the tile, so it has no box under it.
  expect(groundColliders(groundOf(['l', 'G']))).toEqual([
    { kind: 'box', col: 0, row: 1, w: 1, h: 1 },
    { kind: 'slope', col: 0, row: 0.5, w: 1, h: 0.5, rises: 1 },
  ])
  // The mirror: a `half-down-high` tile slopes from the top left to half way down.
  expect(groundColliders(groundOf(['d', 'G']))).toEqual([
    { kind: 'box', col: 0, row: 1, w: 1, h: 1 },
    { kind: 'slope', col: 0, row: 0, w: 1, h: 0.5, rises: -1 },
    { kind: 'box', col: 0, row: 0.5, w: 1, h: 0.5 },
  ])
})

test('three ledges in a row are one ledge, and a back tile gives nothing', () => {
  expect(groundColliders(groundOf(['EEE.E', 'bbbbb']))).toEqual([
    { kind: 'ledge', col: 0, row: 0, w: 3 },
    { kind: 'ledge', col: 4, row: 0, w: 1 },
  ])
})

test('the order is boxes, then slopes, then ledges', () => {
  const colliders = groundColliders(groundOf(['.EE.', '..S.', 'GGGG']))
  expect(colliders.map((c) => c.kind)).toEqual(['box', 'slope', 'ledge'])
})
