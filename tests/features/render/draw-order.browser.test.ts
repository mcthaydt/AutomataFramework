// Draw order in each real browser (F5). A crate half over the hero, standing on the ground: `in-front` paints the crate
// over the hero and over the ground, `behind` puts it under the ground (and the hero), and saying nothing draws it as
// things have always been drawn, with the hero over it and the ground under it.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { createRenderer, type Renderer } from '#src/features/render/render.ts'
import type { RenderDelta, RenderRow } from '#src/features/sim/sim.ts'
import { pixel } from '../../fixtures/game/pixels.ts'

const WORLD = { w: 16, h: 9 }
const GROUND = 0x3b4a5a
const CRATE = 0xc9a227
const HERO = 0xe4572e

const box = (
  sid: number,
  at: number,
  size: number,
  color: number,
  extra: RenderRow['components'] = {},
): RenderRow => ({
  sid,
  components: {
    transform: { x: at, y: 4.5, rotation: 0 },
    look: { w: size, h: size, color },
    ...extra,
  },
})

/** The ground (4 tiles square), a crate, then the hero half over it: the hero is the last to be drawn. */
const level = (draw: string | undefined): RenderDelta => ({
  resync: true,
  added: [
    box(1, 8, 4, GROUND),
    box(2, 8, 1, CRATE, draw === undefined ? {} : { 'level.draw': { layer: draw } }),
    box(3, 8.5, 1, HERO, { sprite: { character: 'hero', pose: '', face: 1, player: 1 } }),
  ],
  changed: [],
  removed: [],
})

let mount: HTMLDivElement
let renderer: Renderer | undefined
beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:320px;height:180px;overflow:hidden'
  document.body.append(mount)
})
afterEach(() => {
  renderer?.destroy()
  renderer = undefined
  mount.remove()
})

const rgb = (color: number): [number, number, number] => [
  (color >> 16) & 255,
  (color >> 8) & 255,
  color & 255,
]

/** Where the crate and the hero overlap, and where only the crate is, in CSS pixels (20 to the tile). */
const OVERLAP = { x: 165, y: 90 }
const CRATE_ONLY = { x: 155, y: 90 }

/** The colours at those two places, drawn with the crate's `draw`. */
async function colours(
  draw: string | undefined,
): Promise<{ overlap: [number, number, number]; crateOnly: [number, number, number] }> {
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.apply(level(draw))
  renderer.draw(1)
  return {
    overlap: pixel(renderer.canvas, OVERLAP.x, OVERLAP.y),
    crateOnly: pixel(renderer.canvas, CRATE_ONLY.x, CRATE_ONLY.y),
  }
}

/** Within a few shades, since the edges and the colour space may differ by a step. */
const near = (got: [number, number, number], want: number): void => {
  for (const [i, c] of rgb(want).entries()) expect(Math.abs((got[i] ?? 0) - c)).toBeLessThanOrEqual(3)
}

test('a thing that says nothing is drawn with the hero: the hero is over it, the ground under', async () => {
  const seen = await colours(undefined)
  near(seen.overlap, HERO)
  near(seen.crateOnly, CRATE)
})

test('with-hero is the same as saying nothing', async () => {
  const seen = await colours('with-hero')
  near(seen.overlap, HERO)
  near(seen.crateOnly, CRATE)
})

test('in-front paints the crate over the hero', async () => {
  const seen = await colours('in-front')
  near(seen.overlap, CRATE)
  near(seen.crateOnly, CRATE)
})

test('behind puts the crate under the ground, and so under the hero', async () => {
  const seen = await colours('behind')
  near(seen.overlap, HERO)
  near(seen.crateOnly, GROUND)
})
