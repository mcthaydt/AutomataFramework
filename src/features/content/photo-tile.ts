// The photo pipeline, a pixel artist's process run as code: a photo taken in flat light (so it carries a surface's own
// colours, not a sun's) is flattened, faceted, scaled to the size it is seen at, put on the scene's paints, worn and cleaned:
//
//   flatten → facet → turn → scale down → index → wear → clean up.
//
// - `flatten` takes out the slow changes of light (a cloud's shade, a damp patch) and keeps the surface's own.
// - `facet` is an edge-keeping filter (Kuwahara) that flattens a photo into patches of one colour, so the scale-down that
//   follows keeps a brick's edge and loses its grit.
// - `resample` is an area average that wraps round the tile's edges, so a tile repeats with no seam.
// - Indexing puts every texel on one of the scene's paints: `ladder` keeps only the photo's light, as steps up or down a
//   list of paints (and a second list where a texel's hue parts from the rest: brick and mortar); `match` keeps the
//   photo's own few main colours, each moved to the scene's nearest paint.
// - `wear` steps patches a place darker; `clean` is what a pixel artist's thousands of clicks did, as rules.
//
// It is held to the painter's rules (tests/architecture): whole-number and exact arithmetic only, no `Math.hypot`, no
// `**`, no `Float32Array`, so a photo gives the same tile in Node and in every browser.
import { labOf } from './lab.ts'
import type { PhotoPixels } from './photo-library.ts'
import { rgb } from './pixels.ts'
import type { PhotoMaterial, ScenePaint } from './scene.ts'

/** A material's tile: `width` by `height` pixels that repeat with no seam, each a place in the scene's paints (0-based). */
export interface MaterialTile {
  readonly width: number
  readonly height: number
  readonly places: Uint8Array
}

/** One colour in OKLab. */
type Triple = readonly [number, number, number]

/** OKLab, three numbers a pixel. */
interface Lab {
  readonly width: number
  readonly height: number
  readonly lab: Float64Array
}

const wrap = (i: number, n: number): number => ((i % n) + n) % n

/** A photo's pixels as OKLab. */
function labImage(photo: PhotoPixels): Lab {
  const { width, height, rgba } = photo
  const lab = new Float64Array(width * height * 3)
  const seen = new Map<number, Triple>()
  for (let i = 0; i < width * height; i++) {
    const c = ((rgba[i * 4] ?? 0) << 16) | ((rgba[i * 4 + 1] ?? 0) << 8) | (rgba[i * 4 + 2] ?? 0)
    let v = seen.get(c)
    if (v === undefined) {
      v = labOf(c)
      seen.set(c, v)
    }
    lab.set(v, i * 3)
  }
  return { width, height, lab }
}

/** Kuwahara: each pixel takes the mean of the least varied of the four (r + 1) by (r + 1) squares it is a corner of. */
function facet(src: Lab, radius: number): Lab {
  if (radius <= 0) return src
  const { width, height, lab } = src
  const out = new Float64Array(lab.length)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let best = Number.POSITIVE_INFINITY
      let bestL = 0
      let bestA = 0
      let bestB = 0
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        let n = 0
        let sumL = 0
        let sumA = 0
        let sumB = 0
        let squares = 0
        for (let j = 0; j <= radius; j++)
          for (let i = 0; i <= radius; i++) {
            const k = (wrap(y + sy * j, height) * width + wrap(x + sx * i, width)) * 3
            const L = lab[k] ?? 0
            sumL += L
            squares += L * L
            sumA += lab[k + 1] ?? 0
            sumB += lab[k + 2] ?? 0
            n++
          }
        const mean = sumL / n
        const variance = squares / n - mean * mean
        if (variance < best) {
          best = variance
          bestL = mean
          bestA = sumA / n
          bestB = sumB / n
        }
      }
      out.set([bestL, bestA, bestB], (y * width + x) * 3)
    }
  return { width, height, lab: out }
}

