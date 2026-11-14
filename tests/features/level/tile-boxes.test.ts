import { afterEach, expect, test } from 'vitest'
import { writeContent } from '#src/features/content/content.ts'
import { createGameSim, levelSize, Look, Thing, tileBoxes, tileRuns } from '#src/features/level/level.ts'
import { Body } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

test('a wall five tiles tall is one box', () =>
  expect(tileBoxes(['#..', '#..', '#..', '#..', '###'])).toEqual([
    { row: 0, col: 0, w: 1, h: 4 },
    { row: 4, col: 0, w: 3, h: 1 },
  ]))

test('runs that do not line up stay apart', () =>
  expect(tileBoxes(['##.', '.##'])).toEqual([
    { row: 0, col: 0, w: 2, h: 1 },
    { row: 1, col: 1, w: 2, h: 1 },
  ]))

test('a floor alone is the box it always was', () =>
  expect(tileBoxes(['....', '####'])).toEqual([{ row: 1, col: 0, w: 4, h: 1 }]))

test('a wall whose rows differ keeps its joins, and a ledge is its own box', () =>
  expect(tileBoxes(['#...', '##..', '#...'])).toEqual([
    { row: 0, col: 0, w: 1, h: 1 },
    { row: 1, col: 0, w: 2, h: 1 },
    { row: 2, col: 0, w: 1, h: 1 },
  ]))

test('a gap between two stacked runs stops the join', () =>
  expect(tileBoxes(['#.', '..', '#.'])).toEqual([
    { row: 0, col: 0, w: 1, h: 1 },
    { row: 2, col: 0, w: 1, h: 1 },
  ]))

test('which letters are solid is the caller’s to say, as it is for runs', () =>
  expect(tileBoxes(['G~', 'G~', 'G~'], (letter) => letter === 'G')).toEqual([{ row: 0, col: 0, w: 1, h: 3 }]))

test('the M1 level has the runs it always had, written out', async () => {
  const game = await loadFixtureGame()
  const level = game.levels['level-1'] as NonNullable<(typeof game.levels)[string]>
  expect(levelSize(level)).toEqual({ w: 16, h: 9 })
  expect(tileRuns(level.tiles)).toEqual([{ row: 8, col: 0, length: 16 }])
})

const meadow = writeContent('tileset', {
  format: 1,
  id: 'meadow',
  image: 'art/meadow.png',
  tileSize: 16,
  columns: 4,
  tiles: [{ id: 'grass', letter: 'G', solid: true, pictures: [{ frame: 0 }] }],
})

/** The fixture level with a wall five tiles tall at its left edge, and a floor. */
function walled(letter: string, tileset: boolean): Record<string, string> {
  const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] ?? '') as {
    tiles: string[]
    starts: unknown
  }
  const tiles = level.tiles.map((row, i) => (i >= 3 && i < 8 ? letter + row.slice(1) : row))
  tiles[8] = letter.repeat(16)
  const written = JSON.stringify({ ...level, ...(tileset ? { tileset: 'meadow' } : {}), tiles })
  return {
    'content/levels/level-1.json': written,
    ...(tileset
      ? {
          'automata.toml': `${fixtureFiles['automata.toml'] ?? ''}\n[[content]]\ntype = "tileset"\npath = "content/tilesets/meadow.json"\n`,
          'content/tilesets/meadow.json': meadow,
        }
      : {}),
  }
}

/** The fixed boxes the level's tiles became: the bodies that are no thing and no hero. */
async function tileBodies(files: Record<string, string>): Promise<{ w: number; h: number }[]> {
  const sim = await createGameSim({ content: await loadFixtureGame(files) })
  made.push(sim)
  return sim
    .query(Body, Look)
    .filter((e) => !e.has(Thing))
    .map((e) => ({ w: e.get(Look).w, h: e.get(Look).h }))
}

test('a level with a tileset has one body for a wall, and the same level without has one per row', async () => {
  expect(await tileBodies(walled('G', true))).toEqual([
    { w: 1, h: 5 },
    { w: 16, h: 1 },
  ])
  expect(await tileBodies(walled('#', false))).toEqual([
    { w: 1, h: 1 },
    { w: 1, h: 1 },
    { w: 1, h: 1 },
    { w: 1, h: 1 },
    { w: 1, h: 1 },
    { w: 16, h: 1 },
  ])
})
