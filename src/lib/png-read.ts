// A PNG reader of our own, the other half of `png.ts`. A game's photos are read by `automata art` in Node, by a test in
// WebKit and by the editors on an iPad, and each must see the same pixels: so no canvas (whose colour handling and
// premultiplied alpha differ by engine) and no `node:zlib`. It takes the files a photo library is made of: 8 bits a
// channel, grey, grey with alpha, RGB, RGBA or palette (with tRNS), not interlaced. Anything else is refused with a
// sentence that says what to save it as. Every step is whole-number work on bytes.
import { InflateError, inflate } from './inflate.ts'
import { crc32 } from './png.ts'

/** A picture as RGBA: `rgba[(y * width + x) * 4]` is red, then green, blue and alpha, each 0 to 255. */
export interface RgbaPicture {
  readonly width: number
  readonly height: number
  readonly rgba: Uint8Array
}

/** A sentence a person can act on: what the file is, and what to save it as. */
export class PngError extends Error {}

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
/** A photo this many pixels over is not one a scene can use; the limit also keeps a bad header from asking for memory. */
const MAX_PIXELS = 16 * 1024 * 1024
const CUT_SHORT = 'This PNG is cut short. Save it again.'
/** Channels a pixel has in the file, by colour type. */
const CHANNELS: Readonly<Record<number, number>> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

interface Chunk {
  readonly type: string
  readonly data: Uint8Array
}

/** Every chunk up to IEND, each with its CRC checked. A file that stops early, or whose CRC is wrong, is "cut short". */
function chunksOf(bytes: Uint8Array): Chunk[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const found: Chunk[] = []
  for (let at = SIGNATURE.length; ; ) {
    if (at + 12 > bytes.length) throw new PngError(CUT_SHORT)
    const length = view.getUint32(at)
    if (at + 12 + length > bytes.length) throw new PngError(CUT_SHORT)
    if (crc32(bytes.subarray(at + 4, at + 8 + length)) !== view.getUint32(at + 8 + length))
      throw new PngError(CUT_SHORT)
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8))
    found.push({ type, data: bytes.subarray(at + 8, at + 8 + length) })
    if (type === 'IEND') return found
    at += 12 + length
  }
}

/** The PNG filters (0 to 4) undone, row by row, in `raw` (each row's filter byte first). Returns the bare rows. */
function unfilter(raw: Uint8Array, rowBytes: number, rows: number, pixelBytes: number): Uint8Array {
  const out = new Uint8Array(rowBytes * rows)
  for (let y = 0; y < rows; y++) {
    const filter = raw[y * (rowBytes + 1)] as number
    const from = y * (rowBytes + 1) + 1
    const row = y * rowBytes
    for (let x = 0; x < rowBytes; x++) {
      const left = x >= pixelBytes ? (out[row + x - pixelBytes] as number) : 0
      const above = y > 0 ? (out[row - rowBytes + x] as number) : 0
      const aboveLeft = x >= pixelBytes && y > 0 ? (out[row - rowBytes + x - pixelBytes] as number) : 0
      let value = raw[from + x] as number
      if (filter === 1) {
        value += left
      } else if (filter === 2) {
        value += above
      } else if (filter === 3) {
        value += Math.floor((left + above) / 2)
      } else if (filter === 4) {
        const guess = left + above - aboveLeft
        const toLeft = Math.abs(guess - left)
        const toAbove = Math.abs(guess - above)
        const toAboveLeft = Math.abs(guess - aboveLeft)
        if (toLeft <= toAbove && toLeft <= toAboveLeft) value += left
        else if (toAbove <= toAboveLeft) value += above
        else value += aboveLeft
      } else if (filter !== 0) {
        throw new PngError(CUT_SHORT)
      }
      out[row + x] = value & 255
    }
  }
  return out
}

/** Reads a PNG: 8 bits a channel, grey, grey with alpha, RGB, RGBA or palette (with tRNS), not interlaced. */
export function decodePng(bytes: Uint8Array): RgbaPicture {
  if (!SIGNATURE.every((b, i) => bytes[i] === b)) throw new PngError('This file is not a PNG picture.')
  const chunks = chunksOf(bytes)
  const header = chunks[0]
  if (header?.type !== 'IHDR' || header.data.length !== 13) throw new PngError(CUT_SHORT)
  const head = new DataView(header.data.buffer, header.data.byteOffset, header.data.byteLength)
  const width = head.getUint32(0)
  const height = head.getUint32(4)
  const depth = header.data[8] as number
  const type = header.data[9] as number
  const interlace = header.data[12] as number
  if (interlace !== 0) throw new PngError('This PNG is interlaced. Save it again without interlacing.')
  if (depth !== 8) throw new PngError(`This PNG has ${depth} bits a channel. Save it again with 8.`)
  const channels = CHANNELS[type]
  if (channels === undefined)
    throw new PngError('This PNG is not one the reader takes. Save it again as an ordinary picture.')
  if (width < 1 || height < 1 || width * height > MAX_PIXELS)
    throw new PngError('This PNG is too big or empty. Save it again smaller than 4096 pixels a side.')

  const palette = chunks.find((c) => c.type === 'PLTE')?.data
  const alphas = chunks.find((c) => c.type === 'tRNS')?.data
  if (type === 3 && (palette === undefined || palette.length < 3)) throw new PngError(CUT_SHORT)

  const idat = chunks.filter((c) => c.type === 'IDAT')
  const packed = new Uint8Array(idat.reduce((total, c) => total + c.data.length, 0))
  let at = 0
  for (const c of idat) {
    packed.set(c.data, at)
    at += c.data.length
  }
  const rowBytes = width * channels
  let raw: Uint8Array
  try {
    raw = inflate(packed)
  } catch (error) {
    if (error instanceof InflateError) throw new PngError(CUT_SHORT)
    throw error
  }
  if (raw.length !== (rowBytes + 1) * height) throw new PngError(CUT_SHORT)
  const pixels = unfilter(raw, rowBytes, height, channels)

  const rgba = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const from = i * channels
    const to = i * 4
    const first = pixels[from] as number
    if (type === 0 || type === 4) {
      rgba[to] = first
      rgba[to + 1] = first
      rgba[to + 2] = first
      rgba[to + 3] = type === 4 ? (pixels[from + 1] as number) : 255
    } else if (type === 2 || type === 6) {
      rgba[to] = first
      rgba[to + 1] = pixels[from + 1] as number
      rgba[to + 2] = pixels[from + 2] as number
      rgba[to + 3] = type === 6 ? (pixels[from + 3] as number) : 255
    } else {
      const colours = palette as Uint8Array
      if (first * 3 + 2 >= colours.length) throw new PngError(CUT_SHORT)
      rgba[to] = colours[first * 3] as number
      rgba[to + 1] = colours[first * 3 + 1] as number
      rgba[to + 2] = colours[first * 3 + 2] as number
      rgba[to + 3] = alphas !== undefined && first < alphas.length ? (alphas[first] as number) : 255
    }
  }
  return { width, height, rgba }
}