/**
 * The photo's slow changes of light taken out, so only the surface's own light and dark (a mortar line, a plank's grain)
 * are left to index: each pixel's lightness less `amount` of a wide blur's (a box `radius` pixels, three passes,
 * wrapping), plus the mean.
 */
function flatten(src: Lab, radius: number, amount: number): Lab {
  if (amount <= 0 || radius <= 0) return src
  const { width, height, lab } = src
  const n = width * height
  let light = new Float64Array(n)
  let mean = 0
  for (let i = 0; i < n; i++) {
    light[i] = lab[i * 3] ?? 0
    mean += light[i] ?? 0
  }
  mean /= n
  const r = Math.max(1, Math.round(radius))
  const span = 2 * r + 1
  const box = (a: Float64Array, alongX: boolean): Float64Array => {
    const out = new Float64Array(n)
    for (let line = 0; line < (alongX ? height : width); line++) {
      const len = alongX ? width : height
      const get = (i: number): number =>
        a[alongX ? line * width + wrap(i, width) : wrap(i, height) * width + line] ?? 0
      let sum = 0
      for (let i = -r; i <= r; i++) sum += get(i)
      for (let i = 0; i < len; i++) {
        out[alongX ? line * width + i : i * width + line] = sum / span
        sum += get(i + r + 1) - get(i - r)
      }
    }
    return out
  }
  for (let pass = 0; pass < 3; pass++) light = box(box(light, true), false)
  const out = lab.slice()
  for (let i = 0; i < n; i++) out[i * 3] = (lab[i * 3] ?? 0) - amount * ((light[i] ?? 0) - mean)
  return { width, height, lab: out }
}

/** Area-average resampling to `W` by `H`, wrapping at the edges. */
function resample(src: Lab, W: number, H: number): Lab {
  const pass = (lab: Float64Array, w: number, h: number, N: number, alongX: boolean): Float64Array => {
    const n = alongX ? w : h
    const out = new Float64Array((alongX ? N * h : w * N) * 3)
    const s = n / N
    for (let o = 0; o < N; o++) {
      const a = o * s
      const b = a + s
      for (let line = 0; line < (alongX ? h : w); line++) {
        let L = 0
        let A = 0
        let B = 0
        let total = 0
        for (let i = Math.floor(a); i < Math.ceil(b - 1e-9); i++) {
          const cover = Math.min(b, i + 1) - Math.max(a, i)
          const j = wrap(i, n)
          const k = (alongX ? line * w + j : j * w + line) * 3
          L += (lab[k] ?? 0) * cover
          A += (lab[k + 1] ?? 0) * cover
          B += (lab[k + 2] ?? 0) * cover
          total += cover
        }
        out.set([L / total, A / total, B / total], (alongX ? line * N + o : o * w + line) * 3)
      }
    }
    return out
  }
  const across = pass(src.lab, src.width, src.height, W, true)
  return { width: W, height: H, lab: pass(across, W, src.height, H, false) }
}

/** A quarter turn of a photo: planks run up a wall instead of across. */
function turned(src: Lab): Lab {
  const { width, height, lab } = src
  const out = new Float64Array(lab.length)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const a = (y * width + x) * 3
      out.set(lab.subarray(a, a + 3), (x * height + (height - 1 - y)) * 3)
    }
  return { width: height, height: width, lab: out }
}

/** The middle one of the numbers when they are put in order. */
const median = (xs: readonly number[]): number => [...xs].sort((a, b) => a - b)[xs.length >> 1] ?? 0

/**
 * `ladder` mode: each texel a step on one of two ladders, as a label `slot * 16 + step` where `slot` 0 is the ladder and
 * 1 the accent's, and `step` counts up from 0 at the darkest paint. A step is how many `contrast`s the texel's light is
 * from the median, kept between `lo` and `hi` (a ladder of `n` paints has `lo = -floor(n / 2)` and `hi = lo + n - 1`).
 */
