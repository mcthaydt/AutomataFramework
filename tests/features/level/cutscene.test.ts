// Cutscenes in the sim: one keeps its own time in sim ticks, puts its actors where its keys say, holds every player's
// hands, opens a level, follows a conversation, and can be skipped; what it changed is the same whether or not it was
// watched.
import { afterEach, expect, test } from 'vitest'
import { type Command, controlsCommand, Player } from '#src/features/commands/commands.ts'
import type { CutsceneFile, GameContent } from '#src/features/content/content.ts'
import {
  chooseCommand,
  createGameSim,
  nextCommand,
  SKIP_AFTER,
  Story,
  type StoryProgress,
  skipCommand,
  startConversation,
  startCutscene,
  Thing,
} from '#src/features/level/level.ts'
import { sceneOf, storyProgress } from '#src/features/level/story-read.ts'
import { cameraAt } from '#src/features/level/timeline.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { PluginDef, Sim } from '#src/features/sim/sim.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import {
  critterBehaviour,
  critterFile,
  keeperFile,
  keeperWords,
  type MiniGame,
  miniGame,
} from '../../fixtures/level/mini-game.ts'
import { callOn, storyEventsOf } from '../../fixtures/level/story-helpers.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** The level's opening: the keeper walks in from the right, and says hello, while the camera goes in. */
const intro = {
  format: 1,
  id: 'intro',
  level: 'level-1',
  length: 120,
  camera: [
    { at: 0, x: 4, y: 4, zoom: 1, ease: 'cut' },
    { at: 120, x: 8, y: 4, zoom: 1.5, ease: 'smooth' },
  ],
  actors: [
    { at: 0, who: 'keeper', x: 12.5, y: 7.5 },
    { at: 90, who: 'keeper', x: 10.5, y: 7.5 },
  ],
  lines: [{ at: 30, until: 110, line: 'keeper.hello', speaker: 'keeper' }],
  opens: true,
}
/** What follows the keeper's tip: the hero steps back a tile. */
const tip = {
  format: 1,
  id: 'tip',
  level: 'level-1',
  length: 60,
  camera: [{ at: 0, x: 8, y: 4.5, zoom: 1, ease: 'cut' }],
  actors: [
    { at: 0, who: 'player-1', x: 8, y: 7.5 },
    { at: 60, who: 'player-1', x: 7, y: 7.5 },
  ],
  lines: [],
}
/** Two actors, one of whom may not be playing. */
const crowd = {
  format: 1,
  id: 'crowd',
  level: 'level-1',
  length: 30,
  camera: [{ at: 0, x: 8, y: 4.5, zoom: 1, ease: 'cut' }],
  actors: [
    { at: 0, who: 'keeper', x: 9.5, y: 7.5 },
    { at: 0, who: 'player-2', x: 3, y: 7.5 },
  ],
  lines: [],
}
/** The keeper's talk, with the tip leading to the cutscene. */
const talk = {
  format: 1,
  id: 'keeper',
  start: 'hello',
  nodes: [
    {
      id: 'hello',
      speaker: 'keeper',
      lines: ['keeper.hello'],
      choices: [
        { line: 'hero.ask', next: 'tip' },
        { line: 'hero.bye', next: 'bye' },
      ],
    },
    { id: 'tip', speaker: 'keeper', lines: ['keeper.tip'], cutscene: 'tip' },
    { id: 'bye', speaker: 'keeper', lines: ['keeper.bye'] },
  ],
}

function storyGame(more: MiniGame = {}): Promise<GameContent> {
  return miniGame({
    players: 2,
    characters: [keeperFile],
    conversations: [talk],
    cutscenes: [intro, tip, crowd],
    words: keeperWords,
    things: [{ id: 'keeper', character: 'keeper', x: 10.5, y: 7.5 }],
    ...more,
  })
}

/** A sim of the story game. By default an earlier play has seen the opening; `fresh` leaves it to open the level. */
async function simOf(options: {
  readonly fresh?: boolean
  readonly players?: readonly number[]
  readonly plugins?: readonly PluginDef[]
  readonly content?: GameContent
}): Promise<Sim> {
  const seen = options.fresh === true ? [] : ['intro']
  const sim = await createGameSim({
    content: options.content ?? (await storyGame()),
    plugins: [heroPlugin, ...(options.plugins ?? [])],
    players: options.players ?? [1, 2],
    story: { ended: {}, seen },
  })
  made.push(sim)
  return sim
}

const thingX = (sim: Sim, id: string): number =>
  sim
    .query(Thing)
    .find((e) => e.get(Thing).id === id)
    ?.get(Transform).x ?? Number.NaN
const heroX = (sim: Sim, number: number): number =>
  sim
    .query(Player)
    .find((e) => e.get(Player).number === number)
    ?.get(Transform).x ?? Number.NaN

