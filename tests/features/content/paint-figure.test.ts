import { expect, test } from 'vitest'
import { type FigureFile, paintFigure } from '#src/features/content/content.ts'
import type { IndexedPicture } from '#src/lib/png.ts'

/** One string per row of one frame: '.' is clear, anything else is the number of its place in the palette. */
function rows(picture: IndexedPicture, frame = 0, size = { w: picture.width, h: picture.height }): string[] {
  const perRow = Math.floor(picture.width / size.w)
  const x0 = (frame % perRow) * size.w
  const y0 = Math.floor(frame / perRow) * size.h
  const out: string[] = []
  for (let y = 0; y < size.h; y++) {
    let line = ''
    for (let x = 0; x < size.w; x++) {
      const place = picture.pixels[(y0 + y) * picture.width + x0 + x] as number
      line += place === 0 ? '.' : String(place)
    }
    out.push(line)
  }
  return out
}

const dot = (): FigureFile =>
  ({
    format: 1,
    id: 'dot',
    tile: 4,
    frame: { w: 4, h: 4 },
    paints: [{ id: 'body', color: '#f37f94' }],
    parts: [{ id: 'body', shape: 'block', x: 2, y: 2, w: 2, h: 2, paint: 'body' }],
    poses: [{ id: 'idle', moves: [] }],
  }) as unknown as FigureFile

/** The dot with something changed. */
const dotWith = (change: Record<string, unknown>): FigureFile => ({ ...dot(), ...change }) as FigureFile

test('a block is painted where it is', () =>
  expect(rows(paintFigure(dot()))).toEqual(['....', '.11.', '.11.', '....']))

test('the picture is as big as the sheet, and its palette starts with clear', () => {
  const picture = paintFigure(dot())
  expect([picture.width, picture.height]).toEqual([4, 4])
  expect(picture.palette).toEqual([0, 0xf37f94])
})

test('an outline goes round it, in the next colour', () => {
  const picture = paintFigure(dotWith({ outline: '#111314' }))
  expect(rows(picture)).toEqual(['.22.', '2112', '2112', '.22.'])
  expect(picture.palette).toEqual([0, 0xf37f94, 0x111314])
})

test('a round part of 4 by 4 is a circle with its corners off', () => {
  const round = dotWith({
    frame: { w: 6, h: 6 },
    parts: [{ id: 'body', shape: 'round', x: 3, y: 3, w: 4, h: 4, paint: 'body' }],
  })
  expect(rows(paintFigure(round))).toEqual(['......', '..11..', '.1111.', '.1111.', '..11..', '......'])
})

test('a later part paints over an earlier one', () => {
  const two = dotWith({
    paints: [
      { id: 'body', color: '#f37f94' },
      { id: 'trim', color: '#fdd4bd' },
    ],
    parts: [
      { id: 'body', shape: 'block', x: 2, y: 2, w: 4, h: 4, paint: 'body' },
      { id: 'trim', shape: 'block', x: 2, y: 2, w: 2, h: 2, paint: 'trim' },
    ],
  })
  expect(rows(paintFigure(two))).toEqual(['1111', '1221', '1221', '1111'])
})

test('a move shifts a part in that pose only', () => {
  const moved = dotWith({
    poses: [
      { id: 'idle', moves: [] },
      { id: 'up', moves: [{ part: 'body', dy: -1 }] },
    ],
  })
  const picture = paintFigure(moved)
  expect(rows(picture, 0, { w: 4, h: 4 })).toEqual(['....', '.11.', '.11.', '....'])
  expect(rows(picture, 1, { w: 4, h: 4 })).toEqual(['.11.', '.11.', '....', '....'])
})

test('a part moved half out of the frame is cut at the edge', () => {
  const half = dotWith({ poses: [{ id: 'idle', moves: [{ part: 'body', dx: 2 }] }] })
  expect(rows(paintFigure(half))).toEqual(['....', '...1', '...1', '....'])
})

test('a part moved right out of the frame paints nothing', () => {
  const gone = dotWith({ poses: [{ id: 'idle', moves: [{ part: 'body', dx: 100 }] }] })
  expect(rows(paintFigure(gone))).toEqual(['....', '....', '....', '....'])
})

test('a quarter turn of a 4 by 2 block stands it on end', () => {
  const turned = dotWith({
    frame: { w: 6, h: 6 },
    parts: [{ id: 'body', shape: 'block', x: 3, y: 3, w: 4, h: 2, paint: 'body', turn: 90 }],
  })
  expect(rows(paintFigure(turned))).toEqual(['......', '..11..', '..11..', '..11..', '..11..', '......'])
})

test('a turn of 30 degrees paints the same pixels as recorded', () => {
  const slanted = dotWith({
    frame: { w: 10, h: 10 },
    parts: [{ id: 'body', shape: 'block', x: 5, y: 5, w: 6, h: 2, paint: 'body', turn: 30 }],
  })
  expect(rows(paintFigure(slanted)).join('/')).toBe(
    [
      '..........',
      '..........',
      '..........',
      '..11......',
      '..1111....',
      '....1111..',
      '......11..',
      '..........',
      '..........',
      '..........',
    ].join('/'),
  )
})

test('a turn counted a whole round is the same as no turn', () => {
  const round = dotWith({
    parts: [{ id: 'body', shape: 'block', x: 2, y: 2, w: 2, h: 2, paint: 'body', turn: 180 }],
  })
  expect(rows(paintFigure(round))).toEqual(rows(paintFigure(dot())))
})

test('a variant changes only the paints it names', () => {
  const picture = paintFigure(
    dotWith({
      paints: [
        { id: 'body', color: '#f37f94' },
        { id: 'trim', color: '#fdd4bd' },
      ],
      parts: [
        { id: 'body', shape: 'block', x: 2, y: 2, w: 4, h: 4, paint: 'body' },
        { id: 'trim', shape: 'block', x: 2, y: 2, w: 2, h: 2, paint: 'trim' },
      ],
      variants: [{ id: 'two', paints: [{ id: 'body', color: '#afd472' }] }],
    }),
  )
  // Two frames side by side: the figure, then 'two/idle' with the body in palette place 3 and the trim as before.
  expect(rows(picture, 0, { w: 4, h: 4 })).toEqual(['1111', '1221', '1221', '1111'])
  expect(rows(picture, 1, { w: 4, h: 4 })).toEqual(['3333', '3223', '3223', '3333'])
})

test('the palette is clear, the paints, the outline, then each variant’s paints', () => {
  const picture = paintFigure(
    dotWith({
      outline: '#111314',
      variants: [
        { id: 'two', paints: [{ id: 'body', color: '#afd472' }] },
        { id: 'three', paints: [{ id: 'body', color: '#fdd4bd' }] },
      ],
    }),
  )
  expect(picture.palette).toEqual([0, 0xf37f94, 0x111314, 0xafd472, 0xfdd4bd])
})

test('the same figure paints the same pixels twice', () => {
  expect([...paintFigure(dot()).pixels]).toEqual([...paintFigure(dot()).pixels])
})

test('a pose that is a clear frame is still a frame', () => {
  const empty = dotWith({
    poses: [
      { id: 'idle', moves: [{ part: 'body', dx: 100 }] },
      { id: 'back', moves: [] },
    ],
  })
  const picture = paintFigure(empty)
  expect([picture.width, picture.height]).toEqual([8, 4])
})
