// `automata play`: the game in a browser. The game's own `vite` does the serving, so the page is built by the versions
// the game installed; this command only checks the folder is a game, says what is wrong with its files (the page shows it
// too), and hands the terminal to Vite until Ctrl+C.
import { join } from 'node:path'
import { Effect } from 'effect'
import { formatDiagnostic, parseProject } from '../content/content.ts'
import { filesStep } from './check-files.ts'
import { readGame } from './game-folder.ts'
import { CliError, Files, Out, type Ports, Tools } from './ports.ts'

/**
 * Starts the game in `folder` in the browser. Resolves with Vite's exit code, which is 0 when Ctrl+C stopped it. Fails
 * with a sentence when the folder is not a game or the game's tools are not installed.
 */
export function runPlay(options: {
  readonly folder: string
  readonly open: boolean
  readonly port?: number
}): Effect.Effect<number, CliError, Ports> {
  return Effect.gen(function* () {
    const { folder } = options
    const game = yield* readGame(folder)
    const out = yield* Out
    // What is wrong with the files, first: the page shows it too, but a person is looking at this terminal.
    const files = yield* filesStep(game, false)
    for (const problem of files.problems) yield* out.line(formatDiagnostic(problem))

    const text = yield* (yield* Files).readText(join(folder, 'automata.toml'))
    const project = text === undefined ? undefined : parseProject(text)
    yield* out.line(`Starting ${project?.ok === true ? project.value.name : folder}. Press Ctrl+C to stop.`)

    const args = [
      ...(options.open ? ['--open'] : []),
      ...(options.port === undefined ? [] : ['--port', String(options.port)]),
    ]
    const code = yield* (yield* Tools).serve('vite', args, folder)
    if (code === 'missing')
      return yield* Effect.fail(
        new CliError(
          game.codeError ?? `This game's tools are not installed yet. Run npm install in ${folder}, then try again.`,
        ),
      )
    return code
  })
}
