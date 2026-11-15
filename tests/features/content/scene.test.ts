// The scene file: it reads and writes back to the same bytes, and each way it can be wrong has one sentence that says what
// is wrong and what to write.
import { expect, test } from 'vitest'
import { loadGame, parseContent, writeContent } from '#src/features/content/content.ts'
import { expectRoundTrip, gameFiles, gameProblems, problemsOf } from '../../fixtures/content/kind.ts'
import { sceneGameFiles } from '../../fixtures/scene-game/read.ts'

type Json = Record<string, unknown>
const file = 'content/x/scene.json'
const meadow = (): Json => JSON.parse(sceneGameFiles['content/scenes/meadow.json'] ?? '') as Json
const edit = (change: (scene: Json) => void): Json => {
  const scene = meadow()
  change(scene)
  return scene
}
const said = (value: unknown): string[] => problemsOf('scene', value, file)
const list = (value: Json, key: string): Json[] => value[key] as Json[]
const ground = (scene: Json): Json => scene.ground as Json
const rows = (scene: Json): string[] => ground(scene).rows as string[]
const material = (scene: Json, id: string): Json => list(scene, 'materials').find((m) => m.id === id) as Json

test('the fixture scene reads, and writes back to the same bytes twice', () => {
  expectRoundTrip('scene', meadow())
  expect(writeContent('scene', meadow() as never)).toBe(sceneGameFiles['content/scenes/meadow.json'])
})

test('a scene is written in the schema’s order', () => {
  expect(Object.keys(JSON.parse(writeContent('scene', meadow() as never)))).toEqual([
    'format',
    'id',
    'seed',
    'tile',
    'size',
    'sky',
    'paints',
    'materials',
    'ground',
  ])
})

test('every fixture file is written as writeContent writes it', async () => {
  for (const path of ['content/scenes/meadow.json', 'content/tilesets/meadow.json']) {
    const type = path.includes('scenes') ? 'scene' : 'tileset'
    const text = sceneGameFiles[path] ?? ''
    const read = parseContent(type, text, path)
    expect(read.ok, path).toBe(true)
    if (read.ok) expect(writeContent(type, read.value as never), path).toBe(text)
  }
})

test('the scene game loads, with its scene among its content', async () => {
  const loaded = await loadGame(async (path) => sceneGameFiles[path] ?? Promise.reject(new Error(path)))
  expect(loaded.ok).toBe(true)
  if (loaded.ok) expect(Object.keys(loaded.value.scenes ?? {})).toEqual(['meadow'])
})

test('a row that is too short, and a scene with too few rows', () => {
  expect(said(edit((s) => rows(s).splice(2, 1, (rows(s)[2] ?? '').slice(0, 22))))).toEqual([
    `${file}: ground.rows[2]: This row has 22 tiles but the scene is 24 wide. Every row must be 24 long.`,
  ])
  expect(said(edit((s) => rows(s).pop()))).toEqual([
    `${file}: ground.rows: This scene is 12 tiles tall but has 11 rows. Write 12 rows.`,
  ])
})

test('a letter no entry has', () => {
  expect(said(edit((s) => rows(s).splice(0, 1, `Q${(rows(s)[0] ?? '').slice(1)}`)))).toEqual([
    `${file}: ground.rows[0]: The letter "Q" is not in this scene's letters. It has: /, =, G, S, W, b, h, l.`,
  ])
})

test('a letter twice, and the letter that always means air', () => {
  const twice = edit((s) =>
    list(ground(s), 'letters').push({ letter: 'G', material: 'plank', shape: 'solid' }),
  )
  expect(said(twice)).toEqual([
    `${file}: ground.letters[8].letter: The letter "G" is already used by the tile "earth". Each tile needs its own letter.`,
  ])
  const dot = edit((s) => list(ground(s), 'letters').push({ letter: '.', material: 'plank', shape: 'solid' }))
  expect(said(dot)).toEqual([
    `${file}: ground.letters[8].letter: The letter . always means empty air. Pick another letter.`,
  ])
})

