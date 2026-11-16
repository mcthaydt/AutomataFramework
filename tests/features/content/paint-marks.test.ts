import { expect, test } from 'vitest'
import { badge, badgeSize, fill, line, ring } from '#src/features/content/paint-marks.ts'
import { createPicture, type Picture } from '#src/features/content/pixels.ts'

/** A picture of `width` by `height` with the palette 0 clear, 1 paper and 2 ink. */
const blank = (width: number, height: number): Picture =>
  createPicture(width, height, [0, 0xffffff, 0x000000])

/** One string per row: `.` is clear and anything else is the number of its place in the palette. */
function rows(picture: Picture): string[] {
  const out: string[] = []
  for (let y = 0; y < picture.height; y++) {
    let text = ''
    for (let x = 0; x < picture.width; x++) text += picture.get(x, y) === 0 ? '.' : String(picture.get(x, y))
    out.push(text)
  }
  return out
}

test('a horizontal line paints both ends and every pixel between', () => {
  const picture = blank(6, 1)
  line(picture, 1, 0, 4, 0, 2)
  expect(rows(picture)).toEqual(['.2222.'])
})

test('a vertical line, drawn from the bottom to the top, is the same line', () => {
  const picture = blank(1, 5)
  line(picture, 0, 3, 0, 1, 2)
  expect(rows(picture)).toEqual(['.', '2', '2', '2', '.'])
})

test('a steep line steps one pixel across for every two or three down', () => {
  const picture = blank(3, 6)
  line(picture, 0, 0, 2, 5, 2)
  expect(rows(picture)).toEqual(['2..', '2..', '.2.', '.2.', '..2', '..2'])
  const back = blank(3, 6)
  line(back, 2, 5, 0, 0, 2)
  expect(rows(back)).toEqual(rows(picture))
})

test('a line that leaves the picture is cut off, and a line of one pixel is one pixel', () => {
  const picture = blank(3, 1)
  line(picture, 1, 0, 8, 0, 2)
  expect(rows(picture)).toEqual(['.22'])
  const dot = blank(3, 3)
  line(dot, 1, 1, 1, 1, 2)
  expect(rows(dot)).toEqual(['...', '.2.', '...'])
})

test('a ring of radius 3 is a circle one pixel wide, with its middle left clear', () => {
  const picture = blank(7, 7)
  ring(picture, 3, 3, 3, 2)
  expect(rows(picture)).toEqual(['..222..', '.2...2.', '2.....2', '2.....2', '2.....2', '.2...2.', '..222..'])
})

test('a ring of no radius is one pixel, and one that runs off the edge is cut off', () => {
  const dot = blank(3, 3)
  ring(dot, 1, 1, 0, 2)
  expect(rows(dot)).toEqual(['...', '.2.', '...'])
  const cut = blank(4, 4)
  ring(cut, 0, 0, 2, 2)
  expect(cut.get(2, 0)).toBe(2)
  expect(cut.get(0, 2)).toBe(2)
  expect(cut.get(2, 2)).toBe(0)
})

test('fill paints a box and nothing outside it', () => {
  const picture = blank(4, 3)
  fill(picture, { x: 1, y: 1, w: 2, h: 2 }, 2)
  expect(rows(picture)).toEqual(['....', '.22.', '.22.'])
})

/** The digits as the badge draws them inside its paper: `#` is ink. */
const DIGITS = [
  ['###', '#.#', '#.#', '#.#', '###'],
  ['.#.', '##.', '.#.', '.#.', '###'],
  ['###', '..#', '###', '#..', '###'],
  ['###', '..#', '###', '..#', '###'],
  ['#.#', '#.#', '###', '..#', '..#'],
  ['###', '#..', '###', '..#', '###'],
  ['###', '#..', '###', '#.#', '###'],
  ['###', '..#', '..#', '..#', '..#'],
  ['###', '#.#', '###', '#.#', '###'],
  ['###', '#.#', '###', '..#', '###'],
]

test('each digit is three pixels wide and five tall, on paper one pixel bigger all round', () => {
  for (let digit = 0; digit < 10; digit++) {
    const picture = blank(5, 7)
    expect(badge(picture, 0, 0, digit, 2, 1)).toEqual({ w: 5, h: 7 })
    const glyph = (DIGITS[digit] as string[]).map(
      (row) => `1${row.replaceAll('#', '2').replaceAll('.', '1')}1`,
    )
    expect(rows(picture), `the digit ${digit}`).toEqual(['11111', ...glyph, '11111'])
  }
})

test('the number 12 is two digits with one pixel of paper between them', () => {
  const picture = blank(9, 7)
  expect(badge(picture, 0, 0, 12, 2, 1)).toEqual({ w: 9, h: 7 })
  expect(rows(picture)).toEqual([
    '111111111',
    '112112221',
    '122111121',
    '112112221',
    '112112111',
    '122212221',
    '111111111',
  ])
})

test('a badge at a place, and a badge made twice as big', () => {
  const picture = blank(12, 16)
  const size = badge(picture, 1, 2, 7, 2, 1, 2)
  expect(size).toEqual(badgeSize(7, 2))
  expect(size).toEqual({ w: 10, h: 14 })
  // The top of the seven is a row of ink, three digit pixels wide and two tall: columns 3 to 8, rows 4 and 5.
  for (const y of [4, 5]) for (let x = 3; x <= 8; x++) expect(picture.get(x, y), `${x},${y}`).toBe(2)
  // The paper is round it, and nothing is painted outside the box.
  expect(picture.get(1, 2)).toBe(1)
  expect(picture.get(0, 2)).toBe(0)
  expect(picture.get(11, 2)).toBe(0)
})
