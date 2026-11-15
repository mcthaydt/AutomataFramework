// zlib's inflate (RFC 1950 around RFC 1951), of our own. `node:zlib` is Node only and a browser's own decompressor is
// asynchronous and not the same code in every engine; this is whole-number work on bytes, so a photo unpacks to the
// same pixels on a server, in a test and on an iPad. It follows the shape of zlib's own `puff.c`: a canonical Huffman
// code is decoded one bit at a time against a count of codes of each length.
import { adler32, DISTANCE_BASE, DISTANCE_EXTRA, LENGTH_BASE, LENGTH_EXTRA } from './png.ts'

/** Thrown when a zlib stream is cut short, is not zlib, or does not add up. The message says which. */
export class InflateError extends Error {}

const MAX_BITS = 15
/** The most bytes a stream may unpack to, so a small file cannot ask for all the memory there is. */
const MAX_OUTPUT = 0x10000000
/** The order a dynamic block lists the lengths of its code-length code (RFC 1951, 3.2.7). */
// biome-ignore format: kept in the order and width the RFC prints it
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]

// --- The bits, lowest first ----------------------------------------------------------------------------------------

class BitReader {
  private readonly bytes: Uint8Array
  private at: number
  private held = 0
  private count = 0
  constructor(bytes: Uint8Array, at: number) {
    this.bytes = bytes
    this.at = at
  }

  /** The next `n` bits (0 to 16) as a number, the first one read being the lowest. */
  bits(n: number): number {
    while (this.count < n) {
      if (this.at >= this.bytes.length) throw new InflateError('The compressed data is cut short.')
      this.held |= (this.bytes[this.at++] as number) << this.count
      this.count += 8
    }
    const value = this.held & ((1 << n) - 1)
    this.held >>>= n
    this.count -= n
    return value
  }

  /** Drops the bits left in the byte being read, so the next read starts on a byte. */
  align(): void {
    const drop = this.count % 8
    this.held >>>= drop
    this.count -= drop
  }
}

// --- Huffman codes --------------------------------------------------------------------------------------------------

/** A canonical code: how many symbols have each length, and the symbols in code order. */
interface Code {
  readonly counts: Uint16Array
  readonly symbols: Uint16Array
}

function codeOf(lengths: ArrayLike<number>): Code {
  const counts = new Uint16Array(MAX_BITS + 1)
  for (let i = 0; i < lengths.length; i++) {
    const len = lengths[i] as number
    counts[len] = (counts[len] as number) + 1
  }
  // A code with more symbols of a length than that length has room for cannot be decoded.
  let left = 1
  for (let len = 1; len <= MAX_BITS; len++) {
    left = left * 2 - (counts[len] as number)
    if (left < 0) throw new InflateError('The compressed data has a code that cannot be read.')
  }
  const offsets = new Uint16Array(MAX_BITS + 2)
  for (let len = 1; len <= MAX_BITS; len++) {
    offsets[len + 1] = (offsets[len] as number) + (counts[len] as number)
  }
  const symbols = new Uint16Array(lengths.length)
  for (let symbol = 0; symbol < lengths.length; symbol++) {
    const len = lengths[symbol] as number
    if (len !== 0) {
      symbols[offsets[len] as number] = symbol
      offsets[len] = (offsets[len] as number) + 1
    }
  }
  return { counts, symbols }
}

/** The next symbol of `code`. */
function decode(reader: BitReader, code: Code): number {
  let value = 0
  let first = 0
  let index = 0
  for (let len = 1; len <= MAX_BITS; len++) {
    value |= reader.bits(1)
    const count = code.counts[len] as number
    if (value - count < first) return code.symbols[index + (value - first)] as number
    index += count
    first += count
    first *= 2
    value *= 2
  }
  throw new InflateError('The compressed data has a code that cannot be read.')
}

const FIXED_LITERALS: Code = (() => {
  const lengths = new Uint8Array(288)
  lengths.fill(8, 0, 144)
  lengths.fill(9, 144, 256)
  lengths.fill(7, 256, 280)
  lengths.fill(8, 280, 288)
  return codeOf(lengths)
})()
const FIXED_DISTANCES: Code = codeOf(new Uint8Array(30).fill(5))

// --- The output ----------------------------------------------------------------------------------------------------

class Output {
  bytes = new Uint8Array(1024)
  length = 0

  push(byte: number): void {
    if (this.length === this.bytes.length) this.grow(this.length + 1)
    this.bytes[this.length++] = byte
  }

  private grow(least: number): void {
    if (least > MAX_OUTPUT)
      throw new InflateError('The compressed data unpacks to more than a picture can be.')
    const bigger = new Uint8Array(Math.min(MAX_OUTPUT, Math.max(least, this.bytes.length * 2)))
    bigger.set(this.bytes.subarray(0, this.length))
    this.bytes = bigger
  }
}