/** Steps to tick `until`, sending `send(tick)`'s commands, and returns the story's events by the tick they came on. */
function run(sim: Sim, until: number, send: (tick: number) => Command[] = () => []) {
  const events: Record<number, ReturnType<typeof storyEventsOf>> = {}
  while (sim.tick < until) {
    const tick = sim.tick
    const found = storyEventsOf(sim.step(send(tick)))
    if (found.length > 0) events[tick] = found
  }
  return events
}
const at =
  (byTick: Record<number, Command[]>) =>
  (tick: number): Command[] =>
    byTick[tick] ?? []

test('the level opens with its cutscene: started on tick 0, ended on tick 120', async () => {
  const sim = await simOf({ fresh: true })
  const events = run(sim, 130)
  expect(events).toEqual({
    0: [{ type: 'cutscene.started', payload: { cutscene: 'intro' } }],
    120: [{ type: 'cutscene.ended', payload: { cutscene: 'intro', skipped: false } }],
  })
  expect(sim.resource(Story).seen).toEqual(['intro'])
  expect(sim.resource(Story).scene).toBeNull()
})

test('an actor is where its keys say at every tick, and stays there after', async () => {
  const sim = await simOf({ fresh: true })
  run(sim, 46)
  expect(thingX(sim, 'keeper')).toBeCloseTo(11.5, 3)
  run(sim, 91)
  expect(thingX(sim, 'keeper')).toBeCloseTo(10.5, 3)
  run(sim, 121)
  expect(thingX(sim, 'keeper')).toBeCloseTo(10.5, 3)
  run(sim, 200)
  expect(thingX(sim, 'keeper')).toBeCloseTo(10.5, 3)
})

test('sceneOf says what the page shows', async () => {
  const content = await storyGame()
  const sim = await simOf({ fresh: true, content })
  expect(sceneOf(sim, content)).toBeUndefined()
  run(sim, 60)
  expect(sceneOf(sim, content)).toEqual({
    cutscene: 'intro',
    t: 60,
    length: 120,
    camera: cameraAt(content.cutscenes?.intro as CutsceneFile, 60),
    lines: [{ speaker: 'keeper', line: 'keeper.hello' }],
  })
  run(sim, 130)
  expect(sceneOf(sim, content)).toBeUndefined()
})

test('Skip ends it at once, and the keeper is where it would have been', async () => {
  const sim = await simOf({ fresh: true })
  const events = run(sim, 45, at({ 40: [skipCommand(40, 1, 0)] }))
  expect(events[40]).toEqual([{ type: 'cutscene.ended', payload: { cutscene: 'intro', skipped: true } }])
  expect(thingX(sim, 'keeper')).toBeCloseTo(10.5, 3)
  expect(sim.resource(Story).seen).toEqual(['intro'])
  expect(sim.resource(Story).scene).toBeNull()
})

test('a Skip on the very tick it ends by itself gives one ended, not skipped', async () => {
  const sim = await simOf({ fresh: true })
  const events = run(sim, 125, at({ 120: [skipCommand(120, 1, 0)] }))
  expect(events[120]).toEqual([{ type: 'cutscene.ended', payload: { cutscene: 'intro', skipped: false } }])
})

test('a Skip in its first SKIP_AFTER ticks does nothing', async () => {
  const early = await simOf({ fresh: true })
  run(early, 40, at({ 0: [skipCommand(0, 1, 0)], 1: [skipCommand(1, 1, 0)], 29: [skipCommand(29, 1, 0)] }))
  expect(early.resource(Story).scene).not.toBeNull()
  const on = await simOf({ fresh: true })
  const events = run(on, SKIP_AFTER + 2, at({ [SKIP_AFTER]: [skipCommand(SKIP_AFTER, 1, 0)] }))
  expect(events[SKIP_AFTER]?.[0]).toEqual({
    type: 'cutscene.ended',
    payload: { cutscene: 'intro', skipped: true },
  })
})

test('a Skip from a player with no hero, or with nothing playing, does nothing', async () => {
  const sim = await simOf({ fresh: true, players: [1] })
  const events = run(sim, 140, at({ 50: [skipCommand(50, 2, 0)], 130: [skipCommand(130, 1, 0)] }))
  expect(Object.keys(events)).toEqual(['0', '120'])
  expect(events[120]?.[0]?.payload).toEqual({ cutscene: 'intro', skipped: false })
})

test('a game that continues does not see the opening again', async () => {
  const sim = await simOf({})
  expect(storyEventsOf(sim.step([]))).toEqual([])
  expect(sim.resource(Story).scene).toBeNull()
})

test('the conversation’s last node starts its cutscene in the tick it ends', async () => {
  const open = callOn('open', [20], (ctx) => {
    startConversation(ctx, 'keeper', 1)
  })
  const sim = await simOf({ plugins: [open] })
  const send = at({
    10: [controlsCommand(10, 1, 0, ['right'])],
    25: [chooseCommand(25, 1, 0, 0)],
    30: [nextCommand(30, 1, 0)],
  })
  const events = run(sim, 31, send)
  expect(events[30]).toEqual([
    {
      type: 'conversation.ended',
      payload: { conversation: 'keeper', node: 'tip', player: 1, finished: true },
    },
    { type: 'cutscene.started', payload: { cutscene: 'tip' } },
  ])
  // Held without a gap: the key is still down, and nothing has let go of it.
  expect(sim.resource(Story).hands).toEqual({ '1': 'right' })
  run(sim, 61)
  expect(heroX(sim, 1)).toBeCloseTo(7.5, 3)
  const ended = run(sim, 100)
  expect(ended[90]).toEqual([{ type: 'cutscene.ended', payload: { cutscene: 'tip', skipped: false } }])
  expect(heroX(sim, 1)).toBeGreaterThan(7)
  expect(sim.resource(Story).seen).toEqual(['intro', 'tip'])
  expect(sim.resource(Story).ended).toEqual({ keeper: 'tip' })
})

