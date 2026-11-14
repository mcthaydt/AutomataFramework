// Conversations in the sim: one opens for a player and a thing, then moves only on that player's commands, holds
// that player's hands while it is open, and ends, finished or cut short. When a conversation opens on its own, by a hero
// walking up, waits on the Owner's answer to plan T's question (see the todo tests); a game's own code opens one with
// `startConversation`, which these tests use.
import { afterEach, expect, test } from 'vitest'
import { type Command, controlsCommand, Player } from '#src/features/commands/commands.ts'
import type { GameContent } from '#src/features/content/content.ts'
import {
  chooseCommand,
  createGameSim,
  leaveCommand,
  nextCommand,
  Story,
  startConversation,
  Thing,
} from '#src/features/level/level.ts'
import { talkOf } from '#src/features/level/story-read.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { PluginDef, Sim, SimContext } from '#src/features/sim/sim.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import {
  keeperFile,
  keeperTalk,
  keeperWords,
  type MiniGame,
  miniGame,
} from '../../fixtures/level/mini-game.ts'
import { callOn, storyEventsOf } from '../../fixtures/level/story-helpers.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** A conversation of one node with three lines: Next moves through them and then ends it. */
const longTalk = {
  format: 1,
  id: 'long',
  start: 'a',
  nodes: [{ id: 'a', speaker: 'keeper', lines: ['keeper.hello', 'keeper.tip', 'keeper.bye'] }],
}

/** Two players on the floor at 2.5 and 4.5, and the keeper at 10.5 with the conversation they can have. */
function keeperGame(more: MiniGame = {}): Promise<GameContent> {
  return miniGame({
    players: 2,
    characters: [keeperFile],
    conversations: [keeperTalk, longTalk],
    words: keeperWords,
    things: [{ id: 'keeper', character: 'keeper', x: 10.5, y: 7.5 }],
    ...more,
  })
}

const keeperSid = (ctx: SimContext): number | undefined =>
  ctx.query(Thing).find((e) => e.get(Thing).id === 'keeper')?.sid

/** A game plugin that opens conversation `id` for `player`, with the keeper unless `alone`, on each of `ticks`. */
const opens = (ticks: readonly number[], id = 'keeper', player = 1, alone = false) =>
  callOn(`open-${id}-${player}`, ticks, (ctx) => {
    startConversation(ctx, id, player, alone ? undefined : keeperSid(ctx))
  })

async function simOf(content: GameContent, ...plugins: PluginDef[]): Promise<Sim> {
  const sim = await createGameSim({ content, plugins: [heroPlugin, ...plugins], players: [1, 2] })
  made.push(sim)
  return sim
}

const hero = (sim: Sim, number: number) => sim.query(Player).find((e) => e.get(Player).number === number)
const held = (sim: Sim, number: number): string => hero(sim, number)?.get(Player).held ?? 'no hero'
const xOf = (sim: Sim, number: number): number => hero(sim, number)?.get(Transform).x ?? Number.NaN

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

test('a conversation opened for the keeper says its first line, and the story knows where it is', async () => {
  const content = await keeperGame()
  const sim = await simOf(content, opens([20]))
  const events = run(sim, 21)
  expect(events).toEqual({
    20: [
      { type: 'conversation.started', payload: { conversation: 'keeper', player: 1, thing: 'keeper' } },
      {
        type: 'conversation.said',
        payload: { conversation: 'keeper', node: 'hello', line: 'keeper.hello', speaker: 'keeper' },
      },
    ],
  })
  const keeper = sim.query(Thing).find((e) => e.get(Thing).id === 'keeper')
  expect(sim.resource(Story).talk).toEqual({
    conversation: 'keeper',
    player: 1,
    thing: keeper?.sid,
    node: 'hello',
    line: 0,
  })
})

test('startConversation from game code opens one with no thing', async () => {
  const sim = await simOf(await keeperGame(), opens([20], 'keeper', 1, true))
  const events = run(sim, 21)
  expect(events[20]?.[0]).toEqual({
    type: 'conversation.started',
    payload: { conversation: 'keeper', player: 1, thing: '' },
  })
  expect(sim.resource(Story).talk?.thing).toBe(0)
})

