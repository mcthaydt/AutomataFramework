// Ropes and pins on a real canvas, in each real browser: a rope is a dark line on the sky and a pin a dark dot.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { createRenderer, type Renderer } from '#src/features/render/render.ts'
import type { RenderDelta } from '#src/features/sim/sim.ts'
import { brightness, pixel } from '../../fixtures/game/pixels.ts'

// A 400 by 300 mount and a world 8 by 6 tiles: 50 pixels to the tile, no bars.
const WORLD = { w: 8, h: 6 }
const TILE = 50

const joint = (kind: number, a: number, b: number) => ({
  kind,
  a,
  b,
  ax: 0,
  ay: 0,
  bx: 0,
  by: 0,
  limited: false,
  min: 0,
  max: 4,
})
const SCENE: RenderDelta = {
  resync: true,
  added: [
    { sid: 1, components: { transform: { x: 2, y: 1, rotation: 0 } } }, // an anchor: a pose and no look
    { sid: 2, components: { transform: { x: 6, y: 1, rotation: 0 } } },
    { sid: 3, components: { 'physics.joint': joint(1, 2, 1) } }, // a rope from (6, 1) to (2, 1)
    { sid: 4, components: { transform: { x: 4, y: 4, rotation: 0 } } },
    { sid: 5, components: { transform: { x: 4, y: 4, rotation: 0 } } },
    { sid: 6, components: { 'physics.joint': joint(0, 4, 5) } }, // a pin at (4, 4)
  ],
  changed: [],
  removed: [],
}

let mount: HTMLDivElement
let renderer: Renderer | undefined
beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:400px;height:300px;overflow:hidden'
  document.body.append(mount)
})
afterEach(() => {
  renderer?.destroy()
  renderer = undefined
  mount.remove()
})

/** The darkest pixel in the 5 by 5 square around a point, in CSS pixels. A 2-pixel line is smoothed at its edges, so one pixel may land pale. */
function darkestAround(canvas: HTMLCanvasElement, x: number, y: number): number {
  let darkest = 255
  for (let dx = -2; dx <= 2; dx++)
    for (let dy = -2; dy <= 2; dy++) darkest = Math.min(darkest, brightness(pixel(canvas, x + dx, y + dy)))
  return darkest
}

test('a rope is a dark line on the sky and a pin a dark dot', async () => {
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.apply(SCENE)
  renderer.draw(1)
  const canvas = renderer.canvas
  // halfway along the rope: the world point (4, 1)
  expect(darkestAround(canvas, 4 * TILE, 1 * TILE)).toBeLessThan(90)
  // a quarter of a tile to its side it is sky
  expect(brightness(pixel(canvas, 4 * TILE, 1 * TILE - TILE / 4))).toBeGreaterThan(150)
  // the pin's centre
  expect(darkestAround(canvas, 4 * TILE, 4 * TILE)).toBeLessThan(90)
  expect(brightness(pixel(canvas, 4 * TILE + TILE / 2, 4 * TILE))).toBeGreaterThan(150)
})
