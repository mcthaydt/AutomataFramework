// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/shared/hash/xxhash64.ts
// XXH64 in pure TypeScript. No wasm, no platform hashing: identical in every engine.
// Reference: https://github.com/Cyan4973/xxHash/blob/dev/doc/xxhash_spec.md
//
// Each 64-bit value is held as two u32 halves (hi, lo), and the arithmetic is done with 32-bit integer
// operations, because BigInt arithmetic allocates per operation and is several times slower.
// The helpers below return their result in the module-level registers `H()` / `L()` instead of allocating a
// pair. `testing/xxhash64-reference.ts` is the plain BigInt version this must agree with on every input.

const P1H = 0x9e3779b1
const P1L = 0x85ebca87
const P2H = 0xc2b2ae3d
const P2L = 0x27d4eb4f
const P3H = 0x165667b1
const P3L = 0x9e3779f9
const P4H = 0x85ebca77
const P4L = 0xc2b2ae63
const P5H = 0x27d4eb2f
const P5L = 0x165667c5

// Result registers: [hi, lo]. A typed array, not two `let`s, so V8 skips the module TDZ checks in hot loops.
const R = new Uint32Array(2)
const H = (): number => R[0] as number
const L = (): number => R[1] as number

/** (ah, al) + (bh, bl) mod 2^64. */
function add(ah: number, al: number, bh: number, bl: number): void {
  const lo = al + bl // < 2^33, exact
  R[1] = lo >>> 0
  R[0] = (ah + bh + (lo > 0xffffffff ? 1 : 0)) >>> 0
}

/**
 * (ah, al) * (bh, bl) mod 2^64. The low halves multiply in 16-bit pieces so every partial product fits a
 * double exactly; the cross terms only reach the high half, where `Math.imul` (mod 2^32) is enough.
 */
function mul(ah: number, al: number, bh: number, bl: number): void {
  const a0 = al & 0xffff
  const a1 = al >>> 16
  const b0 = bl & 0xffff
  const b1 = bl >>> 16
  const p00 = a0 * b0
  const p01 = a0 * b1
  const p10 = a1 * b0
  const mid = (p00 >>> 16) + (p01 & 0xffff) + (p10 & 0xffff)
  R[1] = (((mid & 0xffff) << 16) | (p00 & 0xffff)) >>> 0
  const hi = a1 * b1 + (p01 >>> 16) + (p10 >>> 16) + (mid >>> 16)
  R[0] = (hi + Math.imul(ah, bl) + Math.imul(al, bh)) >>> 0
}

/** Rotate (h, l) left by r bits, 0 < r < 64. */
function rotl(h: number, l: number, r: number): void {
  if (r >= 32) {
    const t = h
    h = l
    l = t
    r -= 32
  }
  if (r === 0) {
    R[0] = h >>> 0
    R[1] = l >>> 0
    return
  }
  R[0] = ((h << r) | (l >>> (32 - r))) >>> 0
  R[1] = ((l << r) | (h >>> (32 - r))) >>> 0
}

/** round(acc, input) = rotl(acc + input * P2, 31) * P1. */
function round(acch: number, accl: number, inh: number, inl: number): void {
  mul(inh, inl, P2H, P2L)
  add(acch, accl, H(), L())
  rotl(H(), L(), 31)
  mul(H(), L(), P1H, P1L)
}

