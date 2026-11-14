// Play sessions: an agent runs the game, a few ticks at a time, and reads where everything is. A session is one sim with
// a recorder. It lives in a Worker (audit C1), so a session started after the rules changed plays the new rules; the
// `Runner` port starts the Worker, and in a test the same session code runs in the test's own process.
//
// This file has two halves. `sessionHost` runs where the game's code is loaded and answers messages. `createSessions` is
// what the command (and, later, the MCP server) holds: the ids, the limit of four, and the sentences.
import { join } from 'node:path'
import { Effect } from 'effect'
import type { Recorder, Sequence } from '../commands/commands.ts'
import { formatDiagnostic } from '../content/content.ts'
import type { Command, Sim } from '../sim/sim.ts'
import type { GameFolder } from './game-folder.ts'
import {
  CliError,
  Files,
  type FilesService,
  type GameCode,
  Runner,
  type RunnerService,
  type SessionMessage,
  type SessionReply,
  type SessionWorker,
} from './ports.ts'
import { type GameState, gameState } from './state.ts'

/** Longest a single step may be: a minute of play. */
export const MAX_TICKS = 3600
/** How many event names one step answers. */
export const MAX_EVENTS = 200
/** How many sessions run at once. */
export const MAX_SESSIONS = 4

const failed = (sentence: string, ended = false): SessionReply => ({ ok: false, sentence, ended })
const withoutFullStop = (text: string): string => text.replace(/\.$/, '')

/** What a started session holds. */
interface Running {
  readonly code: GameCode
  readonly sim: Sim
  readonly recorder: Recorder
  readonly sequence: Sequence
  readonly level: string
  readonly players: readonly number[]
  /** What each player was last told to hold, joined: a command goes out only when it changes, as a page's input does. */
  readonly sent: Map<number, string>
  /** The game's own list of actions, when it has one. */
  readonly actions: readonly string[] | undefined
}

/** A host's whole surface: messages in, answers out. */
export interface SessionHost {
  readonly call: (message: SessionMessage) => Promise<SessionReply>
  readonly end: () => void
}

/**
 * What answers a session's messages, where the game's code is loaded. `load` reads the game (the Worker's own copy of
 * every module, or in a test the memory layer's). Nothing here throws: a game's rules that throw end the session with the
 * sentence that says so.
 */