test('the talker is held; the other player is not', async () => {
  const sim = await simOf(await keeperGame(), opens([20]))
  const send = (tick: number): Command[] =>
    tick === 10 ? [controlsCommand(10, 1, 0, ['right']), controlsCommand(10, 2, 0, ['right'])] : []
  run(sim, 25, send)
  expect(held(sim, 1)).toBe('')
  expect(held(sim, 2)).toBe('right')
  expect(sim.resource(Story).hands).toEqual({ '1': 'right' })
  const [one, two] = [xOf(sim, 1), xOf(sim, 2)]
  run(sim, 40)
  expect(xOf(sim, 1)).toBeCloseTo(one, 6)
  expect(xOf(sim, 2)).toBeGreaterThan(two + 1)
})

test('a pick leads on, Next ends it, and the node it ended on is kept', async () => {
  const sim = await simOf(await keeperGame(), opens([20]))
  const send = at({
    25: [chooseCommand(25, 1, 0, 0)],
    30: [nextCommand(30, 1, 0)],
  })
  const events = run(sim, 40, send)
  expect(events[25]).toEqual([
    {
      type: 'conversation.chosen',
      payload: { conversation: 'keeper', node: 'hello', choice: 0, line: 'hero.ask', player: 1 },
    },
    {
      type: 'conversation.said',
      payload: { conversation: 'keeper', node: 'tip', line: 'keeper.tip', speaker: 'keeper' },
    },
  ])
  expect(events[30]).toEqual([
    {
      type: 'conversation.ended',
      payload: { conversation: 'keeper', node: 'tip', player: 1, finished: true },
    },
  ])
  expect(sim.resource(Story).ended).toEqual({ keeper: 'tip' })
  expect(sim.resource(Story).talk).toBeNull()
  expect(sim.resource(Story).hands).toEqual({})
})

test('talkOf says what the box shows', async () => {
  const content = await keeperGame()
  const sim = await simOf(content, opens([20]))
  expect(talkOf(sim, content)).toBeUndefined()
  run(sim, 21)
  expect(talkOf(sim, content)).toEqual({
    conversation: 'keeper',
    player: 1,
    speaker: 'keeper',
    line: 'keeper.hello',
    choices: ['hero.ask', 'hero.bye'],
  })
  run(sim, 26, at({ 25: [chooseCommand(25, 1, 0, 1)] }))
  expect(talkOf(sim, content)).toEqual({
    conversation: 'keeper',
    player: 1,
    speaker: 'keeper',
    line: 'keeper.bye',
    choices: [],
  })
})

test('Next while a pick waits, a pick that is not offered, and anything from player 2 do nothing', async () => {
  const sim = await simOf(await keeperGame(), opens([20]))
  const talk = (): unknown => structuredClone(sim.resource(Story).talk)
  run(sim, 21)
  const before = talk()
  const events = run(
    sim,
    22,
    at({
      21: [
        nextCommand(21, 1, 0),
        chooseCommand(21, 1, 1, 2),
        chooseCommand(21, 1, 2, 3),
        nextCommand(21, 2, 0),
        chooseCommand(21, 2, 1, 0),
      ],
    }),
  )
  expect(events).toEqual({})
  expect(talk()).toEqual(before)
})

test('two Nexts in one tick move twice and never past the end', async () => {
  const sim = await simOf(await keeperGame(), opens([20], 'long'))
  run(sim, 21)
  const twice = run(sim, 22, at({ 21: [nextCommand(21, 1, 0), nextCommand(21, 1, 1)] }))
  expect(twice[21]?.map((e) => e.type)).toEqual(['conversation.said', 'conversation.said'])
  expect(sim.resource(Story).talk?.line).toBe(2)
  // Four more in one tick: the first ends it, and the other three find nothing to move.
  const more = run(sim, 23, at({ 22: [0, 1, 2, 3].map((seq) => nextCommand(22, 1, seq)) }))
  expect(more[22]?.map((e) => e.type)).toEqual(['conversation.ended'])
  expect(sim.resource(Story).talk).toBeNull()
})

test('a pick and a Next in one tick happen in the order they were sent', async () => {
  const sim = await simOf(await keeperGame(), opens([20, 40]))
  run(sim, 21)
  // The Next comes first, while the pick waits, and does nothing; then the pick leads to the tip.
  const first = run(sim, 22, at({ 21: [nextCommand(21, 1, 0), chooseCommand(21, 1, 1, 0)] }))
  expect(first[21]?.map((e) => e.type)).toEqual(['conversation.chosen', 'conversation.said'])
  run(sim, 41, at({ 30: [nextCommand(30, 1, 0)] }))
  // The pick comes first, and the Next after it ends the tip.
  const second = run(sim, 42, at({ 41: [chooseCommand(41, 1, 0, 0), nextCommand(41, 1, 1)] }))
  expect(second[41]?.map((e) => e.type)).toEqual([
    'conversation.chosen',
    'conversation.said',
    'conversation.ended',
  ])
})

