// A level names a scene instead of writing its own tiles: it has one or the other, takes its sky and backdrop from the
// scene, and is as big as the scene is.
import { expect, test } from 'vitest'
import { formatDiagnostic, parseContent, writeContent } from '#src/features/content/content.ts'
import { expectRoundTrip, gameProblems } from '../../fixtures/content/kind.ts'
import { sceneGameFiles } from '../../fixtures/scene-game/read.ts'

type Json = Record<string, unknown>
const FILE = 'content/levels/a.json'
const LEVEL = 'content/levels/level-1.json'
const level = (): Json => JSON.parse(sceneGameFiles[LEVEL] ?? '') as Json
const oldLevel = (): Json => JSON.parse(sceneGameFiles['content/levels/level-old.json'] ?? '') as Json
const said = (value: unknown): string[] => {
  const parsed = parseContent('level', JSON.stringify(value), FILE)
  return parsed.ok ? [] : parsed.diagnostics.map(formatDiagnostic)
}
/** The scene game with the first level changed. */
const game = (change: (level: Json) => void): Promise<string[]> => {
  const value = level()
  change(value)
  return gameProblems({ ...sceneGameFiles, [LEVEL]: JSON.stringify(value) })
}

test('a level with a scene and no tiles reads, and is written with the scene after the id', () => {
  expectRoundTrip('level', level())
  expect(Object.keys(JSON.parse(writeContent('level', level() as never)))).toEqual([
    'format',
    'id',
    'scene',
    'things',
    'starts',
  ])
  expect(said(oldLevel())).toEqual([])
})

test('a level has a scene or its own tiles, and not both', () => {
  expect(said({ ...level(), tiles: ['....'] })).toEqual([
    `${FILE}: scene: This level has a scene and its own tiles. A level with a scene takes its ground from the scene: remove "tiles".`,
  ])
  const none = { ...level() }
  delete none.scene
  expect(said(none)).toEqual([
    `${FILE}: scene: This level has no ground. Name a scene, like "scene": "meadow", or write "tiles".`,
  ])
})

test('a level with a scene refuses what the scene gives it, each at its own key', () => {
  for (const [key, value] of [
    ['tileset', 'meadow'],
    ['backdrop', 'valley'],
    ['sky', '#9fd3f0'],
    ['ground', '#3b4a5a'],
  ] as const)
    expect(said({ ...level(), [key]: value }), key).toEqual([
      `${FILE}: ${key}: A level with a scene takes this from the scene. Remove "${key}", and set it in the scene "meadow".`,
    ])
})

test('a level with a scene still has its ids checked', () => {
  const things = level().things as Json[]
  expect(said({ ...level(), things: [...things, ...things] })).toEqual([
    `${FILE}: things[1].id: "crate-1" is used twice. Each thing needs its own id.`,
  ])
})

test('the scene game loads, with a level that has a scene and a level that has its own tiles', async () => {
  expect(await gameProblems(sceneGameFiles)).toEqual([])
})

test('a scene that is not listed is named, with the ones that are', async () => {
  expect(await game((l) => (l.scene = 'medow'))).toEqual([
    `${LEVEL}: scene: There is no scene called "medow". This game has: meadow.`,
  ])
})

test('what a level places must be inside the scene, with the sentences a level with tiles gets', async () => {
  // The meadow is 24 tiles wide and 12 tall.
  expect(
    await game((l) => {
      ;(l.things as Json[])[0] = { id: 'crate-1', character: 'crate', x: 30.5, y: 7.5 }
    }),
  ).toEqual([`${LEVEL}: things[0].x: 30.5 is outside the level, which is 24 tiles wide.`])
  expect(
    await game((l) => {
      ;(l.starts as Json[])[0] = { player: 1, x: 2.5, y: 13 }
    }),
  ).toEqual([`${LEVEL}: starts[0].y: 13 is outside the level, which is 12 tiles tall.`])
  expect(
    await game((l) => {
      l.view = { w: 30, h: 8 }
    }),
  ).toEqual([
    `${LEVEL}: view.w: The level is 24 tiles wide, so the view cannot be 30. Make "w" 24 or less, or leave "view" out to show the whole level.`,
  ])
})

test('a game for two players needs a start for player 2 in a level with a scene too', async () => {
  const toml = (sceneGameFiles['automata.toml'] ?? '').replace('hero = "hero"', 'hero = "hero"\nplayers = 2')
  const problems = await gameProblems({ ...sceneGameFiles, 'automata.toml': toml })
  expect(problems.join('\n')).toContain(
    `${LEVEL}: starts: This game is for up to 2 players, but this level has no start point for player 2. Add one to "starts", or lower players in automata.toml.`,
  )
})
