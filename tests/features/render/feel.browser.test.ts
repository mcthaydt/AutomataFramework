// The renderer draws a feel frame in each real browser: dust over the level, a shake in whole device pixels that moves
// the level and not the canvas, and a picture held while a freeze lasts. Phone size first.
import { Graphics } from 'pixi.js'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { FeelFrame } from '#src/features/feel/feel.ts'
import { Sprite } from '#src/features/level/level.ts'
import { createRenderer, fitInRoom, type Renderer } from '#src/features/render/render.ts'
import type { RenderDelta, RenderRow } from '#src/features/sim/sim.ts'
import { brightness, drawnRows, pixel, rowSpan } from '../../fixtures/game/pixels.ts'

const WORLD = { w: 8, h: 6 }
const NO_ROOM = { top: 0, right: 0, bottom: 0, left: 0 }
const PHONE = { w: 390, h: 844 }

let mount: HTMLDivElement
let renderer: Renderer | undefined

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

const size = (box: { w: number; h: number }): void => {
  mount.style.width = `${box.w}px`
  mount.style.height = `${box.h}px`
}

/** A box a tile square, at a place. With `player` above 0 it is that player's hero. */
const box = (sid: number, x: number, y: number, player = 0): RenderRow => ({
  sid,
  components: {
    transform: { x, y, rotation: 0 },
    look: { w: 1, h: 1, color: 0xe4572e },
    ...(player > 0 ? { [Sprite.id]: { character: 'hero', player, pose: '', face: 1 } } : {}),
  },
})
const first = (rows: RenderRow[]): RenderDelta => ({ resync: true, added: rows, changed: [], removed: [] })
const step = (rows: RenderRow[], removed: number[] = []): RenderDelta => ({
  resync: false,
  added: [],
  changed: rows,
  removed,
})

/** A frame of feel: nothing, unless a part is given. */
const feel = (part: Partial<FeelFrame> = {}): FeelFrame => ({
  specks: [],
  shake: { x: 0, y: 0 },
  freeze: 0,
  ...part,
})
const speck = (x: number, y: number, size: number, color: number, alpha = 1) => ({ x, y, size, color, alpha })

/** Where the level is on a canvas of this size, and a world point as CSS pixels. */
const fit = (at: { w: number; h: number }) => fitInRoom(at, NO_ROOM, WORLD)
const where = (at: { w: number; h: number }, x: number, y: number): { x: number; y: number } => {
  const f = fit(at)
  return { x: f.left + x * f.scale, y: f.top + y * f.scale }
}

async function start(rows: RenderRow[], at = PHONE, world = WORLD): Promise<Renderer> {
  size(at)
  renderer = await createRenderer({ mount, world })
  renderer.apply(first(rows))
  return renderer
}

test('a speck is drawn in its colour where the frame says, over a box', async () => {
  const r = await start([box(1, 4, 3)])
  r.draw(1, feel({ specks: [speck(4, 3, 0.5, 0x00aa00)] }))
  const centre = where(PHONE, 4, 3)
  const [red, green, blue] = pixel(r.canvas, centre.x, centre.y)
  expect(green).toBeGreaterThan(120)
  expect(red).toBeLessThan(60)
  expect(blue).toBeLessThan(60)
  // The box is still its own colour beside the speck.
  const side = where(PHONE, 4.4, 3.4)
  expect(pixel(r.canvas, side.x, side.y)[0]).toBeGreaterThan(150)
})

test('a speck on a phone-size level is never under two device pixels', async () => {
  const wide = { w: 64, h: 36 }
  const rect = vi.spyOn(Graphics.prototype, 'rect')
  const r = await start([box(1, 32, 18)], PHONE, wide)
  rect.mockClear()
  r.draw(1, feel({ specks: [speck(10, 10, 0.125, 0x00aa00)] }))
  const resolution = r.canvas.width / PHONE.w
  const scale = PHONE.w / wide.w
  // Boxes are a tile and the cover is the canvas; a speck is the one small square.
  const small = rect.mock.calls.filter((call) => (call[2] ?? 1) < 0.5)
  expect(small).toHaveLength(1)
  const side = small[0]?.[2] ?? 0
  expect(side * scale * resolution).toBeGreaterThanOrEqual(2 - 1e-9)
})

