// A game with a scene, played the way a player plays it, in each real browser: the ground is drawn from the scene's own
// pictures, holding right walks the hero up the meadow's slope, a jump from under the ledge ends on top of it, and the
// meadow is photographed at five sizes for the `ci-screens` branch. The built-in hero walks it, as a game's own would.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { Player } from '#src/features/commands/commands.ts'
import { artFiles, type GameContent, photosUsed } from '#src/features/content/content.ts'
import { type Game, startGame } from '#src/features/game/game.ts'
import { testHost } from '#src/features/host/host.ts'
import { Body, Touching, Transform } from '#src/features/physics/physics.ts'
import type { HeroBox } from '#src/features/render/render.ts'
import { libraryPhotos } from '../../fixtures/content/photo-files.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { snapshot } from '../../fixtures/game/snapshot.ts'
import { chosenLocale } from '../../fixtures/locale/chosen.ts'
import { loadSceneMovesGame, type Start } from '../../fixtures/scene-game/moves.ts'

const FRAME = 1000 / 60
const SKY = 0x9fd3f0
const SOIL = [0x4a3324, 0x6b4a33, 0x8a6444]
/** The meadow's slope crest, and the ledge's top, in tiles from the top of the level. */
const CREST = { x: 5, y: 6 }
const LEDGE_TOP = 4

let mount: HTMLDivElement
let game: Game | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  game?.stop()
  game = undefined
  mount.remove()
  vi.restoreAllMocks()
})

/** The game's pictures, painted the way `automata art` paints them, as a page's `readPicture` gives one. */
async function readerFor(content: GameContent): Promise<(path: string) => Promise<Blob>> {
  const files = Object.fromEntries(
    artFiles(content, await libraryPhotos(photosUsed(content))).map((file) => [file.path, file.bytes]),
  )
  return async (path) => {
    const bytes = files[path]
    if (bytes === undefined) throw new Error(`${path}: no such picture`)
    return new Blob([bytes.slice()], { type: path.endsWith('.png') ? 'image/png' : 'application/json' })
  }
}

/** The meadow with its hero at `start`, on a screen of this size. */
async function begin(
  start: Start,
  w = 1280,
  h = 720,
): Promise<{ g: Game; frames: ManualFrames; content: GameContent }> {
  await page.viewport(w, h)
  const content = await loadSceneMovesGame(start)
  const frames = manualFrames()
  const g = await startGame({
    content,
    locale: await chosenLocale(content, 'ko'),
    mount,
    host: testHost(),
    frames,
    readPicture: await readerFor(content),
  })
  game = g
  frames.at(0)
  return { g, frames, content }
}

const run = (frames: ManualFrames, n: number): void => {
  for (let i = 0; i < n; i++) frames.advance(FRAME)
}
const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}
const hero = (g: Game): { x: number; y: number; below: boolean; vy: number } => {
  const found = g.sim.query(Player, Transform, Body, Touching)[0]
  if (found === undefined) throw new Error('no hero')
  return {
    x: found.get(Transform).x,
    y: found.get(Transform).y,
    below: found.get(Touching).below,
    vy: found.get(Body).vy,
  }
}
const boxOf = (g: Game): HeroBox => {
  const found = g.heroes()[0]
  if (found === undefined) throw new Error('the hero is not on the canvas')
  return found
}

const rgb = (hex: number): [number, number, number] => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]
const near = (colour: readonly number[], hex: number, slack = 6): boolean =>
  colour.every((channel, i) => Math.abs(channel - (rgb(hex)[i] ?? 0)) <= slack)

/** The canvas's colour at a place in the level, in tiles, found from where the hero is (a hero is a tile tall). */
function colourAt(g: Game, x: number, y: number): readonly number[] {
  const box = boxOf(g)
  const at = hero(g)
  const scale = box.h
  const canvas = mount.querySelector('canvas')
  if (canvas === null) throw new Error('no canvas')
  return snapshot(canvas)(box.x + box.w / 2 + (x - at.x) * scale, box.y + box.h / 2 + (y - at.y) * scale)
}

test('the ground is drawn from the scene: soil under the floor, sky over it', async () => {
  const { g, frames } = await begin({ x: 1, y: 8.5 })
  run(frames, 30)
  expect(SOIL.some((hex) => near(colourAt(g, 12, 10.5), hex))).toBe(true)
  expect(near(colourAt(g, 12, 2), SKY)).toBe(true)
})

test('holding right walks the hero up the slope and over its crest, and the picture follows it up', async () => {
  const { g, frames } = await begin({ x: 1, y: 8.5 })
  run(frames, 30)
  const from = { ...hero(g), box: boxOf(g).y }
  key('keydown', 'ArrowRight')
  run(frames, 100)
  key('keyup', 'ArrowRight')
  const now = hero(g)
  expect(now.x).toBeGreaterThan(CREST.x)
  // The floor is a tile and a half lower than the crest's flat ground, and the hero is standing on it.
  expect(now.y).toBeLessThan(from.y - 2.5)
  expect(boxOf(g).y).toBeLessThan(from.box - 2.5 * boxOf(g).h)
})

test('a jump from under the ledge goes up through it and lands on its top', async () => {
  const { g, frames } = await begin({ x: 7.5, y: CREST.y - 0.5 })
  run(frames, 30)
  key('keydown', 'Space')
  let highest = Number.POSITIVE_INFINITY
  for (let i = 0; i < 240; i++) {
    run(frames, 1)
    highest = Math.min(highest, hero(g).y)
  }
  key('keyup', 'Space')
  expect(highest).toBeLessThan(LEDGE_TOP - 0.5)
  expect(Math.abs(hero(g).y - (LEDGE_TOP - 0.5))).toBeLessThan(0.1)
  expect(hero(g).below).toBe(true)
})

for (const [name, w, h] of SCREENS) {
  test(`on ${name} the meadow is photographed with its hero on the slope`, async () => {
    const { g, frames } = await begin({ x: 3.5, y: 6.5 }, w, h)
    run(frames, 60)
    expect(SOIL.some((hex) => near(colourAt(g, 12, 10.5), hex))).toBe(true)
    await page.screenshot({ element: mount, path: `__screenshots__/scene-${w}x${h}.png` })
  })
}
