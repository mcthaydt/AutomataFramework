// A test of the hero's rules. It plays the game with no page: it makes the game's sim, holds a key by sending the
// command a keyboard would send, steps a few ticks and looks at where the hero is. `npm test` runs it.
import { readFile } from 'node:fs/promises'
import {
  Body,
  type Command,
  controlsCommand,
  createGameSim,
  loadGame,
  Player,
  type Sim,
  Transform,
} from '@automataframework/framework/headless'
import { afterEach, expect, test } from 'vitest'
import { Score } from '../../../src/features/hero/score.ts'
import { gamePlugins } from '../../../src/headless.ts'

const GAME = new URL('../../../', import.meta.url)

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

type Level = { things: { id: string; x: number; y: number }[] }

/** A new sim of the game, with the hero standing on the floor. `edit` changes the level before the game reads it. */
async function newGame(edit?: (level: Level) => void): Promise<Sim> {
  const loaded = await loadGame(async (path) => {
    const text = await readFile(new URL(path, GAME), 'utf8')
    if (edit === undefined || path !== 'content/levels/level-1.json') return text
    const level = JSON.parse(text) as Level
    edit(level)
    return JSON.stringify(level)
  })
  if (!loaded.ok) throw new Error(loaded.diagnostics.map((d) => `${d.file}: ${d.message}`).join('\n'))
  const sim = await createGameSim({ content: loaded.value, plugins: gamePlugins })
  made.push(sim)
  for (let i = 0; i < 30; i++) sim.step([])
  return sim
}

const hero = (sim: Sim) => {
  const [found] = sim.query(Player, Body, Transform)
  if (found === undefined) throw new Error('The game has no hero.')
  return { x: found.get(Transform).x, y: found.get(Transform).y }
}

test('holding right runs the hero to the right, and letting go stops it', async () => {
  const sim = await newGame()
  const start = hero(sim).x
  sim.step([controlsCommand(sim.tick, 1, 0, ['right'])])
  for (let i = 0; i < 20; i++) sim.step([])
  const running = hero(sim).x
  expect(running).toBeGreaterThan(start + 1)
  sim.step([controlsCommand(sim.tick, 1, 1, [])])
  for (let i = 0; i < 20; i++) sim.step([])
  expect(hero(sim).x).toBeCloseTo(running, 0)
})

test('jump lifts the hero off the floor', async () => {
  const sim = await newGame()
  const floor = hero(sim).y
  sim.step([controlsCommand(sim.tick, 1, 0, ['jump'])])
  for (let i = 0; i < 10; i++) sim.step([])
  expect(hero(sim).y).toBeLessThan(floor - 0.5)
})

test('touching the spark takes it, and the score counts it once', async () => {
  const sim = await newGame()
  expect(sim.resource(Score).sparks).toBe(0)
  sim.step([controlsCommand(sim.tick, 1, 0, ['right'])])
  for (let i = 0; i < 40; i++) sim.step([])
  expect(sim.resource(Score).sparks).toBe(1)
  // The spark is gone, so running on does not count it again.
  for (let i = 0; i < 60; i++) sim.step([])
  expect(sim.resource(Score).sparks).toBe(1)
})

/** What the level says while a play is held: the events by name, and the tick each was first said. */
function playing(sim: Sim, ticks: number, script: (tick: number) => Command[]): Map<string, number> {
  const first = new Map<string, number>()
  for (let i = 0; i < ticks; i++) {
    const tick = sim.tick
    for (const event of sim.step(script(tick)).events) if (!first.has(event.type)) first.set(event.type, tick)
  }
  return first
}

/**
 * Hold right from the start, and jump at tick `jumpAt` (held for a whole jump). The hero walks 6 tiles a second from
 * x = 2.5, so tick 36 is a tile before the gap, which begins at x = 7, and tick 46 is its edge. A page that plays in
 * real time reads the hero's place a few ticks late, so a jump anywhere in that tile must clear the gap.
 */
const runAndJump =
  (jumpAt: number | undefined) =>
  (tick: number): Command[] => {
    if (tick === 0) return [controlsCommand(tick, 1, 0, ['right'])]
    if (tick === jumpAt) return [controlsCommand(tick, 1, 1, ['jump', 'right'])]
    if (tick === (jumpAt ?? 0) + 24) return [controlsCommand(tick, 1, 2, ['right'])]
    return []
  }

test('walking off the edge of the gap loses the level', async () => {
  const said = playing(await newGame(), 200, runAndJump(undefined))
  expect(said.has('hero.fell')).toBe(true)
  expect(said.has('door.touched')).toBe(false)
})

test('a jump at the edge clears the gap', async () => {
  const said = playing(await newGame(), 240, runAndJump(46))
  expect(said.has('hero.fell')).toBe(false)
})

test.each([36, 38, 40, 42, 44])('a jump at tick %i clears the gap', async (at) => {
  const said = playing(await newGame(), 240, runAndJump(at))
  expect(said.has('hero.fell')).toBe(false)
  expect(said.has('door.touched')).toBe(true)
})

test('a crate pushed into the gap falls, loses nothing, and the door still wins the level', async () => {
  // The crate starts a tile before the gap: the hero pushes it in, and stops before the edge.
  const pushed = await newGame((level) => {
    for (const thing of level.things) if (thing.id === 'crate-1') thing.x = 5.5
  })
  const stop = (tick: number): Command[] =>
    tick === 0
      ? [controlsCommand(tick, 1, 0, ['right'])]
      : tick === 45
        ? [controlsCommand(tick, 1, 1, [])]
        : []
  expect(playing(pushed, 300, stop).has('hero.fell')).toBe(false)
  // Without a crate, the same jump still reaches the door.
  const empty = await newGame((level) => {
    level.things = level.things.filter((thing) => thing.id !== 'crate-1')
  })
  expect(playing(empty, 240, runAndJump(40)).has('door.touched')).toBe(true)
})

test('touching the door wins the level, and it is player 1 who touched it', async () => {
  const sim = await newGame()
  let by: number | undefined
  const script = runAndJump(40)
  for (let i = 0; i < 240; i++) {
    for (const event of sim.step(script(sim.tick)).events)
      if (event.type === 'door.touched' && by === undefined) by = (event.payload as { player: number }).player
  }
  expect(by).toBe(1)
})

test('taking the spark makes the score 1', async () => {
  const sim = await newGame()
  playing(sim, 60, runAndJump(undefined))
  expect(sim.resource(Score).sparks).toBe(1)
})