test('a faded speck lets what is under it show', async () => {
  const r = await start([box(1, 4, 3)])
  r.draw(1, feel({ specks: [speck(1, 1, 1, 0x000000, 0.5)] }))
  const dusted = where(PHONE, 1, 1)
  const clear = where(PHONE, 7, 5)
  const under = brightness(pixel(r.canvas, dusted.x, dusted.y))
  const sky = brightness(pixel(r.canvas, clear.x, clear.y))
  expect(under).toBeLessThan(sky * 0.7)
  expect(under).toBeGreaterThan(sky * 0.3)
})

test('a shake moves the box by whole device pixels and the canvas does not move', async () => {
  const r = await start([box(1, 4, 3)])
  const f = fit(PHONE)
  const row = where(PHONE, 4, 3).y
  r.draw(1, feel())
  const before = rowSpan(r.canvas, row)
  const top = drawnRows(r.canvas)?.top ?? 0
  const canvas = r.canvas.getBoundingClientRect()
  r.draw(1, feel({ shake: { x: 0.2123, y: 0.1 } }))
  const after = rowSpan(r.canvas, row)
  const resolution = r.canvas.width / PHONE.w
  expect(Math.abs((after?.left ?? 0) - (before?.left ?? 0) - 0.2123 * f.scale)).toBeLessThanOrEqual(
    1.5 / resolution,
  )
  expect(Math.abs((drawnRows(r.canvas)?.top ?? 0) - top - 0.1 * f.scale)).toBeLessThanOrEqual(
    1.5 / resolution,
  )
  expect(r.canvas.getBoundingClientRect()).toEqual(canvas)
})

test('no shake in the frame puts the box back exactly', async () => {
  const r = await start([box(1, 4, 3)])
  const row = where(PHONE, 4, 3).y
  r.draw(1, feel())
  const before = rowSpan(r.canvas, row)
  r.draw(1, feel({ shake: { x: 0.5, y: 0.5 } }))
  r.draw(1, feel())
  expect(rowSpan(r.canvas, row)).toEqual(before)
  r.draw(1)
  expect(rowSpan(r.canvas, row)).toEqual(before)
})

test('heroes() answers the same box with and without a shake', async () => {
  const r = await start([box(1, 4, 3, 1)])
  r.draw(1, feel())
  const calm = r.heroes()
  r.draw(1, feel({ shake: { x: 0.4, y: -0.3 } }))
  expect(r.heroes()).toEqual(calm)
})

test('while the picture is held, heroes() answers the held box though a step moved the hero', async () => {
  const r = await start([box(1, 3, 3, 1)])
  r.draw(1, feel({ freeze: 4 }))
  const held = r.heroes()
  r.apply(step([box(1, 6, 3, 1)]))
  r.draw(1, feel({ freeze: 3 }))
  expect(r.heroes()).toEqual(held)
  r.draw(1, feel())
  expect(r.heroes()[0]?.x).toBeGreaterThan((held[0]?.x ?? 0) + 100)
})

test('while the frame says freeze, the box stays where it was drawn though a step moved it, and the dust still moves', async () => {
  const r = await start([box(1, 2, 3)])
  const row = where(PHONE, 2, 3).y
  r.draw(1, feel({ freeze: 4, specks: [speck(7, 1, 1, 0x00aa00)] }))
  const drawn = rowSpan(r.canvas, row)
  r.apply(step([box(1, 5, 3)]))
  r.draw(1, feel({ freeze: 3, specks: [speck(7, 5, 1, 0x00aa00)] }))
  expect(rowSpan(r.canvas, row)?.left).toBe(drawn?.left)
  const low = where(PHONE, 7, 5)
  expect(pixel(r.canvas, low.x, low.y)[1]).toBeGreaterThan(120)
  // Where the speck was, there is sky again: the same colour as the sky well away from anything drawn.
  const old = where(PHONE, 7, 1)
  const sky = where(PHONE, 4, 0.2)
  const here = pixel(r.canvas, old.x, old.y)
  const clear = pixel(r.canvas, sky.x, sky.y)
  for (const channel of [0, 1, 2])
    expect(Math.abs((here[channel] ?? 0) - (clear[channel] ?? 0))).toBeLessThanOrEqual(6)
})

