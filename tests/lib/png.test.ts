// The PNG writer, in Node. `node:zlib` is used here only to read our stream back; the writer itself never touches it.
import { crc32, inflateSync } from 'node:zlib'
import { expect, test } from 'vitest'
import { createRng } from '#src/features/sim/sim.ts'
import { encodePng } from '#src/lib/png.ts'

const two = { width: 2, height: 2, palette: [0, 0x111314, 0xfdd4bd], pixels: Uint8Array.of(0, 1, 2, 1) }

/** Every chunk of a PNG: its type and its data, in order. */
function chunks(png: Uint8Array): { type: string; data: Uint8Array; crc: number }[] {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const found: { type: string; data: Uint8Array; crc: number }[] = []
  for (let at = 8; at < png.length; ) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8))
    found.push({
      type,
      data: png.subarray(at + 8, at + 8 + length),
      crc: view.getUint32(at + 8 + length),
    })
    at += 12 + length
  }
  return found
}

const chunkNames = (png: Uint8Array): string[] => chunks(png).map((c) => c.type)
const chunk = (png: Uint8Array, type: string): Uint8Array =>
  chunks(png).find((c) => c.type === type)?.data ?? new Uint8Array(0)

test('the file starts as a PNG does and ends with IEND', () => {
  const png = encodePng(two)
  expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  expect(chunkNames(png)).toEqual(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'])
})

test('the header says 2 by 2, eight bits, indexed colour', () => {
  const header = chunk(encodePng(two), 'IHDR')
  expect([...header]).toEqual([0, 0, 0, 2, 0, 0, 0, 2, 8, 3, 0, 0, 0])
})

test('the palette is three bytes a colour, with the clear one first, and only the clear one is clear', () => {
  const png = encodePng(two)
  expect([...chunk(png, 'PLTE')]).toEqual([0, 0, 0, 0x11, 0x13, 0x14, 0xfd, 0xd4, 0xbd])
  expect([...chunk(png, 'tRNS')]).toEqual([0])
})

test('zlib reads our stream back to the rows we gave', () => {
  expect([...inflateSync(chunk(encodePng(two), 'IDAT'))]).toEqual([0, 0, 1, 0, 2, 1])
})

test('every chunk carries the checksum a reader works out', () => {
  const png = encodePng(two)
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  let at = 8
  for (const { type, data, crc } of chunks(png)) {
    const typeAndData = png.subarray(at + 4, at + 8 + data.length)
    expect(crc, type).toBe(crc32(typeAndData))
    at += 12 + view.getUint32(at)
  }
})

test('a wide flat picture is small', () => {
  const flat = { width: 512, height: 256, palette: [0, 0xafd472], pixels: new Uint8Array(512 * 256).fill(1) }
  const png = encodePng(flat)
  expect(png.length).toBeLessThan(2000)
  expect(inflateSync(chunk(png, 'IDAT')).length).toBe(513 * 256)
})

test('a picture of noise still reads back', () => {
  const rng = createRng(7)
  const pixels = Uint8Array.from({ length: 64 * 64 }, () => rng.int(5))
  const png = encodePng({ width: 64, height: 64, palette: [0, 1, 2, 3, 4], pixels })
  const rows = new Uint8Array(65 * 64)
  for (let y = 0; y < 64; y++) rows.set(pixels.subarray(y * 64, (y + 1) * 64), y * 65 + 1)
  expect([...inflateSync(chunk(png, 'IDAT'))]).toEqual([...rows])
})

test('a picture with runs in both directions still reads back', () => {
  // Rows that repeat the row above, a long run along a row, and a break in each: every kind of match.
  const width = 40
  const height = 12
  const pixels = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const band = x < 25 ? 1 : 2
      pixels[y * width + x] = y < 6 ? band : (x + y) % 3
    }
  }
  pixels[3 * width + 7] = 3
  const png = encodePng({ width, height, palette: [0, 1, 2, 3], pixels })
  const rows = new Uint8Array((width + 1) * height)
  for (let y = 0; y < height; y++) rows.set(pixels.subarray(y * width, (y + 1) * width), y * (width + 1) + 1)
  expect([...inflateSync(chunk(png, 'IDAT'))]).toEqual([...rows])
})

test('the same picture is the same bytes twice', () => {
  expect([...encodePng(two)]).toEqual([...encodePng(two)])
})

test.each([
  [{ ...two, width: 0 }, 'A picture must be 1 to 4096 pixels wide. This one is 0.'],
  [{ ...two, height: 5000 }, 'A picture must be 1 to 4096 pixels tall. This one is 5000.'],
  [{ ...two, pixels: Uint8Array.of(0, 1, 2) }, 'A picture 2 by 2 needs 4 pixels. This one has 3.'],
  [
    { ...two, pixels: Uint8Array.of(0, 1, 2, 3) },
    'A pixel uses colour 3, but the palette has 3 colours, 0 to 2.',
  ],
  [
    { ...two, palette: Array.from({ length: 300 }, () => 0) },
    'A picture needs 1 to 256 colours, counting the clear one. This one has 300.',
  ],
])('a picture that cannot be written says why', (picture, message) => {
  expect(() => encodePng(picture)).toThrow(message)
  expect(() => encodePng(picture)).toThrow(RangeError)
})
