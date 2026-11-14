// The `lint`, `types` and `tests` steps: the game's own tools, started from its own `node_modules`, so the game is
// judged by the versions it installed and not by whatever this command was built with. A tool's own words name the
// file and the line, so the step keeps the last of them and adds nothing of its own.
import { join } from 'node:path'
import { Effect } from 'effect'
import { Files, type FilesService, type ToolName, Tools, type ToolsService } from './ports.ts'
import type { StepName, StepReport } from './report.ts'

type ToolStepName = Extract<StepName, 'lint' | 'types' | 'tests'>

interface ToolStepSpec {
  readonly tool: ToolName
  readonly args: readonly string[]
  /** The arguments with `--fix`, where the tool can put things right by itself. */
  readonly fixArgs?: readonly string[]
}

const TOOL_STEPS: Readonly<Record<ToolStepName, ToolStepSpec>> = {
  lint: { tool: 'biome', args: ['check', '.'], fixArgs: ['check', '--write', '.'] },
  types: { tool: 'tsc', args: ['-p', '.'] },
  tests: { tool: 'vitest', args: ['run'] },
}

export const isToolStep = (step: StepName): step is ToolStepName => step in TOOL_STEPS

/** Runs the tool of one step in the game's folder. A tool that exits 0 passed; any other code failed. */
export function toolStep(
  step: ToolStepName,
  folder: string,
  fix: boolean,
): Effect.Effect<StepReport, never, FilesService | ToolsService> {
  return Effect.gen(function* () {
    const { tool, args, fixArgs } = TOOL_STEPS[step]
    if (step === 'tests') {
      const files = yield* Files
      if ((yield* files.list(join(folder, 'tests'))).length === 0)
        return { step, state: 'skipped', problems: [], notes: ['This game has no tests yet.'] }
    }
    const tools = yield* Tools
    const result = yield* tools.run(tool, fix && fixArgs !== undefined ? fixArgs : args, folder)
    if (result === 'missing')
      return {
        step,
        state: 'could-not-run',
        problems: [],
        notes: [`${tool} is not installed in this game. Run npm install.`],
      }
    if (result.code === 0) return { step, state: 'passed', problems: [], notes: [] }
    return {
      step,
      state: 'failed',
      problems: [],
      notes: [],
      ...(result.output === '' ? {} : { output: result.output }),
    }
  })
}
