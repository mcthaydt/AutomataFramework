import { expect, test } from 'vitest'
import { writeContent } from '#src/features/content/content.ts'
import { heroFigure } from '../../fixtures/content/art.ts'
import { expectRoundTrip, problemsOf } from '../../fixtures/content/kind.ts'

type Json = Record<string, unknown>
const file = 'content/figures/hero.json'
const said = (value: unknown): string[] => problemsOf('figure', value, file)
/** The hero figure with one change made to it. */
const edit = (change: (value: Json) => void): Json => {
  const value = heroFigure() as Json
  change(value)
  return value
}
const list = (value: Json, key: string): Json[] => value[key] as Json[]
const part = (value: Json, i = 0): Json => list(value, 'parts')[i] as Json
const pose = (value: Json, i = 0): Json => list(value, 'poses')[i] as Json
const variant = (value: Json, i = 0): Json => list(value, 'variants')[i] as Json

test('a figure reads, and writes back to the same bytes twice', () => expectRoundTrip('figure', heroFigure()))

test('a figure is written in the schema’s order', () =>
  expect(Object.keys(JSON.parse(writeContent('figure', heroFigure() as never)))).toEqual([
    'format',
    'id',
    'tile',
    'frame',
    'outline',
    'paints',
    'parts',
    'poses',
    'variants',
  ]))

test('a figure with no outline and no variants reads', () => {
  const plain = edit((v) => {
    delete v.outline
    delete v.variants
  })
  expect(said(plain)).toEqual([])
})

test('two paints with one id', () => {
  const twice = edit((v) => list(v, 'paints').push({ id: 'body', color: '#111314' }))
  expect(said(twice)).toEqual([`${file}: paints[3].id: "body" is used twice. Each paint needs its own id.`])
})

test('two parts with one id', () => {
  const twice = edit((v) => list(v, 'parts').push({ ...part(v) }))
  expect(said(twice)).toEqual([`${file}: parts[3].id: "body" is used twice. Each part needs its own id.`])
})

test('two poses with one id', () => {
  const twice = edit((v) => list(v, 'poses').push({ id: 'idle', moves: [] }))
  expect(said(twice)).toEqual([`${file}: poses[7].id: "idle" is used twice. Each pose needs its own id.`])
})

test('two variants with one id', () => {
  const twice = edit((v) => list(v, 'variants').push({ ...variant(v) }))
  expect(said(twice)).toEqual([
    `${file}: variants[1].id: "two" is used twice. Each variant needs its own id.`,
  ])
})

test('a part painted in a colour the figure does not have', () => {
  const wrong = edit((v) => Object.assign(part(v), { paint: 'bod' }))
  expect(said(wrong)).toEqual([
    `${file}: parts[0].paint: There is no paint called "bod". This figure has: body, ink, trim.`,
  ])
})

test('a variant that changes a paint the figure does not have', () => {
  const wrong = edit((v) => Object.assign(variant(v), { paints: [{ id: 'trm', color: '#111314' }] }))
  expect(said(wrong)).toEqual([
    `${file}: variants[0].paints[0].id: There is no paint called "trm". This figure has: body, ink, trim.`,
  ])
})

test('a variant that changes one paint twice', () => {
  const twice = edit((v) =>
    Object.assign(variant(v), {
      paints: [
        { id: 'body', color: '#111314' },
        { id: 'body', color: '#fdd4bd' },
      ],
    }),
  )
  expect(said(twice)).toEqual([
    `${file}: variants[0].paints[1].id: "body" is used twice. Each paint needs its own id.`,
  ])
})

test('a pose that moves a part the figure does not have', () => {
  const wrong = edit((v) => Object.assign(pose(v, 3), { moves: [{ part: 'hed', dy: 1 }] }))
  expect(said(wrong)).toEqual([
    `${file}: poses[3].moves[0].part: There is no part called "hed". This figure has: body, eye, head.`,
  ])
})

