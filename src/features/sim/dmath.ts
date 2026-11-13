// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/shared/math/dmath.ts
// biome-ignore-all lint/correctness/noPrecisionLoss: fdlibm constants are kept verbatim as published; they parse to the intended doubles.
// biome-ignore-all lint/suspicious/noApproximativeNumericConstant: pi-related literals are deliberate (Math.PI is outside the allowlist).
// Deterministic math built from operations IEEE-754 requires to be correctly rounded.
// Kernels and constants are adapted from fdlibm (Sun Microsystems, freely redistributable).

const scratch = new DataView(new ArrayBuffer(8))

// --- sin / cos / tan -------------------------------------------------------
const INV_PIO2 = 6.36619772367581382433e-1
const PIO2_1 = 1.57079632673412561417 // first 33 bits of pi/2
const PIO2_1T = 6.07710050650619224932e-11 // pi/2 - PIO2_1
const S1 = -1.66666666666666324348e-1
const S2 = 8.33333333332248946124e-3
const S3 = -1.98412698298579493134e-4
const S4 = 2.75573137070700676789e-6
const S5 = -2.50507602534068634195e-8
const S6 = 1.58969099521155010221e-10
const C1 = 4.16666666666666019037e-2
const C2 = -1.38888888888741095749e-3
const C3 = 2.48015872894767294178e-5
const C4 = -2.75573143513906633035e-7
const C5 = 2.0875723212981748279e-9
const C6 = -1.13596475577881948265e-11

function kSin(x: number): number {
  const z = x * x
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)))
  return x + x * z * (S1 + z * r)
}
function kCos(x: number): number {
  const z = x * x
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))))
  return 1 - 0.5 * z + z * r
}

let redQ = 0
let redR = 0
/** Cody–Waite reduction. Accurate for |x| < 2^19 * pi/2 (~8.2e5); deterministic for every finite x. */
function reduce(x: number): void {
  const n = Math.round(x * INV_PIO2)
  redR = x - n * PIO2_1 - n * PIO2_1T
  redQ = ((n % 4) + 4) % 4
}

/** Deterministic sine, in radians. NaN for a non-finite input; `-0` stays `-0`. */
export function sin(x: number): number {
  if (!Number.isFinite(x)) return Number.NaN
  if (x === 0) return x // keeps -0
  reduce(x)
  return redQ === 0 ? kSin(redR) : redQ === 1 ? kCos(redR) : redQ === 2 ? -kSin(redR) : -kCos(redR)
}
/** Deterministic cosine, in radians. NaN for a non-finite input. */
export function cos(x: number): number {
  if (!Number.isFinite(x)) return Number.NaN
  reduce(x)
  return redQ === 0 ? kCos(redR) : redQ === 1 ? -kSin(redR) : redQ === 2 ? -kCos(redR) : kSin(redR)
}
/** Deterministic tangent, in radians, as `sin(x) / cos(x)`. */
export function tan(x: number): number {
  return sin(x) / cos(x)
}

// --- atan / atan2 ----------------------------------------------------------
const ATANHI: readonly number[] = [
  4.63647609000806093515e-1, 7.85398163397448278999e-1, 9.82793723247329054082e-1, 1.570796326794896558,
]
const ATANLO: readonly number[] = [
  2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17,
  6.12323399573676603587e-17,
]
const AT = [
  3.33333333333329318027e-1, -1.99999999998764832476e-1, 1.42857142725034663711e-1, -1.1111110405462355788e-1,
  9.09088713343650656196e-2, -7.69187620504482999495e-2, 6.66107313738753120669e-2,
  -5.83357013379057348645e-2, 4.97687799461593236017e-2, -3.6531572744216915527e-2, 1.62858201153657823623e-2,
] as const
const PI = 3.141592653589793116
const PI_LO = 1.2246467991473531772e-16
const PIO2 = 1.570796326794896558
const PIO2_LO = 6.12323399573676603587e-17 // == ATANLO[3]

/** Deterministic arctangent. NaN stays NaN; `-0` stays `-0`. */
export function atan(x0: number): number {
  if (Number.isNaN(x0)) return Number.NaN
  if (x0 === 0) return x0 // keeps -0
  const neg = x0 < 0
  let x = Math.abs(x0)
  if (x >= 4.4e16) return neg ? -(PIO2 + PIO2_LO) : PIO2 + PIO2_LO
  let id: number
  if (x < 0.4375) id = -1
  else if (x < 0.6875) {
    id = 0
    x = (2 * x - 1) / (2 + x)
  } else if (x < 1.1875) {
    id = 1
    x = (x - 1) / (x + 1)
  } else if (x < 2.4375) {
    id = 2
    x = (x - 1.5) / (1 + 1.5 * x)
  } else {
    id = 3
    x = -1 / x
  }
  const z = x * x
  const w = z * z
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))))
  const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))))
  const hi = ATANHI[id] ?? 0
  const lo = ATANLO[id] ?? 0
  const r = id < 0 ? x - x * (s1 + s2) : hi - (x * (s1 + s2) - lo - x)
  return neg ? -r : r
}