test('startCutscene while one plays replaces it, and ends an open conversation unfinished', async () => {
  const replace = callOn('replace', [50], (ctx) => {
    startCutscene(ctx, 'tip')
  })
  const sim = await simOf({ fresh: true, plugins: [replace] })
  const replaced = run(sim, 51)
  expect(replaced[50]).toEqual([
    { type: 'cutscene.ended', payload: { cutscene: 'intro', skipped: true } },
    { type: 'cutscene.started', payload: { cutscene: 'tip' } },
  ])
  expect(sim.resource(Story).scene).toEqual({ cutscene: 'tip', since: 50 })

  const open = callOn('open', [20], (ctx) => {
    startConversation(ctx, 'keeper', 1)
  })
  const start = callOn('start', [30], (ctx) => {
    startCutscene(ctx, 'tip')
  })
  const talking = await simOf({ plugins: [open, start] })
  const events = run(talking, 31)
  expect(events[30]).toEqual([
    {
      type: 'conversation.ended',
      payload: { conversation: 'keeper', node: 'hello', player: 1, finished: false },
    },
    { type: 'cutscene.started', payload: { cutscene: 'tip' } },
  ])
  expect(talking.resource(Story).ended).toEqual({})
})

test('an actor that has left the game is passed over', async () => {
  const start = callOn('start', [5], (ctx) => {
    startCutscene(ctx, 'crowd')
  })
  const sim = await simOf({ players: [1], plugins: [start] })
  run(sim, 40)
  expect(thingX(sim, 'keeper')).toBeCloseTo(9.5, 3)
  expect(sim.resource(Story).seen).toEqual(['crowd', 'intro'])
})

test('a critter does not act while a cutscene plays, and carries on after', async () => {
  const content = await miniGame({
    characters: [critterFile],
    behaviours: [critterBehaviour],
    things: [{ id: 'critter-1', character: 'critter', x: 12.5, y: 7.7 }],
    cutscenes: [{ ...tip, actors: [], camera: [{ at: 0, x: 8, y: 4.5, zoom: 1, ease: 'cut' }] }],
  })
  const start = callOn('start', [30], (ctx) => {
    startCutscene(ctx, 'tip')
  })
  const sim = await createGameSim({ content, plugins: [heroPlugin, start] })
  made.push(sim)
  const xs: number[] = []
  while (sim.tick < 140) {
    sim.step([])
    xs.push(thingX(sim, 'critter-1'))
  }
  expect(xs[29]).toBeGreaterThan(xs[10] ?? Number.NaN)
  // Held from the next tick, it coasts one tick on, then stands until the cutscene ends at tick 90.
  for (let t = 32; t <= 90; t++) expect(xs[t], `x at ${t}`).toBeCloseTo(xs[31] ?? Number.NaN, 6)
  expect(Math.abs((xs[120] ?? 0) - (xs[90] ?? 0))).toBeGreaterThan(0.3)
})

test('restored in the middle of the opening and of a conversation’s cutscene, the run agrees with the straight one', async () => {
  const open = callOn('open', [150], (ctx) => {
    startConversation(ctx, 'keeper', 1)
  })
  const send = at({
    130: [controlsCommand(130, 1, 0, ['right'])],
    155: [chooseCommand(155, 1, 0, 0)],
    160: [nextCommand(160, 1, 0)],
  })
  const straight = await simOf({ fresh: true, plugins: [open] })
  run(straight, 260, send)
  for (const tick of [60, 190]) {
    const sim = await simOf({ fresh: true, plugins: [open] })
    run(sim, tick, send)
    const bytes = sim.snapshot()
    run(sim, 260, send)
    sim.restore(bytes)
    run(sim, 260, send)
    expect(sim.hash(), `restored at ${tick}`).toBe(straight.hash())
  }
})

test('storyProgress is what a save keeps: the nodes ended on, and the cutscenes seen', async () => {
  const content = await storyGame()
  const open = callOn('open', [20], (ctx) => {
    startConversation(ctx, 'keeper', 1)
  })
  const sim = await simOf({ content, plugins: [open] })
  const nothing: StoryProgress = { ended: {}, seen: ['intro'] }
  expect(storyProgress(sim, content)).toEqual(nothing)
  run(sim, 100, at({ 25: [chooseCommand(25, 1, 0, 1)], 30: [nextCommand(30, 1, 0)] }))
  expect(storyProgress(sim, content)).toEqual({ ended: { keeper: 'bye' }, seen: ['intro'] })
})
