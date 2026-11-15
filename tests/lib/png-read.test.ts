// The PNG reader, in Node. It reads what our own writer writes and the five row filters, and it answers with a sentence a
// person can act on for a file it will not take.
import { expect, test } from 'vitest'
import { decodePng, PngError } from '#src/lib/png-read.ts'
import { encodePng } from '#src/lib/png.ts'
import { chunk, FILTER_SAMPLES, samplePng } from '../fixtures/content/png-samples.ts'

test('what our writer writes reads back as the same pixels, a clear one included', () => {
  // 3 by 2: clear, red, blue / blue, clear, red.
  const picture = {
    width: 3,
    height: 2,
    palette: [0, 0xff0000, 0x0000ff],
    pixels: Uint8Array.of(0, 1, 2, 2, 0, 1),
  }
  const read = decodePng(encodePng(picture))
  expect([read.width, read.height]).toEqual([3, 2])
  expect([...read.rgba]).toEqual([
    ...[0, 0, 0, 0],
    ...[255, 0, 0, 255],
    ...[0, 0, 255, 255],
    ...[0, 0, 255, 255],
    ...[0, 0, 0, 0],
    ...[255, 0, 0, 255],
  ])
})

for (const sample of FILTER_SAMPLES) {
  test(`the ${sample.name} row filter reads back`, () => {
    const read = decodePng(sample.file)
    const second = [...read.rgba].filter((_, i) => i % 4 === 0).slice(3)
    expect(second).toEqual([...sample.pixels])
    expect(read.rgba[3]).toBe(255)
  })
}

test('grey, grey with alpha, RGB and RGBA are all read as RGBA', () => {
  const grey = decodePng(samplePng({ width: 2, height: 1, type: 0, rows: [0, 7, 9] }))
  expect([...grey.rgba]).toEqual([7, 7, 7, 255, 9, 9, 9, 255])
  const greyAlpha = decodePng(samplePng({ width: 1, height: 1, type: 4, rows: [0, 7, 100] }))
  expect([...greyAlpha.rgba]).toEqual([7, 7, 7, 100])
  const rgb = decodePng(samplePng({ width: 1, height: 1, type: 2, rows: [0, 1, 2, 3] }))
  expect([...rgb.rgba]).toEqual([1, 2, 3, 255])
  const rgba = decodePng(samplePng({ width: 1, height: 1, type: 6, rows: [0, 1, 2, 3, 4] }))
  expect([...rgba.rgba]).toEqual([1, 2, 3, 4])
})

test('a palette picture takes its alpha from tRNS, and is solid where tRNS stops', () => {
  const read = decodePng(
    samplePng({ width: 2, height: 1, type: 3, rows: [0, 0, 1], palette: [9, 8, 7, 1, 2, 3], alphas: [0] }),
  )
  expect([...read.rgba]).toEqual([9, 8, 7, 0, 1, 2, 3, 255])
})

test('a palette index the palette does not have is refused', () => {
  const file = samplePng({ width: 1, height: 1, type: 3, rows: [0, 5], palette: [9, 8, 7] })
  expect(() => decodePng(file)).toThrow('This PNG is cut short. Save it again.')
})

test('bytes that are not a PNG are refused with a sentence', () => {
  expect(() => decodePng(new TextEncoder().encode('hello there, this is text'))).toThrow(PngError)
  expect(() => decodePng(new TextEncoder().encode('hello there, this is text'))).toThrow(
    'This file is not a PNG picture.',
  )
  expect(() => decodePng(Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46))).toThrow(
    'This file is not a PNG picture.',
  )
  expect(() => decodePng(new Uint8Array(0))).toThrow('This file is not a PNG picture.')
})

test('an interlaced PNG is refused', () => {
  const file = samplePng({ width: 1, height: 1, interlace: 1, rows: [0, 1] })
  expect(() => decodePng(file)).toThrow('This PNG is interlaced. Save it again without interlacing.')
})

test('16 bits a channel is refused', () => {
  const file = samplePng({ width: 1, height: 1, depth: 16, rows: [0, 1, 2] })
  expect(() => decodePng(file)).toThrow('This PNG has 16 bits a channel. Save it again with 8.')
})

test('a file cut in the middle of its data is refused', () => {
  const file = samplePng({ width: 3, height: 2, rows: [0, 1, 2, 3, 0, 4, 5, 6] })
  expect(() => decodePng(file.subarray(0, file.length - 20))).toThrow('This PNG is cut short. Save it again.')
})

test('a wrong CRC is refused with the same sentence', () => {
  const file = samplePng({ width: 3, height: 2, rows: [0, 1, 2, 3, 0, 4, 5, 6] })
  const broken = file.slice()
  broken[45] = (broken[45] as number) ^ 0xff
  expect(() => decodePng(broken)).toThrow('This PNG is cut short. Save it again.')
})

test('a file with no picture data is refused', () => {
  const header = samplePng({ width: 1, height: 1, rows: [0, 1] }).subarray(0, 8 + 25)
  const file = Uint8Array.from([...header, ...chunk('IEND', [])])
  expect(() => decodePng(file)).toThrow('This PNG is cut short. Save it again.')
})
