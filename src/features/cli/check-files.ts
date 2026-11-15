// The `files` step: every content file reads, is listed in `automata.toml`, and is written the standard way (the bytes
// `writeContent` makes), so that a person, an editor and an agent editing the same file make the same change.
import { join } from 'node:path'
import { Effect, Runtime } from 'effect'
import {
  type Diagnostic,
  type FolderRef,
  type GameContent,
  type Language,
  parseProject,
} from '../content/content.ts'
import { paintedPaths } from './art.ts'
import type { GameFolder } from './game-folder.ts'
import { type CliError, Files, type FilesService } from './ports.ts'
import type { StepReport } from './report.ts'

const NOT_INSTALLED_NOTE =
  "This game is not installed, so its files were checked with automata's own copy of the framework."

/** True for a file directly inside one of the folders the project lists (it may be one that did not load). */
function inListedFolder(path: string, folders: readonly FolderRef[]): boolean {
  return folders.some((entry) => path.slice(0, path.lastIndexOf('/')) === entry.folder)
}

/**
 * The files step. `fix` rewrites a file that reads but is not in the standard form; it never touches a file that does
 * not read, since whatever is wrong in it is for a person to say.
 */
export function filesStep(game: GameFolder, fix: boolean): Effect.Effect<StepReport, CliError, FilesService> {
  return Effect.gen(function* () {
    const files = yield* Files
    const problems: Diagnostic[] = game.loaded.ok ? [] : [...game.loaded.diagnostics]
    const notes: string[] = game.code === undefined ? [NOT_INSTALLED_NOTE] : []

    const text = yield* files.readText(join(game.folder, 'automata.toml'))
    const project = text === undefined ? undefined : parseProject(text)
    const listed = new Set<string>()
    // The files the game lists by path and the ones in its folders: the loaded game has both, and a game that did not
    // load is read as far as its project file goes (the folders' files are then left for the load problems to name).
    const byPath = project?.ok === true ? project.value.content : []
    const refs = game.loaded.ok ? game.loaded.value.project.content : byPath
    const folders = project?.ok === true ? (project.value.folders ?? []) : []
    if (project?.ok === true) {
      for (const ref of refs) {
        listed.add(ref.path)
        const before = yield* files.readText(join(game.folder, ref.path))
        if (before === undefined) continue
        const parsed = game.content.parseContent(ref.type, before, ref.path)
        if (!parsed.ok) continue
        let standard: string
        try {
          standard = game.content.writeContent(ref.type, parsed.value as never)
        } catch {
          continue
        }
        if (standard === before) continue
        if (fix) {
          yield* files.write(join(game.folder, ref.path), standard)
          notes.push(`Rewrote ${ref.path} in the standard form.`)
        } else {
          problems.push({
            file: ref.path,
            path: '',
            message: 'This file is not in the standard form. Run automata check --fix.',
          })
        }
      }
    }

    // A `.json` under content/ that the project does not list is a file the game never reads, unless it is one a figure or
    // a backdrop paints (an atlas), which is part of the game because the file that makes it is.
    const painted = paintedPaths(game)
    for (const name of yield* files.list(join(game.folder, 'content'))) {
      const path = `content/${name}`
      if (
        name.endsWith('.json') &&
        !listed.has(path) &&
        !painted.has(path) &&
        !inListedFolder(path, folders)
      )
        problems.push({
          file: path,
          path: '',
          message:
            'This file is not listed in automata.toml, so the game does not use it. List it, or delete it.',
        })
    }

    if (game.loaded.ok) {
      const words = yield* translationStep(game, game.loaded.value, files)
      problems.push(...words.problems)
      notes.push(...words.notes)
      problems.push(...(yield* recordingStep(game, game.loaded.value, files)))
    }

    const state = problems.length > 0 ? 'failed' : 'passed'
    return { step: 'files', state, problems, notes } satisfies StepReport
  })
}

/**
 * The recordings of a game: each one a sound names is there, can be played, and is short enough, and together they are
 * not too big. A game's own copy of the framework does the judging, so an older one that has no such check is left alone.
 */
function recordingStep(
  game: GameFolder,
  content: GameContent,
  files: FilesService,
): Effect.Effect<readonly Diagnostic[]> {
  return Effect.gen(function* () {
    const api = game.content
    if (typeof api.recordingProblems !== 'function') return []
    const runtime = yield* Effect.runtime<never>()
    const read = (path: string): Promise<Uint8Array | undefined> =>
      Runtime.runPromise(runtime)(files.readBytes(join(game.folder, path)))
    return yield* Effect.promise(() => api.recordingProblems(content, read))
  })
}

/**
 * The words of a game in every language: what is missing (a problem: a player in that language would see the game's own
 * words) and how many of the translated words no native speaker has read yet (a note for each language, never a
 * problem: a first draft plays, and `automata words` lists them). A game with no messages says nothing. A game's own
 * copy of the framework does the reading, so an older one that has no such check is left alone.
 */
function translationStep(
  game: GameFolder,
  content: GameContent,
  files: FilesService,
): Effect.Effect<{ problems: Diagnostic[]; notes: string[] }> {
  return Effect.gen(function* () {
    const api = game.content
    if (typeof api.translationProblems !== 'function' || typeof api.unreadWords !== 'function')
      return { problems: [], notes: [] }
    const problems = [...api.translationProblems(content)]
    const marksText = yield* files.readText(join(game.folder, api.READ_MARKS_FILE))
    const marks = marksText === undefined ? undefined : api.parseReadMarks(marksText)
    if (marks?.ok === false) return { problems: [...problems, ...marks.diagnostics], notes: [] }
    const unread = api.unreadWords(content, marks?.value)
    const counts = new Map<Language, number>()
    for (const word of unread) counts.set(word.language, (counts.get(word.language) ?? 0) + 1)
    const notes: string[] = []
    // Marks made against another language than the game is written in count for nothing: say why every word waits.
    const source = content.project.source
    const made = marks?.value.source
    if (made !== undefined && source !== undefined && made !== source && counts.size > 0)
      notes.push(
        `The read marks were made against ${api.languageName(made)}, and this game is now written in ${api.languageName(source)}, so every word waits again. See them with automata words.`,
      )
    for (const [language, count] of counts)
      notes.push(
        `${count} ${count === 1 ? 'word' : 'words'} in ${api.languageName(language)} ${count === 1 ? 'waits' : 'wait'} for a native speaker. See them with automata words.`,
      )
    return { problems, notes }
  })
}