function indexLadder(src: Lab, contrast: number, lo: number, hi: number, hue: number): Uint16Array {
  const { width, height, lab } = src
  const n = width * height
  const out = new Uint16Array(n)
  let meanA = 0
  let meanB = 0
  for (let i = 0; i < n; i++) {
    meanA += lab[i * 3 + 1] ?? 0
    meanB += lab[i * 3 + 2] ?? 0
  }
  meanA /= n
  meanB /= n
  const isAccent = new Uint8Array(n)
  if (hue > 0)
    for (let i = 0; i < n; i++) {
      const da = (lab[i * 3 + 1] ?? 0) - meanA
      const db = (lab[i * 3 + 2] ?? 0) - meanB
      isAccent[i] = Math.sqrt(da * da + db * db) > hue ? 1 : 0
    }
  // A small accent share is noise in the photo, not a material: under 3% it stays on the main ladder.
  let accented = 0
  for (let i = 0; i < n; i++) accented += isAccent[i] ?? 0
  const share = accented / n
  if (share < 0.03 || share > 0.6) isAccent.fill(0)
  const lights: [number[], number[]] = [[], []]
  for (let i = 0; i < n; i++) lights[isAccent[i] as 0 | 1].push(lab[i * 3] ?? 0)
  const mid = [median(lights[0]), median(lights[1])]
  for (let i = 0; i < n; i++) {
    const slot = isAccent[i] as 0 | 1
    const offset = Math.max(lo, Math.min(hi, Math.round(((lab[i * 3] ?? 0) - (mid[slot] ?? 0)) / contrast)))
    out[i] = slot * 16 + offset - lo
  }
  return out
}

/**
 * `match` mode: the photo's `k` main colours (k-means in OKLab, seeded from its lightness quantiles, eight rounds), each
 * taken to the scene paint nearest it (the lower index on a tie). Each texel is labelled with its colour's paint.
 */
function indexMatch(src: Lab, k: number, paintLabs: readonly Triple[]): Uint16Array {
  const { width, height, lab } = src
  const n = width * height
  const light = (i: number): number => lab[i * 3] ?? 0
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => light(a) - light(b) || a - b)
  const centres = Array.from({ length: k }, (_, j) => {
    const i = order[Math.min(n - 1, Math.floor(((j + 0.5) / k) * n))] ?? 0
    return [lab[i * 3] ?? 0, lab[i * 3 + 1] ?? 0, lab[i * 3 + 2] ?? 0]
  })
  const nearestCentre = new Int32Array(n)
  for (let round = 0; round < 8; round++) {
    const sums = centres.map(() => [0, 0, 0, 0])
    for (let i = 0; i < n; i++) {
      let best = Number.POSITIVE_INFINITY
      let bestJ = 0
      for (let j = 0; j < k; j++) {
        const c = centres[j] as number[]
        const dL = (lab[i * 3] ?? 0) - (c[0] ?? 0)
        const dA = (lab[i * 3 + 1] ?? 0) - (c[1] ?? 0)
        const dB = (lab[i * 3 + 2] ?? 0) - (c[2] ?? 0)
        const e = dL * dL + dA * dA + dB * dB
        if (e < best) {
          best = e
          bestJ = j
        }
      }
      nearestCentre[i] = bestJ
      const s = sums[bestJ] as number[]
      s[0] = (s[0] ?? 0) + (lab[i * 3] ?? 0)
      s[1] = (s[1] ?? 0) + (lab[i * 3 + 1] ?? 0)
      s[2] = (s[2] ?? 0) + (lab[i * 3 + 2] ?? 0)
      s[3] = (s[3] ?? 0) + 1
    }
    sums.forEach((s, j) => {
      const count = s[3] ?? 0
      if (count > 0) centres[j] = [(s[0] ?? 0) / count, (s[1] ?? 0) / count, (s[2] ?? 0) / count]
    })
  }
  const labels = centres.map(([L, A, B]) => {
    let best = Number.POSITIVE_INFINITY
    let place = 0
    paintLabs.forEach((p, index) => {
      const dL = (L ?? 0) - p[0]
      const dA = (A ?? 0) - p[1]
      const dB = (B ?? 0) - p[2]
      const e = dL * dL + dA * dA + dB * dB
      if (e < best) {
        best = e
        place = index
      }
    })
    return place
  })
  const out = new Uint16Array(n)
  for (let i = 0; i < n; i++) out[i] = labels[nearestCentre[i] as number] ?? 0
  return out
}