/** Finite inputs only (sim values are finite). Signed zeros follow the built-in atan2. */
export function atan2(y: number, x: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return Number.NaN
  if (y === 0) return x > 0 || Object.is(x, 0) ? y : Object.is(y, -0) ? -PI : PI
  if (x === 0) return y > 0 ? PIO2 : -PIO2
  const z = atan(Math.abs(y / x))
  if (x > 0) return y < 0 ? -z : z
  return y < 0 ? z - PI_LO - PI : PI - (z - PI_LO)
}

// --- exp / log / pow -------------------------------------------------------
const LN2_HI = 6.9314718036912381649e-1
const LN2_LO = 1.90821492927058770002e-10
const INV_LN2 = 1.442695040888963387
const P1 = 1.66666666666666019037e-1
const P2 = -2.77777777770155933842e-3
const P3 = 6.61375632143793436117e-5
const P4 = -1.6533902205465251539e-6
const P5 = 4.13813679705723846039e-8

/** Exact 2^k for -1022 <= k <= 1023, built from the bit pattern. */
function pow2i(k: number): number {
  scratch.setUint32(0, ((k + 1023) << 20) >>> 0, false)
  scratch.setUint32(4, 0, false)
  return scratch.getFloat64(0, false)
}

/** Deterministic `e` to the power `x`. Infinity above about 709.78, 0 below about -745.13. */
export function exp(x: number): number {
  if (Number.isNaN(x)) return Number.NaN
  if (x > 709.782712893383973096) return Number.POSITIVE_INFINITY
  if (x < -745.13321910194110842) return 0
  const k = Math.round(x * INV_LN2)
  const hi = x - k * LN2_HI
  const lo = k * LN2_LO
  const r = hi - lo
  const t = r * r
  const c = r - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))))
  const y = 1 - (lo - (r * c) / (2 - c) - hi)
  if (k === 1024) return y * 2 * pow2i(1023)
  if (k >= -1021) return y * pow2i(k)
  return y * pow2i(k + 1000) * pow2i(-1000)
}

const LG1 = 6.66666666666673513e-1
const LG2 = 3.999999999940941908e-1
const LG3 = 2.857142874366239149e-1
const LG4 = 2.222219843214978396e-1
const LG5 = 1.818357216161805012e-1
const LG6 = 1.531383769920937332e-1
const LG7 = 1.479819860511658591e-1
const SQRT2 = 1.41421356237309514547

/** Deterministic natural logarithm. NaN for a negative input, `-Infinity` for 0. */
export function log(x0: number): number {
  if (Number.isNaN(x0) || x0 < 0) return Number.NaN
  if (x0 === 0) return Number.NEGATIVE_INFINITY
  if (x0 === Number.POSITIVE_INFINITY) return x0
  let x = x0
  let k = 0
  if (x < 2.2250738585072014e-308) {
    x *= 18014398509481984
    k = -54
  } // scale subnormals by 2^54
  scratch.setFloat64(0, x, false)
  const hx = scratch.getUint32(0, false)
  k += ((hx >>> 20) & 0x7ff) - 1023
  scratch.setUint32(0, ((hx & 0x000fffff) | 0x3ff00000) >>> 0, false)
  let m = scratch.getFloat64(0, false) // in [1, 2)
  if (m > SQRT2) {
    m *= 0.5
    k += 1
  }
  const f = m - 1
  const s = f / (2 + f)
  const z = s * s
  const w = z * z
  const t1 = w * (LG2 + w * (LG4 + w * LG6))
  const t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)))
  const hfsq = 0.5 * f * f
  return k * LN2_HI - (hfsq - (s * (hfsq + t2 + t1) + k * LN2_LO) - f)
}

/** Exact-as-IEEE path for small integer exponents: repeated squaring, so pow(2, 3) === 8. */
function powInt(x: number, n: number): number {
  let result = 1
  let base = x
  let e = Math.abs(n)
  while (e > 0) {
    if (e % 2 === 1) result *= base
    base *= base
    e = Math.floor(e / 2)
  }
  return n < 0 ? 1 / result : result
}

/**
 * Deterministic `x` to the power `y`. An integer `y` of 64 or less in magnitude multiplies exactly; otherwise
 * it is `exp(y * log(x))`, and a negative `x` with a non-integer `y` is NaN.
 */
export function pow(x: number, y: number): number {
  if (y === 0) return 1
  if (Number.isNaN(x) || Number.isNaN(y)) return Number.NaN
  if (Number.isInteger(y) && Math.abs(y) <= 64) return powInt(x, y)
  if (x > 0) return exp(y * log(x))
  if (x === 0) return y > 0 ? 0 : Number.POSITIVE_INFINITY
  if (!Number.isInteger(y)) return Number.NaN
  const v = exp(y * log(-x))
  return Math.abs(y) % 2 === 1 ? -v : v
}

/** No overflow scaling: inputs must satisfy x*x + y*y < 1.7e308. */
export function hypot(x: number, y: number): number {
  return Math.sqrt(x * x + y * y)
}
