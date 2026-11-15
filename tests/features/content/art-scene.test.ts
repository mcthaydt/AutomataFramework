// A scene's picture and atlas are painted beside its file, with the game's art, and judged the way a figure's are.
import { expect, test } from 'vitest'
import {
  artFiles,
  artProblems,
  atlasText,
  formatDiagnostic,
  type GameContent,
  MissingPhotoError,
  paintedFiles,
  paintedPath,
  photosUsed,
  sceneSheet,
} from '#src/features/content/content.ts'
import { libraryPhotos, photoBytes } from '../../fixtures/content/photo-files.ts'
import { loadSceneGame, sceneGamePictures } from '../../fixtures/scene-game/game.ts'
import { sceneGameFiles } from '../../fixtures/scene-game/read.ts'

/** The fixture's own photo picture: the same bytes as the file beside its record. */
const mossPicture = (): Promise<Uint8Array> => photoBytes('bark.png')

/** `artProblems` over a set of files, as sentences. */
async function problemsOf(game: GameContent, have: Record<string, Uint8Array>): Promise<string[]> {
  const photos = await libraryPhotos(photosUsed(game))
  return (await artProblems(game, async (path) => have[path], photos)).map(formatDiagnostic)
}

test('a scene at content/scenes/meadow.json is painted beside itself', async () => {
  const game = await loadSceneGame()
  expect(paintedPath(game, 'scene', 'meadow')).toBe('content/scenes/meadow.png')
  expect(paintedPath(game, 'scene', 'nowhere')).toBeUndefined()
  const files = await sceneGamePictures()
  // The rule for where a painted file goes is written once: the list of paths agrees with what the painter wrote.
  expect([...paintedFiles(game)].sort()).toEqual(Object.keys(files).sort())
  expect(Object.keys(files)).toEqual([
    'content/scenes/meadow.png',
    'content/scenes/meadow.atlas.json',
    'content/figures/meadow.png',
    'content/figures/meadow.atlas.json',
  ])
})

test('the scene’s atlas names its one page, and is the text every writer writes', async () => {
  const game = await loadSceneGame()
  const files = await sceneGamePictures()
  const text = new TextDecoder().decode(files['content/scenes/meadow.atlas.json'])
  expect(JSON.parse(text)).toMatchObject({
    frames: { 'ground/0': { frame: { x: 0, y: 0, w: 384, h: 192 } } },
    meta: { image: 'meadow.png', size: { w: 384, h: 192 } },
  })
  const scene = game.scenes?.meadow
  if (scene === undefined) throw new Error('the scene game has no meadow')
  expect(text).toBe(atlasText(sceneSheet(scene), 'meadow.png'))
})

test('the photos a game’s scenes use are named once each, in order', async () => {
  expect(photosUsed(await loadSceneGame())).toEqual(['brick', 'dirt', 'stone'])
})

test('a scene that needs a photo cannot be painted without it', async () => {
  const game = await loadSceneGame()
  expect(() => artFiles(game)).toThrow(MissingPhotoError)
})

test('a game with every picture painted and its photo in place has no problem', async () => {
  const game = await loadSceneGame()
  const have = { ...(await sceneGamePictures()), 'content/photos/moss.png': await mossPicture() }
  expect(await problemsOf(game, have)).toEqual([])
})

test('a scene whose paint changed has a picture older than its file', async () => {
  const have = { ...(await sceneGamePictures()), 'content/photos/moss.png': await mossPicture() }
  const scene = JSON.parse(sceneGameFiles['content/scenes/meadow.json'] ?? '') as {
    paints: { id: string; color: string }[]
  }
  ;(scene.paints[0] as { color: string }).color = '#123456'
  const game = await loadSceneGame({ 'content/scenes/meadow.json': JSON.stringify(scene) })
  expect(await problemsOf(game, have)).toEqual([
    'content/scenes/meadow.png: This picture is older than its scene file. Run "automata art".',
  ])
})

test('a scene with no picture yet says to paint it', async () => {
  const game = await loadSceneGame()
  const files = await sceneGamePictures()
  const have: Record<string, Uint8Array> = { ...files, 'content/photos/moss.png': await mossPicture() }
  delete have['content/scenes/meadow.png']
  expect(await problemsOf(game, have)).toEqual([
    'content/scenes/meadow.png: This picture has not been painted. Run "automata art".',
  ])
})

test('a photo file whose picture is not there has its sentence at the photo’s file', async () => {
  const game = await loadSceneGame()
  expect(await problemsOf(game, await sceneGamePictures())).toEqual([
    'content/photos/moss.json: image: There is no picture at "content/photos/moss.png". Put the photo there.',
  ])
})

test('a photo file whose picture is not a PNG says so', async () => {
  const game = await loadSceneGame()
  const have = { ...(await sceneGamePictures()), 'content/photos/moss.png': Uint8Array.of(1, 2, 3) }
  expect(await problemsOf(game, have)).toEqual([
    'content/photos/moss.json: image: This file is not a PNG picture.',
  ])
})
