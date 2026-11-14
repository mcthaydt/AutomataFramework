// The story's state, and a player's hands held while a cutscene plays: the sim blanks what a held player holds, so a
// game's own hero code needs no change, and gives back what is still held when it ends.
import { afterEach, expect, test } from 'vitest'
import { type Command, controlsCommand, Player } from '#src/features/commands/commands.ts'
import {
  chooseCommand,
  createGameSim,
  joinCommand,
  leaveCommand,
  nextCommand,
  skipCommand,
  startCutscene,
  Story,
} from '#src/features/level/level.ts'
import { Body, Transform } from '#src/features/physics/physics.ts'
import type { Sim, SimContext } from '#src/features/sim/sim.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { type MiniGame, miniGame } from '../../fixtures/level/mini-game.ts'
import { callOn, storyEventsOf } from '../../fixtures/level/story-helpers.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** A cutscene of 60 ticks that only holds the camera still: what it does to the players is all a test looks at. */
const pause = {
  format: 1,
  id: 'pause',
  level: 'level-1',
  length: 60,
  camera: [{ at: 0, x: 8, y: 4.5, zoom: 1, ease: 'cut' }],
  actors: [],
  lines: [],
}
/** The tick the game's own system starts it, so it is playing from 30 and ends in the step at tick 90. */
const START = 30
const END = START + pause.length

async function simOf(
  players: readonly number[] = [1],
  game: MiniGame = {},
  at: readonly number[] = [START],
): Promise<Sim> {
  const content = await miniGame({ players: 2, cutscenes: [pause], ...game })
  const sim = await createGameSim({
    content,
    plugins: [heroPlugin, callOn('start-pause', at, (ctx) => startCutscene(ctx, 'pause'))],
    players,
  })
  made.push(sim)
  return sim
}

const hero = (sim: Sim, number: number) => sim.query(Player).find((e) => e.get(Player).number === number)
const held = (sim: Sim, number = 1): string => hero(sim, number)?.get(Player).held ?? 'no hero'
const pressed = (sim: Sim, number = 1): string => hero(sim, number)?.get(Player).pressed ?? 'no hero'
const xOf = (sim: Sim, number = 1): number => hero(sim, number)?.get(Transform).x ?? Number.NaN
const vyOf = (sim: Sim, number = 1): number => hero(sim, number)?.get(Body).vy ?? Number.NaN

/** What one step left behind, read after it. */
interface Seen {
  readonly held: string
  readonly pressed: string
  readonly x: number
  readonly vy: number
  readonly playing: boolean
}
/** Steps to tick `until`, sending `send(tick)`'s commands, and returns what each step left, by the tick it ran at. */
function run(sim: Sim, until: number, send: (tick: number) => Command[] = () => []): Seen[] {
  const seen: Seen[] = []
  while (sim.tick < until) {
    sim.step(send(sim.tick))
    seen.push({
      held: held(sim),
      pressed: pressed(sim),
      x: xOf(sim),
      vy: vyOf(sim),
      playing: sim.resource(Story).scene !== null,
    })
  }
  return seen
}
/** `commands` at the ticks given: `{ 10: ['right'] }` sends player 1's controls at tick 10. */
const controlsAt =
  (byTick: Record<number, readonly string[]>) =>
  (tick: number): Command[] => {
    const actions = byTick[tick]
    return actions === undefined ? [] : [controlsCommand(tick, 1, 0, actions)]
  }

test('a held hero stands still, and runs on when it is let go with the key still down', async () => {
  const sim = await simOf()
  const seen = run(sim, 140, controlsAt({ 10: ['right'] }))
  // It runs before the cutscene.
  expect(seen[29]?.x).toBeGreaterThan((seen[10]?.x ?? 0) + 1)
  // It is playing after the step that started it, until the step at the tick it ends.
  expect(seen.map((s) => s.playing).indexOf(true)).toBe(START)
  expect(seen.map((s) => s.playing).lastIndexOf(true)).toBe(END - 1)
  // Held from the next tick on: nothing is held, and after the one tick it coasts on, it has not moved.
  for (let t = START + 1; t < END; t++) expect(seen[t]?.held, `held at ${t}`).toBe('')
  for (let t = START + 2; t <= END; t++)
    expect(seen[t]?.x, `x at ${t}`).toBeCloseTo(seen[START + 1]?.x ?? Number.NaN, 6)
  // Let go: the key is still down, and it was never a new press.
  expect(seen[END]?.held).toBe('right')
  expect(seen[END]?.pressed).toBe('')
  expect(seen[END + 10]?.x).toBeGreaterThan((seen[END]?.x ?? 0) + 0.5)
})

test('a key let go while held stays let go', async () => {
  const sim = await simOf()
  const seen = run(sim, 140, controlsAt({ 10: ['right'], 50: [] }))
  expect(seen[END]?.held).toBe('')
  expect(seen[END + 20]?.x).toBeCloseTo(seen[END]?.x ?? Number.NaN, 6)
  expect(seen[END + 20]?.x).toBeCloseTo(seen[START + 1]?.x ?? Number.NaN, 6)
})

