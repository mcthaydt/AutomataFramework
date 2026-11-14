// The `files` step: every content file reads, is listed in `automata.toml`, and is written the standard way (the bytes
// `writeContent` makes), so that a person, an editor and an agent editing the same file make the same change.
import { join } from 'node:path'
import { Effect } from 'effect'
import { type Diagnostic, type GameContent, type Language, parseProject } from '../content/content.ts'
import type { GameFolder } from './game-folder.ts'
import { type CliError, Files, type FilesService } from './ports.ts'
import type { StepReport } from './report.ts'

const NOT_INSTALLED_NOTE =
  "This game is not installed, so its files were checked with automata's own copy of the framework."

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
    if (project?.ok === true) {
      for (const ref of project.value.content) {
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

    // A `.json` under content/ that the project does not list is a file the game never reads.
    for (const name of yield* files.list(join(game.folder, 'content'))) {
      const path = `content/${name}`
      if (name.endsWith('.json') && !listed.has(path))
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
    }

    const state = problems.length > 0 ? 'failed' : 'passed'
    return { step: 'files', state, problems, notes } satisfies StepReport
  })
}

/**
 * The words of a game in every language: what is missing (a problem: a player in that language would see English) and
 * how many of the translated words no native speaker has read yet (a note, never a problem: a first draft plays). A
 * game with no messages says nothing. A game's own copy of the framework does the reading, so an older one that has no
 * such check is left alone.
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
    const unread = api.unreadWords(content, marks?.value ?? {})
    const counts = new Map<Language, number>()
    for (const word of unread) counts.set(word.language, (counts.get(word.language) ?? 0) + 1)
    const notes =
      counts.size === 0
        ? []
        : [
            'Words no native speaker has read yet (a first draft plays fine): ' +
              [...counts].map(([language, count]) => `${api.languageName(language)} ${count}`).join(', ') +
              '.',
          ]
    return { problems, notes }
  })
}