test('a letter, a ladder and a top that name what is not there', () => {
  const letter = edit((s) => Object.assign(list(ground(s), 'letters')[0] as Json, { material: 'eart' }))
  expect(said(letter)).toEqual([
    `${file}: ground.letters[0].material: There is no material called "eart". This scene has: brick, earth, plank, rock, stone, turf.`,
  ])
  const paint = edit((s) => ((material(s, 'earth').ladder as string[])[1] = 'soill'))
  expect(said(paint)).toEqual([
    `${file}: materials[0].ladder[1]: There is no paint called "soill". This scene has: brick, brick-dark, brick-light, grass, mortar, mortar-dark, mortar-light, soil, soil-dark, soil-light, stone-dark, stone-gray, stone-light, wood.`,
  ])
  const top = edit((s) => ((material(s, 'earth').top as Json).material = 'turff'))
  expect(said(top)).toEqual([
    `${file}: materials[0].top.material: There is no material called "turff". This scene has: brick, earth, plank, rock, stone, turf.`,
  ])
})

test('a top that is itself, a tileset tile, or deeper than a tile', () => {
  expect(said(edit((s) => ((material(s, 'earth').top as Json).material = 'earth')))).toEqual([
    `${file}: materials[0].top.material: A material cannot be its own top.`,
  ])
  expect(said(edit((s) => ((material(s, 'earth').top as Json).material = 'stone')))).toEqual([
    `${file}: materials[0].top.material: The top must be a photo or a flat material.`,
  ])
  expect(said(edit((s) => ((material(s, 'earth').top as Json).deep = 20)))).toEqual([
    `${file}: materials[0].top.deep: The top can be 16 pixels deep at most, one tile. Write 16 or less.`,
  ])
})

test('a photo needs a ladder or a match, not both and not neither', () => {
  const sentence = `${file}: materials[0]: Write "ladder" (a list of paints, dark to light) or "match" (a number of colors), not both.`
  expect(said(edit((s) => (material(s, 'earth').match = 3)))).toEqual([sentence])
  expect(said(edit((s) => delete material(s, 'earth').ladder))).toEqual([sentence])
})

test('an accent must be as long as the ladder, and goes only with a ladder', () => {
  expect(said(edit((s) => ((material(s, 'brick').accent as string[]).length = 2)))).toEqual([
    `${file}: materials[3].accent: "accent" must list 3 paints, as "ladder" does.`,
  ])
  expect(said(edit((s) => (material(s, 'rock').accent = ['soil', 'grass'])))).toEqual([
    `${file}: materials[4].accent: "accent" goes with "ladder", not "match". Remove it, or write a "ladder".`,
  ])
  expect(said(edit((s) => (material(s, 'rock').contrast = 0.1)))).toEqual([
    `${file}: materials[4].contrast: "contrast" goes with "ladder", not "match". Remove it, or write a "ladder".`,
  ])
})

test('a slope cannot be a tileset tile', () => {
  expect(
    said(edit((s) => Object.assign(list(ground(s), 'letters')[1] as Json, { material: 'stone' }))),
  ).toEqual([
    `${file}: ground.letters[1].shape: A slope needs a photo or a flat material: a tileset's tile is a whole square.`,
  ])
})

test('a slope with air under it says which tile to fill', () => {
  const air = edit((s) => rows(s).splice(7, 1, (rows(s)[7] ?? '').replace('/G', '/.')))
  expect(said(air)).toEqual([
    `${file}: ground.rows[7]: The slope that starts at column 2 needs solid ground under it. The tile at column 4, row 7 is not solid: fill it, or shorten the slope.`,
  ])
})

