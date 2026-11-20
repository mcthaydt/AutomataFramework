// `Game.levelAt` in each real browser: a point on the mount is turned into the spot in the level that the picture shows
// there. The picture is the judge: the canvas is read at many points, and wherever it shows sky or ground clearly (more
// than BOUND tiles from a tile's edge), the spot `levelAt` gives must be in an open tile or a solid one to match. The
// level's solid tiles are scattered so that no two columns look alike, so a spot a tile or two off is caught.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { GameContent } from '#src/features/content/content.ts'
import { type Game, startGame } from '#src/features/game/game.ts'
import { testHost } from '#src/features/host/host.ts'
import { SKY_COLOR, TILE_COLOR } from '#src/features/level/level.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { editLevel, type LevelJson, loadLinksGame } from '../../fixtures/links-game/read.ts'
import { chosenLocale } from '../../fixtures/locale/chosen.ts'

const FRAME = 1000 / 60
/** How near a tile's edge a point may be and still be judged: the answer must be right to within this many tiles. */
const BOUND = 0.2
/** The gap between the points read, in CSS pixels. */
const STEP = 7

let mount: HTMLDivElement
let game: Game | undefined
/** The page's own pixel density, put back after a test that changes it. */
let ownDensity: PropertyDescriptor | undefined

beforeEach(() => {
  mount = document.createElement('div')
  document.body.append(mount)
  // No touch buttons: the whole mount is the level's.
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
  ownDensity = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio')
})
afterEach(() => {
  game?.stop()
  game = undefined
  mount.remove()
  vi.restoreAllMocks()
  if (ownDensity === undefined) Reflect.deleteProperty(window, 'devicePixelRatio')
  else Object.defineProperty(window, 'devicePixelRatio', ownDensity)
})

const size = (w: number, h: number): void => {
  mount.style.cssText = `position:fixed;left:0;top:0;overflow:hidden;width:${w}px;height:${h}px`
}

/** Room 1 with only its door, a wall at each end, the floor, and one solid tile in each column at a row no neighbour shares. */
const scattered = (level: LevelJson, start: number): void => {
  level.tiles = Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 16 }, (_, col) => {
      if (row === 8 || col === 0 || col === 15) return '#'
      return row === (col * 3) % 7 ? '#' : '.'
    }).join(''),
  )
  // The door out stays: room 2's door leads to it.
  level.things = level.things.filter((t) => t.id === 'exit')
  level.starts = [
    { player: 1, x: start, y: 7.5 },
    { player: 2, x: start - 1, y: 7.5 },
  ]
}

/** The links game with room 1 scattered, the hero starting at `start`, and a view when one is given. */
const roomOne = (start: number, view?: { w: number; h: number }): Promise<GameContent> =>
  loadLinksGame(
    editLevel('room-1', (level) => {
      scattered(level, start)
      if (view !== undefined) level.view = view
    }),
  )

async function begin(content: GameContent, level?: string): Promise<{ g: Game; frames: ManualFrames }> {
  const frames = manualFrames()
  const g = await startGame({
    content,
    locale: await chosenLocale(content, 'en'),
    mount,
    host: testHost(),
    frames,
    ...(level === undefined ? {} : { level }),
  })
  game = g
  frames.at(0)
  return { g, frames }
}

/** The canvas as drawn, copied so it can be read later: a WebGL canvas is cleared once the page has shown it. */
function photo(): (x: number, y: number) => [number, number, number] {
  const canvas = mount.querySelector('canvas')
  if (canvas === null) throw new Error('no canvas')
  const copy = document.createElement('canvas')
  copy.width = canvas.width
  copy.height = canvas.height
  const context = copy.getContext('2d', { willReadFrequently: true })
  if (context === null) throw new Error('no 2D canvas to read pixels with')
  context.drawImage(canvas, 0, 0)
  const data = context.getImageData(0, 0, copy.width, copy.height).data
  const density = canvas.width / canvas.clientWidth
  return (x, y) => {
    const i = (Math.floor(y * density) * copy.width + Math.floor(x * density)) * 4
    return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0]
  }
}

