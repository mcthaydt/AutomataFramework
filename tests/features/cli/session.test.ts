import { Effect } from 'effect'
import { expect, test } from 'vitest'
import type { CliError, GameCode, Ports } from '#src/features/cli/ports.ts'
import { runReplays } from '#src/features/cli/replay.ts'
import { createSessions } from '#src/features/cli/session.ts'
import { defineEvent, definePlugin, defineSystem, type PluginDef } from '#src/features/sim/sim.ts'
import * as framework from '#src/headless.ts'
import { z } from '#src/lib/zod.ts'
import { smallGame, under } from '../../fixtures/cli/game.ts'
import { type Memory, memoryLayer } from '../../fixtures/cli/memory.ts'
import { failingHero } from '../../fixtures/cli/recording.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'

const ACTIONS = ['left', 'right', 'jump']
const codeOf = (...plugins: PluginDef[]): GameCode => ({
  framework,
  rules: { plugins: [heroPlugin, ...plugins], actions: ACTIONS },
})
const game = (code: GameCode | (() => GameCode) = codeOf()): Memory =>
  memoryLayer(under('game', smallGame()), { code })

/** Runs an effect on the memory layer. */
const run = <A>(memory: Memory, effect: Effect.Effect<A, CliError, Ports>): Promise<A> =>
  Effect.runPromise(Effect.provide(effect, memory.layer))
/** The sentence an effect fails with. */
const sentence = async (memory: Memory, effect: Effect.Effect<unknown, CliError, Ports>): Promise<string> =>
  (await Effect.runPromise(Effect.provide(Effect.flip(effect), memory.layer))).message
const heroOf = (state: { things: readonly { id: string; character: string; x: number }[] }) =>
  state.things.find((thing) => thing.character === 'hero')

test('start gives tick 0 and the level as it is in the file, and says what rules it plays', async () => {
  const memory = game()
  const sessions = createSessions()
  const started = await run(memory, sessions.start({ folder: 'game' }))
  expect(started.session).toBe('s1')
  expect(started.state.tick).toBe(0)
  expect(started.state.level).toBe('level-1')
  expect(started.state.players).toEqual([1])
  expect(started.state.things.map((thing) => thing.id).sort()).toEqual(['crate-1', 'player-1'])
  expect(started.note).toBe("This session plays the game's rules as they were when it started.")
  await run(memory, sessions.stopAll())
})

test('holding right for 60 ticks moves player 1 to the right, and the crate after it', async () => {
  const memory = game()
  const sessions = createSessions()
  const { session, state } = await run(memory, sessions.start({ folder: 'game' }))
  const before = heroOf(state)?.x ?? 0
  const stepped = await run(memory, sessions.step(session, 60, { '1': ['right'] }))
  expect(stepped.state.tick).toBe(60)
  expect(heroOf(stepped.state)?.x).toBeGreaterThan(before + 1)
  const later = await run(memory, sessions.step(session, 120, { '1': ['right'] }))
  const crate = later.state.things.find((thing) => thing.id === 'crate-1')
  expect(crate?.x).toBeGreaterThan(6.5)
  await run(memory, sessions.stopAll())
})

test('the same steps give the same hash every time', async () => {
  const memory = game()
  const sessions = createSessions()
  const hashes: string[] = []
  for (let i = 0; i < 2; i++) {
    const { session } = await run(memory, sessions.start({ folder: 'game' }))
    await run(memory, sessions.step(session, 30, { '1': ['right'] }))
    hashes.push((await run(memory, sessions.step(session, 30, { '1': ['right', 'jump'] }))).state.hash)
    await run(memory, sessions.stop(session))
  }
  expect(hashes[0]).toBe(hashes[1])
})

test('a saved session is a recording automata replay calls "as recorded"', async () => {
  const memory = game()
  const sessions = createSessions()
  const { session } = await run(memory, sessions.start({ folder: 'game' }))
  await run(memory, sessions.step(session, 90, { '1': ['right'] }))
  await run(memory, sessions.step(session, 30, {}))
  const saved = await run(memory, sessions.save(session, 'agent-run'))
  expect(saved.file).toBe('replays/agent-run.json')
  expect(saved.ticks).toBe(120)
  const [result] = await run(memory, runReplays({ folder: 'game' }))
  expect(result?.verdict).toBe('ok')
  expect(result?.finalHash).toBe(saved.finalHash)
  await run(memory, sessions.stopAll())
})

test('events are named once a tick, in order, and stop at 200', async () => {
  const Ping = defineEvent('ping', z.object({}))
  const Pong = defineEvent('pong', z.object({}))
  const noisy = definePlugin({
    name: 'noisy',
    dependsOn: ['commands'],
    events: [Ping, Pong],
    systems: [
      defineSystem({
        name: 'noisy.ping',
        phase: 'gameplay',
        run(ctx) {
          ctx.emit(Ping, {})
          ctx.emit(Ping, {})
          ctx.emit(Pong, {})
        },
      }),
    ],
  })
  const memory = game(codeOf(noisy))
  const sessions = createSessions()
  const { session } = await run(memory, sessions.start({ folder: 'game' }))
  // The physics raises its own events too (the hero landing), so only these two are looked at.
  const mine = (events: readonly string[]): string[] =>
    events.filter((name) => name === 'ping' || name === 'pong')
  const first = await run(memory, sessions.step(session, 2, {}))
  expect(mine(first.events)).toEqual(['ping', 'pong', 'ping', 'pong'])
  expect((await run(memory, sessions.step(session, 300, {}))).events).toHaveLength(200)
  await run(memory, sessions.stopAll())
})