/** A hash of up to three whole numbers to [0, 1): a tile's wear comes from it, so a seed repeats. */
function hash3(a: number, b: number, c = 0): number {
  let n = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1)
  n = Math.imul(n ^ (n >>> 15), 0x85ebca6b)
  n ^= n >>> 13
  return (n >>> 0) / 4294967296
}

/**
 * The wear field: smooth value noise over the tile, its value at each texel (0 to 1). The lattice has a whole number of
 * cells across each axis (about 6 texels a cell), so the field wraps with the tile and a worn wall shows no seam.
 */
function wearField(width: number, height: number, seed: number): Float64Array {
  const out = new Float64Array(width * height)
  const cw = Math.max(1, Math.round(width / 6))
  const ch = Math.max(1, Math.round(height / 6))
  const corner = (i: number, j: number): number => hash3(wrap(i, cw), wrap(j, ch), seed)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const fx = (x * cw) / width
      const fy = (y * ch) / height
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const tx = fx - x0
      const ty = fy - y0
      const sx = tx * tx * (3 - 2 * tx)
      const sy = ty * ty * (3 - 2 * ty)
      out[y * width + x] =
        (corner(x0, y0) * (1 - sx) + corner(x0 + 1, y0) * sx) * (1 - sy) +
        (corner(x0, y0 + 1) * (1 - sx) + corner(x0 + 1, y0 + 1) * sx) * sy
    }
  return out
}

/**
 * Wear: patches of the surface a place darker (`darker` says which label is one place darker than another, and gives the
 * same one back at the bottom) where the wear field is over 1 - 0.45 * `amount` (0 to 1), so worn patches are clusters
 * and never single texels.
 */
function wear(
  labels: Uint16Array,
  width: number,
  height: number,
  amount: number,
  seed: number,
  darker: (label: number) => number,
): void {
  if (amount <= 0) return
  const field = wearField(width, height, seed)
  for (let i = 0; i < width * height; i++)
    if ((field[i] ?? 0) > 1 - amount * 0.45) labels[i] = darker(labels[i] ?? 0)
}

/**
 * The clean-up: orphans take their neighbours' label, and clusters under `min` texels (4-connected, wrapping) join the
 * neighbour they border most. Run to a fixed point, at most four passes.
 */
function clean(labels: Uint16Array, width: number, height: number, min: number): void {
  const n = width * height
  const neighbours = (i: number): number[] => {
    const x = i % width
    const y = (i / width) | 0
    return [
      y * width + wrap(x - 1, width),
      y * width + wrap(x + 1, width),
      wrap(y - 1, height) * width + x,
      wrap(y + 1, height) * width + x,
    ]
  }
  /** The label most of `votes` name; the lowest on a tie. */
  const winner = (votes: Map<number, number>, fallback: number): [number, number] => {
    let best = fallback
    let most = 0
    for (const [label, count] of votes)
      if (count > most || (count === most && label < best)) {
        best = label
        most = count
      }
    return [best, most]
  }
  for (let pass = 0; pass < 4; pass++) {
    let changed = false
    // A texel whose label at most one of its four neighbours shares takes the most common label round it, if three or
    // more agree.
    for (let i = 0; i < n; i++) {
      const around = neighbours(i).map((q) => labels[q] ?? 0)
      if (around.filter((l) => l === labels[i]).length > 1) continue
      const votes = new Map<number, number>()
      for (const l of around) votes.set(l, (votes.get(l) ?? 0) + 1)
      const [best, most] = winner(votes, labels[i] ?? 0)
      if (most >= 3 && best !== labels[i]) {
        labels[i] = best
        changed = true
      }
    }
    if (min > 1) {
      const seen = new Uint8Array(n)
      for (let start = 0; start < n; start++) {
        if (seen[start]) continue
        const label = labels[start]
        const run: number[] = []
        const stack = [start]
        seen[start] = 1
        while (stack.length > 0) {
          const i = stack.pop() as number
          run.push(i)
          for (const q of neighbours(i))
            if (!seen[q] && labels[q] === label) {
              seen[q] = 1
              stack.push(q)
            }
        }
        if (run.length >= min || run.length === n) continue
        const votes = new Map<number, number>()
        for (const i of run)
          for (const q of neighbours(i))
            if (labels[q] !== label) votes.set(labels[q] ?? 0, (votes.get(labels[q] ?? 0) ?? 0) + 1)
        const [best] = winner(votes, label ?? 0)
        if (best !== label) {
          for (const i of run) labels[i] = best
          changed = true
        }
      }
    }
    if (!changed) break
  }
}