export function sessionHost(load: () => Promise<GameFolder>): SessionHost {
  let running: Running | undefined

  const dispose = (): void => {
    running?.sim.dispose()
    running = undefined
  }

  async function start(message: Extract<SessionMessage, { kind: 'start' }>): Promise<SessionReply> {
    if (running !== undefined) return failed('This session has already started.')
    const game = await load()
    if (game.code === undefined)
      return failed(
        game.codeError ?? "This game's tools are not installed yet. Run npm install, then try again.",
        true,
      )
    if (!('plugins' in game.code.rules))
      return failed(
        `The game's rules could not be loaded. ${formatDiagnostic(game.code.rules.problem)}`,
        true,
      )
    if (!game.loaded.ok) {
      const first = game.loaded.diagnostics[0]
      const what = first === undefined ? 'unknown' : formatDiagnostic(first)
      return failed(`The game's files have a problem: ${what}. Run check to see all of them.`, true)
    }
    const content = game.loaded.value
    const level = message.level ?? content.project.start
    if (content.levels[level] === undefined)
      return failed(
        `This game has no level called "${level}". Its levels are: ${Object.keys(content.levels).join(', ')}.`,
        true,
      )
    const { framework } = game.code
    const players = message.players ?? [1]
    const sim = await framework.createGameSim({
      content,
      plugins: game.code.rules.plugins,
      seed: message.seed ?? 1,
      level,
      players,
    })
    running = {
      code: game.code,
      sim,
      recorder: framework.createRecorder(sim, { meta: { level, players: players.join(',') } }),
      sequence: framework.createSequence(),
      level,
      players,
      sent: new Map(),
      actions: game.code.rules.actions,
    }
    return answer(running, [])
  }

  const answer = (now: Running, events: readonly string[]): SessionReply => ({
    ok: true,
    state: gameState(now.code, now.sim, now.level),
    events,
    level: now.level,
  })

  function step(now: Running, message: Extract<SessionMessage, { kind: 'step' }>): SessionReply {
    // Everything is checked before the first tick is played, so a refused step changes nothing.
    for (const [who, actions] of Object.entries(message.hold)) {
      if (!now.players.includes(Number(who)))
        return failed(`There is no player ${who} in this game. It has: ${now.players.join(', ')}.`)
      for (const action of actions)
        if (now.actions !== undefined && !now.actions.includes(action))
          return failed(`"${action}" is not one of this game's actions: ${now.actions.join(', ')}.`)
    }
    const events: string[] = []
    for (let i = 0; i < message.ticks; i++) {
      const commands: Command[] = []
      for (const player of now.players) {
        const held = [...(message.hold[String(player)] ?? [])].sort()
        const joined = held.join(',')
        if (joined === now.sent.get(player)) continue
        now.sent.set(player, joined)
        const { controlsCommand } = now.code.framework
        commands.push(controlsCommand(now.sim.tick, player, now.sequence.next(player), held))
      }
      const result = now.recorder.step(commands)
      // Each name once for a tick, in the order the rules raised them.
      for (const type of new Set(result.events.map((event) => event.type)))
        if (events.length < MAX_EVENTS) events.push(type)
    }
    return answer(now, events)
  }

  return {
    async call(message) {
      try {
        if (message.kind === 'start') return await start(message)
        if (running === undefined) return failed('This session has not started.', true)
        if (message.kind === 'step') return step(running, message)
        if (message.kind === 'state') return answer(running, [])
        return {
          ...answer(running, []),
          recording: running.code.framework.writeReplay(running.recorder.replay()),
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        const tick = running?.sim.tick
        dispose()
        return failed(
          tick === undefined
            ? `The game could not start: ${withoutFullStop(reason)}.`
            : `The game stopped at tick ${tick}: ${withoutFullStop(reason)}.`,
          true,
        )
      }
    },
    end: dispose,
  }
}

/** What a session start answers, and what the sessions in a server hold. */
export interface SessionStarted {
  readonly session: string
  readonly state: GameState
  readonly note: string
}

/** The sentence a session's start ends with, so an agent knows what it is playing. */
const AS_THEY_WERE = "This session plays the game's rules as they were when it started."

export interface Sessions {
  readonly start: (options: {
    readonly folder: string
    readonly level?: string
    readonly players?: readonly number[]
    readonly seed?: number
  }) => Effect.Effect<SessionStarted, CliError, RunnerService>
  readonly step: (
    session: string,
    ticks: number,
    hold: Readonly<Record<string, readonly string[]>>,
  ) => Effect.Effect<{ readonly state: GameState; readonly events: readonly string[] }, CliError>
  readonly state: (session: string) => Effect.Effect<GameState, CliError>
  /** Writes the recording so far to `replays/<name>.json` in the session's folder. */
  readonly save: (
    session: string,
    name: string,
  ) => Effect.Effect<
    { readonly file: string; readonly ticks: number; readonly finalHash: string },
    CliError,
    FilesService
  >
  readonly stop: (session: string) => Effect.Effect<void, CliError>
  /** Ends every session: the server's input ended. */
  readonly stopAll: () => Effect.Effect<void>
}

interface Held {
  readonly worker: SessionWorker
  readonly folder: string
}

/** The sessions of one server: at most `max` at once, named `s1`, `s2` and so on. */
export function createSessions(max: number = MAX_SESSIONS): Sessions {
  const held = new Map<string, Held>()
  let counter = 0

  const find = (id: string): Effect.Effect<Held, CliError> => {
    const found = held.get(id)
    return found === undefined
      ? Effect.fail(new CliError(`There is no session called "${id}". Start one with play_start.`))
      : Effect.succeed(found)
  }
  /** Sends a message; a session that ended answers with its sentence and is gone. */
  const send = (
    id: string,
    found: Held,
    message: SessionMessage,
  ): Effect.Effect<Extract<SessionReply, { ok: true }>, CliError> =>
    Effect.flatMap(
      Effect.promise(() => found.worker.call(message)),
      (reply) => {
        if (reply.ok) return Effect.succeed(reply)
        if (reply.ended === true) {
          held.delete(id)
          return Effect.zipRight(
            Effect.promise(() => found.worker.end()),
            Effect.fail(new CliError(reply.sentence)),
          )
        }
        return Effect.fail(new CliError(reply.sentence))
      },
    )

  return {
    start: (options) =>
      Effect.gen(function* () {
        if (held.size >= max)
          return yield* Effect.fail(
            new CliError(
              `${numberWord(max)} ${max === 1 ? 'game is' : 'games are'} already running. Stop one with play_stop first.`,
            ),
          )
        const runner = yield* Runner
        const worker = yield* runner.worker(options.folder)
        counter++
        const id = `s${counter}`
        const found: Held = { worker, folder: options.folder }
        held.set(id, found)
        const reply = yield* send(id, found, {
          kind: 'start',
          ...(options.level === undefined ? {} : { level: options.level }),
          ...(options.players === undefined ? {} : { players: options.players }),
          ...(options.seed === undefined ? {} : { seed: options.seed }),
        })
        return { session: id, state: reply.state, note: AS_THEY_WERE }
      }),
    step: (id, ticks, hold) =>
      Effect.gen(function* () {
        if (!Number.isInteger(ticks) || ticks < 1 || ticks > MAX_TICKS)
          return yield* Effect.fail(new CliError(`ticks must be a whole number from 1 to ${MAX_TICKS}.`))
        const found = yield* find(id)
        const reply = yield* send(id, found, { kind: 'step', ticks, hold })
        return { state: reply.state, events: reply.events }
      }),
    state: (id) =>
      Effect.gen(function* () {
        const found = yield* find(id)
        return (yield* send(id, found, { kind: 'state' })).state
      }),
    save: (id, name) =>
      Effect.gen(function* () {
        if (!/^[a-z0-9-]+$/.test(name))
          return yield* Effect.fail(
            new CliError("A recording's name is small letters, numbers and dashes, like level-1."),
          )
        const found = yield* find(id)
        const reply = yield* send(id, found, { kind: 'recording' })
        const file = `replays/${name}.json`
        yield* (yield* Files).write(join(found.folder, file), reply.recording ?? '')
        return { file, ticks: reply.state.tick, finalHash: reply.state.hash }
      }),
    stop: (id) =>
      Effect.gen(function* () {
        const found = yield* find(id)
        held.delete(id)
        yield* Effect.promise(() => found.worker.end())
      }),
    stopAll: () =>
      Effect.promise(async () => {
        const all = [...held.values()]
        held.clear()
        await Promise.all(all.map((found) => found.worker.end()))
      }),
  }
}

const numberWord = (n: number): string => ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'][n] ?? String(n)
