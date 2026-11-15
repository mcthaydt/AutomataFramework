// A scene from an old level: what the level wrote about its ground goes to a scene file, the level points at it, and both
// are files the framework's own schemas accept.
import { expect, test } from 'vitest'
import {
  type GameContent,
  loadGame,
  parseContent,
  sceneFromLevel,
  writeContent,
} from '#src/features/content/content.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { loadSceneGame } from '../../fixtures/scene-game/game.ts'

async function loadFull(): Promise<GameContent> {
  const loaded = await loadGame(readFullGame())
  if (!loaded.ok) throw new Error('the full game did not load')
  return loaded.value
}

/** The result's two files as the writer writes them, read back through their schemas. */
function accepted(result: ReturnType<typeof sceneFromLevel>): void {
  for (const [type, value] of [
    ['scene', result.scene],
    ['level', result.level],
  ] as const) {
    const text = writeContent(type, value as never)
    const read = parseContent(type, text, `content/${type}s/x.json`)
    expect(read.ok, read.ok ? '' : read.diagnostics.map((d) => d.message).join('\n')).toBe(true)
    // Written and read back, it is the same file again.
    if (read.ok) expect(writeContent(type, read.value as never)).toBe(text)
  }
}

test('a level written in # and . becomes one flat material, one letter and one box a row', async () => {
  const game = await loadFixtureGame()
  const result = sceneFromLevel(game, 'level-1', 'meadow')
  const old = game.levels['level-1'] as NonNullable<(typeof game.levels)[string]>
  expect(result.scene).toMatchObject({
    id: 'meadow',
    seed: 0,
    tile: 16,
    size: { w: old.tiles?.[0]?.length, h: old.tiles?.length },
    paints: [{ id: 'ground', color: '#3b4a5a' }],
    materials: [{ id: 'ground', kind: 'flat', paint: 'ground' }],
    ground: {
      oneBoxPerRow: true,
      letters: [{ letter: '#', material: 'ground', shape: 'solid' }],
      rows: old.tiles,
    },
  })
  accepted(result)
})

test('the level keeps what happens in it, names the scene, and loses what the scene now holds', async () => {
  const game = await loadFull()
  const old = game.levels['level-1'] as NonNullable<(typeof game.levels)[string]>
  const { level } = sceneFromLevel(game, 'level-1', 'meadow-scene')
  expect(level).toEqual({
    format: 1,
    id: old.id,
    scene: 'meadow-scene',
    view: old.view,
    things: old.things,
    starts: old.starts,
    joints: old.joints,
  })
  for (const gone of ['tiles', 'tileset', 'backdrop', 'sky', 'ground'])
    expect(level[gone as keyof typeof level], gone).toBeUndefined()
})

test('a level with a tileset becomes one tiles material for each kind of tile, and the same rows', async () => {
  const game = await loadFull()
  const old = game.levels['level-1'] as NonNullable<(typeof game.levels)[string]>
  const tileset = game.tilesets?.meadow
  const result = sceneFromLevel(game, 'level-1', 'meadow-scene')
  expect(result.scene.ground.oneBoxPerRow).toBeUndefined()
  expect(result.scene.ground.rows).toEqual(old.tiles)
  expect(result.scene.backdrop).toBe(old.backdrop)
  expect(result.scene.materials.map((m) => m.id)).toEqual(tileset?.tiles.map((t) => t.id))
  for (const material of result.scene.materials) expect(material.kind).toBe('tiles')
  accepted(result)
})

test('a tile that is not solid becomes a back wall: seen, never stood on', async () => {
  const game = await loadFull()
  const { scene } = sceneFromLevel(game, 'level-1', 'meadow-scene')
  const shapeOf = (letter: string) => scene.ground.letters.find((l) => l.letter === letter)?.shape
  expect(shapeOf('G')).toBe('solid')
  expect(shapeOf('~')).toBe('back')
})

test('the level’s colours go to the scene', async () => {
  const game = await loadFixtureGame()
  const level = game.levels['level-1'] as NonNullable<(typeof game.levels)[string]>
  const painted = { ...game, levels: { 'level-1': { ...level, sky: '#fdd4bd', ground: '#111314' } } }
  const { scene } = sceneFromLevel(painted as GameContent, 'level-1', 'meadow')
  expect(scene.sky).toBe('#fdd4bd')
  expect(scene.ground.color).toBe('#111314')
  expect(scene.paints).toEqual([{ id: 'ground', color: '#111314' }])
})

test('a level of a game whose hero the framework moves keeps the joined boxes it had', async () => {
  const game = await loadFixtureGame()
  const hero = game.characters[game.project.hero] as NonNullable<(typeof game.characters)[string]>
  const moving = {
    ...game,
    characters: { ...game.characters, [game.project.hero]: { ...hero, moves: {} } },
  } as GameContent
  expect(sceneFromLevel(moving, 'level-1', 'meadow').scene.ground.oneBoxPerRow).toBeUndefined()
  expect(sceneFromLevel(game, 'level-1', 'meadow').scene.ground.oneBoxPerRow).toBe(true)
})

test('a tileset of more kinds than a scene holds materials is told so, not cut short', async () => {
  const game = await loadFull()
  const tileset = game.tilesets?.meadow as NonNullable<NonNullable<GameContent['tilesets']>[string]>
  const first = tileset.tiles[0] as object
  const kinds = Array.from({ length: 33 }, (_, i) => ({
    ...first,
    id: `t${i}`,
    letter: String.fromCharCode(48 + i),
  }))
  const crowded = { ...game, tilesets: { meadow: { ...tileset, tiles: kinds } } } as unknown as GameContent
  expect(() => sceneFromLevel(crowded, 'level-1', 'meadow-scene')).toThrow(
    'The tileset "meadow" has 33 kinds of tile, and a scene holds 32 materials at most.',
  )
})

test('a level that already has a scene is not moved again', async () => {
  const game = await loadSceneGame()
  expect(() => sceneFromLevel(game, 'level-1', 'other')).toThrow(
    'Level "level-1" already has a scene, "meadow".',
  )
})

test('a level that is not there says which are', async () => {
  const game = await loadFixtureGame()
  expect(() => sceneFromLevel(game, 'level-9', 'meadow')).toThrow(
    'There is no level called "level-9". This game has: level-1.',
  )
})
