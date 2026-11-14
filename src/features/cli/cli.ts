// The `automata` command's entry: the words are read (`args.ts`), the command's row in the table runs as an Effect over
// the ports (`ports.ts`), and the answer is the exit status: 0 everything is fine, 1 the game has something to fix, 2 the
// command could not do its work. Nothing here prints a stack trace: a person gets a sentence.
import { Cause, Effect, type Layer } from 'effect'
import { FRAMEWORK_VERSION } from '../sim/sim.ts'
import { type CommandInput, type CommandName, parseArgs } from './args.ts'
import { runCheck } from './check.ts'
import { helpFor } from './help.ts'
import { liveLayer } from './live.ts'
import { CliError, Out, type OutService, type Ports } from './ports.ts'
import { exitCodeOf, formatReport, STEP_NAMES } from './report.ts'

type Command = (input: CommandInput) => Effect.Effect<number, CliError, Ports>

/** A command whose task has not landed yet says so. */
const notBuilt =
  (name: CommandName): Command =>
  () =>
    Effect.fail(new CliError(`automata ${name} is not built yet.`))

/** `automata check`: the steps' report, as words or as JSON, and the exit status the report gives. */
const check: Command = (input) =>
  Effect.gen(function* () {
    const out = yield* Out
    const { only, fix, json } = input.flags
    const step = STEP_NAMES.find((name) => name === only)
    if (only !== undefined && step === undefined)
      return yield* Effect.fail(
        new CliError(`There is no step called "${String(only)}". The steps are: ${STEP_NAMES.join(', ')}.`),
      )
    const report = yield* runCheck({
      folder: input.folder ?? '.',
      ...(step === undefined ? {} : { only: step }),
      fix: fix === true,
    })
    yield* out.line(json === true ? JSON.stringify(report, null, 2) : formatReport(report))
    return exitCodeOf(report)
  })

/** One row per command, so a new command (M4's `ship` and `build`) is one row and one help text. */
const COMMANDS: Readonly<Record<CommandName, Command>> = {
  create: notBuilt('create'),
  check,
  play: notBuilt('play'),
  replay: notBuilt('replay'),
  mcp: notBuilt('mcp'),
}

const run = (args: readonly string[]): Effect.Effect<number, CliError, Ports> =>
  Effect.gen(function* () {
    const out = yield* Out
    const parsed = parseArgs(args)
    if ('problem' in parsed) {
      yield* out.error(parsed.problem)
      return 2
    }
    if ('help' in parsed) {
      yield* out.line(helpFor(parsed.help))
      return 0
    }
    if ('version' in parsed) {
      yield* out.line(FRAMEWORK_VERSION)
      return 0
    }
    return yield* COMMANDS[parsed.command](parsed)
  })

/** Says a sentence on stderr and gives the exit status for a command that could not do its work. */
const refuse = (sentence: string): Effect.Effect<number, never, OutService> =>
  Effect.flatMap(Out, (out) => Effect.as(out.error(sentence), 2))

/** What a person reads when something nobody planned for went wrong: a sentence, then the error's own words. */
const unplanned = (cause: Cause.Cause<unknown>): string => {
  const reason = Cause.squash(cause)
  return `Something went wrong inside automata. Please report this:\n${reason instanceof Error ? reason.message : String(reason)}`
}

/**
 * Runs `automata <args>` and gives the exit status. `layer` is what the command reaches the world through: the live one
 * by default, a memory one in a test. An error the command planned for is printed as its sentence and is exit 2.
 */
export async function main(args: readonly string[], layer: Layer.Layer<Ports> = liveLayer): Promise<number> {
  const program = run(args).pipe(
    Effect.catchAll((error) => refuse(error.message)),
    Effect.catchAllCause((cause) => refuse(unplanned(cause))),
    Effect.provide(layer),
  )
  return Effect.runPromise(program)
}
