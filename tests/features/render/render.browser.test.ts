// The renderer in each real browser: a canvas that fills its mount, refits when the mount turns, and cleans up.
import { Application } from 'pixi.js'
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

// Pixi clears a WebGL canvas when its size is set, and a game that is paused by hand asks for no frames, so the picture
// has to be put back by the renderer itself.
test('turning the mount while nothing is drawing puts the picture back', async () => {
  size(390, 844)
  const render = vi.spyOn(Application.prototype, 'render')
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.apply(ONE_BOX)
  renderer.draw(1)
  // Let the observer's first report (it fires when it starts watching) pass, so only the turn is counted.
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  render.mockClear()
  size(844, 390)
  await vi.waitFor(() => expect(renderer?.canvas.width).toBe(buffer(844)))
  expect(render).toHaveBeenCalled()
})

test('a mount that gets its size after the last draw is drawn once it has one', async () => {
  size(0, 0)
  const render = vi.spyOn(Application.prototype, 'render')
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.apply(ONE_BOX)
  renderer.draw(1)
  expect(render).not.toHaveBeenCalled()
  size(320, 180)
  await vi.waitFor(() => expect(render).toHaveBeenCalled())
})

test('the first step is drawn without waiting for the next frame', async () => {
  size(390, 844)
  const render = vi.spyOn(Application.prototype, 'render')
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.apply(ONE_BOX)
  expect(render).toHaveBeenCalledTimes(1)
  // Later steps leave the drawing to the loop's frames.
  renderer.apply({ resync: false, added: [], changed: [], removed: [] })
  expect(render).toHaveBeenCalledTimes(1)
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

/** Reads one pixel of the canvas as [r, g, b]. Must run in the same task as the draw, while the buffer is intact. */
function pixel(canvas: HTMLCanvasElement, cssX: number, cssY: number): [number, number, number] {
  const copy = document.createElement('canvas')
  copy.width = canvas.width
  copy.height = canvas.height
  const context = copy.getContext('2d')
  if (context === null) throw new Error('no 2D canvas to read pixels with')
  context.drawImage(canvas, 0, 0)
  const [r = 0, g = 0, b = 0] = context.getImageData(
    Math.round(cssX * window.devicePixelRatio),
    Math.round(cssY * window.devicePixelRatio),
    1,
    1,
  ).data
  return [r, g, b]
}
const brightness = ([r, g, b]: [number, number, number]): number => (r + g + b) / 3

// A pale box on the pale sky must still be seen: every box has a dark edge, whatever its colour.
test('a box has a dark edge, so a pale one shows against the sky', async () => {
  size(320, 180) // 20 pixels a tile; the box is 4 tiles wide, from x 120 to 200
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.apply({
    ...ONE_BOX,
    added: [
      {
        sid: 1,
        components: { transform: { x: 8, y: 4.5, rotation: 0 }, look: { w: 4, h: 4, color: 0xffffff } },
      },
    ],
  })
  renderer.draw(1)
  expect(pixel(renderer.canvas, 160, 90)).toEqual([255, 255, 255])
  // Somewhere in the three pixels either side of the left edge there is a dark one.
  const edge = [119, 120, 121, 122].map((x) =>
    brightness(pixel(renderer?.canvas as HTMLCanvasElement, x, 90)),
  )
  expect(Math.min(...edge)).toBeLessThan(60)
})
