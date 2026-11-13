// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/hash/canonical.test.ts
import { describe, expect, test } from 'vitest'
import { CanonicalJsonError, canonicalJson, decodeUtf8Strict, utf8 } from '#src/lib/canonical.ts'

test('object keys are sorted at every depth; arrays keep their order', () => {
  expect(canonicalJson({ b: 1, a: { d: [3, 1], c: true } })).toBe('{"a":{"c":true,"d":[3,1]},"b":1}')
})

test('equal values with different insertion order serialize identically', () => {
  expect(canonicalJson({ x: 1, y: 2 })).toBe(canonicalJson({ y: 2, x: 1 }))
})

test('strings are JSON-escaped; null is kept', () => {
  expect(canonicalJson({ s: 'a"b\n', n: null })).toBe('{"n":null,"s":"a\\"b\\n"}')
})

test.each([
  ['NaN', Number.NaN],
  ['Infinity', Number.POSITIVE_INFINITY],
  ['undefined', undefined],
  ['bigint', 1n],
  ['function', () => 1],
])('rejects %s (not representable canonically)', (_name, v) => {
  expect(() => canonicalJson({ v })).toThrow(/canonicalJson/)
})

test('utf8 encodes 1-, 2-, 3- and 4-byte code points and lone surrogates as U+FFFD', () => {
  expect([...utf8('aé€😀')]).toEqual([0x61, 0xc3, 0xa9, 0xe2, 0x82, 0xac, 0xf0, 0x9f, 0x98, 0x80])
  expect([...utf8('\ud800')]).toEqual([0xef, 0xbf, 0xbd])
})

test('-0 is written as -0, so it survives a JSON round trip (audit, spec M2.1 §10.1)', () => {
  expect(canonicalJson(-0)).toBe('-0')
  expect(canonicalJson({ a: [-0, 0] })).toBe('{"a":[-0,0]}')
  expect(Object.is(JSON.parse(canonicalJson(-0)), -0)).toBe(true)
})

test('non-plain objects throw CanonicalJsonError instead of hashing as {} (content audit, M2.1 spec §10.7)', () => {
  class Point {
    x = 1
  }
  for (const value of [new Date(0), new Map([[1, 2]]), new Set([1]), new Point(), new Uint8Array(2), /x/]) {
    expect(() => canonicalJson({ nested: [value] })).toThrow(CanonicalJsonError)
  }
  expect(() => canonicalJson(new Date(0))).toThrow(/unsupported Date/)
  expect(() => canonicalJson(new Point())).toThrow(/unsupported class instance/)
  // Plain objects, including ones without a prototype, are still accepted.
  const bare = Object.create(null) as Record<string, number>
  bare.b = 2
  expect(canonicalJson({ a: bare })).toBe('{"a":{"b":2}}')
})

test('every canonicalJson failure is a CanonicalJsonError', () => {
  expect(() => canonicalJson(Number.NaN)).toThrow(CanonicalJsonError)
  expect(() => canonicalJson({ a: undefined })).toThrow(CanonicalJsonError)
})

describe('decodeUtf8Strict', () => {
  test.each([
    ['ascii', 'hello, world'],
    ['bmp', 'Ünïcödé ✓ 日本'],
    ['astral', '😀 𝄞'],
    ['empty', ''],
  ])('inverts utf8 for %s text', (_, text) => {
    expect(decodeUtf8Strict(utf8(text))).toBe(text)
  })

  test.each([
    ['an overlong form', [0xc0, 0xaf]],
    ['an overlong three-byte form', [0xe0, 0x80, 0xaf]],
    ['a lone surrogate', [0xed, 0xa0, 0x80]],
    ['a truncated sequence', [0xe6, 0x97]],
    ['a stray continuation byte', [0x80]],
    ['a code point past U+10FFFF', [0xf4, 0x90, 0x80, 0x80]],
    ['a bad continuation byte', [0xc3, 0x28]],
  ])('throws on %s', (_, bytes) => {
    expect(() => decodeUtf8Strict(Uint8Array.from(bytes))).toThrow(RangeError)
  })
})
