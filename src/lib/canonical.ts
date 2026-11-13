// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/shared/hash/canonical.ts
import { sortedKeys } from './sorted.ts'

/** A value canonical JSON cannot represent exactly; hashing it anyway would let different values collide. */
export class CanonicalJsonError extends Error {
  constructor(message: string) {
    super(`canonicalJson: ${message}`)
    this.name = 'CanonicalJsonError'
  }
}

/** Only arrays and plain objects (prototype Object.prototype or null) have a canonical form. */
function describeNonPlain(value: object): string | undefined {
  if (Array.isArray(value)) return undefined
  const proto = Object.getPrototypeOf(value)
  if (proto === Object.prototype || proto === null) return undefined
  // "[object Date]" -> "Date"; a class instance reports "Object", so it gets a description instead.
  const tag = Object.prototype.toString.call(value).slice(8, -1)
  return tag === 'Object' ? 'class instance' : tag
}

/**
 * Canonical JSON: object keys sorted at every depth, no whitespace. Numbers use the ECMAScript
 * Number-to-string algorithm, which every engine implements identically, except that -0 is written as -0.
 * Throws CanonicalJsonError for anything JSON can't represent exactly: NaN, Infinity, undefined, bigint,
 * functions, symbols, and non-plain objects (a Date, Map, Set, typed array or class instance would otherwise
 * serialize as {} and hash the same as every other one).
 */
export function canonicalJson(value: unknown): string {
  if (value === null) return 'null'
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false'
    case 'string':
      return JSON.stringify(value)
    case 'number':
      if (!Number.isFinite(value)) throw new CanonicalJsonError(`non-finite number ${value}`)
      // JSON.stringify(-0) is "0", which would turn -0 into 0 on restore; "-0" parses back to -0.
      return Object.is(value, -0) ? '-0' : JSON.stringify(value)
    case 'object': {
      const nonPlain = describeNonPlain(value)
      if (nonPlain) throw new CanonicalJsonError(`unsupported ${nonPlain}; convert it to plain data first`)
      if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
      const obj = value as Record<string, unknown>
      return `{${sortedKeys(obj)
        .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
        .join(',')}}`
    }
    default:
      throw new CanonicalJsonError(`unsupported ${typeof value}`)
  }
}

/** UTF-8 encoding without TextEncoder (the sim's lib has no DOM/Web APIs). Lone surrogates become U+FFFD. */
export function utf8(s: string): Uint8Array {
  const out: number[] = []
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i)
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const lo = s.charCodeAt(i + 1)
      if (lo >= 0xdc00 && lo <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (lo - 0xdc00)
        i++
      }
    }
    if (c >= 0xd800 && c <= 0xdfff) c = 0xfffd
    if (c < 0x80) out.push(c)
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63))
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
  }
  return Uint8Array.from(out)
}

/**
 * Strict UTF-8 decoding, the inverse of `utf8` for well-formed text. Throws RangeError on anything else: a stray
 * or missing continuation byte, an overlong form, an encoded surrogate, a code point past U+10FFFF or a truncated
 * sequence. Replays need it because their bytes come from outside; the snapshot decoder's loose
 * one only ever reads bytes the sim wrote.
 */
export function decodeUtf8Strict(bytes: Uint8Array): string {
  const parts: string[] = []
  let codes: number[] = []
  const fail = (at: number, what: string): never => {
    throw new RangeError(`invalid UTF-8 at byte ${at}: ${what}`)
  }
  const continuation = (at: number): number => {
    const b = bytes[at]
    if (b === undefined) return fail(at, 'truncated sequence')
    if ((b & 0xc0) !== 0x80) return fail(at, 'expected a continuation byte')
    return b & 0x3f
  }
  for (let i = 0; i < bytes.length; ) {
    const lead = bytes[i] as number
    let cp: number
    let min: number
    let length: number
    if (lead < 0x80) {
      cp = lead
      min = 0
      length = 1
    } else if (lead >= 0xc0 && lead < 0xe0) {
      cp = lead & 0x1f
      min = 0x80
      length = 2
    } else if (lead >= 0xe0 && lead < 0xf0) {
      cp = lead & 0x0f
      min = 0x800
      length = 3
    } else if (lead >= 0xf0 && lead < 0xf8) {
      cp = lead & 0x07
      min = 0x10000
      length = 4
    } else return fail(i, lead < 0xc0 ? 'stray continuation byte' : 'invalid lead byte')
    for (let k = 1; k < length; k++) cp = cp * 64 + continuation(i + k)
    if (cp < min) fail(i, 'overlong form')
    if (cp >= 0xd800 && cp <= 0xdfff) fail(i, 'encoded surrogate')
    if (cp > 0x10ffff) fail(i, 'code point past U+10FFFF')
    codes.push(cp)
    // fromCodePoint takes its code points as arguments, so flush in chunks well under any engine's limit.
    if (codes.length === 4096) {
      parts.push(String.fromCodePoint(...codes))
      codes = []
    }
    i += length
  }
  parts.push(String.fromCodePoint(...codes))
  return parts.join('')
}
