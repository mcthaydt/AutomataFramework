// A level with a scene, drawn in each real browser: its painted ground as the pictures, the tileset's own squares, the
// slope's clear half, no box edge over it, a picture that does not fit, and the ground changed while the level stays.
import { afterEach, beforeEach, expect, test } from 'vitest'
import {
  artFiles,
  type GameContent,
  photosUsed,
  type SceneFile,
  sceneSheet,
  writeContent,
} from '#src/features/content/content.ts'
import { ArtError, createLevelPicture, type LevelPicture, loadArt } from '#src/features/render/render.ts'
import { libraryPhotos } from '../../fixtures/content/photo-files.ts'
import { snapshot } from '../../fixtures/game/snapshot.ts'
import { loadSceneGame } from '../../fixtures/scene-game/game.ts'

const SKY = 0x9fd3f0
const SOIL = [0x4a3324, 0x6b4a33, 0x8a6444]
const GRASS = 0x5fa04a
const BRICKS = [0x6e3b34, 0x9c5a4b, 0x7d7468, 0xa79f92]
const LIT_BRICKS = [0xc08a74, 0xcfc8bb]
/** The dark edge a box is drawn with when no picture covers it. */
const OUTLINE = 0x1b1b24

let mount: HTMLDivElement
let picture: LevelPicture | undefined

beforeEach(() => {
  // 24 by 12 tiles in 512 by 288: 21.33 pixels a tile, with 16 pixels of sky above and below.
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;overflow:hidden;width:512px;height:288px'
  document.body.append(mount)
})
afterEach(() => {
  picture?.destroy()
  picture = undefined
  mount.remove()
})

const rgb = (hex: number): [number, number, number] => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]
const near = (a: readonly number[], hex: number, slack = 3): boolean =>
  a.every((channel, i) => Math.abs(channel - (rgb(hex)[i] ?? 0)) <= slack)
const nearOne = (a: readonly number[], hexes: readonly number[]): boolean => hexes.some((h) => near(a, h))

/** The game's painted pictures, the way `automata art` paints them, as a `readPicture` gives them. */
async function readerFor(content: GameContent): Promise<(path: string) => Promise<Blob>> {
  const files = Object.fromEntries(
    artFiles(content, await libraryPhotos(photosUsed(content))).map((file) => [file.path, file.bytes]),
  )
  return async (path) => {
    const bytes = files[path]
    if (bytes === undefined) throw new Error(`${path}: no such picture`)
    return new Blob([bytes.slice()], { type: 'image/png' })
  }
}

/** The scene game's level, opened with its own pictures. */
async function opened(content?: GameContent): Promise<{ content: GameContent; picture: LevelPicture }> {
  const game = content ?? (await loadSceneGame())
  const level = game.levels['level-1']
  if (level === undefined) throw new Error('the scene game has no level-1')
  const art = await loadArt({ content: game, level: 'level-1', readPicture: await readerFor(game) })
  picture = await createLevelPicture({ mount, content: game, level, art, keep: true })
  return { content: game, picture }
}

/** The canvas's colour at a place in the level, in tiles, as the picture has it fitted now. */
function colourAt(shown: LevelPicture, x: number, y: number): [number, number, number] {
  const fit = shown.fit()
  return snapshot(shown.canvas)(fit.left + x * fit.scale, fit.top + y * fit.scale)
}

test('the middle of an earth tile is one of the three soils of the ladder, and the top of the floor is turf', async () => {
  const { picture: shown } = await opened()
  expect(nearOne(colourAt(shown, 10.5, 10.5), SOIL)).toBe(true)
  // Six tiles in, on the floor's first row: a tile with air over it, whose top two pixels are turf.
  expect(near(colourAt(shown, 6.5, 6 + 2.5 / 16), GRASS)).toBe(true)
})

test('a back wall is the ladder one step darker, and a slope’s upper half is the sky', async () => {
  const { picture: shown } = await opened()
  const back = colourAt(shown, 16.5, 7.5)
  expect(nearOne(back, BRICKS)).toBe(true)
  expect(nearOne(back, LIT_BRICKS)).toBe(false)
  // The tile the slope climbs through: its upper left is above the line, so the picture leaves it clear.
  expect(near(colourAt(shown, 3.15, 7.15), SKY)).toBe(true)
})

