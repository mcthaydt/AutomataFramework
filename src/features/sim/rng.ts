// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/src/shared/rng/rng.ts
// xoshiro128** (Blackman & Vigna), 32-bit integer ops only, so it is bit-exact in every engine.
// Seeded through splitmix32; each system gets its own substream, so adding a system never shifts another's draws.

/** The four 32-bit words of a generator's state, as `Rng.state()` copies them and snapshots store them. */
export type RngState = [number, number, number, number]

/**
 * A deterministic generator (xoshiro128**, 32-bit integer math only, so it is bit-exact in every engine).
 * Each system gets its own, seeded from the sim's seed and the system's name.
 */
export interface Rng {
  /** Next raw 32-bit unsigned output. */
  nextU32(): number
  /** Uniform in [0, 1), 32 bits of precision. */
  next(): number
  /** Uniform integer in [0, n). `n` must be a positive integer <= 2^32. */
  int(n: number): number
  /** Copy of the current state, for snapshots. */
  state(): RngState
}

const rotl = (x: number, k: number): number => ((x << k) | (x >>> (32 - k))) >>> 0

function splitmix32(seed: number): () => number {
  let x = seed >>> 0
  return () => {
    x = (x + 0x9e3779b9) >>> 0
    let z = x
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0
    return (z ^ (z >>> 16)) >>> 0
  }
}

export function rngFromState(initial: RngState): Rng {
  const s = initial.map((v) => v >>> 0) as RngState
  if ((s[0] | s[1] | s[2] | s[3]) === 0) s[0] = 1 // the all-zero state is a fixed point
  const nextU32 = (): number => {
    const result = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0
    const t = (s[1] << 9) >>> 0
    s[2] = (s[2] ^ s[0]) >>> 0
    s[3] = (s[3] ^ s[1]) >>> 0
    s[1] = (s[1] ^ s[2]) >>> 0
    s[0] = (s[0] ^ s[3]) >>> 0
    s[2] = (s[2] ^ t) >>> 0
    s[3] = rotl(s[3], 11)
    return result
  }
  return {
    nextU32,
    next: () => nextU32() / 4294967296,
    int: (n) => {
      if (!Number.isInteger(n) || n <= 0 || n > 4294967296) throw new RangeError(`rng.int: bad bound ${n}`)
      return Math.floor((nextU32() / 4294967296) * n)
    },
    state: () => [s[0], s[1], s[2], s[3]],
  }
}

/**
 * A generator seeded from `seed` (through splitmix32): the same seed gives the same sequence in every engine.
 */
export function createRng(seed: number): Rng {
  const sm = splitmix32(seed)
  return rngFromState([sm(), sm(), sm(), sm()])
}

/** Seed for a named substream: FNV-1a over the name's UTF-16 code units, mixed with the root seed. */
export function deriveSeed(rootSeed: number, name: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 0x01000193) >>> 0
  return splitmix32((h ^ Math.imul(rootSeed >>> 0, 0x9e3779b1)) >>> 0)()
}
