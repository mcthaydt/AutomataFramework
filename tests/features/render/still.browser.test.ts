// A level drawn still, in each real browser: the game's own pictures, a level moved, room kept on one side, a game with
// no pictures at all, and cleaning up.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { type GameContent, type Level, loadGame } from '#src/features/content/content.ts'
import { TILE_COLOR } from '#src/features/level/level.ts'
import { type Art, createLevelPicture, type LevelPicture, loadArt } from '#src/features/render/render.ts'
import { fullGamePictures, readFullGamePicture } from '../../fixtures/full-game/pictures.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { snapshot } from '../../fixtures/game/snapshot.ts'

const SKY = 0x9fd3f0
const GRASS = 0xafd472
const CRATE = 0xc9a227

let mount: HTMLDivElement
let picture: LevelPicture | undefined
let art: Art | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;overflow:hidden;width:512px;height:288px'
  document.body.append(mount)
})
afterEach(() => {
  // Destroying the picture frees its art; an art that never reached one is freed here.
  picture?.destroy()
  art?.destroy()
  picture = undefined
  art = undefined
  mount.remove()
})

async function loaded(): Promise<{ content: GameContent; level: Level }> {
  const game = await loadGame(readFullGame())
  if (!game.ok) throw new Error('the full game did not load')
  const level = game.value.levels['level-1']
  if (level === undefined) throw new Error('the full game has no level-1')
  return { content: game.value, level }
}

const rgb = (hex: number): [number, number, number] => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]
const near = (a: readonly number[], hex: number, slack = 24): boolean =>
  a.every((channel, i) => Math.abs(channel - (rgb(hex)[i] ?? 0)) <= slack)

/** Opens the full game's level with its own pictures. */
async function opened(): Promise<{ content: GameContent; level: Level; picture: LevelPicture }> {
  const { content, level } = await loaded()
  art = await loadArt({ content, readPicture: readFullGamePicture })
  picture = await createLevelPicture({ mount, content, level, art, keep: true })
  // The picture frees its art now.
  art = undefined
  return { content, level, picture }
}

/** The canvas's colour at the middle of a place in the level, as the picture has it fitted now. */
function colourAt(shown: LevelPicture, x: number, y: number): [number, number, number] {
  const fit = shown.fit()
  return snapshot(shown.canvas)(fit.left + x * fit.scale, fit.top + y * fit.scale)
}

test('the level is drawn in its own pictures: grass on the ground row, the crate in its colour', async () => {
  expect(Object.keys(await fullGamePictures())).toContain('content/figures/meadow.png')
  const { picture: shown } = await opened()
  const fit = shown.fit()
  const at = snapshot(shown.canvas)
  // The grass is the top of each ground tile, so look down the whole row for it.
  let grass = false
  for (let y = 8 * fit.scale; y < 9 * fit.scale && !grass; y += 2)
    for (let x = 0; x < 16 * fit.scale && !grass; x += 2)
      grass = near(at(fit.left + x, fit.top + y), GRASS, 8)
  expect(grass).toBe(true)
  expect(near(colourAt(shown, 6.5, 7.5), CRATE)).toBe(true)
})

test('show draws a changed level: the crate has moved two tiles right', async () => {
  const { level, picture: shown } = await opened()
  const before = colourAt(shown, 6.5, 7.5)
  expect(near(before, CRATE)).toBe(true)
  shown.show({
    ...level,
    things: level.things.map((thing) => (thing.id === 'crate-1' ? { ...thing, x: thing.x + 2 } : thing)),
  })
  expect(near(colourAt(shown, 6.5, 7.5), CRATE)).toBe(false)
  expect(near(colourAt(shown, 8.5, 7.5), CRATE)).toBe(true)
})

test('setRoom moves the level where fit says, and the sky still fills the room', async () => {
  mount.style.width = '600px'
  mount.style.height = '300px'
  const { picture: shown } = await opened()
  const before = shown.fit()
  shown.setRoom({ top: 0, right: 200, bottom: 0, left: 0 })
  const after = shown.fit()
  // 400 by 300 is left: the level is 16 tiles wide, so 25 pixels a tile.
  expect(after.scale).toBe(25)
  expect(after.left).toBe(0)
  expect(before.left).toBeGreaterThan(after.left)
  expect(near(colourAt(shown, 6.5, 7.5), CRATE)).toBe(true)
  expect(near(snapshot(shown.canvas)(590, 10), SKY)).toBe(true)
})

test('a game with no pictures draws each thing as its character’s box', async () => {
  const { content, level } = await loaded()
  picture = await createLevelPicture({ mount, content, level, keep: true })
  const hero = content.characters.hero
  if (hero === undefined) throw new Error('the full game has a hero')
  expect(near(colourAt(picture, 6.5, 7.5), CRATE)).toBe(true)
  expect(near(colourAt(picture, 2.5, 7.5), Number.parseInt(hero.color.slice(1), 16))).toBe(true)
  expect(near(colourAt(picture, 9, 8.5), TILE_COLOR)).toBe(true)
})

test('destroy twice does not throw, and the mount is left empty', async () => {
  const { picture: shown } = await opened()
  expect(mount.children).toHaveLength(1)
  shown.destroy()
  expect(() => shown.destroy()).not.toThrow()
  expect(mount.children).toHaveLength(0)
  picture = undefined
})
