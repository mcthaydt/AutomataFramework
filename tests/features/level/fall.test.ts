// A hero that falls out of the level says so (plan Q, Task 2): `hero.fell`, once for each hero, only in a game whose
// project says `lost = "hero.fell"`.
import { afterEach, expect, test } from 'vitest'
import { controlsCommand } from '#src/features/commands/commands.ts'
import type { GameContent } from '#src/features/content/content.ts'
import {
  createGameSim,
  fellEvent,
  gameSimPlugins,
  levelBottom,
  Thing,
  usesFalls,
  usesMoves,
} from '#src/features/level/level.ts'
import { simContent } from '#src/features/level/sim-content.ts'
import { type Command, createSim, type PluginDef, type Sim } from '#src/features/sim/sim.ts'
import { type FallSetup, fallFiles } from '../../fixtures/game/fall-game.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { movesFiles } from '../../fixtures/game/moves-game.ts'
import schemaGolden from '../../golden/schema-hash.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

const loadFall = (setup: FallSetup = {}): Promise<GameContent> => loadFixtureGame(fallFiles(setup))

async function simOf(content: GameContent, players: readonly number[] = [1]): Promise<Sim> {
  const sim = await createGameSim({ content, plugins: [heroPlugin], players })
  made.push(sim)
  return sim
}

/** Everyone runs right from tick 10. */
const RIGHT =
  (players: number) =>
  (tick: number): Command[] =>
    tick === 10 ? Array.from({ length: players }, (_, i) => controlsCommand(tick, i + 1, 0, ['right'])) : []

/** Steps `ticks` ticks and returns every `hero.fell` the sim said, as the step gave it. */
function play(sim: Sim, ticks: number, script: (tick: number) => Command[]) {
  const said: Array<{ tick: number; payload: { player: number; sid: number } }> = []
  for (let i = 0; i < ticks; i++) {
    const tick = sim.tick
    for (const e of sim.step(script(tick)).events)
      if (e.type === fellEvent.id) said.push({ tick, payload: e.payload as never })
  }
  return said
}
const heroSid = (sim: Sim, id = 'player-1'): number => {
  const found = sim.query(Thing).find((e) => e.get(Thing).id === id)
  if (!found) throw new Error(`no thing ${id}`)
  return found.sid
}

test('the event is called hero.fell', () => expect(fellEvent.id).toBe('hero.fell'))

test('a level has as many rows as its tiles, and a level the game lacks has none', async () => {
  const content = await loadFall()
  expect(levelBottom(content, 'level-1')).toBe(9)
  expect(levelBottom(content, 'nowhere')).toBe(0)
})

test('a hero that walks into the gap raises hero.fell once, with its player number', async () => {
  const sim = await simOf(await loadFall())
  const sid = heroSid(sim)
  const said = play(sim, 300, RIGHT(1))
  expect(said).toHaveLength(1)
  expect(said[0]?.payload).toEqual({ player: 1, sid })
})

test('a hero standing on the lowest row has not fallen', async () => {
  const sim = await simOf(await loadFall())
  expect(play(sim, 300, () => [])).toEqual([])
})

test('a crate that falls raises nothing', async () => {
  const content = await loadFall({
    things: [{ id: 'crate-1', character: 'crate', x: 7.5, y: 7.5 }],
  })
  const sim = await simOf(content)
  expect(play(sim, 300, () => [])).toEqual([])
})

test('two heroes that fall raise one event each', async () => {
  const content = await loadFall({ players: 2 })
  const sim = await simOf(content, [1, 2])
  const said = play(sim, 400, RIGHT(2))
  expect(said.map((e) => e.payload.player).sort()).toEqual([1, 2])
})

test('a restored snapshot of a fallen hero does not raise it again', async () => {
  const content = await loadFall()
  const sim = await simOf(content)
  expect(play(sim, 300, RIGHT(1))).toHaveLength(1)
  const bytes = sim.snapshot()
  const restored = await simOf(content)
  restored.restore(bytes)
  expect(play(restored, 60, () => [])).toEqual([])
})

test('a game with no lost has no fall plugin: its schema hash is the recorded one', async () => {
  const content = await loadFixtureGame()
  expect(usesFalls(content)).toBe(false)
  const sim = await createGameSim({ content, plugins: [heroPlugin] })
  made.push(sim)
  expect(sim.describeSnapshot().header.schemaHash).toBe(schemaGolden.schemaHash)
  expect(gameSimPlugins({ content }).map((p) => p.name)).not.toContain('fall')
})

test('a game whose lost is another event has no fall plugin', async () => {
  const content = await loadFall({ lost: 'hero.drowned' })
  expect(usesFalls(content)).toBe(false)
  expect(gameSimPlugins({ content }).map((p) => p.name)).not.toContain('fall')
  expect(play(await simOf(content), 300, RIGHT(1))).toEqual([])
})

test("a hero with no moves, moved by the game's own rules, falls and raises hero.fell", async () => {
  const content = await loadFall()
  expect(usesMoves(content)).toBe(false)
  expect(usesFalls(content)).toBe(true)
  expect(play(await simOf(content), 300, RIGHT(1))).toHaveLength(1)
})

test('a hero the framework moves falls too', async () => {
  const files = movesFiles()
  const fall = fallFiles()
  // The moves game's hero, the gap's level, and the line that names the event.
  const toml = (files['automata.toml'] ?? '').replace(
    'hero = "hero"\n',
    'hero = "hero"\nlost = "hero.fell"\n',
  )
  const content = await loadFixtureGame({
    ...files,
    'automata.toml': toml,
    'content/levels/level-1.json': fall['content/levels/level-1.json'],
  })
  expect(usesMoves(content)).toBe(true)
  const sim = await createGameSim({ content })
  made.push(sim)
  expect(play(sim, 300, RIGHT(1))).toHaveLength(1)
})

/** The names of a game's framework plugins, in the order they join. */
const names = (plugins: readonly PluginDef[]): string[] => plugins.map((p) => p.name)

test('gameSimPlugins gives the plugins createGameSim joins, in its order, for each fixture game', async () => {
  const plain = await loadFixtureGame()
  const falling = await loadFall()
  const coop = await loadFall({ players: 2 })
  const moving = await loadFixtureGame(movesFiles())
  expect(names(gameSimPlugins({ content: plain }))).toEqual(['physics', 'commands', 'level'])
  expect(names(gameSimPlugins({ content: falling }))).toEqual(['physics', 'commands', 'level', 'fall'])
  expect(names(gameSimPlugins({ content: coop }))).toEqual(['physics', 'commands', 'level', 'join', 'fall'])
  expect(names(gameSimPlugins({ content: moving }))).toEqual(['physics', 'commands', 'level', 'moves'])
  // The same list, joined by hand, is the sim `createGameSim` makes: one schema hash.
  for (const content of [plain, falling, coop, moving]) {
    const byHand = await createSim({
      seed: 1,
      content: simContent(content),
      plugins: [...gameSimPlugins({ content }), heroPlugin],
    })
    made.push(byHand)
    const given = await createGameSim({ content, plugins: [heroPlugin] })
    made.push(given)
    expect(given.describeSnapshot().header.schemaHash).toBe(byHand.describeSnapshot().header.schemaHash)
  }
})
