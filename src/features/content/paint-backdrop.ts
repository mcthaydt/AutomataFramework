// Paints a backdrop into one picture of strips, one strip a layer, each repeating sideways with no seam. Only whole-number
// work, `Math.round` and `dmath`'s `sin`, drawn from a stream of the layer's own (`createRng(deriveSeed(seed, id))`), so
// the same file gives the same bytes in every engine and a renamed layer changes only itself. The old world kit's rule
// is kept (AutomataFrameworkFailed@ed8592e8, extensions/world-kit/README.md): a scene is kinds with numbers and a
// seed, and the same seed gives the same scene.
import type { IndexedPicture } from '../../lib/png.ts'
import { createRng, deriveSeed, type Rng, sin } from '../sim/sim.ts'
import type { BackdropFile, BackdropLayer } from './backdrop.ts'
import { createPicture, type Picture, rgb } from './pixels.ts'
import { backdropSheet } from './sheet.ts'

const TAU = 2 * Math.PI

/** Paints column `c` of a strip from row `top` (clamped to the strip) down to its bottom. */
function fill(strip: Picture, c: number, top: number, place: number): void {
  for (let row = Math.max(0, top); row < strip.height; row++) strip.set(c, row, place)
}

/** Rolling hills: two waves with whole numbers of crests, so the strip meets itself where it repeats. */
function hills(strip: Picture, rng: Rng, place: number): void {
  const { width: W, height: H } = strip
  const a = 1 + rng.int(2)
  const b = 3 + rng.int(3)
  const p = rng.next() * TAU
  const q = rng.next() * TAU
  for (let c = 0; c < W; c++) {
    const t = (TAU * (c + 0.5)) / W
    fill(strip, c, Math.round(H * (0.5 - 0.3 * sin(a * t + p) - 0.15 * sin(b * t + q))), place)
  }
}

/** Pointed mountains: a few peaks, each also drawn one width to each side so the edges meet. */
function mountains(strip: Picture, rng: Rng, place: number): void {
  const { width: W, height: H } = strip
  const n = 3 + rng.int(3)
  const peaks: { x: number; tall: number; half: number }[] = []
  for (let k = 0; k < n; k++) {
    const x = ((k + 0.2 + 0.6 * rng.next()) * W) / n
    const tall = H * (0.55 + 0.4 * rng.next())
    const half = (W / n) * (0.6 + 0.3 * rng.next())
    peaks.push({ x, tall, half })
  }
  for (let c = 0; c < W; c++) {
    let height = 0.15 * H
    for (const peak of peaks) {
      for (const shift of [-W, 0, W])
        height = Math.max(height, peak.tall * (1 - Math.abs(c + 0.5 - (peak.x + shift)) / peak.half))
    }
    fill(strip, c, Math.round(H - height), place)
  }
}

/** Soft clouds: each a big ellipse and a smaller one on its upper left, also drawn one width to each side. */
function clouds(strip: Picture, rng: Rng, place: number): void {
  const { width: W, height: H } = strip
  const n = 3 + rng.int(4)
  const puffs: { x: number; y: number; rx: number; ry: number }[] = []
  for (let k = 0; k < n; k++) {
    const x = rng.next() * W
    const y = H * (0.25 + 0.4 * rng.next())
    const ry = H * (0.1 + 0.1 * rng.next())
    const rx = ry * (2 + 2 * rng.next())
    puffs.push({ x, y, rx, ry }, { x: x - 0.4 * rx, y: y - 0.6 * ry, rx: 0.5 * rx, ry: 0.8 * ry })
  }
  for (let row = 0; row < H; row++) {
    for (let c = 0; c < W; c++) {
      const covered = puffs.some((puff) =>
        [-W, 0, W].some((shift) => {
          const dx = (c + 0.5 - (puff.x + shift)) / puff.rx
          const dy = (row + 0.5 - puff.y) / puff.ry
          return dx * dx + dy * dy <= 1
        }),
      )
      if (covered) strip.set(c, row, place)
    }
  }
}

/** One layer's strip, `place` being its colour's place in the palette. */
function paintStrip(strip: Picture, layer: BackdropLayer, seed: number, place: number): void {
  const rng = createRng(deriveSeed(seed, layer.id))
  switch (layer.kind) {
    case 'flat':
      for (let c = 0; c < strip.width; c++) fill(strip, c, 0, place)
      break
    case 'hills':
      hills(strip, rng, place)
      break
    case 'mountains':
      mountains(strip, rng, place)
      break
    case 'clouds':
      clouds(strip, rng, place)
      break
  }
}

/** The picture of a backdrop: `backdropSheet`'s strips, the first layer at the top, in the layers' colours. */
export function paintBackdrop(backdrop: BackdropFile): IndexedPicture {
  const sheet = backdropSheet(backdrop)
  const palette = [0, ...backdrop.layers.map((layer) => rgb(layer.color))]
  const picture = createPicture(sheet.w, sheet.h, palette)
  backdrop.layers.forEach((layer, i) => {
    const at = sheet.frames[i]
    if (at === undefined) return
    const strip = createPicture(at.w, at.h, palette)
    paintStrip(strip, layer, backdrop.seed, i + 1)
    picture.draw(strip, at.x, at.y)
  })
  return picture.done()
}
