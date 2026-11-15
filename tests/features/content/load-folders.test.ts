// A game whose project file lists folders: every json file directly in one is part of the game, as the kind the folder is for.
import { expect, test } from 'vitest'
import { formatDiagnostic, loadGame } from '#src/features/content/content.ts'
import { listOver, musicText, soundText, withFolderBlocks } from '../../fixtures/content/folders.ts'
import { readFiles } from '../../fixtures/content/kind.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

const SOUNDS = [{ type: 'sound', folder: 'content/sounds' }] as const

function gameWith(
  extra: Record<string, string | undefined>,
  blocks: readonly { type: 'sound' | 'music' | 'level'; folder: string }[] = SOUNDS,
): Record<string, string | undefined> {
  return { ...fixtureFiles, 'automata.toml': withFolderBlocks(blocks), ...extra }
}

async function load(files: Record<string, string | undefined>, withList = true) {
  return loadGame(readFiles(files), withList ? listOver(files) : undefined)
}

async function problems(files: Record<string, string | undefined>): Promise<string[]> {
  const loaded = await load(files)
  return loaded.ok ? [] : loaded.diagnostics.map(formatDiagnostic)
}

test('every json file in a listed folder is loaded as that kind, in name order', async () => {
  const files = gameWith({
    'content/sounds/b.json': soundText('b'),
    'content/sounds/a.json': soundText('a'),
  })
  const loaded = await load(files)
  expect(loaded.ok).toBe(true)
  if (!loaded.ok) return
  expect(Object.keys(loaded.value.sounds ?? {})).toEqual(['a', 'b'])
  const sounds = loaded.value.project.content.filter((ref) => ref.type === 'sound')
  expect(sounds.map((ref) => ref.path)).toEqual(['content/sounds/a.json', 'content/sounds/b.json'])
  expect(loaded.value.project.folders).toEqual([{ type: 'sound', folder: 'content/sounds' }])
})

test('a game with a folder and no list function says so', async () => {
  const loaded = await load(gameWith({}), false)
  expect(loaded.ok).toBe(false)
  expect(loaded.ok ? [] : loaded.diagnostics.map(formatDiagnostic)).toEqual([
    'automata.toml: content: This game lists folders, so whoever loads it must be able to list them.',
  ])
})

test('a folder that cannot be listed counts as empty', async () => {
  const files = gameWith({ 'content/sounds/a.json': soundText('a') })
  const loaded = await loadGame(readFiles(files), async () => {
    throw new Error('no such folder')
  })
  expect(loaded.ok).toBe(true)
  expect(loaded.ok && loaded.value.sounds).toBeUndefined()
})

test('a file in a folder that reads as another kind says so in one sentence', async () => {
  expect(await problems(gameWith({ 'content/sounds/tune.json': musicText('tune') }))).toEqual([
    "content/sounds/tune.json: This file is in the folder for sounds, but it reads as a music track. Move it to that kind's folder.",
  ])
})

test('a file in a folder that reads as nothing gets its own reading problems', async () => {
  const found = await problems(gameWith({ 'content/sounds/odd.json': '{ "format": 1 }' }))
  expect(found.length).toBeGreaterThan(0)
  expect(found.every((line) => line.startsWith('content/sounds/odd.json:'))).toBe(true)
})

test('a file both listed by path and in a folder of its kind is loaded once', async () => {
  const text = `${withFolderBlocks(SOUNDS)}\n[[content]]\ntype = "sound"\npath = "content/sounds/a.json"\n`
  const files = { ...gameWith({ 'content/sounds/a.json': soundText('a') }), 'automata.toml': text }
  const loaded = await load(files)
  expect(loaded.ok).toBe(true)
  if (!loaded.ok) return
  expect(loaded.value.project.content.filter((ref) => ref.path === 'content/sounds/a.json')).toHaveLength(1)
})

test("a file listed by path as one kind and in another kind's folder is a problem", async () => {
  const text = `${withFolderBlocks(SOUNDS)}\n[[content]]\ntype = "music"\npath = "content/sounds/a.json"\n`
  const files = { ...gameWith({ 'content/sounds/a.json': soundText('a') }), 'automata.toml': text }
  expect(await problems(files)).toContain(
    'content/sounds/a.json: This file is listed as a music track, but it is in the folder for sounds.',
  )
})

test('an atlas beside a figure in a figures folder is passed over', async () => {
  const files = gameWith({
    'content/sounds/a.json': soundText('a'),
    'content/sounds/a.atlas.json': '{}',
    'content/sounds/x.txt': '',
  })
  const loaded = await load(files)
  expect(loaded.ok).toBe(true)
})

test('a start level and a hero found only in folders are accepted', async () => {
  const toml = `format = 1
name = "Crate Game"
start = "level-1"
hero = "hero"

[[content]]
type = "level"
folder = "content/levels"

[[content]]
type = "character"
folder = "content/characters"
`
  const files = { ...fixtureFiles, 'automata.toml': toml }
  const loaded = await load(files)
  expect(loaded.ok).toBe(true)
  if (!loaded.ok) return
  expect(Object.keys(loaded.value.characters).sort()).toEqual(['crate', 'hero'])
  expect(Object.keys(loaded.value.levels)).toEqual(['level-1'])
})

test('a game with no folder loads as it did, with no folders key and no list needed', async () => {
  const loaded = await loadGame(readFiles(fixtureFiles))
  expect(loaded.ok).toBe(true)
  expect(loaded.ok && 'folders' in loaded.value.project).toBe(false)
})
