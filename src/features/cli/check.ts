// `automata check`: the game's steps, one after another, each one's answer in one report. A step that fails does not stop
// the next, so one run says everything that is wrong. The command and the MCP tool both call `runCheck`.
import { Effect } from 'effect'
import { filesStep } from './check-files.ts'
import { rulesStep } from './check-rules.ts'
import { readGame } from './game-folder.ts'
import type { CliError, Ports } from './ports.ts'
import { type CheckReport, STEP_NAMES, type StepName, type StepReport } from './report.ts'

/** A step that has no work to do yet. */
const skipped = (step: StepName): StepReport => ({ step, state: 'skipped', problems: [], notes: [] })

/** Runs the steps (or the one asked for) on the game in `folder`. Only a folder that is not a game is an error. */
export function runCheck(options: {
  readonly folder: string
  readonly only?: StepName
  readonly fix?: boolean
}): Effect.Effect<CheckReport, CliError, Ports> {
  return Effect.gen(function* () {
    const game = yield* readGame(options.folder)
    const steps: StepReport[] = []
    for (const step of STEP_NAMES) {
      if (options.only !== undefined && options.only !== step) continue
      if (step === 'files') steps.push(yield* filesStep(game, options.fix === true))
      else if (step === 'rules') steps.push(yield* rulesStep(game))
      else steps.push(skipped(step))
    }
    // A game that is not installed has its own sentence for what to do about steps that could not run.
    const unknown = steps.some((s) => s.state === 'could-not-run')
    return {
      ok: steps.every((s) => s.state === 'passed' || s.state === 'skipped'),
      steps,
      ...(unknown && game.codeError !== undefined ? { advice: game.codeError } : {}),
    }
  })
}