test('the first frame of a freeze shows the newest step, and a thing removed in that step is gone', async () => {
  const r = await start([box(1, 2, 3), box(2, 6, 3)])
  r.draw(1, feel())
  r.apply(step([], [2]))
  r.draw(1, feel({ freeze: 4 }))
  const gone = where(PHONE, 6, 3)
  expect(rowSpan(r.canvas, gone.y)?.right).toBeLessThan(gone.x)
})

test('after the freeze the box is where the sim has it', async () => {
  const r = await start([box(1, 2, 3)])
  const row = where(PHONE, 2, 3).y
  r.draw(1, feel({ freeze: 2 }))
  const was = rowSpan(r.canvas, row)
  r.apply(step([box(1, 5, 3)]))
  r.draw(1, feel({ freeze: 1 }))
  r.draw(1, feel())
  const now = rowSpan(r.canvas, row)
  expect((now?.left ?? 0) - (was?.left ?? 0)).toBeGreaterThan(100)
})

test('place answers the newest step for a thing there, the last picture for one just removed, and undefined for one never drawn', async () => {
  const r = await start([box(1, 2, 3), box(2, 6, 4)])
  r.draw(1)
  expect(r.place(1)).toEqual({ x: 2, y: 3, w: 1, h: 1 })
  r.apply(step([box(1, 2.5, 3)]))
  expect(r.place(1)).toEqual({ x: 2.5, y: 3, w: 1, h: 1 })
  r.apply(step([], [2]))
  expect(r.place(2)).toEqual({ x: 6, y: 4, w: 1, h: 1 })
  expect(r.place(99)).toBeUndefined()
})

test('turning the mount during a shake puts back the same specks and offset; after the shake a resize has none', async () => {
  const sideways = { w: 844, h: 390 }
  const r = await start([box(1, 4, 3)])
  r.draw(1, feel({ shake: { x: 0.25, y: 0 }, specks: [speck(6, 1, 0.8, 0x00aa00)] }))
  size(sideways)
  await vi.waitFor(() => expect(r.canvas.width).toBeGreaterThanOrEqual(sideways.w))
  const f = fit(sideways)
  const resolution = r.canvas.width / sideways.w
  const row = where(sideways, 4, 3).y
  const span = rowSpan(r.canvas, row)
  expect(Math.abs((span?.left ?? 0) - (f.left + 3.5 * f.scale + 0.25 * f.scale))).toBeLessThanOrEqual(
    2 / resolution + 1,
  )
  const dust = where(sideways, 6, 1)
  expect(pixel(r.canvas, dust.x + 0.25 * f.scale, dust.y)[1]).toBeGreaterThan(120)
  // The shake is over: the loop draws a calm frame, and a later turn puts the box back with no offset.
  r.draw(1, feel())
  size(PHONE)
  await vi.waitFor(() => expect(r.canvas.width).toBe(Math.round(PHONE.w * resolution)))
  const calm = where(PHONE, 4, 3)
  expect(
    Math.abs((rowSpan(r.canvas, calm.y)?.left ?? 0) - (fit(PHONE).left + 3.5 * fit(PHONE).scale)),
  ).toBeLessThanOrEqual(2 / resolution + 1)
})

test('dust is under the sky strip kept for the thumbs', async () => {
  const at = { w: 400, h: 300 }
  size(at)
  renderer = await createRenderer({ mount, world: WORLD })
  renderer.setInset(120)
  renderer.apply(first([box(1, 4, 1)]))
  // A speck at the foot of the level, shaken down into the strip: the strip is sky, whatever shakes into it.
  renderer.draw(1, feel({ shake: { x: 0, y: 1 }, specks: [speck(4, 5.5, 1, 0x000000)] }))
  const into = pixel(renderer.canvas, 200, 195)
  expect(brightness(into)).toBeGreaterThan(150)
})