// --- Blocks --------------------------------------------------------------------------------------------------------

function stored(reader: BitReader, out: Output): void {
  reader.align()
  const length = reader.bits(16)
  if (reader.bits(16) !== (~length & 0xffff))
    throw new InflateError('A stored block has a length that does not match.')
  for (let i = 0; i < length; i++) out.push(reader.bits(8))
}

function codes(reader: BitReader, out: Output, literals: Code, distances: Code): void {
  for (;;) {
    const symbol = decode(reader, literals)
    if (symbol < 256) {
      out.push(symbol)
    } else if (symbol === 256) {
      return
    } else {
      const lengthSymbol = symbol - 257
      if (lengthSymbol >= LENGTH_BASE.length)
        throw new InflateError('The compressed data has a length that is not one.')
      const length = (LENGTH_BASE[lengthSymbol] as number) + reader.bits(LENGTH_EXTRA[lengthSymbol] as number)
      const distanceSymbol = decode(reader, distances)
      if (distanceSymbol >= DISTANCE_BASE.length)
        throw new InflateError('The compressed data has a distance that is not one.')
      const extra = reader.bits(DISTANCE_EXTRA[distanceSymbol] as number)
      const distance = (DISTANCE_BASE[distanceSymbol] as number) + extra
      if (distance > out.length)
        throw new InflateError('The compressed data copies from before its own start.')
      // One byte at a time on purpose: a copy may overlap what it is writing, and that is how a run is made.
      for (let i = 0; i < length; i++) out.push(out.bytes[out.length - distance] as number)
    }
  }
}

function dynamic(reader: BitReader, out: Output): void {
  const literalCount = reader.bits(5) + 257
  const distanceCount = reader.bits(5) + 1
  const lengthCount = reader.bits(4) + 4
  if (literalCount > 286 || distanceCount > 30)
    throw new InflateError('The compressed data has too many codes.')
  const lengthLengths = new Uint8Array(19)
  for (let i = 0; i < lengthCount; i++) lengthLengths[CODE_LENGTH_ORDER[i] as number] = reader.bits(3)
  const lengthCode = codeOf(lengthLengths)
  const lengths = new Uint8Array(literalCount + distanceCount)
  for (let at = 0; at < lengths.length; ) {
    const symbol = decode(reader, lengthCode)
    if (symbol < 16) {
      lengths[at++] = symbol
      continue
    }
    let repeat: number
    let value = 0
    if (symbol === 16) {
      if (at === 0) throw new InflateError('The compressed data repeats a length that is not there.')
      value = lengths[at - 1] as number
      repeat = 3 + reader.bits(2)
    } else if (symbol === 17) {
      repeat = 3 + reader.bits(3)
    } else {
      repeat = 11 + reader.bits(7)
    }
    if (at + repeat > lengths.length)
      throw new InflateError('The compressed data has more codes than it said.')
    lengths.fill(value, at, at + repeat)
    at += repeat
  }
  if (lengths[256] === 0) throw new InflateError('The compressed data has no way to end a block.')
  codes(reader, out, codeOf(lengths.subarray(0, literalCount)), codeOf(lengths.subarray(literalCount)))
}

/**
 * The bytes a zlib stream (RFC 1950) unpacks to: stored, fixed-code and dynamic-code blocks, and the Adler-32 at the
 * end checked. Throws `InflateError`, with a sentence that says what is wrong, when the stream is cut short or wrong.
 */
export function inflate(zlib: Uint8Array): Uint8Array {
  if (zlib.length < 2) throw new InflateError('The compressed data is cut short.')
  const method = (zlib[0] as number) & 15
  if (method !== 8 || (((zlib[0] as number) << 8) | (zlib[1] as number)) % 31 !== 0)
    throw new InflateError('The data is not zlib compressed.')
  if ((zlib[1] as number) & 32)
    throw new InflateError('The compressed data needs a dictionary it does not have.')
  const reader = new BitReader(zlib, 2)
  const out = new Output()
  let last: number
  do {
    last = reader.bits(1)
    const type = reader.bits(2)
    if (type === 0) stored(reader, out)
    else if (type === 1) codes(reader, out, FIXED_LITERALS, FIXED_DISTANCES)
    else if (type === 2) dynamic(reader, out)
    else throw new InflateError('The compressed data has a block of a kind that does not exist.')
  } while (!last)
  reader.align()
  let sum = 0
  for (let i = 0; i < 4; i++) sum = sum * 256 + reader.bits(8)
  const bytes = out.bytes.slice(0, out.length)
  if (sum !== adler32(bytes)) throw new InflateError('The compressed data does not add up.')
  return bytes
}