test('ticks of 0, 1.5 and a million, an unknown session and a fifth session each get their sentence', async () => {
  const memory = game()
  const sessions = createSessions()
  const { session } = await run(memory, sessions.start({ folder: 'game' }))
  for (const ticks of [0, 1.5, 1_000_000])
    expect(await sentence(memory, sessions.step(session, ticks, {}))).toBe(
      'ticks must be a whole number from 1 to 3600.',
    )
  expect(await sentence(memory, sessions.step('s9', 1, {}))).toBe(
    'There is no session called "s9". Start one with play_start.',
  )
  expect(await sentence(memory, sessions.state('s9'))).toBe(
    'There is no session called "s9". Start one with play_start.',
  )
  for (let i = 0; i < 3; i++) await run(memory, sessions.start({ folder: 'game' }))
  expect(await sentence(memory, sessions.start({ folder: 'game' }))).toBe(
    'Four games are already running. Stop one with play_stop first.',
  )
  await run(memory, sessions.stopAll())
})

test('an action the game does not have, and player 2 in a one-player game, each get their sentence', async () => {
  const memory = game()
  const sessions = createSessions()
  const { session } = await run(memory, sessions.start({ folder: 'game' }))
  expect(await sentence(memory, sessions.step(session, 1, { '1': ['jup'] }))).toBe(
    '"jup" is not one of this game\'s actions: left, right, jump.',
  )
  expect(await sentence(memory, sessions.step(session, 1, { '2': ['left'] }))).toBe(
    'There is no player 2 in this game. It has: 1.',
  )
  // Nothing was played by the refused steps.
  expect((await run(memory, sessions.state(session))).tick).toBe(0)
  await run(memory, sessions.stopAll())
})

test('a player is named exactly as the game numbers them: "01" is not player 1', async () => {
  const memory = game()
  const sessions = createSessions()
  const { session } = await run(memory, sessions.start({ folder: 'game' }))
  expect(await sentence(memory, sessions.step(session, 1, { '01': ['right'] }))).toBe(
    'There is no player 01 in this game. It has: 1.',
  )
  await run(memory, sessions.stopAll())
})

test("a recording that is already there, such as the game's own, is never written over", async () => {
  const memory = game()
  const sessions = createSessions()
  const { session } = await run(memory, sessions.start({ folder: 'game' }))
  await run(memory, sessions.step(session, 30, { '1': ['right'] }))
  await run(memory, sessions.save(session, 'agent-run'))
  const kept = memory.files.get('game/replays/agent-run.json')
  await run(memory, sessions.step(session, 30, {}))
  expect(await sentence(memory, sessions.save(session, 'agent-run'))).toBe(
    'There is already a recording called agent-run, in replays/agent-run.json. Pick another name, or delete that file first.',
  )
  expect(memory.files.get('game/replays/agent-run.json')).toBe(kept)
  await run(memory, sessions.stopAll())
})

test('a recording is named in small letters, numbers and dashes', async () => {
  const memory = game()
  const sessions = createSessions()
  const { session } = await run(memory, sessions.start({ folder: 'game' }))
  expect(await sentence(memory, sessions.save(session, 'My Run'))).toBe(
    "A recording's name is small letters, numbers and dashes, like level-1.",
  )
  await run(memory, sessions.stopAll())
})

test('a session started after the rules changed plays the new rules', async () => {
  let code = codeOf()
  const memory = game(() => code)
  const sessions = createSessions()
  const first = await run(memory, sessions.start({ folder: 'game' }))
  const before =
    heroOf((await run(memory, sessions.step(first.session, 60, { '1': ['right'] }))).state)?.x ?? 0
  // The agent edits the rules: the hero now stands still.
  const still = definePlugin({
    name: 'hero',
    dependsOn: ['physics', 'commands'],
    systems: [defineSystem({ name: 'hero.move', phase: 'gameplay', run: () => undefined })],
  })
  code = { framework, rules: { plugins: [still], actions: ACTIONS } }
  const second = await run(memory, sessions.start({ folder: 'game' }))
  const after =
    heroOf((await run(memory, sessions.step(second.session, 60, { '1': ['right'] }))).state)?.x ?? 0
  expect(after).toBeLessThan(before)
  await run(memory, sessions.stopAll())
})

test('rules that throw end the session with the sentence, and the next call is answered', async () => {
  const memory = game({ framework, rules: { plugins: [failingHero], actions: ACTIONS } })
  const sessions = createSessions()
  const { session } = await run(memory, sessions.start({ folder: 'game' }))
  expect(await sentence(memory, sessions.step(session, 60, { '1': ['right'] }))).toMatch(
    /^The game stopped at tick \d+: .*boom/,
  )
  expect(await sentence(memory, sessions.state(session))).toBe(
    `There is no session called "${session}". Start one with play_start.`,
  )
})

test('a folder that is not a game, and a level that is not there, say so', async () => {
  const memory = game()
  const sessions = createSessions()
  expect(await sentence(memory, sessions.start({ folder: 'nowhere' }))).toContain('is not a game')
  expect(await sentence(memory, sessions.start({ folder: 'game', level: 'level-9' }))).toBe(
    'This game has no level called "level-9". Its levels are: level-1.',
  )
})

test('stop and stopAll dispose every sim: twenty sessions in a row do not run Koota out of worlds', async () => {
  const memory = game()
  const sessions = createSessions()
  for (let i = 0; i < 20; i++) {
    const { session } = await run(memory, sessions.start({ folder: 'game' }))
    await run(memory, sessions.step(session, 2, {}))
    await run(memory, sessions.stop(session))
  }
  for (let i = 0; i < 3; i++) await run(memory, sessions.start({ folder: 'game' }))
  await run(memory, sessions.stopAll())
  // All gone: four more can start.
  for (let i = 0; i < 4; i++) await run(memory, sessions.start({ folder: 'game' }))
  await run(memory, sessions.stopAll())
})
