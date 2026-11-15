// `automata art`: paints a game's pictures, the one picture and atlas each figure and backdrop makes, written beside the
// file that makes it. The painter is the framework's (`artFiles`), and the check that judges the result is too
// (`artProblems`), so a person at the command line, an agent, CI and an editor make and judge the same bytes. `check`'s
// `art` step, `play` and `create` call the same pieces.
import { join } from 'node:path'
import { Effect } from 'effect'
import { type Diagnostic, formatDiagnostic } from '../content/content.ts'
import { type GameFolder, readGame } from './game-folder.ts'
import { type CliError, Files, type FilesService, type Ports } from './ports.ts'
import type { StepReport } from './report.ts'

/** What `automata art` found: the files it painted, and what is still wrong with a picture. */
export interface ArtReport {
  readonly ok: boolean
  /** The files written, from the game's root, in the order the painter gives them. */
  readonly painted: readonly string[]
  readonly problems: readonly Diagnostic[]
  /** Set when nothing could be painted: the game does not load. */
  readonly sentence?: string
}

/** True when two files hold the same bytes. */
const same = (a: Uint8Array | undefined, b: Uint8Array): boolean =>
  a !== undefined && a.length === b.length && a.every((byte, i) => byte === b[i])

const NOT_LOADED =
  'The game does not load, so nothing was painted. Fix the problems above, then run this again.'

/** The picture files the game's own painter makes for its content; none for a game with no figure or backdrop. */
function wanted(game: GameFolder): readonly { path: string; bytes: Uint8Array }[] {
  if (!game.loaded.ok || typeof game.content.artFiles !== 'function') return []
  return game.content.artFiles(game.loaded.value)
}

/** The paths of every file the game's figures and backdrops paint, so the files step knows they belong to the game. */
export const paintedPaths = (game: GameFolder): ReadonlySet<string> =>
  new Set(wanted(game).map((file) => file.path))

/** Writes every picture that is missing or different, and answers the paths it wrote. Never touches one that is right. */
export function paintArt(game: GameFolder): Effect.Effect<readonly string[], CliError, FilesService> {
  return Effect.gen(function* () {
    const files = yield* Files
    const painted: string[] = []
    for (const file of wanted(game)) {
      if (same(yield* files.readBytes(join(game.folder, file.path)), file.bytes)) continue
      yield* files.write(join(game.folder, file.path), file.bytes)
      painted.push(file.path)
    }
    return painted
  })
}

/** What is wrong with the pictures as they are: one sentence for each, naming the file and the command to run. */
function pictureProblems(game: GameFolder): Effect.Effect<readonly Diagnostic[], never, FilesService> {
  return Effect.gen(function* () {
    if (!game.loaded.ok || typeof game.content.artProblems !== 'function') return []
    const content = game.loaded.value
    const files = yield* Files
    const read = (path: string) => Effect.runPromise(files.readBytes(join(game.folder, path)))
    return yield* Effect.promise(() => game.content.artProblems(content, read))
  })
}

/** The `art` step of `automata check`: the pictures are all painted, and none is older than its file. */
export function artStep(game: GameFolder): Effect.Effect<StepReport, never, FilesService> {
  return Effect.gen(function* () {
    // The files step has said what is wrong with a game that does not load; there is nothing to paint from.
    if (!game.loaded.ok)
      return {
        step: 'art',
        state: 'skipped',
        problems: [],
        notes: ["The game's files do not load yet, so its pictures were not checked."],
      } satisfies StepReport
    const problems = yield* pictureProblems(game)
    return {
      step: 'art',
      state: problems.length > 0 ? 'failed' : 'passed',
      problems,
      notes: [],
    } satisfies StepReport
  })
}

/** `automata art [folder]`: paints what is missing or old (or, with `check`, only says what is). */
export function runArt(options: {
  readonly folder: string
  readonly check: boolean
}): Effect.Effect<ArtReport, CliError, Ports> {
  return Effect.gen(function* () {
    const game = yield* readGame(options.folder)
    if (!game.loaded.ok)
      return { ok: false, painted: [], problems: game.loaded.diagnostics, sentence: NOT_LOADED }
    const painted = options.check ? [] : yield* paintArt(game)
    const problems = yield* pictureProblems(game)
    return { ok: problems.length === 0, painted, problems }
  })
}

/** What a person reads: a line for each file painted, or that all is well; then what is still wrong. */
export function describeArt(report: ArtReport, check: boolean): { out: string[]; err: string[] } {
  const err = report.problems.map(formatDiagnostic)
  if (report.sentence !== undefined) return { out: [], err: [...err, report.sentence] }
  if (check) return { out: report.ok ? ['Every picture is painted and up to date.'] : [], err }
  const out = report.painted.map((path) => `Painted ${path}`)
  return {
    out: out.length === 0 && report.ok ? ['Every picture is already painted and up to date.'] : out,
    err,
  }
}
