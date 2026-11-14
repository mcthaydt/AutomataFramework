// The camera in a real browser: it follows the heroes, pulls back to hold two, lets go of one who leaves, goes straight
// back after a restore, and keeps the level above the touch buttons. Heroes are boxes here: the camera does not care.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { Sprite } from '#src/features/level/level.ts'
import { createRenderer, type Renderer } from '#src/features/render/render.ts'
import type { RenderDelta, RenderRow } from '#src/features/sim/sim.ts'
import { drawnRows } from '../../fixtures/game/pixels.ts'

/** A level 40 tiles wide and 12 tall, with a view 16 by 9, on a canvas that is 32 pixels to a tile at the view. */
const WORLD = { w: 40, h: 12 }
const VIEW = { w: 16, h: 9 }
const CANVAS = { w: 512, h: 288 }

let mount: HTMLDivElement
let renderer: Renderer | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = `position:fixed;left:0;top:0;overflow:hidden;width:${CANVAS.w}px;height:${CANVAS.h}px`
  document.body.append(mount)
})
afterEach(() => {
  renderer?.destroy()
  renderer = undefined
  mount.remove()
})

/** A hero: a box a tile square that is hero number `player`. */
const hero = (sid: number, player: number, x: number, y = 6): RenderRow => ({
  sid,
  components: {
    transform: { x, y, rotation: 0 },
    look: { w: 1, h: 1, color: 0xe4572e },
    [Sprite.id]: { character: 'hero', player, pose: '', face: 1 },
  },
})

const first = (rows: RenderRow[]): RenderDelta => ({ resync: true, added: rows, changed: [], removed: [] })
const step = (rows: RenderRow[], removed: number[] = []): RenderDelta => ({
  resync: false,
  added: [],
  changed: rows,
  removed,
})

async function start(rows: RenderRow[]): Promise<Renderer> {
  renderer = await createRenderer({ mount, world: WORLD, view: VIEW })
  renderer.apply(first(rows))
  renderer.draw(1)
  return renderer
}

/** Takes `count` steps of the same things, drawing after each. */
function hold(count: number, rows: RenderRow[], removed: number[] = []): void {
  for (let i = 0; i < count; i++) {
    renderer?.apply(step(rows, i === 0 ? removed : []))
    renderer?.draw(1)
  }
}

test("the camera follows a hero who walks right, and stops at the level's end", async () => {
  const camera = await start([hero(1, 1, 3)])
  const places: number[] = []
  for (let x = 3.25; x <= 38; x += 0.25) {
    camera.apply(step([hero(1, 1, x)]))
    camera.draw(1)
    const box = camera.heroes()[0]
    if (x >= 14 && x <= 30 && box !== undefined) places.push((box.x + box.w / 2) / CANVAS.w)
  }
  expect(places.length).toBeGreaterThan(10)
  for (const place of places) {
    expect(place).toBeGreaterThan(0.3)
    expect(place).toBeLessThan(0.7)
  }
  // At the end of the level the camera has stopped, and the hero walked on across the screen to the edge.
  const end = camera.heroes()[0]
  expect(end).toBeDefined()
  expect(((end?.x ?? 0) + (end?.w ?? 0) / 2) / CANVAS.w).toBeGreaterThan(0.7)
  expect((end?.x ?? 0) + (end?.w ?? 0)).toBeLessThanOrEqual(CANVAS.w)
})

test('a second hero far away pulls the camera back until both are on the canvas', async () => {
  await start([hero(1, 1, 20)])
  const both = [hero(1, 1, 8), hero(2, 2, 34)]
  hold(80, both)
  const boxes = renderer?.heroes() ?? []
  expect(boxes.map((b) => b.player)).toEqual([1, 2])
  for (const box of boxes) {
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.w).toBeLessThanOrEqual(CANVAS.w)
  }
  // The camera is further back than the view: a tile is fewer pixels than one at the view.
  expect(boxes[0]?.w).toBeLessThan(CANVAS.w / VIEW.w - 1)
})

test('a hero who leaves gives the camera back to the one who stays', async () => {
  await start([hero(1, 1, 8), hero(2, 2, 34)])
  const wide = renderer?.heroes()[0]?.w ?? 0
  hold(80, [hero(1, 1, 8)], [2])
  const now = renderer?.heroes() ?? []
  expect(now.map((b) => b.player)).toEqual([1])
  expect(wide).toBeLessThan(CANVAS.w / VIEW.w - 1)
  expect(now[0]?.w).toBeCloseTo(CANVAS.w / VIEW.w, 0)
})

test('look puts the camera where it is told, and letting go eases back', async () => {
  const camera = await start([hero(1, 1, 30)])
  camera.look({ x: 30, y: 6, zoom: 2 })
  camera.apply(step([hero(1, 1, 30)]))
  camera.draw(1)
  // Twice as close: a tile is 64 pixels, and the hero is in the middle of the canvas.
  const zoomed = camera.heroes()[0]
  expect(zoomed?.w).toBeCloseTo(64, 0)
  expect((zoomed?.x ?? 0) + (zoomed?.w ?? 0) / 2).toBeCloseTo(CANVAS.w / 2, 0)
  expect((zoomed?.y ?? 0) + (zoomed?.h ?? 0) / 2).toBeCloseTo(CANVAS.h / 2, 0)
  camera.look(undefined)
  camera.apply(step([hero(1, 1, 30)]))
  camera.draw(1)
  const easing = camera.heroes()[0]?.w ?? 0
  // One step of letting go is part of the way, not all of it.
  expect(easing).toBeLessThan(64)
  expect(easing).toBeGreaterThan(32)
  hold(120, [hero(1, 1, 30)])
  expect(renderer?.heroes()[0]?.w).toBeCloseTo(32, 0)
})

test('a restore puts the camera straight back on the start, with no glide', async () => {
  const camera = await start([hero(1, 1, 3)])
  const atStart = camera.heroes()[0]?.x ?? Number.NaN
  for (let i = 1; i <= 120; i++) {
    camera.apply(step([hero(1, 1, 3 + i * 0.25)]))
    camera.draw(1)
  }
  expect(camera.heroes()[0]?.x).toBeGreaterThan(atStart + 100)
  // A restore is a resync delta (watch mode makes one between rounds): the camera is not left to glide back.
  camera.apply(first([hero(1, 1, 3)]))
  camera.draw(1)
  expect(camera.heroes()[0]?.x).toBeCloseTo(atStart, 0)
  camera.apply(step([hero(1, 1, 3.25)]))
  camera.draw(1)
  expect(Math.abs((camera.heroes()[0]?.x ?? 0) - (atStart + 8))).toBeLessThanOrEqual(1)
})

test('the level is still fitted above the touch buttons', async () => {
  // The ground is the level's bottom row, which the camera at the hero's height shows below the room it is given.
  const ground: RenderRow = {
    sid: 9,
    components: { transform: { x: 20, y: 11.5, rotation: 0 }, look: { w: 40, h: 1, color: 0xff00ff } },
  }
  const camera = await start([hero(1, 1, 20), ground])
  camera.setInset(96)
  camera.apply(step([hero(1, 1, 20), ground]))
  camera.draw(1)
  const rows = drawnRows(camera.canvas)
  expect(rows).toBeDefined()
  expect(rows?.bottom ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(CANVAS.h - 96 + 1)
})
