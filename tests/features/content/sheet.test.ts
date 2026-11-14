import { expect, test } from 'vitest'
import {
  atlasOf,
  type BackdropFile,
  backdropSheet,
  type FigureFile,
  figureSheet,
  SHEET_COLUMNS,
} from '#src/features/content/content.ts'
import { heroFigure, valleyBackdrop } from '../../fixtures/content/art.ts'

const hero = heroFigure() as unknown as FigureFile
const valley = valleyBackdrop() as unknown as BackdropFile
const dot = {
  format: 1,
  id: 'dot',
  tile: 4,
  frame: { w: 4, h: 4 },
  paints: [{ id: 'body', color: '#f37f94' }],
  parts: [{ id: 'body', shape: 'block', x: 2, y: 2, w: 2, h: 2, paint: 'body' }],
  poses: [{ id: 'idle', moves: [] }],
} as unknown as FigureFile

test('frames are the poses in order, eight to a row, then each variant’s', () => {
  const sheet = figureSheet(hero) // frame 24 by 24, 7 poses, 1 variant 'two'
  expect(SHEET_COLUMNS).toBe(8)
  expect([sheet.w, sheet.h]).toEqual([192, 48])
  expect(sheet.frames).toHaveLength(14)
  expect(sheet.frames[0]).toEqual({ name: 'idle', x: 0, y: 0, w: 24, h: 24 })
  expect(sheet.frames[7]).toEqual({ name: 'two/idle', x: 168, y: 0, w: 24, h: 24 })
  expect(sheet.frames[8]).toEqual({ name: 'two/run-1', x: 0, y: 24, w: 24, h: 24 })
})

test('a figure of one pose is one frame, and the sheet is as wide as the frames in its row', () => {
  const sheet = figureSheet(dot)
  expect([sheet.w, sheet.h]).toEqual([4, 4])
  expect(sheet.frames).toEqual([{ name: 'idle', x: 0, y: 0, w: 4, h: 4 }])
})

test('the atlas is the frames by name, and names its picture', () =>
  expect(JSON.stringify(atlasOf(figureSheet(dot), 'dot.png'))).toBe(
    '{"frames":{"idle":{"frame":{"x":0,"y":0,"w":4,"h":4}}},"meta":{"image":"dot.png","size":{"w":4,"h":4},"scale":"1"}}',
  ))

test('a backdrop’s picture is one strip per layer, top to bottom', () => {
  const sheet = backdropSheet(valley) // tile 8, width 32; layers haze 3 tall, far 6, near 2.5
  expect([sheet.w, sheet.h]).toEqual([256, 92])
  expect(sheet.frames).toEqual([
    { name: 'haze', x: 0, y: 0, w: 256, h: 24 },
    { name: 'far', x: 0, y: 24, w: 256, h: 48 },
    { name: 'near', x: 0, y: 72, w: 256, h: 20 },
  ])
})

test('a layer that is a fraction of a pixel tall is one pixel tall', () => {
  const thin = { ...valley, tile: 4, layers: [{ ...valley.layers[0], height: 0.1 }] } as unknown as BackdropFile
  expect(backdropSheet(thin).frames[0]).toMatchObject({ h: 1 })
})
