// The inflate of our own, in Node. `node:zlib` is used here only to make streams to read; `inflate` never touches it.
import { constants, deflateSync } from 'node:zlib'
import { expect, test } from 'vitest'
import { InflateError, inflate } from '#src/lib/inflate.ts'

const text = (bytes: Uint8Array): string => new TextDecoder().decode(bytes)
const bytesOf = (s: string): Uint8Array => new TextEncoder().encode(s)
/** The type of the first block of a zlib stream: 0 stored, 1 fixed codes, 2 dynamic codes. */
const blockType = (stream: Uint8Array): number => ((stream[2] as number) >> 1) & 3

test('a stored block unpacks', () => {
  // 78 01: header. 01: last block, stored. 05 00 fa ff: length 5 and its complement. Then "hello" and its Adler-32.
  // biome-ignore format: one byte of the stream a column, as the RFC prints them
  const stream = Uint8Array.of(0x78, 0x01, 0x01, 0x05, 0x00, 0xfa, 0xff, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x06, 0x2c, 0x02, 0x15)
  expect(text(inflate(stream))).toBe('hello')
})

test('a block with the fixed codes unpacks', () => {
  // What every zlib writes for "hello" at its default level: one fixed block.
  const stream = Uint8Array.of(0x78, 0x9c, 0xcb, 0x48, 0xcd, 0xc9, 0xc9, 0x07, 0x00, 0x06, 0x2c, 0x02, 0x15)
  expect(blockType(stream)).toBe(1)
  expect(text(inflate(stream))).toBe('hello')
})

test('a block with its own codes unpacks', () => {
  // Long and varied enough that zlib writes a dynamic block; the assertion keeps the test honest about that.
  const words = Array.from({ length: 400 }, (_, i) => `word${(i * 7919) % 97} `).join('')
  const stream = deflateSync(bytesOf(words), { level: 9 })
  expect(blockType(stream)).toBe(2)
  expect(text(inflate(stream))).toBe(words)
})

test('a stream of several blocks, stored and coded, unpacks', () => {
  const words = Array.from({ length: 3000 }, (_, i) => String.fromCharCode(97 + ((i * i) % 26))).join('')
  expect(text(inflate(deflateSync(bytesOf(words), { level: 0 })))).toBe(words) // many stored blocks
  expect(text(inflate(deflateSync(bytesOf(words), { strategy: constants.Z_FIXED })))).toBe(words)
  expect(text(inflate(deflateSync(bytesOf(words), { strategy: constants.Z_HUFFMAN_ONLY })))).toBe(words)
})

test('a long run copies from the bytes it just wrote', () => {
  const run = 'a'.repeat(5000)
  expect(text(inflate(deflateSync(bytesOf(run))))).toBe(run)
})

test('an empty stream unpacks to nothing', () => {
  expect(inflate(deflateSync(new Uint8Array(0))).length).toBe(0)
})

test('a stream cut one byte short is refused', () => {
  const stream = deflateSync(bytesOf('hello hello hello'))
  expect(() => inflate(stream.subarray(0, stream.length - 1))).toThrow(InflateError)
})

test('a wrong Adler-32 is refused', () => {
  const stream = deflateSync(bytesOf('hello hello hello'))
  stream[stream.length - 1] = (stream[stream.length - 1] as number) ^ 1
  expect(() => inflate(stream)).toThrow(InflateError)
})

test('a block of type 3 is refused', () => {
  // 78 01 then a last block of type 3 (bits 1, 1, 1).
  expect(() => inflate(Uint8Array.of(0x78, 0x01, 0x07, 0, 0, 0, 0))).toThrow(InflateError)
})

test('a stored block whose length does not match its complement is refused', () => {
  // biome-ignore format: as above
  const stream = Uint8Array.of(0x78, 0x01, 0x01, 0x05, 0x00, 0xfa, 0xfe, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x06, 0x2c, 0x02, 0x15)
  expect(() => inflate(stream)).toThrow(InflateError)
})

test('a header that is not zlib is refused', () => {
  expect(() => inflate(bytesOf('not zlib at all'))).toThrow(InflateError)
})
