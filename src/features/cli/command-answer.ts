// What a child `automata <words> --json` printed becomes the answer of `Runner.command`. One function for the live
// runner (a child process) and the memory one (`main` called in the test's own process), so both read a command the
// same way: JSON on stdout is an answer, whatever the exit status; anything else is the sentence the command stopped on.
import { Effect } from 'effect'
import { CliError, type CommandAnswer } from './ports.ts'

/** Node's own notices about itself (`(node:123) ExperimentalWarning: ...`) are not what the command said. */
const nodeNotice = /^\(node:\d+\) |^\(Use `node /

/** The answer the command printed, or the sentence it said on stderr (exit 2 prints no JSON). */
export function commandAnswer(
  code: number,
  stdout: string,
  stderr: string,
): Effect.Effect<CommandAnswer, CliError> {
  const printed = stdout.trim()
  if (printed !== '') {
    try {
      return Effect.succeed({ code, json: JSON.parse(printed) as unknown })
    } catch {
      // Not JSON: fall through to the sentence.
    }
  }
  const spoken = stderr
    .split(/\r?\n/)
    .filter((line) => !nodeNotice.test(line))
    .join('\n')
    .trim()
  const said = spoken !== '' ? spoken : printed
  return Effect.fail(
    new CliError(said !== '' ? said : `automata ended with status ${code} and said nothing.`),
  )
}