test('a tile of the tileset is drawn from the tileset’s own picture, not left clear', async () => {
  const { picture: shown } = await opened()
  expect(near(colourAt(shown, 23.5, 8.5), SKY)).toBe(false)
})

test('no dark box edge is drawn over the ground', async () => {
  const { picture: shown } = await opened()
  const fit = shown.fit()
  const at = snapshot(shown.canvas)
  let edge = false
  // The three rows of solid ground at the bottom, the whole way across.
  for (let y = 9 * fit.scale; y < 12 * fit.scale && !edge; y += 3)
    for (let x = 0; x < 24 * fit.scale && !edge; x += 3)
      edge = near(at(fit.left + x, fit.top + y), OUTLINE, 4)
  expect(edge).toBe(false)
})

test('a scene picture one pixel too narrow stops the level with the sentence that says what to run', async () => {
  const game = await loadSceneGame()
  const scene = game.scenes?.meadow as SceneFile
  const sheet = sceneSheet(scene)
  const real = await readerFor(game)
  const narrow = document.createElement('canvas')
  narrow.width = sheet.w - 1
  narrow.height = sheet.h
  const wrong = await new Promise<Blob>((done) => narrow.toBlob((blob) => done(blob as Blob), 'image/png'))
  const readPicture = (path: string): Promise<Blob> =>
    path === 'content/scenes/meadow.png' ? Promise.resolve(wrong) : real(path)
  const error = await loadArt({ content: game, level: 'level-1', readPicture }).catch((e: unknown) => e)
  expect(error).toBeInstanceOf(ArtError)
  expect((error as ArtError).message).toContain(
    `content/scenes/meadow.png is ${sheet.w - 1} by ${sheet.h} pixels, but its scene file makes it ${sheet.w} by ${sheet.h}`,
  )
})

test('the picture is the same before and after a resize', async () => {
  const { picture: shown } = await opened()
  const before = shown.canvas.toDataURL()
  mount.style.width = '640px'
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  expect(shown.canvas.toDataURL()).not.toBe(before)
  mount.style.width = '512px'
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  expect(shown.canvas.toDataURL()).toBe(before)
})

/** The scene game with the ground tile at `col`, `row` taken away. */
async function without(col: number, row: number): Promise<GameContent> {
  const base = (await loadSceneGame()).scenes?.meadow as SceneFile
  const rows = base.ground.rows.map((text, r) =>
    r === row ? `${text.slice(0, col)}.${text.slice(col + 1)}` : text,
  )
  const scene: SceneFile = { ...base, ground: { ...base.ground, rows } }
  return loadSceneGame({ 'content/scenes/meadow.json': writeContent('scene', scene) })
}

test('showScene draws the scene again with its ground changed, and destroys the art it had', async () => {
  const { picture: shown } = await opened()
  expect(nearOne(colourAt(shown, 10.5, 10.5), SOIL)).toBe(true)
  const one = await without(10, 10)
  shown.showScene(one, await loadArt({ content: one, level: 'level-1', readPicture: await readerFor(one) }))
  expect(near(colourAt(shown, 10.5, 10.5), SKY)).toBe(true)

  // A second change: the first tile is back, the second is gone.
  const two = await without(12, 10)
  shown.showScene(two, await loadArt({ content: two, level: 'level-1', readPicture: await readerFor(two) }))
  expect(nearOne(colourAt(shown, 10.5, 10.5), SOIL)).toBe(true)
  expect(near(colourAt(shown, 12.5, 10.5), SKY)).toBe(true)
})

test('the art a picture had is destroyed when showScene gives it another', async () => {
  const game = await loadSceneGame()
  const level = game.levels['level-1']
  if (level === undefined) throw new Error('the scene game has no level-1')
  const art = await loadArt({ content: game, level: 'level-1', readPicture: await readerFor(game) })
  picture = await createLevelPicture({ mount, content: game, level, art, keep: true })
  const page = art.groundPages[0]?.texture
  const square = art.tiles[0]?.texture
  expect(page?.destroyed).toBe(false)
  expect(square?.destroyed).toBe(false)
  const next = await loadArt({ content: game, level: 'level-1', readPicture: await readerFor(game) })
  picture.showScene(game, next)
  expect(page?.destroyed).toBe(true)
  expect(square?.destroyed).toBe(true)
  expect(next.groundPages[0]?.texture.destroyed).toBe(false)
})
