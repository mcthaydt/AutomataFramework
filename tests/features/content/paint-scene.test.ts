// The picture of a scene's ground, on small scenes made here from flat paints (and one photo), so each test says exactly
// which pixels it expects and why.
import { expect, test } from 'vitest'
import {
  MissingPhotoError,
  type PhotoMaterial,
  type PhotoPixels,
  type Photos,
  paintScene,
  parseContent,
  type SceneFile,
  type SceneMaterial,
} from '#src/features/content/content.ts'
import { materialTile } from '#src/features/content/photo-tile.ts'
import { libraryPhotos } from '../../fixtures/content/photo-files.ts'
import { sceneGameFiles } from '../../fixtures/scene-game/read.ts'

const PAINTS = [
  { id: 'a', color: '#ff0000' },
  { id: 'b', color: '#00ff00' },
  { id: 'c', color: '#0000ff' },
]
const TILE = 8
const none: Photos = () => undefined

interface Options {
  readonly rows: readonly string[]
  readonly materials: readonly SceneMaterial[]
  readonly letters: readonly { letter: string; material: string; shape: string }[]
  readonly seed?: number
}

/** A scene of `rows` at tile 8: the letters and materials as given, in three paints. */
function sceneOf({ rows, materials, letters, seed = 1 }: Options): SceneFile {
  return {
    format: 1,
    id: 'test',
    seed,
    tile: TILE,
    size: { w: rows[0]?.length ?? 0, h: rows.length },
    paints: PAINTS,
    materials,
    ground: { letters, rows },
  } as SceneFile
}

/** One flat material of paint `paint`, with whatever else `extra` says (a top, an edge). */
const flat = (id: string, paint: string, extra: Record<string, unknown> = {}): SceneMaterial =>
  ({ id, kind: 'flat', paint, ...extra }) as SceneMaterial

/** The painted places by row, one string a row: `.` for clear and the paint's number otherwise. */
function drawn(scene: SceneFile, photos: Photos = none): string[] {
  const { width, height, pixels } = paintScene(scene, photos)
  const at = (x: number, y: number): string => {
    const place = pixels[y * width + x]
    return place === 0 ? '.' : String(place)
  }
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => at(x, y)).join(''))
}

const rock = flat('rock', 'a')
const SOLID = [{ letter: 'G', material: 'rock', shape: 'solid' }]
const SLOPE = [{ letter: '/', material: 'rock', shape: 'slope-up' }]
const LEDGE = [{ letter: '=', material: 'rock', shape: 'ledge' }]
const STONE_TILE = [{ letter: 'S', material: 'stone', shape: 'solid' }]

test('a solid tile fills its square, and air is clear', () => {
  const rows = drawn(sceneOf({ rows: ['G.'], materials: [rock], letters: SOLID }))
  expect(rows).toHaveLength(TILE)
  for (const row of rows) expect(row).toBe(`${'1'.repeat(TILE)}${'.'.repeat(TILE)}`)
})

test('a slope-up fills the pixels under its line: i + j at least 7 at tile 8, 36 of 64', () => {
  const rows = drawn(sceneOf({ rows: ['/'], materials: [rock], letters: SLOPE }))
  let filled = 0
  for (const [j, row] of rows.entries())
    for (const [i, pixel] of [...row].entries()) {
      expect(pixel === '1', `pixel ${i}, ${j}`).toBe(i + j >= TILE - 1)
      if (pixel === '1') filled++
    }
  expect(filled).toBe((TILE * (TILE + 1)) / 2)
})

test('a ledge fills its top quarter and nothing under it', () => {
  const rows = drawn(sceneOf({ rows: ['='], materials: [rock], letters: LEDGE }))
  expect(rows.filter((row) => row === '1'.repeat(TILE))).toHaveLength(TILE / 4)
  expect(rows.slice(0, TILE / 4).every((row) => row === '1'.repeat(TILE))).toBe(true)
  expect(rows.slice(TILE / 4).every((row) => row === '.'.repeat(TILE))).toBe(true)
})

test('a tile of a tileset is left clear: the renderer draws it', () => {
  const stone = { id: 'stone', kind: 'tiles', tileset: 'meadow', tile: 'stone' } as SceneMaterial
  const rows = drawn(sceneOf({ rows: ['S'], materials: [stone], letters: STONE_TILE }))
  for (const row of rows) expect(row).toBe('.'.repeat(TILE))
})

/** A photo that is one grey everywhere: its tile is one place, the middle of a three paint ladder. */
const greyPhoto: PhotoPixels = {
  width: 4,
  height: 4,
  rgba: new Uint8Array(4 * 4 * 4).fill(0x80),
  size: { w: 1, h: 1 },
}
const earth: PhotoMaterial = { id: 'earth', kind: 'photo', photo: 'grey', ladder: ['a', 'b', 'c'], wear: 0 }
const EARTH_TILE = [{ letter: 'G', material: 'earth', shape: 'solid' }]

