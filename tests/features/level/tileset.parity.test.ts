// A level that names a tileset plays exactly like the same level written with # and . — in Node and in every browser.
// Its level is a floor and no wall: a level with a tileset joins stacked tiles into one box (tileBoxes), a level in # and
// . does not, so the two play alike only while no wall is a column of equal rows. That is why they still do here.
import { afterEach, expect, test } from 'vitest'
import { writeContent } from '#src/features/content/content.ts'
import { createGameSim } from '#src/features/level/level.ts'
import type { Sim, SnapshotView } from '#src/features/sim/sim.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'
import { PUSH_TICKS, pushScript } from '../../fixtures/game/script.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** The meadow: grass is solid, flowers are not. */
const meadow = writeContent('tileset', {
  format: 1,
  id: 'meadow',
  image: 'art/meadow.png',
  tileSize: 16,
  columns: 4,
  tiles: [
    { id: 'grass', letter: 'G', solid: true, pictures: [{ frame: 0 }] },
    { id: 'flowers', letter: '~', solid: false, pictures: [{ frame: 1 }] },
  ],
})

/** The fixture level with the floor written `G`, a row of flowers in the air, and the tileset named. */
function levelWithTileset(): string {
  const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] ?? '') as { tiles: string[] }
  const tiles = [...level.tiles]
  tiles[2] = '....~~~~........'
  tiles[tiles.length - 1] = 'GGGGGGGGGGGGGGGG'
  return `${JSON.stringify({ ...level, tileset: 'meadow', tiles }, null, 2)}\n`
}

const withTileset = (): Promise<Awaited<ReturnType<typeof loadFixtureGame>>> =>
  loadFixtureGame({
    'automata.toml': `${fixtureFiles['automata.toml'] ?? ''}\n[[content]]\ntype = "tileset"\npath = "content/tilesets/meadow.json"\n`,
    'content/tilesets/meadow.json': meadow,
    'content/levels/level-1.json': levelWithTileset(),
  })

/**
 * The world at tick 0 and every 60 ticks after, as the snapshot describes it. The two games' content differs by the
 * tileset, so the content hash in the header is blanked: it is the one thing that is meant to differ.
 */
async function worldsEvery60(content: Awaited<ReturnType<typeof loadFixtureGame>>): Promise<SnapshotView[]> {
  const sim = await createGameSim({ content, plugins: [heroPlugin] })
  made.push(sim)
  const worlds: SnapshotView[] = []
  const keep = (): void => {
    const view = sim.describeSnapshot()
    worlds.push({ ...view, header: { ...view.header, contentHash: '' } })
  }
  keep()
  for (let t = 0; t < PUSH_TICKS; t++) {
    sim.step(pushScript(sim.tick))
    if (sim.tick % 60 === 0) keep()
  }
  return worlds
}

test('a level with a tileset plays exactly like the same level written with # and .', async () => {
  const withIt = await worldsEvery60(await withTileset())
  const plain = await worldsEvery60(await loadFixtureGame())
  expect(withIt).toEqual(plain)
  expect(plain.length).toBe(PUSH_TICKS / 60 + 1)
})

test('a level whose tileset is missing from the content says so', async () => {
  // Content built by hand, past loadGame: spawnLevel must not guess.
  const { tilesets: _gone, ...withoutItsTileset } = await withTileset()
  await expect(createGameSim({ content: withoutItsTileset, plugins: [heroPlugin] })).rejects.toThrow(
    'Level "level-1" uses the tileset "meadow", and this game has no such tileset.',
  )
})
