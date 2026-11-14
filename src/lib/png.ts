// A PNG writer of our own. A game's pictures are painted by `automata art`, by a test in WebKit and, in the editors, by
// a page on an iPad, and each must give the same bytes: so no canvas, no `node:zlib` (whose output may change with a
// version of Node) and no package. Every step below is whole-number work on bytes with one way to make each choice.
//
// The file is the 8-byte signature and the chunks IHDR, PLTE, tRNS, one IDAT and IEND. The picture is indexed (colour
// type 3): entry 0 of the palette is clear and every other entry is solid, which is all a pixel-art game needs and
// keeps the file small. The IDAT is a zlib stream of one deflate block with the fixed Huffman codes (RFC 1951,
// 3.2.6), made greedily from matches at two distances only: the byte before, and the same place one row up.

/** A picture as numbers: `pixels[y * width + x]` is a place in `palette`; 0 is always clear. */
export interface IndexedPicture {
  readonly width: number
  readonly height: number
  /** `0xrrggbb`; `palette[0]` is ignored, because colour 0 is clear. At most 256 entries. */
  readonly palette: readonly number[]
  /** `width * height` numbers, each a place in `palette`. */
  readonly pixels: Uint8Array
}

const MAX_SIDE = 4096
const MAX_COLOURS = 256
const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]

// --- Checksums ------------------------------------------------------------------------------------------------------

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

/** CRC-32 of `bytes`, which PNG puts after each chunk's type and data. */
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const byte of bytes) c = (CRC_TABLE[(c ^ byte) & 0xff] as number) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Adler-32 of `bytes`, which ends a zlib stream. */
function adler32(bytes: Uint8Array): number {
  let a = 1
  let b = 0
  for (const byte of bytes) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

// --- A stream of bits, filled from the low bit of each byte (RFC 1951, 3.1.1) ---------------------------------------

class BitWriter {
  private bytes = new Uint8Array(1024)
  private length = 0
  private held = 0
  private count = 0

  /** Writes the low `n` bits of `value`, lowest first. `n` is at most 13. */
  bits(value: number, n: number): void {
    this.held |= value << this.count
    this.count += n
    while (this.count >= 8) {
      this.push(this.held & 0xff)
      this.held >>>= 8
      this.count -= 8
    }
  }

  /** Writes a Huffman code, which goes highest bit first, so it is turned round to go in lowest first. */
  code(code: number, n: number): void {
    let turned = 0
    for (let i = 0; i < n; i++) turned |= ((code >>> i) & 1) << (n - 1 - i)
    this.bits(turned, n)
  }

  /** The bytes written, with the last byte filled up with zeros. */
  finish(): Uint8Array {
    if (this.count > 0) this.push(this.held & 0xff)
    this.held = 0
    this.count = 0
    return this.bytes.slice(0, this.length)
  }

  private push(byte: number): void {
    if (this.length === this.bytes.length) {
      const bigger = new Uint8Array(this.bytes.length * 2)
      bigger.set(this.bytes)
      this.bytes = bigger
    }
    this.bytes[this.length++] = byte
  }
}

// --- Deflate, one block, fixed codes --------------------------------------------------------------------------------

/** The first length each length symbol (257 to 285) stands for, and how many extra bits follow it. */
// biome-ignore format: the tables are kept in the order and width RFC 1951 prints them
const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258]
// biome-ignore format: see above
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
/** The first distance each distance symbol (0 to 29) stands for, and how many extra bits follow it. */
// biome-ignore format: see above
const DISTANCE_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577]
// biome-ignore format: see above
const DISTANCE_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
const MIN_MATCH = 3
const MAX_MATCH = 258

/** Writes one symbol with the fixed codes: 0 to 143 in 8 bits, 144 to 255 in 9, 256 to 279 in 7, 280 to 287 in 8. */
function symbol(out: BitWriter, value: number): void {
  if (value < 144) out.code(0x30 + value, 8)
  else if (value < 256) out.code(0x190 + (value - 144), 9)
  else if (value < 280) out.code(value - 256, 7)
  else out.code(0xc0 + (value - 280), 8)
}

/** The last place in `table` whose first number is not more than `value`. */
function placeOf(table: readonly number[], value: number): number {
  let place = 0
  for (let i = 0; i < table.length; i++) if ((table[i] as number) <= value) place = i
  return place
}

/** How many bytes from `at` repeat the bytes `distance` before them, at most `MAX_MATCH`. */
function matchLength(raw: Uint8Array, at: number, distance: number): number {
  if (distance < 1 || at < distance) return 0
  const most = Math.min(MAX_MATCH, raw.length - at)
  let n = 0
  while (n < most && raw[at + n] === raw[at + n - distance]) n++
  return n
}