test('a pose that moves one part twice', () => {
  const twice = edit((v) =>
    Object.assign(pose(v, 3), {
      moves: [
        { part: 'head', dy: 1 },
        { part: 'head', dx: 1 },
      ],
    }),
  )
  expect(said(twice)).toEqual([
    `${file}: poses[3].moves[1].part: "head" is moved twice in this pose. Put its moves together.`,
  ])
})

test('a move that says nothing', () => {
  const nothing = edit((v) => Object.assign(pose(v, 3), { moves: [{ part: 'head' }] }))
  expect(said(nothing)).toEqual([`${file}: poses[3].moves[0]: Say how the part moves: add "dx", "dy" or "turn".`])
})

test('a part whose middle is outside the frame', () => {
  expect(said(edit((v) => Object.assign(part(v), { x: 40 })))).toEqual([
    `${file}: parts[0].x: 40 is outside the frame, which is 24 pixels wide.`,
  ])
  expect(said(edit((v) => Object.assign(part(v), { y: 30 })))).toEqual([
    `${file}: parts[0].y: 30 is outside the frame, which is 24 pixels tall.`,
  ])
})

test('a figure whose sheet would be too tall', () => {
  // 16 poses and 8 variants are 144 pictures, 18 rows of 128 pixels.
  const tall = edit((v) => {
    v.frame = { w: 128, h: 128 }
    v.poses = Array.from({ length: 16 }, (_, i) => ({ id: `pose-${i}`, moves: [] }))
    v.variants = Array.from({ length: 8 }, (_, i) => ({
      id: `variant-${i}`,
      paints: [{ id: 'body', color: '#111314' }],
    }))
  })
  expect(said(tall)).toEqual([
    `${file}: poses: This figure's picture would be 2304 pixels tall. A picture can be 2048 at most: use fewer poses or variants, or a smaller frame.`,
  ])
})

test('a sheet of exactly 2048 pixels is fine', () => {
  const full = edit((v) => {
    v.frame = { w: 128, h: 128 }
    v.poses = Array.from({ length: 16 }, (_, i) => ({ id: `pose-${i}`, moves: [] }))
    v.variants = Array.from({ length: 7 }, (_, i) => ({
      id: `variant-${i}`,
      paints: [{ id: 'body', color: '#111314' }],
    }))
  })
  expect(said(full)).toEqual([])
})

test('a size, a place and a turn out of range', () => {
  expect(said(edit((v) => Object.assign(v, { tile: 2 })))).toEqual([`${file}: tile: This must be 4 or more.`])
  expect(said(edit((v) => Object.assign(part(v), { w: 0 })))).toEqual([
    `${file}: parts[0].w: This must be more than 0.`,
  ])
  expect(said(edit((v) => Object.assign(part(v), { turn: 270 })))).toEqual([
    `${file}: parts[0].turn: This must be 180 or less.`,
  ])
  expect(said(edit((v) => Object.assign(v, { frame: { w: 4, h: 200 } })))).toContain(
    `${file}: frame.h: This must be 128 or less.`,
  )
})

test('a part that is neither a block nor a round', () => {
  const wrong = edit((v) => Object.assign(part(v), { shape: 'triangle' }))
  expect(said(wrong)).toEqual([`${file}: parts[0].shape: This must be one of: block, round.`])
})

test('a missing field says what to write', () => {
  expect(said(edit((v) => delete v.frame))).toEqual([
    `${file}: frame: This is missing. Write the size of one pose in pixels, like { "w": 24, "h": 24 }.`,
  ])
  expect(said(edit((v) => delete part(v).paint))).toEqual([
    `${file}: parts[0].paint: This is missing. Write which of the paints it uses, like "body".`,
  ])
})

test('an unknown key', () =>
  expect(said(edit((v) => Object.assign(v, { light: 'left' })))).toEqual([
    `${file}: light: This is not something a figure has. Remove it or check the spelling.`,
  ]))
