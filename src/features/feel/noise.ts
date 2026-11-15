// A number from four whole numbers, the same in every engine: only 32-bit integer work (`Math.imul`, xor and shifts),
// so the same events give the same dust and the same shake in Node, Chromium, WebKit and Firefox.

/** Folds one more whole number into a running 32-bit hash (a murmur-style finisher). */
const mix = (h: number, k: number): number => {
  let x = (h ^ Math.imul(k | 0, 0x9e3779b1)) | 0
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  return (x ^ (x >>> 16)) | 0
}

/** The same four integers always give the same number, 0 up to but not 1, in every engine. */
export const noise = (a: number, b: number, c: number, d: number): number =>
  (mix(mix(mix(mix(0x2545f491, a), b), c), d) >>> 0) / 4294967296
