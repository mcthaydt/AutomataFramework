import { Effect } from 'effect'
import { expect, test } from 'vitest'
import { readGame } from '#src/features/cli/game-folder.ts'
import { missingPhotos, photoProblems, readPhotos } from '#src/features/cli/photos.ts'
import { Files } from '#src/features/cli/ports.ts'
import { photosUsed } from '#src/features/content/content.ts'
import { decodePng } from '#src/lib/png-read.ts'
import { memoryLayer } from '../../fixtures/cli/memory.ts'
import { sceneGameInMemory } from '../../fixtures/cli/scene-game.ts'
import { photoBytes } from '../../fixtures/content/photo-files.ts'
import { sceneGameFiles } from '../../fixtures/scene-game/read.ts'

/** The meadow scene with the material that uses the library's `dirt` using the game's own `moss` instead. */
const mossy = (): string =>
  (sceneGameFiles['content/scenes/meadow.json'] ?? '').replaceAll('"photo": "dirt"', '"photo": "moss"')

/** `readPhotos` over the scene game in memory, and the paths it read bytes from. */
async function read(changes: Record<string, string | Uint8Array> = {}) {
  const memory = memoryLayer(await sceneGameInMemory('game', changes))
  const reads: string[] = []
  const program = Effect.gen(function* () {
    const files = yield* Files
    const spy = {
      ...files,
      readBytes: (path: string) => {
        reads.push(path)
        return files.readBytes(path)
      },
    }
    const folder = yield* readGame('game')
    const photos = yield* readPhotos(folder).pipe(Effect.provideService(Files, spy))
    return { folder, photos }
  }).pipe(Effect.provide(memory.layer))
  return { ...(await Effect.runPromise(program)), reads }
}

test('the library photos a scene uses are read from the package, and no other is', async () => {
  const { photos, reads, folder } = await read()
  expect(folder.loaded.ok).toBe(true)
  const used = folder.loaded.ok ? photosUsed(folder.loaded.value) : []
  expect(used).toEqual(expect.arrayContaining(['brick', 'dirt', 'stone']))
  for (const id of used) expect(photos(id), id).toBeDefined()
  expect(photos('moss')).toBeUndefined()
  expect(photos('bark')).toBeUndefined()
  expect(reads.every((path) => path.includes('/photos/') && !path.startsWith('game/'))).toBe(true)
  expect(reads.length).toBeGreaterThan(0)
})

test('a photo the game has of its own wins over a library photo with the same name', async () => {
  const own = JSON.stringify({
    format: 1,
    id: 'dirt',
    image: 'content/photos/dirt.png',
    size: { w: 2, h: 2 },
    source: 'my own photo',
    licence: 'CC0',
    credit: 'Dana',
  })
  const mine = await photoBytes('bark.png')
  const { photos } = await read({
    'content/photos/dirt.json': own,
    'content/photos/dirt.png': mine,
    'automata.toml': `${sceneGameFiles['automata.toml'] ?? ''}\n[[content]]\ntype = "photo"\npath = "content/photos/dirt.json"\n`,
  })
  const got = photos('dirt')
  expect(got?.size).toEqual({ w: 2, h: 2 })
  expect(got?.width).toBe(decodePng(mine).width)
})

test('a photo of the game’s own that has no picture is left out, and said', async () => {
  const memory = memoryLayer(await sceneGameInMemory('game', { 'content/scenes/meadow.json': mossy() }))
  memory.files.delete('game/content/photos/moss.png')
  const program = Effect.gen(function* () {
    const folder = yield* readGame('game')
    const photos = yield* readPhotos(folder)
    return {
      missing: folder.loaded.ok ? missingPhotos(folder.loaded.value, photos) : ['not loaded'],
      problems: yield* photoProblems(folder),
    }
  }).pipe(Effect.provide(memory.layer))
  const { missing, problems } = await Effect.runPromise(program)
  expect(missing).toEqual(['moss'])
  expect(problems).toEqual([
    {
      file: 'content/photos/moss.json',
      path: 'image',
      message: 'There is no picture at "content/photos/moss.png". Put the photo there.',
    },
  ])
})