const near = (rgb: [number, number, number], color: number): boolean =>
  Math.abs(rgb[0] - ((color >> 16) & 255)) <= 12 &&
  Math.abs(rgb[1] - ((color >> 8) & 255)) <= 12 &&
  Math.abs(rgb[2] - (color & 255)) <= 12

interface Judged {
  /** Points where the picture shows sky or ground clearly and the spot was judged against it. */
  readonly judged: number
  /** Points where the spot is in the wrong kind of tile, or no spot is given where the level is drawn. */
  readonly wrong: readonly string[]
  /** The levels the spots were in. */
  readonly levels: ReadonlySet<string>
  /** Points of sky with no level under them (bars, or a gap). */
  readonly outside: number
}

/** Reads the picture at every STEP pixels and judges `levelAt` at each point against it. */
function judge(g: Game, content: GameContent, shot: ReturnType<typeof photo>, w: number, h: number): Judged {
  let judged = 0
  let outside = 0
  const wrong: string[] = []
  const levels = new Set<string>()
  for (let y = STEP / 2; y < h; y += STEP)
    for (let x = STEP / 2; x < w; x += STEP) {
      const rgb = shot(x, y)
      const sky = near(rgb, SKY_COLOR)
      const ground = near(rgb, TILE_COLOR)
      const spot = g.levelAt(x, y)
      if (spot === undefined) {
        // Nothing of a level is drawn there, so only sky may show.
        if (sky) outside++
        else wrong.push(`(${x}, ${y}) shows ${rgb.join(',')} but has no level`)
        continue
      }
      levels.add(spot.level)
      if (!sky && !ground) continue
      const col = Math.floor(spot.x)
      const row = Math.floor(spot.y)
      const edge = Math.min(spot.x - col, col + 1 - spot.x, spot.y - row, row + 1 - spot.y)
      if (edge < BOUND) continue
      const tiles = content.levels[spot.level]?.tiles ?? []
      const solid = tiles[row]?.[col] === '#'
      judged++
      if (solid !== ground)
        wrong.push(
          `(${x}, ${y}) shows ${ground ? 'ground' : 'sky'} but is ${spot.level} (${spot.x.toFixed(2)}, ${spot.y.toFixed(2)})`,
        )
    }
  return { judged, wrong, levels, outside }
}

test('phone sideways, the camera on a hero far right of the middle: each point is the tile the picture shows', async () => {
  size(844, 390)
  const content = await roomOne(10.5, { w: 6, h: 4 })
  const { g, frames } = await begin(content)
  for (let i = 0; i < 30; i++) frames.advance(FRAME)
  const seen = judge(g, content, photo(), 844, 390)
  expect(seen.wrong).toEqual([])
  expect(seen.levels).toEqual(new Set(['room-1']))
  // The level fills the mount: no point is outside it, and most points were judged.
  expect(seen.outside).toBe(0)
  expect(seen.judged).toBeGreaterThan(2000)
  // The hero is where the level says: the middle of its box on the canvas is its place in the level.
  const box = g.heroes()[0]
  expect(box).toBeDefined()
  const middle = g.levelAt((box?.x ?? 0) + (box?.w ?? 0) / 2, (box?.y ?? 0) + (box?.h ?? 0) / 2)
  expect(middle?.level).toBe('room-1')
  expect(Math.abs((middle?.x ?? 0) - 10.5)).toBeLessThan(BOUND)
})

test('at twice the pixel density the answer is the same in CSS pixels', async () => {
  Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true })
  size(844, 390)
  const content = await roomOne(10.5, { w: 6, h: 4 })
  const { g, frames } = await begin(content)
  for (let i = 0; i < 30; i++) frames.advance(FRAME)
  const canvas = mount.querySelector('canvas')
  expect(canvas?.width).toBe(844 * 2)
  const seen = judge(g, content, photo(), 844, 390)
  expect(seen.wrong).toEqual([])
  expect(seen.judged).toBeGreaterThan(2000)
})

