// The renderer in each real browser: a canvas that fills its mount, refits when the mount turns, and cleans up.
import { Application } from 'pixi.js'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { SKY_COLOR } from '#src/features/level/level.ts'
import { createRenderer, type Renderer } from '#src/features/render/render.ts'
import type { RenderDelta } from '#src/features/sim/sim.ts'
import { brightness, drawnRows, pixel } from '../../fixtures/game/pixels.ts'

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

// Touch buttons take room at the bottom; the world is fitted above them so a thumb never hides the play area.
test('with room kept at the bottom, the whole world is drawn above it', async () => {
  size(844, 390) // a phone held sideways: the world would fill the height
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.setInset(96)
  renderer.apply({
    ...ONE_BOX,
    added: [
      {
        sid: 1,
        components: { transform: { x: 8, y: 8.5, rotation: 0 }, look: { w: 16, h: 1, color: 0x3b4a5a } },
      },
    ],
  })
  renderer.draw(1)
  const rows = drawnRows(renderer.canvas)
  expect(rows).toBeDefined()
  // The floor is the world's bottom row, so where it ends is where the world ends.
  expect(rows?.bottom).toBeLessThanOrEqual(390 - 96 + 1)
  expect(rows?.bottom).toBeGreaterThan(390 - 96 - 40)
})

test('taking the room back puts the world back to the full height', async () => {
  size(844, 390)
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.apply({
    ...ONE_BOX,
    added: [
      {
        sid: 1,
        components: { transform: { x: 8, y: 8.5, rotation: 0 }, look: { w: 16, h: 1, color: 0x3b4a5a } },
      },
    ],
  })
  renderer.setInset(96)
  renderer.setInset(0)
  renderer.draw(1)
  expect(drawnRows(renderer.canvas)?.bottom).toBeGreaterThan(388)
})

test('room larger than half the mount is ignored, so the world never disappears', async () => {
  size(320, 180)
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.apply(ONE_BOX)
  renderer.setInset(10_000)
  renderer.draw(1)
  expect(drawnRows(renderer.canvas)).toBeDefined()
})

test("the sky fills the canvas in the colour it is given, and in the framework's own when it is not", async () => {
  size(390, 844)
  renderer = await createRenderer({ mount, world: WORLD, sky: 0xfdd4bd })
  renderer.apply(ONE_BOX)
  renderer.draw(1)
  expect(pixel(renderer.canvas, 2, 2)).toEqual([0xfd, 0xd4, 0xbd])
  renderer.destroy()
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.apply(ONE_BOX)
  renderer.draw(1)
  expect(pixel(renderer.canvas, 2, 2)).toEqual([
    (SKY_COLOR >> 16) & 255,
    (SKY_COLOR >> 8) & 255,
    SKY_COLOR & 255,
  ])
})
