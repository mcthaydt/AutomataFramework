// The photo pipeline, on photos made here so each test says exactly what is in them.
import { expect, test } from 'vitest'
import type { PhotoMaterial, ScenePaint } from '#src/features/content/content.ts'
import type { PhotoPixels } from '#src/features/content/photo-library.ts'
import { materialTile } from '#src/features/content/photo-tile.ts'

const GREY_DARK = 0x40
const GREY_LIGHT = 0xc0

/** A `side` by `side` photo that is `pixel(x, y)` (0xrrggbb) everywhere, spanning `size` tiles. */
function photoOf(
  pixel: (x: number, y: number) => number,
  size: { w: number; h: number } = { w: 1, h: 1 },
  side = 16,
): PhotoPixels {
  const rgba = new Uint8Array(side * side * 4)
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++) {
      const c = pixel(x, y)
      rgba.set([(c >> 16) & 255, (c >> 8) & 255, c & 255, 255], (y * side + x) * 4)
    }
  return { width: side, height: side, rgba, size }
}

const grey = (v: number): number => (v << 16) | (v << 8) | v
/** Two greys in two by two cells, and a red block of four by four in the middle. */
const checker = (x: number, y: number): number => {
  if (x >= 6 && x < 10 && y >= 6 && y < 10) return 0xcc2222
  return ((x >> 1) + (y >> 1)) % 2 === 0 ? grey(GREY_DARK) : grey(GREY_LIGHT)
}

const PAINTS: ScenePaint[] = [
  { id: 'g1', color: '#202020' },
  { id: 'g2', color: '#606060' },
  { id: 'g3', color: '#a0a0a0' },
  { id: 'r1', color: '#601010' },
  { id: 'r2', color: '#a02020' },
  { id: 'r3', color: '#e04040' },
]
const LADDER = ['g1', 'g2', 'g3']
const ACCENT = ['r1', 'r2', 'r3']
const LADDER_PLACES = [0, 1, 2]
const ACCENT_PLACES = [3, 4, 5]

/** A photo material that leaves the photo as it is (no flatten, no facet, no wear) unless a knob says otherwise. */
const material = (knobs: Partial<PhotoMaterial> = {}): PhotoMaterial => ({
  id: 'm',
  kind: 'photo',
  photo: 'checker',
  ladder: LADDER,
  flatten: 0,
  facet: 0,
  wear: 0,
  ...knobs,
})

const placesOf = (m: PhotoMaterial, photo: PhotoPixels, tile = 16) =>
  materialTile(m, PAINTS, tile, photo).places

test('a tile is the photo’s size in tiles times the tile, each way', () => {
  const photo = photoOf(checker)
  expect(materialTile(material(), PAINTS, 8, photo)).toMatchObject({ width: 8, height: 8 })
  expect(materialTile(material({ scale: 2 }), PAINTS, 8, photo)).toMatchObject({ width: 16, height: 16 })
  const wide = photoOf(checker, { w: 2, h: 1 })
  expect(materialTile(material(), PAINTS, 8, wide)).toMatchObject({ width: 16, height: 8 })
})

test('a quarter turn swaps the sides of a photo that is not square', () => {
  const wide = photoOf(checker, { w: 2, h: 1 })
  expect(materialTile(material({ turn: true }), PAINTS, 8, wide)).toMatchObject({ width: 8, height: 16 })
})

test('a tile has at least two pixels each way', () => {
  expect(materialTile(material(), PAINTS, 4, photoOf(checker, { w: 0.27, h: 0.27 }))).toMatchObject({
    width: 2,
    height: 2,
  })
})

test('in ladder mode every place is one of the paints the material names', () => {
  const places = placesOf(material({ accent: ACCENT }), photoOf(checker))
  for (const place of places) expect([...LADDER_PLACES, ...ACCENT_PLACES]).toContain(place)
  const plain = placesOf(material(), photoOf(checker))
  for (const place of plain) expect(LADDER_PLACES).toContain(place)
})

test('in match mode every place is a paint of the scene, and two colours keep two paints', () => {
  const photo = photoOf((x, y) => (((x >> 1) + (y >> 1)) % 2 === 0 ? grey(GREY_DARK) : grey(GREY_LIGHT)))
  const places = placesOf(
    { id: 'm', kind: 'photo', photo: 'x', match: 2, flatten: 0, facet: 0, wear: 0 },
    photo,
  )
  for (const place of places) expect(place).toBeLessThan(PAINTS.length)
  expect(new Set(places).size).toBe(2)
})

test('a flat grey photo is one place everywhere when it is not worn', () => {
  const places = placesOf(
    material(),
    photoOf(() => grey(0x80)),
  )
  expect(new Set(places).size).toBe(1)
  expect(places[0]).toBe(1) // the middle of three paints
})

test('wear darkens some texels one place, and none goes below the first paint', () => {
  const worn = placesOf(
    material({ wear: 1 }),
    photoOf(() => grey(0x80)),
    32,
  )
  expect([...new Set(worn)].sort((a, b) => a - b)).toEqual([0, 1])
})

test('the same input gives the same bytes twice, and another seed gives other bytes', () => {
  const photo = photoOf(checker)
  const once = placesOf(material({ wear: 1 }), photo, 32)
  expect(placesOf(material({ wear: 1 }), photo, 32)).toEqual(once)
  expect(placesOf(material({ wear: 1, seed: 5 }), photo, 32)).not.toEqual(once)
})

test('a run that touches both edges is one run: the tile wraps', () => {
  // The two left columns and the two right columns are dark, the rest light. Apart they are 32 texels each, under the
  // 50 a cluster must have to stay; together they are 64, and stay.
  const photo = photoOf((x) => (x < 2 || x >= 14 ? grey(GREY_DARK) : grey(GREY_LIGHT)))
  const places = placesOf(material({ ladder: ['g1', 'g2'], cluster: 50 }), photo)
  expect([...places].filter((place) => place === 0)).toHaveLength(64)
})

test('ladder with accent puts the red block on the accent’s paints', () => {
  const places = placesOf(material({ accent: ACCENT }), photoOf(checker))
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const inBlock = x >= 6 && x < 10 && y >= 6 && y < 10
      const place = places[y * 16 + x] as number
      expect(inBlock ? ACCENT_PLACES : LADDER_PLACES, `texel ${x}, ${y}`).toContain(place)
    }
})
