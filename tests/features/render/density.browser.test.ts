// The canvas keeps up with the screen: a window dragged to a sharper screen gets a sharper canvas without a reload.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { createRenderer, type Density, pageDensity, type Renderer } from '#src/features/render/render.ts'
import type { RenderDelta } from '#src/features/sim/sim.ts'
import { pixel } from '../../fixtures/game/pixels.ts'

const WORLD = { w: 16, h: 9 }
const HERO: RenderDelta = {
  resync: true,
  added: [
    {
      sid: 1,
      components: { transform: { x: 8, y: 4.5, rotation: 0 }, look: { w: 4, h: 4, color: 0xe4572e } },
    },
  ],
  changed: [],
  removed: [],
}

/** A density moved by hand. `listeners` counts who is listening. */
function fakeDensity(start: number): Density & { set(value: number): void; listeners: number } {
  let value = start
  const heard = new Set<() => void>()
  return {
    now: () => value,
    onChange(listener) {
      heard.add(listener)
      return () => heard.delete(listener)
    },
    set(next) {
      value = next
      for (const listener of [...heard]) listener()
    },
    get listeners() {
      return heard.size
    },
  }
}

let mount: HTMLDivElement
let renderer: Renderer | undefined
beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;overflow:hidden;width:200px;height:100px'
  document.body.append(mount)
})
afterEach(() => {
  renderer?.destroy()
  renderer = undefined
  mount.remove()
})

test('moving to a sharper screen sharpens the canvas without a reload', async () => {
  const density = fakeDensity(1)
  renderer = await createRenderer({ mount, world: WORLD, density })
  renderer.apply(HERO)
  renderer.draw(1)
  expect(renderer.canvas.width).toBe(200)
  density.set(2)
  expect(renderer.canvas.width).toBe(400)
  expect(renderer.canvas.height).toBe(200)
  // The picture was put back: the hero is in the middle of the canvas (`pixel` takes device pixels of the page's own).
  const [r = 0, g = 0, b = 0] = pixel(renderer.canvas, renderer.canvas.width / 2, renderer.canvas.height / 2)
  expect(Math.abs(r - 0xe4) + Math.abs(g - 0x57) + Math.abs(b - 0x2e)).toBeLessThan(40)
})

test('a density of 0, or not a number, is 1', async () => {
  for (const bad of [0, Number.NaN, -2, Number.POSITIVE_INFINITY]) {
    const density = fakeDensity(bad)
    renderer = await createRenderer({ mount, world: WORLD, density })
    expect(renderer.canvas.width).toBe(200)
    density.set(bad)
    expect(renderer.canvas.width).toBe(200)
    renderer.destroy()
    renderer = undefined
  }
})

test('destroy stops listening', async () => {
  const density = fakeDensity(1)
  renderer = await createRenderer({ mount, world: WORLD, density })
  expect(density.listeners).toBe(1)
  renderer.destroy()
  renderer = undefined
  expect(density.listeners).toBe(0)
})

test("the page's own density is the device pixel ratio, and can be listened to and let go of", () => {
  expect(pageDensity.now()).toBe(window.devicePixelRatio)
  let heard = 0
  const stop = pageDensity.onChange(() => heard++)
  expect(() => stop()).not.toThrow()
  expect(heard).toBe(0)
})