test('the press on the tick it ends is held, not pressed', async () => {
  const sim = await simOf()
  const seen = run(sim, 140, controlsAt({ [END]: ['jump'] }))
  expect(seen[END]?.held).toBe('jump')
  expect(seen[END]?.pressed).toBe('')
  // It never jumped: a jump sets an upward speed of 12, and standing on the floor it stays at about nothing.
  for (let t = END; t < END + 30; t++) expect(seen[t]?.vy, `vy at ${t}`).toBeGreaterThan(-1)
})

test('a key pressed while held does not fire when the hold ends', async () => {
  const sim = await simOf()
  const seen = run(sim, 160, controlsAt({ 50: ['jump'] }))
  expect(seen[END]?.held).toBe('jump')
  expect(seen[END]?.pressed).toBe('')
  for (let t = START + 1; t < 150; t++) expect(seen[t]?.vy, `vy at ${t}`).toBeGreaterThan(-1)
})

test('everyone is held in a cutscene, a player who joins during it too', async () => {
  const sim = await simOf([1])
  const commands = (tick: number): Command[] =>
    tick === 40 ? [joinCommand(40, 2, 0), controlsCommand(40, 2, 1, ['right'])] : []
  run(sim, 41, commands)
  expect(held(sim, 2)).toBe('')
  expect(sim.resource(Story).hands).toEqual({ '1': '', '2': 'right' })
  const x = xOf(sim, 2)
  run(sim, 80)
  expect(xOf(sim, 2)).toBeCloseTo(x, 6)
  run(sim, END + 1)
  expect(held(sim, 2)).toBe('right')
  expect(sim.resource(Story).hands).toEqual({})
})

test('a held player who leaves takes their entry with them', async () => {
  const sim = await simOf([1, 2])
  run(sim, 41)
  expect(Object.keys(sim.resource(Story).hands)).toEqual(['1', '2'])
  run(sim, 51, (tick) => (tick === 50 ? [leaveCommand(50, 2, 0)] : []))
  expect(Object.keys(sim.resource(Story).hands)).toEqual(['1'])
})

test('restored in the middle of the hold and just after it, the run agrees with the straight one', async () => {
  const send = controlsAt({ 10: ['right'], 50: ['right', 'jump'], 70: ['jump'] })
  const straight = await simOf()
  run(straight, 150, send)
  for (const at of [45, END + 5]) {
    const sim = await simOf()
    run(sim, at, send)
    const bytes = sim.snapshot()
    run(sim, 150, send)
    sim.restore(bytes)
    expect(sim.tick).toBe(at)
    run(sim, 150, send)
    expect(sim.hash(), `restored at ${at}`).toBe(straight.hash())
  }
})

test('a game with no conversation and no cutscene has no story', async () => {
  const sim = await createGameSim({ content: await loadFixtureGame() })
  made.push(sim)
  expect(() => sim.resource(Story)).toThrow('unknown resource "story"')
  expect(sim.step([skipCommand(0, 1, 0)]).rejected).toHaveLength(1)
})

test('a choice is a whole number from 0 to 3; anything else is a bad command', async () => {
  const sim = await simOf()
  const bad = [
    chooseCommand(0, 1, 0, 4),
    chooseCommand(0, 1, 1, -1),
    chooseCommand(0, 1, 2, 0.5),
    { tick: 0, source: 1, seq: 3, type: 'story.next', payload: { extra: true } },
    { tick: 0, source: 1, seq: 4, type: 'story.skip', payload: 7 },
  ]
  expect(sim.step(bad).rejected.map((r) => r.reason)).toEqual(Array(5).fill('invalid-payload'))
  const fine = [nextCommand(1, 1, 0), chooseCommand(1, 1, 1, 3), skipCommand(1, 1, 2)]
  expect(sim.step(fine).rejected).toEqual([])
})

test('startCutscene says no to an id the game lacks and to another level’s cutscene', async () => {
  const answers: boolean[] = []
  const elsewhere = { ...pause, id: 'elsewhere', level: 'level-2' }
  const secondLevel = {
    format: 1,
    id: 'level-2',
    tiles: [...Array.from({ length: 8 }, () => '.'.repeat(16)), '#'.repeat(16)],
    things: [],
    starts: [{ player: 1, x: 2.5, y: 7.5 }],
  }
  const content = await miniGame({ cutscenes: [pause, elsewhere], levels: [secondLevel] })
  const sim = await createGameSim({
    content,
    plugins: [
      heroPlugin,
      callOn('ask', [3, 4, 5], (ctx: SimContext) => {
        answers.push(startCutscene(ctx, ctx.tick === 3 ? 'nothing' : ctx.tick === 4 ? 'elsewhere' : 'pause'))
      }),
    ],
  })
  made.push(sim)
  const events: string[][] = []
  while (sim.tick < 8) events.push(storyEventsOf(sim.step([])).map((e) => e.type))
  expect(answers).toEqual([false, false, true])
  expect(events.flat()).toEqual(['cutscene.started'])
  expect(sim.resource(Story).scene).toEqual({ cutscene: 'pause', since: 5 })
})

test('the story knows which level is open, and what an earlier play finished', async () => {
  const content = await miniGame({ cutscenes: [pause] })
  const sim = await createGameSim({
    content,
    story: { ended: { keeper: 'tip' }, seen: ['pause'] },
  })
  made.push(sim)
  expect(sim.resource(Story)).toEqual({
    level: 'level-1',
    talk: null,
    scene: null,
    hands: {},
    met: [],
    ended: { keeper: 'tip' },
    seen: ['pause'],
  })
})
