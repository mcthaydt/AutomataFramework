// A game's own photo: it reads and writes back to the same bytes, each way it can be wrong has one sentence, and a
// scene's photo material finds it, or the library's, by name.
import { expect, test } from 'vitest'
import {
  loadGame,
  type PhotoFile,
  parseContent,
  photoPictureProblem,
  writeContent,
} from '#src/features/content/content.ts'
import { PHOTO_LIBRARY } from '#src/features/content/photo-library.ts'
import { expectRoundTrip, gameProblems, problemsOf } from '../../fixtures/content/kind.ts'
import { photoBytes } from '../../fixtures/content/photo-files.ts'
import { samplePng } from '../../fixtures/content/png-samples.ts'
import { readSceneGame, sceneGameFiles } from '../../fixtures/scene-game/read.ts'

type Json = Record<string, unknown>
const file = 'content/photos/moss.json'
const moss = (): Json => JSON.parse(sceneGameFiles['content/photos/moss.json'] ?? '') as Json
const edit = (change: (photo: Json) => void): Json => {
  const photo = moss()
  change(photo)
  return photo
}
const said = (value: unknown): string[] => problemsOf('photo', value, file)

test('the fixture photo reads, and writes back to the same bytes twice', () => {
  expectRoundTrip('photo', moss())
  expect(writeContent('photo', moss() as never)).toBe(sceneGameFiles['content/photos/moss.json'])
})

test('a photo is written in the schema’s order', () => {
  expect(Object.keys(JSON.parse(writeContent('photo', moss() as never)))).toEqual([
    'format',
    'id',
    'image',
    'size',
    'source',
    'licence',
    'credit',
  ])
})

test('a library photo’s name is a photo’s name, so a game can put its own under it', () => {
  expect(said(edit((p) => (p.id = 'brickYellow')))).toEqual([])
  expect(said(edit((p) => (p.id = 'Moss')))).toEqual([
    `${file}: id: Write the photo's name, like "moss" or "brickYellow".`,
  ])
})

test('the words that say where a photo came from cannot be empty', () => {
  expect(said(edit((p) => (p.source = '')))).toEqual([
    `${file}: source: Write where the photo came from, like "my own photo".`,
  ])
  expect(said(edit((p) => (p.licence = '')))).toEqual([`${file}: licence: Write its licence, like "CC0".`])
  expect(said(edit((p) => (p.credit = '')))).toEqual([
    `${file}: credit: Write who made it, like "Dana, taken in the garden".`,
  ])
  expect(said(edit((p) => (p.credit = 'x'.repeat(201))))).toHaveLength(1)
})

test('each missing key says what to write', () => {
  const sentences: Record<string, string> = {
    source: 'Write where the photo came from, like "my own photo".',
    licence: 'Write its licence, like "CC0".',
    credit: 'Write who made it, like "Dana, taken in the garden".',
    image: 'Write where the picture is, like "content/photos/moss.png".',
    size: 'Write how big the photo looks in tiles, like { "w": 1, "h": 1 }.',
  }
  for (const [key, sentence] of Object.entries(sentences)) {
    const problems = said(edit((p) => delete p[key]))
    expect(problems.join('\n'), key).toContain(sentence)
  }
})

test('the picture’s path ends in .png and stays inside the game', () => {
  expect(said(edit((p) => (p.image = 'content/photos/moss.jpg')))).toHaveLength(1)
  expect(said(edit((p) => (p.image = '/etc/moss.png')))).toHaveLength(1)
  expect(said(edit((p) => (p.image = 'content/../../moss.png')))).toEqual([
    `${file}: image: The path may not go up a folder: remove "..".`,
  ])
})

test('the size is more than nothing and at most 16 tiles a side', () => {
  expect(said(edit((p) => (p.size = { w: 0, h: 1 }))).length).toBeGreaterThan(0)
  expect(said(edit((p) => (p.size = { w: 1, h: 17 }))).length).toBeGreaterThan(0)
  expect(said(edit((p) => (p.size = { w: 0.25, h: 16 })))).toEqual([])
})

/** A grey picture of this size, every pixel black. */
const grey = (side: number): Uint8Array =>
  samplePng({ width: side, height: side, rows: new Array<number>(side * (side + 1)).fill(0) })

const photo = (): PhotoFile => {
  const read = parseContent('photo', sceneGameFiles['content/photos/moss.json'] ?? '', file)
  if (!read.ok) throw new Error('the fixture photo did not read')
  return read.value as PhotoFile
}

test('a picture that is a PNG of a fair size has no problem', async () => {
  expect(photoPictureProblem(photo(), await photoBytes('bark.png'))).toBeUndefined()
})

test('a picture that is not there says where to put it', () => {
  expect(photoPictureProblem(photo(), undefined)).toBe(
    'There is no picture at "content/photos/moss.png". Put the photo there.',
  )
})

test('a picture over 256 a side says how big it is', () => {
  expect(photoPictureProblem(photo(), grey(512))).toBe(
    'This photo is 512 by 512 pixels. A photo can be 256 at most: make it smaller.',
  )
  expect(photoPictureProblem(photo(), grey(256))).toBeUndefined()
})

test('a picture that is not a PNG says the reader’s own sentence', () => {
  expect(photoPictureProblem(photo(), Uint8Array.of(1, 2, 3))).toBe('This file is not a PNG picture.')
})

test('the fixture game, with its own photo, loads', async () => {
  expect(await gameProblems(sceneGameFiles)).toEqual([])
  const loaded = await loadGame(readSceneGame())
  if (!loaded.ok) throw new Error('the scene game did not load')
  expect(Object.keys(loaded.value.photos ?? {})).toEqual(['moss'])
})

test('a scene’s photo is a game’s own or the library’s, or it says what there is', async () => {
  const scene = JSON.parse(sceneGameFiles['content/scenes/meadow.json'] ?? '') as {
    materials: { id: string; photo?: string }[]
  }
  const earth = scene.materials.find((m) => m.id === 'earth') as { photo?: string }
  earth.photo = 'moss'
  const own = await gameProblems({ ...sceneGameFiles, 'content/scenes/meadow.json': JSON.stringify(scene) })
  expect(own).toEqual([])
  earth.photo = 'dirt2'
  const wrong = await gameProblems({ ...sceneGameFiles, 'content/scenes/meadow.json': JSON.stringify(scene) })
  const library = Object.keys(PHOTO_LIBRARY).sort().join(', ')
  expect(wrong.join('\n')).toContain(
    `There is no photo called "dirt2". This game has: moss. The library has: ${library}.`,
  )
})