test('paused, then the mount changes size: the answer follows the picture drawn again at the new size', async () => {
  size(844, 390)
  const content = await roomOne(10.5, { w: 6, h: 4 })
  const { g, frames } = await begin(content)
  for (let i = 0; i < 30; i++) frames.advance(FRAME)
  g.pause()
  const before = g.levelAt(200, 200)
  size(390, 844)
  // The game's own watcher hears the new size and draws the last picture again at it, with no step.
  const canvas = mount.querySelector('canvas')
  await vi.waitUntil(() => canvas?.width === Math.round(390 * window.devicePixelRatio))
  expect(g.paused()).toBe(true)
  // The same point is somewhere else in the level now: the picture changed with the mount.
  expect(before).toBeDefined()
  const now = g.levelAt(200, 200)
  expect(now).toBeDefined()
  expect(now).not.toEqual(before)
  // A WebGL canvas is cleared once the page has shown it, so the picture is read after one step taken by hand, which
  // draws at once. The hero stands still, so the step moves nothing: the answer is the one given before it.
  g.step()
  const shot = photo()
  expect(g.paused()).toBe(true)
  expect(Math.abs((g.levelAt(200, 200)?.x ?? 0) - (now?.x ?? 0))).toBeLessThan(0.01)
  expect(Math.abs((g.levelAt(200, 200)?.y ?? 0) - (now?.y ?? 0))).toBeLessThan(0.01)
  const seen = judge(g, content, shot, 390, 844)
  expect(seen.wrong).toEqual([])
  expect(seen.judged).toBeGreaterThan(1500)
  // The level is taller than it is wide here, so it is centred with sky above and below it, which is no level.
  expect(seen.outside).toBeGreaterThan(500)
})

test('with no view the whole level is fitted, and the bars beside it are no level at all', async () => {
  size(844, 390)
  const content = await roomOne(10.5)
  const { g, frames } = await begin(content)
  for (let i = 0; i < 5; i++) frames.advance(FRAME)
  const seen = judge(g, content, photo(), 844, 390)
  expect(seen.wrong).toEqual([])
  expect(seen.judged).toBeGreaterThan(1500)
  // 16 by 9 tiles in 844 by 390 is 43 1/3 pixels a tile, so the level is 693 pixels wide and the bars 75 or so each.
  expect(seen.outside).toBeGreaterThan(500)
  expect(g.levelAt(20, 200)).toBeUndefined()
  expect(g.levelAt(824, 200)).toBeUndefined()
  expect(g.levelAt(-1, 200)).toBeUndefined()
  expect(g.levelAt(422, 391)).toBeUndefined()
  const middle = g.levelAt(422, 195)
  expect(middle?.level).toBe('room-1')
  expect(middle?.x).toBeCloseTo(8, 1)
  expect(middle?.y).toBeCloseTo(4.5, 1)
})

test("in a place of joined levels each spot is in the level under it, in that level's own tiles", async () => {
  size(640, 360)
  const content = await loadLinksGame()
  const { g, frames } = await begin(content, 'room-2')
  for (let i = 0; i < 5; i++) frames.advance(FRAME)
  const seen = judge(g, content, photo(), 640, 360)
  expect(seen.wrong).toEqual([])
  expect(seen.levels).toEqual(new Set(['room-2', 'room-3']))
  // 32 tiles across 640 pixels is 20 a tile, with 90 pixels of sky above and below. Room 3's right wall is its own
  // column 15, not the place's 31.
  const wall = g.levelAt(630, 180)
  expect(wall?.level).toBe('room-3')
  expect(wall?.x).toBeCloseTo(15.5, 1)
  expect(wall?.y).toBeCloseTo(4.5, 1)
  expect(g.levelAt(10, 180)?.level).toBe('room-2')
  expect(g.levelAt(320, 40)).toBeUndefined()
})

test('after stop there is no level under any point', async () => {
  size(844, 390)
  const { g, frames } = await begin(await roomOne(10.5, { w: 6, h: 4 }))
  frames.advance(FRAME)
  expect(g.levelAt(422, 195)).toBeDefined()
  g.stop()
  expect(g.levelAt(422, 195)).toBeUndefined()
})
