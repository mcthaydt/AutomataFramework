import { expect, test } from 'vitest'
import { createScene } from '#src/features/render/render.ts'
import type { RenderDelta, RenderRow } from '#src/features/sim/sim.ts'

const LOOK = { w: 1, h: 2, color: 0xff0000 }

/** A row for an entity that has a transform and a look, as the sim delivers it. */
function row(
  sid: number,
  x: number,
  y = 0,
  rotation = 0,
  look: Record<string, number> | null = LOOK,
): RenderRow {
  return { sid, components: { transform: { x, y, rotation }, ...(look === null ? {} : { look }) } }
}
const delta = (d: Partial<RenderDelta>): RenderDelta => ({
  resync: false,
  added: [],
  changed: [],
  removed: [],
  ...d,
})

test('an added entity is a view at its pose, whatever alpha is', () => {
  const scene = createScene()
  scene.apply(delta({ added: [row(1, 4, 5, 0.5)] }))
  for (const alpha of [0, 0.5, 1])
    expect(scene.views(alpha)).toEqual([{ sid: 1, x: 4, y: 5, rotation: 0.5, w: 1, h: 2, color: 0xff0000 }])
})

test('a moved entity is halfway at alpha 0.5', () => {
  const scene = createScene()
  scene.apply(delta({ added: [row(1, 1)] }))
  scene.apply(delta({ changed: [row(1, 3)] }))
  expect(scene.views(0)[0]?.x).toBe(1)
  expect(scene.views(0.5)[0]?.x).toBe(2)
  expect(scene.views(1)[0]?.x).toBe(3)
})

test('rotation takes the short way', () => {
  const scene = createScene()
  scene.apply(delta({ added: [row(1, 0, 0, 3.0)] }))
  scene.apply(delta({ changed: [row(1, 0, 0, -3.0)] }))
  const half = scene.views(0.5)[0]?.rotation ?? 0
  // The long way would pass through 0; the short way passes through π.
  expect(Math.abs(Math.abs(half) - Math.PI)).toBeLessThan(0.2)
})

test('an entity that stopped changing rests at its last pose', () => {
  const scene = createScene()
  scene.apply(delta({ added: [row(1, 1)] }))
  scene.apply(delta({ changed: [row(1, 3)] }))
  scene.apply(delta({}))
  expect(scene.views(0)).toEqual(scene.views(1))
  expect(scene.views(0)[0]?.x).toBe(3)
})

test('a removed entity is gone; a resync replaces everything', () => {
  const scene = createScene()
  scene.apply(delta({ added: [row(1, 1), row(2, 2)] }))
  scene.apply(delta({ removed: [1] }))
  expect(scene.views(1).map((v) => v.sid)).toEqual([2])
  scene.apply(delta({ resync: true, added: [row(3, 3)] }))
  expect(scene.views(1).map((v) => v.sid)).toEqual([3])
})

test('an entity with no look is not drawn, and one that loses its look stops being drawn', () => {
  const scene = createScene()
  scene.apply(delta({ added: [row(1, 1, 0, 0, null), row(2, 2)] }))
  expect(scene.views(1).map((v) => v.sid)).toEqual([2])
  scene.apply(delta({ changed: [row(2, 2, 0, 0, null)] }))
  expect(scene.views(1)).toEqual([])
})

test('views come in ascending sid order', () => {
  const scene = createScene()
  scene.apply(delta({ added: [row(3, 0), row(1, 0), row(2, 0)] }))
  expect(scene.views(1).map((v) => v.sid)).toEqual([1, 2, 3])
})

test('alpha outside 0..1 is clamped, and one that is not a number counts as 1', () => {
  const scene = createScene()
  scene.apply(delta({ added: [row(1, 1)] }))
  scene.apply(delta({ changed: [row(1, 3)] }))
  expect(scene.views(-5)).toEqual(scene.views(0))
  expect(scene.views(5)).toEqual(scene.views(1))
  expect(scene.views(Number.NaN)).toEqual(scene.views(1))
})

test('a size or colour that changes is drawn as the new one at once', () => {
  const scene = createScene()
  scene.apply(delta({ added: [row(1, 1)] }))
  scene.apply(delta({ changed: [row(1, 1, 0, 0, { w: 3, h: 4, color: 0x00ff00 })] }))
  expect(scene.views(0)[0]).toMatchObject({ w: 3, h: 4, color: 0x00ff00 })
})

// Ropes and pins (plan P): a joint is drawn between where its two ends are, so a thing never hangs in the air
// unexplained.

/** A row for a joint, as the sim delivers it: physics.joint with every field. */
function jointRow(sid: number, fields: Record<string, number | boolean>): RenderRow {
  return {
    sid,
    components: {
      'physics.joint': {
        kind: 1,
        a: 0,
        b: 0,
        ax: 0,
        ay: 0,
        bx: 0,
        by: 0,
        limited: false,
        min: 0,
        max: 1,
        ...fields,
      },
    },
  }
}
const places = (link: { x1: number; y1: number; x2: number; y2: number }): number[] =>
  [link.x1, link.y1, link.x2, link.y2].map((n) => Math.round(n * 1e6) / 1e6)

test('a rope is drawn from its end on a turned thing to its end on a thing that is not drawn', () => {
  const scene = createScene()
  scene.apply(
    delta({
      added: [
        row(1, 0, 0, 0, null), // the level's anchor: a pose and no look
        row(2, 2, 3, Math.PI / 2),
        jointRow(3, { kind: 1, a: 2, b: 1, ax: 1, bx: 0.5 }),
      ],
    }),
  )
  const [link] = scene.links(1)
  expect(link).toMatchObject({ sid: 3, kind: 'rope' })
  expect(places(link as never)).toEqual([2, 4, 0.5, 0])
  expect(scene.views(1).map((v) => v.sid)).toEqual([2])
})

test('a pin is a link of kind pin, and links are blended like views', () => {
  const scene = createScene()
  scene.apply(delta({ added: [row(1, 0, 0, 0, null), row(2, 2, 0), jointRow(3, { kind: 0, a: 2, b: 1 })] }))
  scene.apply(delta({ changed: [row(2, 4, 0)] }))
  expect(scene.links(1)[0]).toMatchObject({ kind: 'pin', x1: 4, y1: 0 })
  expect(scene.links(0.5)[0]).toMatchObject({ x1: 3 })
  expect(scene.links(0)[0]).toMatchObject({ x1: 2 })
})

test('a link goes when either end goes, and comes back on a resync', () => {
  const scene = createScene()
  const all = [row(1, 0, 0, 0, null), row(2, 2, 3), jointRow(3, { a: 2, b: 1 })]
  scene.apply(delta({ added: all }))
  expect(scene.links(1)).toHaveLength(1)
  scene.apply(delta({ removed: [2] }))
  expect(scene.links(1)).toEqual([])
  scene.apply(delta({ resync: true, added: all }))
  expect(scene.links(1)).toHaveLength(1)
  scene.apply(delta({ removed: [3] }))
  expect(scene.links(1)).toEqual([])
})

test('a scene with no joints has no links', () => {
  const scene = createScene()
  scene.apply(delta({ added: [row(1, 1), row(2, 2)] }))
  expect(scene.links(1)).toEqual([])
})
