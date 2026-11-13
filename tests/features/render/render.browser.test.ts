// The renderer in each real browser: a canvas that fills its mount, refits when the mount turns, and cleans up.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createRenderer, type Renderer } from '#src/features/render/render.ts'
import type { RenderDelta } from '#src/features/sim/sim.ts'

const WORLD = { w: 16, h: 9 }
const ONE_BOX: RenderDelta = {
  resync: true,
  added: [
    {
      sid: 1,
      components: { transform: { x: 8, y: 4.5, rotation: 0 }, look: { w: 1, h: 1, color: 0xe4572e } },
    },
  ],
  changed: [],
  removed: [],
}

let mount: HTMLDivElement
let renderer: Renderer | undefined
const size = (w: number, h: number): void => {
  mount.style.width = `${w}px`
  mount.style.height = `${h}px`
}

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;overflow:hidden'
  document.body.append(mount)
})
afterEach(() => {
  renderer?.destroy()
  renderer = undefined
  mount.remove()
  vi.restoreAllMocks()
})

/** The canvas's drawing buffer is its CSS size times the device pixel ratio. */
const buffer = (css: number): number => Math.round(css * window.devicePixelRatio)

test('the canvas fills its mount', async () => {
  size(390, 844)
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.apply(ONE_BOX)
  renderer.draw(1)
  expect(renderer.canvas.parentElement).toBe(mount)
  expect(renderer.canvas.clientWidth).toBe(390)
  expect(renderer.canvas.clientHeight).toBe(844)
  expect(renderer.canvas.width).toBe(buffer(390))
  expect(renderer.canvas.height).toBe(buffer(844))
})

test('turning the mount refits the picture', async () => {
  size(390, 844)
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.apply(ONE_BOX)
  renderer.draw(1)
  size(844, 390)
  await vi.waitFor(() => expect(renderer?.canvas.width).toBe(buffer(844)))
  expect(renderer.canvas.height).toBe(buffer(390))
  expect(() => renderer?.draw(1)).not.toThrow()
})

test('a mount with no size yet does not throw, and draws once it has one', async () => {
  size(0, 0)
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.apply(ONE_BOX)
  expect(() => renderer?.draw(1)).not.toThrow()
  size(320, 180)
  await vi.waitFor(() => expect(renderer?.canvas.width).toBe(buffer(320)))
  expect(() => renderer?.draw(1)).not.toThrow()
})

test('destroy removes the canvas and stops watching', async () => {
  size(390, 844)
  const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.destroy()
  expect(mount.querySelector('canvas')).toBeNull()
  expect(disconnect).toHaveBeenCalled()
  // A second destroy, and a draw after it, are harmless.
  expect(() => renderer?.destroy()).not.toThrow()
  expect(() => renderer?.draw(1)).not.toThrow()
  renderer = undefined
})
