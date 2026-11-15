// A level's ground moved into a scene plays exactly as it did, and a scene's own ground plays the same in Node and in every
// browser. The content differs by the scene, so the content hash in a snapshot's header is the one thing that is meant to.
import { afterEach, expect, test } from 'vitest'
import { controlsCommand } from '#src/features/commands/commands.ts'
import { type GameContent, loadGame, sceneFromLevel } from '#src/features/content/content.ts'
import { createGameSim } from '#src/features/level/level.ts'
import type { Command, Sim, SnapshotView } from '#src/features/sim/sim.ts'
import examplesLevel from '../../fixtures/examples-level-1.json?raw'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { PUSH_TICKS, pushScript } from '../../fixtures/game/script.ts'
import { expectGolden, runGolden } from '../../fixtures/golden.ts'
import { loadMovesGame } from '../../fixtures/moves/game.ts'
import { MOVES_TICKS, movesScript } from '../../fixtures/moves/script.ts'
import { loadSceneGame } from '../../fixtures/scene-game/game.ts'
import golden from '../../golden/scene.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** The content with the ground of `levelId` moved into a scene, as `automata scene from-level` writes it. */
function withScene(content: GameContent, levelId: string): GameContent {
  const { scene, level } = sceneFromLevel(content, levelId, 'ground')
  return { ...content, levels: { ...content.levels, [levelId]: level }, scenes: { ground: scene } }
}

/** The world at tick 0 and every 60 ticks after, the content hash in the header blanked. */
async function worldsEvery60(
  content: GameContent,
  ticks: number,
  script: (tick: number) => Command[],
  withHero: boolean,
): Promise<SnapshotView[]> {
  const sim = await createGameSim({ content, ...(withHero ? { plugins: [heroPlugin] } : {}) })
  made.push(sim)
  const worlds: SnapshotView[] = []
  const keep = (): void => {
    const view = sim.describeSnapshot()
    worlds.push({ ...view, header: { ...view.header, contentHash: '' } })
  }
  keep()
  for (let t = 0; t < ticks; t++) {
    sim.step(script(sim.tick))
    if (sim.tick % 60 === 0) keep()
  }
  return worlds
}

async function loadFull(): Promise<GameContent> {
  const loaded = await loadGame(readFullGame())
  if (!loaded.ok) throw new Error('the full game did not load')
  return loaded.value
}

test('the fixture game, with its ground in a scene, plays the push-crate run as it did', async () => {
  const content = await loadFixtureGame()
  const before = await worldsEvery60(content, PUSH_TICKS, pushScript, true)
  const after = await worldsEvery60(withScene(content, 'level-1'), PUSH_TICKS, pushScript, true)
  expect(after).toEqual(before)
  expect(before.length).toBe(PUSH_TICKS / 60 + 1)
})

test('the full game (a tileset, a hero the framework moves), with its ground in a scene, plays as it did', async () => {
  const content = await loadFull()
  const before = await worldsEvery60(content, PUSH_TICKS, pushScript, false)
  const after = await worldsEvery60(withScene(content, 'level-1'), PUSH_TICKS, pushScript, false)
  expect(after).toEqual(before)
})

test("the Examples game's level, with its ground in a scene, plays as it did", async () => {
  // A byte copy of the demo game's first level, played with the fixture game's characters.
  const content = await loadFixtureGame({ 'content/levels/level-1.json': examplesLevel })
  const before = await worldsEvery60(content, PUSH_TICKS, pushScript, true)
  const after = await worldsEvery60(withScene(content, 'level-1'), PUSH_TICKS, pushScript, true)
  expect(after).toEqual(before)
})

test('a `#` level with a hero the framework moves, the case of a game made with `automata create`, plays as it did', async () => {
  // The moves game's first level is `#` rows with no tileset and its hero has `moves`, so `sceneFromLevel` leaves
  // `oneBoxPerRow` out and the scene's boxes join as the level's did. The script walks into walls and jumps, doubles,
  // dashes and clings, so a seam between two boxes would show.
  const content = await loadMovesGame()
  const before = await worldsEvery60(content, MOVES_TICKS, movesScript, false)
  const moved = withScene(content, 'level-1')
  expect(moved.scenes?.ground?.ground?.oneBoxPerRow).toBeUndefined()
  const after = await worldsEvery60(moved, MOVES_TICKS, movesScript, false)
  expect(after).toEqual(before)
})

/** The hero of the scene game runs right from tick 10, jumps at 200 and 400, and lets go at 520. */
function meadowScript(tick: number): Command[] {
  if (tick === 10) return [controlsCommand(tick, 1, 0, ['right'])]
  if (tick === 200 || tick === 400) return [controlsCommand(tick, 1, tick, ['jump', 'right'])]
  if (tick === 520) return [controlsCommand(tick, 1, 520, [])]
  return []
}

test('the scene game, played 600 ticks, ends on its recorded hash', async () => {
  const sim = await createGameSim({ content: await loadSceneGame(), plugins: [heroPlugin] })
  made.push(sim)
  expectGolden(
    runGolden(sim, 600, (tick) => meadowScript(tick)),
    golden,
  )
})
