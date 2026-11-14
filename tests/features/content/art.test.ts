import { expect, test } from 'vitest'
import {
  artFiles,
  artProblems,
  formatDiagnostic,
  type GameContent,
  loadGame,
  paintedPath,
  writeContent,
} from '#src/features/content/content.ts'
import { fullGamePictures } from '../../fixtures/full-game/pictures.ts'
import { fullGameFiles, readFullGame } from '../../fixtures/full-game/read.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'

async function loadFull(overrides: Record<string, string | undefined> = {}): Promise<GameContent> {
  const loaded = await loadGame(readFullGame(overrides))
  if (!loaded.ok) throw new Error(loaded.diagnostics.map(formatDiagnostic).join('\n'))
  return loaded.value
}

/** `artProblems` over a set of painted files, as sentences. */
async function problemsOf(game: GameContent, have: Record<string, Uint8Array>): Promise<string[]> {
  return (await artProblems(game, async (path) => have[path])).map(formatDiagnostic)
}

test('a figure at content/figures/hero.json is painted beside itself', async () => {
  const game = await loadFull()
  expect(paintedPath(game, 'figure', 'hero')).toBe('content/figures/hero.png')
  expect(paintedPath(game, 'backdrop', 'valley')).toBe('content/backdrops/valley.png')
  expect(paintedPath(game, 'figure', 'nobody')).toBeUndefined()
  expect(artFiles(game).map((file) => file.path)).toEqual([
    'content/figures/hero.png',
    'content/figures/hero.atlas.json',
    'content/figures/keeper.png',
    'content/figures/keeper.atlas.json',
    'content/figures/meadow.png',
    'content/figures/meadow.atlas.json',
    'content/figures/tree.png',
    'content/figures/tree.atlas.json',
    'content/backdrops/valley.png',
    'content/backdrops/valley.atlas.json',
  ])
})

test('a game with no figure and no backdrop has no art', async () =>
  expect(artFiles(await loadFixtureGame())).toEqual([]))

test('a picture is a PNG and its atlas names every frame', async () => {
  const files = await fullGamePictures()
  expect([...(files['content/figures/hero.png'] as Uint8Array).slice(0, 4)]).toEqual([137, 80, 78, 71])
  const atlas = JSON.parse(new TextDecoder().decode(files['content/figures/hero.atlas.json'])) as {
    frames: Record<string, unknown>
    meta: { image: string }
  }
  expect(Object.keys(atlas.frames)).toEqual([
    'idle',
    'run-1',
    'run-2',
    'jump',
    'fall',
    'land',
    'push',
    'two/idle',
    'two/run-1',
    'two/run-2',
    'two/jump',
    'two/fall',
    'two/land',
    'two/push',
  ])
  expect(atlas.meta.image).toBe('hero.png')
})

test('art that is all there has no problems', async () =>
  expect(await problemsOf(await loadFull(), await fullGamePictures())).toEqual([]))

test('a picture nobody painted', async () => {
  const { 'content/figures/hero.png': _gone, ...rest } = await fullGamePictures()
  expect(await problemsOf(await loadFull(), rest)).toEqual([
    'content/figures/hero.png: This picture has not been painted. Run "automata art".',
  ])
})

test('a picture older than its file', async () => {
  const have = { ...(await fullGamePictures()) }
  const valley = (have['content/backdrops/valley.png'] as Uint8Array).slice()
  valley[valley.length - 20] = (valley[valley.length - 20] as number) ^ 1
  have['content/backdrops/valley.png'] = valley
  expect(await problemsOf(await loadFull(), have)).toEqual([
    'content/backdrops/valley.png: This picture is older than its backdrop file. Run "automata art".',
  ])
})

test('an atlas that is not what the figure says', async () => {
  const have = { ...(await fullGamePictures()) }
  have['content/figures/tree.atlas.json'] = new TextEncoder().encode('{}\n')
  expect(await problemsOf(await loadFull(), have)).toEqual([
    'content/figures/tree.atlas.json: This atlas is older than its figure file. Run "automata art".',
  ])
})

test('a tileset whose picture is nowhere', async () => {
  const tileset = JSON.parse(fullGameFiles['content/tilesets/meadow.json'] ?? '') as Record<string, unknown>
  tileset.image = 'art/meadow.png'
  const game = await loadFull({ 'content/tilesets/meadow.json': writeContent('tileset', tileset as never) })
  expect(await problemsOf(game, await fullGamePictures())).toEqual([
    'content/tilesets/meadow.json: image: There is no picture at "art/meadow.png". Put one there, or use a figure\'s picture, like content/figures/meadow.png.',
  ])
})

test('a tileset whose picture is a file the game has', async () => {
  const tileset = JSON.parse(fullGameFiles['content/tilesets/meadow.json'] ?? '') as Record<string, unknown>
  tileset.image = 'art/meadow.png'
  const game = await loadFull({ 'content/tilesets/meadow.json': writeContent('tileset', tileset as never) })
  const have = { ...(await fullGamePictures()), 'art/meadow.png': Uint8Array.of(1) }
  expect(await problemsOf(game, have)).toEqual([])
})

test('the fixture game is painted only in palette No. 276', () => {
  const allowed = new Set(['#111314', '#fdd4bd', '#afd472', '#f37f94'])
  const found: string[] = []
  for (const [path, text] of Object.entries(fullGameFiles)) {
    if (!path.startsWith('content/figures/') && !path.startsWith('content/backdrops/')) continue
    for (const match of text.matchAll(/"(?:color|outline)": "(#[0-9a-fA-F]{6})"/g))
      found.push((match[1] as string).toLowerCase())
  }
  expect(found.length).toBeGreaterThan(10)
  expect(found.filter((colour) => !allowed.has(colour))).toEqual([])
})

test('no id and no message in the full game names a colour', () => {
  const colours = new Set([
    'black',
    'white',
    'grey',
    'gray',
    'pink',
    'red',
    'green',
    'yellow',
    'blue',
    'orange',
    'purple',
    'brown',
  ])
  const words = (text: string): string[] => text.toLowerCase().split(/[\s.\-_]+/)
  const named: string[] = []
  for (const [path, text] of Object.entries(fullGameFiles)) {
    if (!path.endsWith('.json')) continue
    const found: string[] = []
    for (const match of text.matchAll(/"id": "([^"]*)"/g)) found.push(match[1] as string)
    if (path === 'content/messages/en.json')
      for (const match of text.matchAll(/": "([^"]*)"/g)) found.push(match[1] as string)
    for (const text2 of found)
      for (const word of words(text2)) if (colours.has(word)) named.push(`${path}: ${word}`)
  }
  expect(named).toEqual([])
})
