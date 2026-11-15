// Small PNGs for the reader's tests, built here from their raw rows so each test can say exactly what is in the file.
// Node only: it packs the rows with `node:zlib` and takes the CRC from it. The reader itself never does either.
import { crc32, deflateSync } from 'node:zlib'

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]

const be32 = (n: number): number[] => [n >>> 24, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]

/** One chunk: length, type, data, then the CRC of the type and the data. */
export function chunk(type: string, data: ArrayLike<number>): Uint8Array {
  const body = Uint8Array.from([...[...type].map((c) => c.charCodeAt(0)), ...Array.from(data)])
  return Uint8Array.from([...be32(data.length), ...body, ...be32(crc32(body))])
}

export interface SampleOptions {
  readonly width: number
  readonly height: number
  /** Bits a channel in the header. Default 8. */
  readonly depth?: number
  /** PNG colour type: 0 grey, 2 RGB, 3 palette, 4 grey with alpha, 6 RGBA. Default 0. */
  readonly type?: number
  /** 1 writes an interlaced header. Default 0. */
  readonly interlace?: number
  /** Every scanline with its filter byte first, one after the other. */
  readonly rows: readonly number[]
  readonly palette?: readonly number[]
  readonly alphas?: readonly number[]
}

/** A whole PNG file for `options`. */
export function samplePng(options: SampleOptions): Uint8Array {
  const { width, height, depth = 8, type = 0, interlace = 0, rows, palette, alphas } = options
  const parts = [
    Uint8Array.from(SIGNATURE),
    chunk('IHDR', [...be32(width), ...be32(height), depth, type, 0, 0, interlace]),
    ...(palette ? [chunk('PLTE', palette)] : []),
    ...(alphas ? [chunk('tRNS', alphas)] : []),
    chunk('IDAT', deflateSync(Uint8Array.from(rows))),
    chunk('IEND', []),
  ]
  const file = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let at = 0
  for (const part of parts) {
    file.set(part, at)
    at += part.length
  }
  return file
}

/**
 * Five 3 by 2 grey pictures, one for each row filter: the first row is unfiltered, the second is stored with the
 * filter, and `pixels` is what the second row must read back as (worked out by hand from the PNG rules).
 */
export const FILTER_SAMPLES: readonly { name: string; file: Uint8Array; pixels: readonly number[] }[] = [
  { name: 'None', rows: [0, 10, 20, 30, 0, 4, 5, 6], pixels: [4, 5, 6] },
  { name: 'Sub', rows: [0, 10, 20, 30, 1, 5, 5, 5], pixels: [5, 10, 15] },
  { name: 'Up', rows: [0, 10, 20, 30, 2, 1, 2, 3], pixels: [11, 22, 33] },
  // Average: floor((left + above) / 2) is added. 1 + 5, then 2 + floor((6 + 20) / 2), then 3 + floor((15 + 30) / 2).
  { name: 'Average', rows: [0, 10, 20, 30, 3, 1, 2, 3], pixels: [6, 15, 25] },
  // Paeth over a flat row above, so the left neighbour wins after the first pixel: 1 + 10, 2 + 11, 3 + 13.
  { name: 'Paeth', rows: [0, 10, 10, 10, 4, 1, 2, 3], pixels: [11, 13, 16] },
].map(({ name, rows, pixels }) => ({ name, file: samplePng({ width: 3, height: 2, rows }), pixels }))