/** The index of the paint called `id`, or 0 for one a checked scene cannot name. */
const placeOf = (paints: readonly ScenePaint[], id: string | undefined): number =>
  Math.max(0, paints.findIndex((paint) => paint.id === id))

/** The whole pipeline for one photo material at the scene's tile size. */
export function materialTile(
  material: PhotoMaterial,
  paints: readonly ScenePaint[],
  tile: number,
  photo: PhotoPixels,
): MaterialTile {
  const raw = labImage(photo)
  const flat = flatten(raw, Math.max(raw.width, raw.height) / 8, material.flatten ?? 0.85)
  let lab = facet(flat, material.facet ?? 1)
  let { w: tilesWide, h: tilesTall } = photo.size
  if (material.turn === true) {
    lab = turned(lab)
    ;[tilesWide, tilesTall] = [tilesTall, tilesWide]
  }
  const scale = material.scale ?? 1
  const width = Math.max(2, Math.round(tilesWide * scale * tile))
  const height = Math.max(2, Math.round(tilesTall * scale * tile))
  const small = resample(lab, width, height)
  const seed = (material.seed ?? 0) * 31 + 7
  const amount = material.wear ?? 0.3
  const cluster = material.cluster ?? 4
  const places = new Uint8Array(width * height)

  if (material.ladder !== undefined) {
    const steps = material.ladder.length
    const lo = -Math.floor(steps / 2)
    const hue = material.accent === undefined ? 0 : (material.hue ?? 0.06)
    const labels = indexLadder(small, material.contrast ?? 0.07, lo, lo + steps - 1, hue)
    wear(labels, width, height, amount, seed, (label) => ((label & 15) > 0 ? label - 1 : label))
    clean(labels, width, height, cluster)
    const rungs = [material.ladder, material.accent ?? material.ladder]
    for (let i = 0; i < places.length; i++) {
      const label = labels[i] ?? 0
      places[i] = placeOf(paints, rungs[label >> 4]?.[label & 15])
    }
  } else {
    const paintLabs = paints.map((paint) => labOf(rgb(paint.color)))
    const labels = indexMatch(small, material.match ?? 2, paintLabs)
    // A worn texel takes the next darker of the paints the photo kept, by lightness; the darkest stays as it is.
    const lightOf = (paint: number): number => paintLabs[paint]?.[0] ?? 0
    const kept = [...new Set(labels)].sort((a, b) => lightOf(a) - lightOf(b) || a - b)
    const below = new Map(kept.map((label, i) => [label, kept[Math.max(0, i - 1)] ?? label]))
    wear(labels, width, height, amount, seed, (label) => below.get(label) ?? label)
    clean(labels, width, height, cluster)
    for (let i = 0; i < places.length; i++) places[i] = labels[i] ?? 0
  }
  return { width, height, places }
}
