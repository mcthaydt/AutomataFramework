// The photo library's records and files, in Node: every photo has a record, every record a file, and every file reads.
import { readdirSync } from 'node:fs'
import { expect, test } from 'vitest'
import { PHOTO_LIBRARY } from '#src/features/content/photo-library.ts'
import { decodePng } from '#src/lib/png-read.ts'
import { photoBytes } from '../../fixtures/content/photo-files.ts'

const ids = Object.keys(PHOTO_LIBRARY)

test('there are 38 photos, sorted, each with its source, licence and credit', () => {
  expect(ids).toHaveLength(38)
  expect(ids).toEqual([...ids].sort())
  for (const id of ids) {
    const record = PHOTO_LIBRARY[id]
    expect(record?.source, id).not.toBe('')
    expect(record?.licence, id).not.toBe('')
    expect(record?.credit, id).not.toBe('')
  }
})

test('the library is frozen', () => {
  expect(Object.isFrozen(PHOTO_LIBRARY)).toBe(true)
  expect(Object.isFrozen(PHOTO_LIBRARY.brick)).toBe(true)
})

test('every record has its file and every file has its record', () => {
  const files = readdirSync(new URL('../../../photos/', import.meta.url)).filter((f) => f !== 'README.md')
  expect(files.sort()).toEqual(ids.map((id) => PHOTO_LIBRARY[id]?.file).sort())
})

test('every photo reads, is at most 256 a side and has the proportions its record says', async () => {
  for (const id of ids) {
    const record = PHOTO_LIBRARY[id]
    const picture = decodePng(await photoBytes(record?.file ?? ''))
    expect(picture.width, id).toBeLessThanOrEqual(256)
    expect(picture.height, id).toBeLessThanOrEqual(256)
    const shape = picture.width / picture.height
    const wanted = (record?.size.w ?? 1) / (record?.size.h ?? 1)
    expect(Math.abs(shape / wanted - 1), id).toBeLessThan(1 / 8)
  }
})