test('startConversation says no to an id the game lacks, a player with no hero, and a second conversation', async () => {
  const answers: boolean[] = []
  const asks = callOn('ask', [5, 6, 7, 8], (ctx) => {
    const id = ctx.tick === 5 ? 'nothing' : 'keeper'
    const player = ctx.tick === 6 ? 3 : 1
    answers.push(startConversation(ctx, id, player))
    if (ctx.tick === 8) answers.push(startConversation(ctx, id, 2))
  })
  const sim = await simOf(await keeperGame(), asks)
  run(sim, 10)
  // Tick 5: no such conversation. Tick 6: player 3 has no hero. Tick 7: it opens. Tick 8: one is already open.
  expect(answers).toEqual([false, false, true, false, false])
  expect(sim.resource(Story).talk?.player).toBe(1)
})

test('the talker leaves the game mid-sentence: it ends unfinished and nothing is kept', async () => {
  const send = at({ 10: [controlsCommand(10, 1, 0, ['right'])], 25: [leaveCommand(25, 1, 0)] })
  const content = await keeperGame()
  const sim = await simOf(content, opens([20]))
  const events = run(sim, 26, send)
  // The hero is still there for the tick it leaves on, and gone for the next.
  expect(events[25]).toBeUndefined()
  const after = run(sim, 27, send)
  expect(after[26]).toEqual([
    {
      type: 'conversation.ended',
      payload: { conversation: 'keeper', node: 'hello', player: 1, finished: false },
    },
  ])
  expect(sim.resource(Story).ended).toEqual({})
  expect(sim.resource(Story).talk).toBeNull()
  expect(sim.resource(Story).hands).toEqual({})
  // Restored one tick later, the run agrees with the straight one.
  const bytes = sim.snapshot()
  run(sim, 60, send)
  const straight = sim.hash()
  sim.restore(bytes)
  run(sim, 60, send)
  expect(sim.hash()).toBe(straight)
})

test('the keeper goes away mid-sentence: it ends unfinished, and the hero runs on', async () => {
  const goes = callOn('goes', [25], (ctx) => {
    const sid = keeperSid(ctx)
    if (sid !== undefined) ctx.despawn(sid)
  })
  const sim = await simOf(await keeperGame(), opens([20]), goes)
  run(sim, 30, at({ 10: [controlsCommand(10, 1, 0, ['right'])] }))
  expect(sim.resource(Story).talk).toBeNull()
  expect(sim.resource(Story).ended).toEqual({})
  // The key it held through the conversation is still down, and is not a new press.
  expect(held(sim, 1)).toBe('right')
  const x = xOf(sim, 1)
  run(sim, 40)
  expect(xOf(sim, 1)).toBeGreaterThan(x + 0.5)
})

test('a thing that is not near enough is not met, and one that is, is, once, while a conversation is off', async () => {
  const content = await keeperGame()
  const sim = await simOf(content)
  const keeper = sim.query(Thing).find((e) => e.get(Thing).id === 'keeper')
  expect(sim.resource(Story).met).toEqual([])
  // Player 2 walks right from 4.5 at 6 tiles a second: within 1.5 of the keeper at x 9.
  run(sim, 5, at({ 0: [controlsCommand(0, 2, 0, ['right'])] }))
  expect(sim.resource(Story).met).toEqual([])
  run(sim, 70)
  expect(sim.resource(Story).met).toEqual([`${keeper?.sid}:2`])
})

test('a pair that comes within reach while a conversation is open is kept out of what has been met', async () => {
  const content = await keeperGame()
  // Player 1 is talking about nothing in particular (no thing) while player 2 walks up to the keeper.
  const sim = await simOf(content, opens([2], 'keeper', 1, true))
  run(sim, 70, at({ 0: [controlsCommand(0, 2, 0, ['right'])] }))
  expect(sim.resource(Story).talk).not.toBeNull()
  expect(sim.resource(Story).met).toEqual([])
})

test('a hero never counts as a thing to talk to, even if its character names a conversation', async () => {
  const content = await keeperGame({ hero: { conversation: 'keeper' }, starts: [2.5, 3.5] })
  const sim = await simOf(content)
  run(sim, 10)
  expect(sim.resource(Story).met).toEqual([])
})

test.todo('walking up to the keeper opens the conversation: waits for the Owner’s answer on when it opens')
test.todo(
  'it opens again only when the Owner’s rule says so, and two heroes arriving together: the lower player talks',
)
