// `automata replay`: plays each recording in `replays/` with nobody at the controls and says whether it ends where it was
// recorded, or records it again. The same function is the `replays` step of `automata check` and an agent's tool.
// Every sim is disposed, also when the game's rules throw: Koota allows a few worlds at a time.
import { basename, dirname, join } from 'node:path'
import { Effect } from 'effect'
import type { Replay } from '../commands/commands.ts'
import { formatDiagnostic, type GameContent } from '../content/content.ts'
import type { PluginDef, Sim } from '../sim/sim.ts'
import type { GameFolder } from './game-folder.ts'
import { readGame } from './game-folder.ts'
import { CliError, Files, type FilesService, type GameCode, type Ports } from './ports.ts'
import type { StepReport } from './report.ts'
import { describeState, type GameState, gameState } from './state.ts'

export interface ReplayResult {
  /** From the game's root, like `replays/level-1.json`. */
  readonly file: string
  readonly verdict:
    | 'ok'
    | 'content-changed'
    | 'code-changed'
    | 'diverged'
    | 'wrong-setup'
    | 'not-a-replay'
    | 'accepted'
  /** The sentence, without the file in front. */
  readonly message: string
  readonly ticks?: number
  readonly finalHash?: string
  readonly state?: GameState
  /** `content-changed` only: the rules changed too. */
  readonly rulesChanged?: boolean
}

export const NO_RECORDINGS = 'This game has no recordings in replays/.'

/** What it takes to play a recording: the game's code, its rules and its content, all of which must have loaded. */
interface Ready {
  readonly code: GameCode
  readonly plugins: readonly PluginDef[]
  readonly content: GameContent
}

function readyOf(game: GameFolder): Effect.Effect<Ready, CliError> {
  const { code, loaded } = game
  if (code === undefined)
    return Effect.fail(new CliError(game.codeError ?? 'The game could not be loaded. Run npm install.'))
  if ('problem' in code.rules) return Effect.fail(new CliError(formatDiagnostic(code.rules.problem)))
  if (!loaded.ok)
    return Effect.fail(
      new CliError(
        "The game's files have problems, so its recordings cannot be played. Run automata check --only files.",
      ),
    )
  return Effect.succeed({ code, plugins: code.rules.plugins, content: loaded.value })
}

const result = (
  file: string,
  verdict: ReplayResult['verdict'],
  message: string,
  more: Partial<ReplayResult> = {},
): ReplayResult => ({ file, verdict, message, ...more })

const withoutFullStop = (text: string): string => text.replace(/\.$/, '')

/** The numbers in `meta.players`, like `1,2`; a game for one player has `1`. */
const playersOf = (meta: string | undefined): number[] => {
  const numbers = (meta ?? '').split(',').map(Number).filter(Number.isInteger)
  return numbers.length > 0 ? numbers : [1]
}

interface Played {
  readonly result: ReplayResult
  /** The text to write back to the recording, for `--accept`. */
  readonly write?: string
}

/** The commands of `replay` for each tick, so a recording can be played through a recorder. */
function commandsAt(replay: Replay): (tick: number) => Replay['commands'] {
  let next = 0
  return (tick) => {
    const now: Replay['commands'][number][] = []
    while (next < replay.commands.length && (replay.commands[next]?.tick ?? 0) === tick) {
      now.push(replay.commands[next] as Replay['commands'][number])
      next++
    }
    return now
  }
}