test('a back tile shows its photo one step down the ladder, and a solid tile the ladder’s middle', () => {
  const photos: Photos = (id) => (id === 'grey' ? greyPhoto : undefined)
  const letters = [...EARTH_TILE, { letter: 'b', material: 'earth', shape: 'back' }]
  const rows = drawn(sceneOf({ rows: ['Gb'], materials: [earth], letters }), photos)
  for (const row of rows) expect(row).toBe(`${'2'.repeat(TILE)}${'1'.repeat(TILE)}`)
})

test('a photo runs across tiles with no seam', () => {
  // A photo 1.5 tiles wide: the second tile does not start the photo over.
  const photo: PhotoPixels = {
    width: 12,
    height: 8,
    rgba: Uint8Array.from({ length: 12 * 8 * 4 }, (_, i) => (i % 4 === 3 ? 255 : ((i >> 2) % 12) * 20)),
    size: { w: 1.5, h: 1 },
  }
  const wide: PhotoMaterial = { ...earth, flatten: 0, facet: 0, cluster: 1 }
  const scene = sceneOf({ rows: ['GG'], materials: [wide], letters: EARTH_TILE })
  const made = materialTile(wide, PAINTS, TILE, photo)
  expect(made.width).toBe(12)
  const { pixels, width } = paintScene(scene, (id) => (id === 'grey' ? photo : undefined))
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < 2 * TILE; x++) {
      const place = made.places[(y % made.height) * made.width + (x % made.width)] ?? 0
      expect(pixels[y * width + x], `pixel ${x}, ${y}`).toBe(place + 1)
    }
})

const turf = flat('turf', 'b')
const GRASSY = [
  { letter: 'G', material: 'earth', shape: 'solid' },
  { letter: '/', material: 'earth', shape: 'slope-up' },
]
const soil = (extra: Record<string, unknown> = {}): SceneMaterial =>
  flat('earth', 'a', { top: { material: 'turf', deep: 4 }, ...extra })

test('the top is 3, 4 or 5 deep, a little ragged, and the same every time', () => {
  const rows4 = ['....', '....', 'GGGG', 'GGGG']
  const scene = sceneOf({ rows: rows4, materials: [soil(), turf], letters: GRASSY })
  const rows = drawn(scene)
  const { width } = paintScene(scene, none)
  const depths = Array.from({ length: width }, (_, x) => rows.filter((row) => row[x] === '2').length)
  for (const depth of depths) expect([3, 4, 5]).toContain(depth)
  expect(new Set(depths).size).toBeGreaterThan(1)
  expect(drawn(scene)).toEqual(rows)
  // The turf is only the top: every pixel under it is earth.
  const first = TILE * 2
  expect(rows.slice(first + 5).every((row) => row === '1'.repeat(width))).toBe(true)
})

test('the top follows a slope: the first ground pixel of every column is turf', () => {
  const rows = drawn(sceneOf({ rows: ['/'], materials: [soil(), turf], letters: GRASSY }))
  for (let x = 0; x < TILE; x++) expect(rows[TILE - 1 - x]?.[x]).toBe('2')
})

test('the edge is one pixel where ground meets air, and not at the scene’s border', () => {
  const scene = sceneOf({
    rows: ['..', 'GG'],
    materials: [flat('rock', 'a', { edge: 'c' })],
    letters: SOLID,
  })
  const rows = drawn(scene)
  expect(rows[TILE]).toBe('3'.repeat(2 * TILE))
  for (const row of rows.slice(TILE + 1)) expect(row).toBe('1'.repeat(2 * TILE))
  // Without air anywhere, the border draws no edge.
  const full = drawn(sceneOf({ rows: ['GG'], materials: [flat('rock', 'a', { edge: 'c' })], letters: SOLID }))
  for (const row of full) expect(row).toBe('1'.repeat(2 * TILE))
})

test('a material whose photo was not given says which', () => {
  const scene = sceneOf({ rows: ['G'], materials: [earth], letters: EARTH_TILE })
  expect(() => paintScene(scene, none)).toThrow(MissingPhotoError)
  expect(() => paintScene(scene, none)).toThrow(
    'The material "earth" uses the photo "grey", and no such photo was given to the painter.',
  )
})

test('the meadow paints the same bytes twice, and other bytes with another seed', async () => {
  const parsed = parseContent('scene', sceneGameFiles['content/scenes/meadow.json'] ?? '', 'meadow.json')
  if (!parsed.ok) throw new Error('the fixture scene did not read')
  const meadow = parsed.value as SceneFile
  const photos = await libraryPhotos(['dirt', 'brick', 'stone'])
  const once = paintScene(meadow, photos)
  expect([once.width, once.height]).toEqual([384, 192])
  expect(paintScene(meadow, photos).pixels).toEqual(once.pixels)
  expect(paintScene({ ...meadow, seed: 8 }, photos).pixels).not.toEqual(once.pixels)
  expect(once.palette).toEqual([0, ...meadow.paints.map((p) => Number.parseInt(p.color.slice(1), 16))])
  expect(once.pixels.some((p) => p !== 0)).toBe(true)
})