/** XXH64 of `data` with an unsigned 64-bit `seed`. */
export function xxhash64(data: Uint8Array, seed = 0n): bigint {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const len = data.byteLength
  const sh = Number((seed >> 32n) & 0xffffffffn)
  const sl = Number(seed & 0xffffffffn)
  let p = 0
  let hh: number
  let hl: number
  if (len >= 32) {
    add(sh, sl, P1H, P1L)
    add(H(), L(), P2H, P2L)
    let v1h = H()
    let v1l = L()
    add(sh, sl, P2H, P2L)
    let v2h = H()
    let v2l = L()
    let v3h = sh
    let v3l = sl
    // seed - P1 = seed + (2^64 - P1)
    add(sh, sl, ~P1H >>> 0, ~P1L >>> 0)
    add(H(), L(), 0, 1)
    let v4h = H()
    let v4l = L()
    for (; p + 32 <= len; p += 32) {
      round(v1h, v1l, view.getUint32(p + 4, true), view.getUint32(p, true))
      v1h = H()
      v1l = L()
      round(v2h, v2l, view.getUint32(p + 12, true), view.getUint32(p + 8, true))
      v2h = H()
      v2l = L()
      round(v3h, v3l, view.getUint32(p + 20, true), view.getUint32(p + 16, true))
      v3h = H()
      v3l = L()
      round(v4h, v4l, view.getUint32(p + 28, true), view.getUint32(p + 24, true))
      v4h = H()
      v4l = L()
    }
    rotl(v1h, v1l, 1)
    hh = H()
    hl = L()
    rotl(v2h, v2l, 7)
    add(hh, hl, H(), L())
    hh = H()
    hl = L()
    rotl(v3h, v3l, 12)
    add(hh, hl, H(), L())
    hh = H()
    hl = L()
    rotl(v4h, v4l, 18)
    add(hh, hl, H(), L())
    hh = H()
    hl = L()
    // merge(h, v) = (h ^ round(0, v)) * P1 + P4, for v1..v4 in order.
    const lanes = [v1h, v1l, v2h, v2l, v3h, v3l, v4h, v4l]
    for (let i = 0; i < 8; i += 2) {
      round(0, 0, lanes[i] as number, lanes[i + 1] as number)
      mul((hh ^ H()) >>> 0, (hl ^ L()) >>> 0, P1H, P1L)
      add(H(), L(), P4H, P4L)
      hh = H()
      hl = L()
    }
  } else {
    add(sh, sl, P5H, P5L)
    hh = H()
    hl = L()
  }
  // len < 2^32 for any Uint8Array a browser can allocate, so it only adds to the low half.
  add(hh, hl, 0, len >>> 0)
  hh = H()
  hl = L()
  for (; p + 8 <= len; p += 8) {
    round(0, 0, view.getUint32(p + 4, true), view.getUint32(p, true))
    rotl((hh ^ H()) >>> 0, (hl ^ L()) >>> 0, 27)
    mul(H(), L(), P1H, P1L)
    add(H(), L(), P4H, P4L)
    hh = H()
    hl = L()
  }
  if (p + 4 <= len) {
    mul(0, view.getUint32(p, true), P1H, P1L)
    rotl((hh ^ H()) >>> 0, (hl ^ L()) >>> 0, 23)
    mul(H(), L(), P2H, P2L)
    add(H(), L(), P3H, P3L)
    hh = H()
    hl = L()
    p += 4
  }
  for (; p < len; p++) {
    mul(0, view.getUint8(p), P5H, P5L)
    rotl((hh ^ H()) >>> 0, (hl ^ L()) >>> 0, 11)
    mul(H(), L(), P1H, P1L)
    hh = H()
    hl = L()
  }
  // Avalanche: h ^= h >> 33; h *= P2; h ^= h >> 29; h *= P3; h ^= h >> 32.
  hl = (hl ^ (hh >>> 1)) >>> 0
  mul(hh, hl, P2H, P2L)
  hh = H()
  hl = L()
  hl = (hl ^ ((hl >>> 29) | (hh << 3))) >>> 0
  hh = (hh ^ (hh >>> 29)) >>> 0
  mul(hh, hl, P3H, P3L)
  hh = H()
  hl = (L() ^ H()) >>> 0
  return (BigInt(hh) << 32n) | BigInt(hl)
}

/** 16 lowercase hex digits. */
export function hex64(value: bigint): string {
  return value.toString(16).padStart(16, '0')
}
