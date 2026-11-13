// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/testing/xxhash64-reference.ts
// Reference XXH64 in BigInt arithmetic: the straightforward reading of the spec. The sim's own xxhash64
// (hash/xxhash64.ts) must agree with it on every input; it is kept only for that test and the speed comparison.
// Reference: https://github.com/Cyan4973/xxHash/blob/dev/doc/xxhash_spec.md

const MASK = 0xffffffffffffffffn
const P1 = 0x9e3779b185ebca87n
const P2 = 0xc2b2ae3d27d4eb4fn
const P3 = 0x165667b19e3779f9n
const P4 = 0x85ebca77c2b2ae63n
const P5 = 0x27d4eb2f165667c5n

const rotl = (x: bigint, r: bigint): bigint => ((x << r) | (x >> (64n - r))) & MASK
const round = (acc: bigint, input: bigint): bigint => (rotl((acc + input * P2) & MASK, 31n) * P1) & MASK
const merge = (acc: bigint, val: bigint): bigint => (((acc ^ round(0n, val)) * P1) & MASK) + P4

/** XXH64 of `data` with an unsigned 64-bit `seed`. */
export function xxhash64Reference(data: Uint8Array, seed = 0n): bigint {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const len = data.byteLength
  let p = 0
  let h: bigint
  if (len >= 32) {
    let v1 = (seed + P1 + P2) & MASK
    let v2 = (seed + P2) & MASK
    let v3 = seed & MASK
    let v4 = (seed - P1) & MASK
    for (; p + 32 <= len; p += 32) {
      v1 = round(v1, view.getBigUint64(p, true))
      v2 = round(v2, view.getBigUint64(p + 8, true))
      v3 = round(v3, view.getBigUint64(p + 16, true))
      v4 = round(v4, view.getBigUint64(p + 24, true))
    }
    h = (rotl(v1, 1n) + rotl(v2, 7n) + rotl(v3, 12n) + rotl(v4, 18n)) & MASK
    h = merge(h, v1) & MASK
    h = merge(h, v2) & MASK
    h = merge(h, v3) & MASK
    h = merge(h, v4) & MASK
  } else {
    h = (seed + P5) & MASK
  }
  h = (h + BigInt(len)) & MASK
  for (; p + 8 <= len; p += 8) {
    h ^= round(0n, view.getBigUint64(p, true))
    h = (rotl(h, 27n) * P1 + P4) & MASK
  }
  if (p + 4 <= len) {
    h ^= (BigInt(view.getUint32(p, true)) * P1) & MASK
    h = (rotl(h, 23n) * P2 + P3) & MASK
    p += 4
  }
  for (; p < len; p++) {
    h ^= (BigInt(view.getUint8(p)) * P5) & MASK
    h = (rotl(h, 11n) * P1) & MASK
  }
  h ^= h >> 33n
  h = (h * P2) & MASK
  h ^= h >> 29n
  h = (h * P3) & MASK
  h ^= h >> 32n
  return h
}