test('a scene too big to paint says how big its picture would be, and what to make smaller', () => {
  const big: Json = {
    format: 1,
    id: 'big',
    seed: 0,
    tile: 32,
    size: { w: 256, h: 64 },
    paints: [{ id: 'grass', color: '#5fa04a' }],
    materials: [{ id: 'turf', kind: 'flat', paint: 'grass' }],
    ground: { letters: [], rows: Array.from({ length: 64 }, () => '.'.repeat(256)) },
  }
  expect(problemsOf('scene', big, file)).toEqual([
    `${file}: size: This scene's ground picture would be 2048 by 8192 pixels, cut into 4 pages stacked 8192 pixels tall. A picture can be 2048 at most: use a smaller "tile", or a smaller scene.`,
  ])
})

test('every key a scene needs says what to write when it is missing', () => {
  const missing = (change: (scene: Json) => void): string[] => said(edit(change))
  expect(missing((s) => delete s.seed)).toEqual([
    `${file}: seed: This is missing. Write a whole number, like 7. Another number gives another painting.`,
  ])
  expect(missing((s) => delete s.tile)).toEqual([
    `${file}: tile: This is missing. Write how many pixels make one tile, like 16.`,
  ])
  expect(missing((s) => delete s.size)).toEqual([
    `${file}: size: This is missing. Write how big the scene is in tiles, like { "w": 32, "h": 18 }.`,
  ])
  expect(missing((s) => delete (s.size as Json).w)).toEqual([
    `${file}: size.w: This is missing. Write how many tiles wide the scene is, like 32.`,
  ])
  expect(missing((s) => delete s.paints)).toEqual([
    `${file}: paints: This is missing. List at least one paint, like [{ "id": "grass", "color": "#5fa04a" }].`,
  ])
  expect(missing((s) => delete (list(s, 'paints')[0] as Json).color)).toEqual([
    `${file}: paints[0].color: This is missing. Write the colour as # and six digits, like #5fa04a.`,
  ])
  expect(missing((s) => delete s.materials)).toEqual([
    `${file}: materials: This is missing. List at least one material, like [{ "id": "turf", "kind": "flat", "paint": "grass" }].`,
  ])
  expect(missing((s) => delete material(s, 'earth').photo)).toEqual([
    `${file}: materials[0].photo: This is missing. Write the photo's name, like "dirt".`,
  ])
  expect(missing((s) => delete material(s, 'stone').tileset)).toEqual([
    `${file}: materials[5].tileset: This is missing. Write which tileset, like "meadow".`,
  ])
  expect(missing((s) => delete material(s, 'turf').paint)).toEqual([
    `${file}: materials[1].paint: This is missing. Write which of the scene's paints, like "grass".`,
  ])
  expect(missing((s) => delete s.ground)).toEqual([
    `${file}: ground: This is missing. Write the ground: its letters and its rows.`,
  ])
  expect(missing((s) => delete ground(s).rows)).toEqual([
    `${file}: ground.rows: This is missing. Write one string a row, top row first, like ["....", "GGGG"].`,
  ])
  expect(missing((s) => delete (list(ground(s), 'letters')[0] as Json).shape)).toEqual([
    `${file}: ground.letters[0].shape: This is missing. Write "solid", "slope-up", "slope-down", "ledge" or "back".`,
  ])
})

test('what a scene names in the rest of the game must be there', async () => {
  const files = (change: (scene: Json) => void) =>
    gameFiles(sceneGameFiles, [], {
      'content/scenes/meadow.json': writeContent('scene', edit(change) as never),
    })
  expect(await gameProblems(files((s) => (s.backdrop = 'valey')))).toEqual([
    'content/scenes/meadow.json: backdrop: There is no backdrop called "valey". This game has: nothing.',
  ])
  expect(await gameProblems(files((s) => (material(s, 'stone').tileset = 'meado')))).toEqual([
    'content/scenes/meadow.json: materials[5].tileset: There is no tileset called "meado". This game has: meadow.',
  ])
  expect(await gameProblems(files((s) => (material(s, 'stone').tile = 'granite')))).toEqual([
    'content/scenes/meadow.json: materials[5].tile: The tileset "meadow" has no tile called "granite". It has: grass, stone.',
  ])
})
