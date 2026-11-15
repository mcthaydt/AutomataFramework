// Where the painted pages of a scene's ground go: a pure function of the scene.
import { expect, test } from 'vitest'
import type { SceneFile } from '#src/features/content/content.ts'
import { groundPages } from '#src/features/render/ground.ts'

const scene = (w: number, h: number, tile = 16): SceneFile => ({
  format: 1,
  id: 'wide',
  seed: 0,
  tile,
  size: { w, h },
  paints: [],
  materials: [],
  ground: { letters: [], rows: [] },
})

test('the pages of a 200-wide scene at 16 are at columns 0 and 128', () => {
  expect(groundPages(scene(200, 10))).toEqual([
    { frame: 'ground/0', col: 0, w: 128, h: 10 },
    { frame: 'ground/1', col: 128, w: 72, h: 10 },
  ])
})

test('a scene that fits one page has one, as wide as the scene', () => {
  expect(groundPages(scene(24, 12))).toEqual([{ frame: 'ground/0', col: 0, w: 24, h: 12 }])
})

test('a bigger tile makes a page hold fewer columns', () => {
  // 2048 / 64 = 32 columns a page.
  expect(groundPages(scene(70, 5, 64)).map((page) => [page.col, page.w])).toEqual([
    [0, 32],
    [32, 32],
    [64, 6],
  ])
})
