// `automata add`: lists a new content file in the game's `automata.toml`. The file is written first (by hand, by an agent
// or by an editor); this says it is part of the game, with the framework's own `listContent` so the project file keeps
// every byte it had. Nothing is written unless the file reads as the kind it is listed as.
import { join } from 'node:path'
import { Effect } from 'effect'
import {
  type ContentType,
  type Diagnostic,
  formatDiagnostic,
  listContent,
  parseContent,
} from '../content/content.ts'
import { notAGame } from './game-folder.ts'
import { CliError, Files, type Ports } from './ports.ts'

/** What `automata add` found: whether the file is listed now, and what is wrong with the file when it is not fit to list. */
export interface AddReport {
  readonly ok: boolean
  /** True when this run wrote the block, false when the file was already listed (or could not be listed). */
  readonly listed: boolean
  readonly problems: readonly Diagnostic[]
}

/** What to add: a kind, a path from the game's root, and a line of words for the comment above the block. */
export interface AddOptions {
  readonly folder: string
  readonly type: string
  readonly path: string
  readonly about?: string
}

const PROJECT = 'automata.toml'

/** "a figure", "an animal": the article a sentence needs before a kind's name. */
const article = (kind: string): string => `${/^[aeiou]/.test(kind) ? 'an' : 'a'} ${kind}`

/** The kinds that have a picture to paint, so the sentence after listing one says which command makes it. */
const PAINTED = new Set(['figure', 'backdrop'])

/** The whole command, for the sentence that says a word of it is missing. */
export const ADD_USAGE = 'automata add --type figure --path content/figures/keeper.json'

/** Lists `path` as a `type` in the game's `automata.toml`, or says why it cannot. */
export function runAdd(options: AddOptions): Effect.Effect<AddReport, CliError, Ports> {
  return Effect.gen(function* () {
    const files = yield* Files
    const projectPath = join(options.folder, PROJECT)
    const project = yield* files.readText(projectPath)
    if (project === undefined) return yield* Effect.fail(notAGame(options.folder))

    // The project file's own rules say what is wrong with the kind, the path, the note or the project itself.
    const next = listContent(project, { type: options.type, path: options.path }, options.about)
    if (!next.ok)
      return yield* Effect.fail(new CliError(next.diagnostics.map((d) => formatDiagnostic(d)).join('\n')))

    const text = yield* files.readText(join(options.folder, options.path))
    if (text === undefined)
      return yield* Effect.fail(
        new CliError(`There is no file at ${options.path}. Write it first, then run this again.`),
      )
    const read = parseContent(options.type as ContentType, text, options.path)
    if (!read.ok) return { ok: false, listed: false, problems: read.diagnostics }

    if (next.value === project) return { ok: true, listed: false, problems: [] }
    yield* files.write(projectPath, next.value)
    return { ok: true, listed: true, problems: [] }
  })
}

/** What a person reads: one line for what happened, then the command that paints a picture when the kind has one. */
export function describeAdd(
  report: AddReport,
  options: Pick<AddOptions, 'type' | 'path'>,
): { out: string[]; err: string[] } {
  const err = report.problems.map(formatDiagnostic)
  if (!report.ok) return { out: [], err }
  const out = [
    report.listed
      ? `Listed ${options.path} as ${article(options.type)}.`
      : `${options.path} is already listed.`,
  ]
  if (PAINTED.has(options.type)) out.push('Run "automata art" to paint its picture.')
  return { out, err }
}
