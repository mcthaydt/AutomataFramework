import { expect, test } from 'vitest'
import {
  type BackdropFile,
  type BackdropLayer,
  backdropSheet,
  paintBackdrop,
} from '#src/features/content/content.ts'
import type { IndexedPicture } from '#src/lib/png.ts'

const layer = (id: string, kind: BackdropLayer['kind'], height = 4): BackdropLayer => ({
  id,
  kind,
  color: '#afd472',
  height,
  drift: 0.5,
})

const backdropOf = (layers: BackdropLayer[], change: Partial<BackdropFile> = {}): BackdropFile => ({
  format: 1,
  id: 'valley',
  seed: 7,
  tile: 8,
  width: 16,
  layers,
  props: [],
  ...change,
})

/** The pixels of one layer's strip, as rows. */
function strip(backdrop: BackdropFile, picture: IndexedPicture, id: string): number[][] {
  const frame = backdropSheet(backdrop).frames.find((f) => f.name === id)
  if (frame === undefined) throw new Error(`no strip ${id}`)
  const rows: number[][] = []
  for (let y = 0; y < frame.h; y++) {
    const row: number[] = []
    for (let x = 0; x < frame.w; x++)
      row.push(picture.pixels[(frame.y + y) * picture.width + frame.x + x] as number)
    rows.push(row)
  }
  return rows
}

const solid = (rows: number[][]): number => rows.flat().filter((place) => place !== 0).length

test('the picture is as big as the sheet, with one colour a layer after clear', () => {
  const backdrop = backdropOf([layer('a', 'flat'), layer('b', 'hills')])
  const picture = paintBackdrop(backdrop)
  const sheet = backdropSheet(backdrop)
  expect([picture.width, picture.height]).toEqual([sheet.w, sheet.h])
  expect(picture.palette).toEqual([0, 0xafd472, 0xafd472])
})

test('a flat layer fills its whole strip', () => {
  const backdrop = backdropOf([layer('band', 'flat', 2)])
  const rows = strip(backdrop, paintBackdrop(backdrop), 'band')
  expect(rows).toHaveLength(16)
  expect(solid(rows)).toBe(16 * 8 * 16)
})

test('hills reach the bottom row of their strip and leave room above', () => {
  const backdrop = backdropOf([layer('hills', 'hills', 6)])
  const rows = strip(backdrop, paintBackdrop(backdrop), 'hills')
  const bottom = rows[rows.length - 1] as number[]
  expect(bottom.every((place) => place === 1)).toBe(true)
  expect(rows[0]?.some((place) => place === 0)).toBe(true)
  // Hills are solid from their edge down: no hole under a painted pixel.
  for (let x = 0; x < 16 * 8; x++) {
    let seen = false
    for (const row of rows) {
      if (row[x] === 1) seen = true
      else expect(seen).toBe(false)
    }
  }
})

test('hills and mountains meet themselves where the strip repeats', () => {
  for (const kind of ['hills', 'mountains'] as const) {
    const backdrop = backdropOf([layer('far', kind, 6)])
    const rows = strip(backdrop, paintBackdrop(backdrop), 'far')
    const height = (x: number): number => rows.filter((row) => row[x] === 1).length
    const last = (rows[0] as number[]).length - 1
    // The step across the join is no bigger than the steepest step inside the strip (and one more for rounding).
    let steepest = 0
    for (let x = 0; x < last; x++) steepest = Math.max(steepest, Math.abs(height(x + 1) - height(x)))
    expect(Math.abs(height(0) - height(last))).toBeLessThanOrEqual(steepest + 1)
  }
})

test('mountains fill at least a sixth of their strip', () => {
  const backdrop = backdropOf([layer('far', 'mountains', 6)])
  const rows = strip(backdrop, paintBackdrop(backdrop), 'far')
  expect(solid(rows) / (rows.length * (rows[0]?.length ?? 1))).toBeGreaterThanOrEqual(0.15)
})

test('clouds are not painted on the bottom row of their strip', () => {
  const backdrop = backdropOf([layer('sky', 'clouds', 6)])
  const rows = strip(backdrop, paintBackdrop(backdrop), 'sky')
  expect(solid(rows)).toBeGreaterThan(0)
  expect((rows[rows.length - 1] as number[]).every((place) => place === 0)).toBe(true)
})

test('the same file gives the same picture, and another seed gives another', () => {
  const backdrop = backdropOf([layer('far', 'mountains', 6), layer('sky', 'clouds', 6)])
  expect(paintBackdrop(backdrop)).toEqual(paintBackdrop(backdrop))
  expect(paintBackdrop({ ...backdrop, seed: 8 }).pixels).not.toEqual(paintBackdrop(backdrop).pixels)
})

test('renaming a layer repaints that layer and no other', () => {
  const before = backdropOf([layer('far', 'mountains', 6), layer('near', 'hills', 6)])
  const after = backdropOf([layer('far', 'mountains', 6), layer('close', 'hills', 6)])
  const one = paintBackdrop(before)
  const two = paintBackdrop(after)
  expect(strip(after, two, 'far')).toEqual(strip(before, one, 'far'))
  expect(strip(after, two, 'close')).not.toEqual(strip(before, one, 'near'))
})

test('a layer a fraction of a tile tall is still one pixel tall', () => {
  const backdrop = backdropOf([layer('line', 'flat', 0.01)])
  const rows = strip(backdrop, paintBackdrop(backdrop), 'line')
  expect(rows).toHaveLength(1)
  expect(solid(rows)).toBe(16 * 8)
})