/** Plays (or records again) one recording on a sim of its own. Never throws for what the game or the file did. */
async function playOne(
  ready: Ready,
  file: string,
  text: string,
  options: { readonly accept?: boolean; readonly state?: boolean },
): Promise<Played> {
  const { framework } = ready.code
  let replay: Replay
  try {
    replay = framework.parseReplay(text)
  } catch (error) {
    if (error instanceof framework.ReplayFormatError)
      return { result: result(file, 'not-a-replay', error.message) }
    throw error
  }
  const level = replay.meta.level ?? ready.content.project.start
  const wrong = (detail: string): Played => ({
    result: result(file, 'wrong-setup', `This cannot be played on this game: ${detail}.`),
  })
  if (ready.content.levels[level] === undefined)
    return wrong(`it was recorded on the level "${level}", which this game does not have`)

  let sim: Sim | undefined
  try {
    try {
      sim = await framework.createGameSim({
        content: ready.content,
        plugins: ready.plugins,
        seed: replay.seed,
        level,
        players: playersOf(replay.meta.players),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return wrong(
        error instanceof framework.LevelError
          ? withoutFullStop(message)
          : `the game could not be started: ${withoutFullStop(message)}`,
      )
    }
    const where = (done: ReplayResult): ReplayResult =>
      options.state === true && sim !== undefined && sim.tick > 0
        ? { ...done, state: gameState(ready.code, sim, level) }
        : done

    try {
      if (options.accept === true) {
        const recorder = framework.createRecorder(sim, { meta: replay.meta })
        const at = commandsAt(replay)
        for (let i = 0; i < replay.ticks; i++) recorder.step(at(sim.tick))
        const again = recorder.replay()
        return {
          result: where(
            result(file, 'accepted', `Recorded again: ${again.ticks} ticks, ending on ${again.finalHash}.`, {
              ticks: again.ticks,
              finalHash: again.finalHash,
            }),
          ),
          write: framework.writeReplay(again),
        }
      }
      const verdict = framework.verifyReplay(sim, replay)
      const accept = `npm run accept -- ${file}`
      if (verdict.ok)
        return {
          result: where(
            result(
              file,
              'ok',
              `Played ${replay.ticks} ticks and ended on ${replay.finalHash}, as recorded.`,
              { ticks: replay.ticks, finalHash: replay.finalHash },
            ),
          ),
        }
      switch (verdict.reason) {
        case 'wrong-setup':
          return wrong(verdict.detail)
        case 'code-changed':
          return {
            result: result(
              file,
              'code-changed',
              `The game's rules have changed since this was recorded: its code, or the framework's version. If the play was meant to change, run: ${accept}`,
            ),
          }
        case 'diverged':
          return {
            result: where(
              result(
                file,
                'diverged',
                `The game no longer plays the way it was recorded: it first differs at tick ${verdict.tick}. Look at what changed in src/. If the new play is right, run: ${accept}`,
              ),
            ),
          }
        default: {
          // `content-changed`: the hashes cannot be compared, so the recording is played only to say where it ends now.
          const played = framework.playReplay(sim, replay)
          const rules = verdict.rulesChanged ? 'Its rules have changed too. ' : ''
          return {
            result: where(
              result(
                file,
                'content-changed',
                `The game's content has changed since this was recorded, so its hashes were not compared. It played ${replay.ticks} ticks and ended on ${played.finalHash}. ${rules}To record how the game plays now, run: ${accept}`,
                { ticks: replay.ticks, finalHash: played.finalHash, rulesChanged: verdict.rulesChanged },
              ),
            ),
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        result: result(
          file,
          'diverged',
          `The game stopped at tick ${sim.tick}: ${withoutFullStop(message)}.`,
        ),
      }
    }
  } finally {
    sim?.dispose()
  }
}

/** Plays the recordings of a game that has been read (all of them, or `file`), or records them again. */
export function replaysOf(
  game: GameFolder,
  options: { file?: string; accept?: boolean; state?: boolean },
): Effect.Effect<readonly ReplayResult[], CliError, FilesService> {
  return Effect.gen(function* () {
    const ready = yield* readyOf(game)
    const files = yield* Files
    const results: ReplayResult[] = []
    for (const file of options.file === undefined ? game.recordings : [options.file]) {
      const text = yield* files.readText(join(game.folder, file))
      if (text === undefined) {
        results.push(result(file, 'not-a-replay', 'This file is missing.'))
        continue
      }
      const played = yield* Effect.promise(() => playOne(ready, file, text, options))
      if (played.write !== undefined) yield* files.write(join(game.folder, file), played.write)
      results.push(played.result)
    }
    return results
  })
}

/** Reads the game in `folder` and plays its recordings. Only a folder that is not a game, or code that will not load, fails. */
export function runReplays(options: {
  readonly folder: string
  readonly file?: string
  readonly accept?: boolean
  readonly state?: boolean
}): Effect.Effect<readonly ReplayResult[], CliError, Ports> {
  return Effect.flatMap(readGame(options.folder), (game) => replaysOf(game, options))
}

/** The line a person reads for one result, with the state under it when it was asked for. */
export function describeResult(r: ReplayResult): string {
  const line = `${r.file}: ${r.message}`
  return r.state === undefined ? line : `${line}\n${describeState(r.state)}`
}

/** 0 when every recording ends where it did (or was only recorded again, or its content changed), else 1. */
export function replayExitCode(results: readonly ReplayResult[]): 0 | 1 {
  const fine = ['ok', 'content-changed', 'accepted']
  return results.every((r) => fine.includes(r.verdict)) ? 0 : 1
}

/** `automata replay <folder or file>`: which game, and the one recording when a file is named. */
export function replayTarget(target: string): { folder: string; file?: string } {
  return target.endsWith('.json')
    ? { folder: dirname(dirname(target)), file: `replays/${basename(target)}` }
    : { folder: target }
}

/** The `replays` step of `automata check`. */
export function replaysStep(game: GameFolder): Effect.Effect<StepReport, never, FilesService> {
  return Effect.gen(function* () {
    const ran = yield* Effect.either(replaysOf(game, {}))
    if (ran._tag === 'Left')
      return {
        step: 'replays',
        state: 'could-not-run',
        problems: [],
        notes: [ran.left.message],
      } satisfies StepReport
    if (ran.right.length === 0)
      return { step: 'replays', state: 'skipped', problems: [], notes: [NO_RECORDINGS] } satisfies StepReport
    const fine = ran.right.filter((r) => r.verdict === 'ok')
    const changed = ran.right.filter((r) => r.verdict === 'content-changed')
    const problems = ran.right
      .filter((r) => !fine.includes(r) && !changed.includes(r))
      .map((r) => ({ file: r.file, path: '', message: r.message }))
    const notes = changed.map((r) => `${r.file}: ${r.message}`)
    const state = problems.length > 0 ? 'failed' : 'passed'
    return { step: 'replays', state, problems, notes } satisfies StepReport
  })
}
