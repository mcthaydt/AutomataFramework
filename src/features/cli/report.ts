// What `automata check` says: one report of steps, and the words and the exit status that follow from it. The report is
// plain data, so the command prints it, `--json` gives it as it is, and an agent's tool reads it the same way.
import { type Diagnostic, formatDiagnostic } from '../content/content.ts'

/** The steps of `automata check`, in the order they run. */
export type StepName = 'files' | 'rules' | 'lint' | 'types' | 'replays' | 'tests'
export const STEP_NAMES: readonly StepName[] = ['files', 'rules', 'lint', 'types', 'replays', 'tests']

export interface StepReport {
  readonly step: StepName
  /** `could-not-run`: the step's tool is missing or the game is not installed, so nothing is known about this step. */
  readonly state: 'passed' | 'failed' | 'could-not-run' | 'skipped'
  /** What to fix, each at its file and place. */
  readonly problems: readonly Diagnostic[]
  /** True and worth saying, but nothing to fix. For a step that could not run, the first note is why. */
  readonly notes: readonly string[]
  /** A tool's own last lines, for `lint`, `types` and `tests`. */
  readonly output?: string
}

export interface CheckReport {
  /** True when nothing failed and nothing was left unknown. */
  readonly ok: boolean
  readonly steps: readonly StepReport[]
  /** One last sentence for a person, such as what to run first when the game is not installed. */
  readonly advice?: string
}

/** 0 everything passed (or was skipped), 1 the game needs fixing, 2 nothing failed but a step could not run. */
export function exitCodeOf(report: CheckReport): 0 | 1 | 2 {
  if (report.steps.some((s) => s.state === 'failed')) return 1
  if (report.steps.some((s) => s.state === 'could-not-run')) return 2
  return 0
}

const indent = (text: string): string =>
  text
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n')

/** "1 step needs", "2 steps need": the count and the words that agree with it. */
const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

function stepLines(step: StepReport): string[] {
  const label = step.step.padEnd(10)
  if (step.state === 'could-not-run') {
    const [why = '', ...rest] = step.notes
    return [`${label}could not run: ${why}`, ...rest.map(indent)]
  }
  return [
    `${label}${step.state}`,
    ...step.problems.map((p) => indent(formatDiagnostic(p))),
    ...step.notes.map(indent),
    ...(step.output === undefined || step.output === '' ? [] : [indent(step.output)]),
  ]
}

/** The whole report as a person reads it: a line per step, what is wrong under it, and the count at the end. */
export function formatReport(report: CheckReport): string {
  const named = (state: StepReport['state']): string[] =>
    report.steps.filter((s) => s.state === state).map((s) => s.step)
  const failed = named('failed')
  const unknown = named('could-not-run')
  const endings: string[] = []
  if (failed.length > 0)
    endings.push(
      `${count(failed.length, 'step needs', 'steps need')} fixing: ${failed.join(', ')}. Fix the first and run automata check again.`,
    )
  if (unknown.length > 0)
    endings.push(`${count(unknown.length, 'step', 'steps')} could not run: ${unknown.join(', ')}.`)
  if (endings.length === 0) endings.push('Everything passed.')
  if (report.advice !== undefined) endings.push(report.advice)
  return [...report.steps.flatMap(stepLines), '', ...endings].join('\n')
}