/**
 * A zlib stream of `raw`: header, one final block with the fixed codes, then Adler-32. At each byte the longest match
 * of 3 to 258 bytes at distance 1 or at `rowLength` (the same place one row up) is taken, distance 1 when they tie;
 * a match under 3 bytes is just the byte.
 */
function zlib(raw: Uint8Array, rowLength: number): Uint8Array {
  const out = new BitWriter()
  out.bits(0x78, 8)
  out.bits(0x01, 8)
  out.bits(1, 1) // the last block
  out.bits(1, 2) // fixed Huffman codes
  let at = 0
  while (at < raw.length) {
    const before = matchLength(raw, at, 1)
    const above = matchLength(raw, at, rowLength)
    const length = Math.max(before, above)
    if (length < MIN_MATCH) {
      symbol(out, raw[at] as number)
      at++
      continue
    }
    const distance = before >= above ? 1 : rowLength
    const lengthSymbol = placeOf(LENGTH_BASE, length)
    symbol(out, 257 + lengthSymbol)
    out.bits(length - (LENGTH_BASE[lengthSymbol] as number), LENGTH_EXTRA[lengthSymbol] as number)
    const distanceSymbol = placeOf(DISTANCE_BASE, distance)
    out.code(distanceSymbol, 5)
    out.bits(distance - (DISTANCE_BASE[distanceSymbol] as number), DISTANCE_EXTRA[distanceSymbol] as number)
    at += length
  }
  symbol(out, 256)
  const body = out.finish()
  const stream = new Uint8Array(body.length + 4)
  stream.set(body)
  const sum = adler32(raw)
  stream.set([sum >>> 24, (sum >>> 16) & 0xff, (sum >>> 8) & 0xff, sum & 0xff], body.length)
  return stream
}

// --- The file -------------------------------------------------------------------------------------------------------

/** Four bytes, most significant first. */
function be32(n: number): number[] {
  return [n >>> 24, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
}

/** One chunk: its length, its four-letter type, its data and the CRC-32 of the type and the data. */
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  out.set(be32(data.length), 0)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  out.set(be32(crc32(out.subarray(4, 8 + data.length))), 8 + data.length)
  return out
}

/** Throws a `RangeError` with a plain sentence when the picture cannot be written. */
function check(picture: IndexedPicture): void {
  const { width, height, palette, pixels } = picture
  if (!Number.isInteger(width) || width < 1 || width > MAX_SIDE)
    throw new RangeError(`A picture must be 1 to ${MAX_SIDE} pixels wide. This one is ${width}.`)
  if (!Number.isInteger(height) || height < 1 || height > MAX_SIDE)
    throw new RangeError(`A picture must be 1 to ${MAX_SIDE} pixels tall. This one is ${height}.`)
  if (palette.length < 1 || palette.length > MAX_COLOURS)
    throw new RangeError(
      `A picture needs 1 to ${MAX_COLOURS} colours, counting the clear one. This one has ${palette.length}.`,
    )
  if (pixels.length !== width * height)
    throw new RangeError(
      `A picture ${width} by ${height} needs ${width * height} pixels. This one has ${pixels.length}.`,
    )
  for (const pixel of pixels)
    if (pixel >= palette.length)
      throw new RangeError(
        `A pixel uses colour ${pixel}, but the palette has ${palette.length} colours, 0 to ${palette.length - 1}.`,
      )
}

/** The bytes of a PNG for `picture`. The same picture is the same bytes in every engine. */
export function encodePng(picture: IndexedPicture): Uint8Array {
  check(picture)
  const { width, height, palette, pixels } = picture

  const rowLength = width + 1
  const raw = new Uint8Array(rowLength * height)
  for (let y = 0; y < height; y++) raw.set(pixels.subarray(y * width, (y + 1) * width), y * rowLength + 1)

  const header = new Uint8Array([...be32(width), ...be32(height), 8, 3, 0, 0, 0])
  const colours = new Uint8Array(palette.length * 3)
  palette.forEach((rgb, i) => {
    if (i === 0) return
    colours.set([(rgb >>> 16) & 0xff, (rgb >>> 8) & 0xff, rgb & 0xff], i * 3)
  })
  const parts = [
    Uint8Array.from(SIGNATURE),
    chunk('IHDR', header),
    chunk('PLTE', colours),
    chunk('tRNS', Uint8Array.of(0)),
    chunk('IDAT', zlib(raw, rowLength)),
    chunk('IEND', new Uint8Array(0)),
  ]
  const file = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let at = 0
  for (const part of parts) {
    file.set(part, at)
    at += part.length
  }
  return file
}
