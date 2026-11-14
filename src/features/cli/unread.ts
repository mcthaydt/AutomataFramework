// `automata words`: the translated words no native speaker has read yet, each beside the game's own text, and the way to
// mark a language's words read once a person has read them. A machine's translation is a first draft that plays fine; this
// is the list of what still needs a person. The reading and the marking are the framework's (`unreadWords`, `markRead`),
// so a person at the command line, an agent and an editor keep the same marks file, and the one file this command ever
// writes is `automata.translations.toml`.
import { join } from 'node:path'
import { Effect } from 'effect'
import { formatDiagnostic, LANGUAGES, type Language, languageName } from '../content/content.ts'
import { readGame } from './game-folder.ts'
import { CliError, Files, type Ports } from './ports.ts'

/** One word that waits: its key, the game's own text and the translation to read. */
export interface UnreadWord {
  readonly language: Language
  readonly key: string
  /** The game's own text, in its source language. */
  readonly source: string
  readonly text: string
}

/** What `automata words` found. */
export interface WordsReport {
  /** The language the game's own words are written in: every other language is read against it. */
  readonly source: Language
  /** What still waits, after any marking: `LANGUAGES` order, then key order. */
  readonly unread: readonly UnreadWord[]
  /** Only with `read`: what was marked. */
  readonly marked?: { readonly language: Language; readonly keys: readonly string[] }
}

/** `a word waits`, `2 words wait`: the count and the right form of the sentence around it. */
const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`

/** The languages a native speaker can be asked to read: those with words, which are not the game's own. */
const readable = (words: Readonly<Record<string, unknown>>, source: Language): readonly Language[] =>
  LANGUAGES.filter((language) => language !== source && Object.hasOwn(words, language))

/**
 * Lists what waits for a read, and with `read` first marks `language`'s words (or only `keys`) as read. Nothing is
 * written unless something was marked, and then only the marks file.
 */
export function runWords(options: {
  readonly folder: string
  readonly read?: { readonly language: string; readonly keys: readonly string[] }
}): Effect.Effect<WordsReport, CliError, Ports> {
  return Effect.gen(function* () {
    const files = yield* Files
    const game = yield* readGame(options.folder)
    if (!game.loaded.ok)
      return yield* Effect.fail(
        new CliError(
          `The game does not load, so its words cannot be listed:\n${game.loaded.diagnostics.map(formatDiagnostic).join('\n')}`,
        ),
      )
    const content = game.loaded.value
    const api = game.content
    const source = content.project.source
    const words = content.messages
    if (source === undefined || words === undefined || Object.keys(words).length === 0)
      return yield* Effect.fail(
        new CliError(
          'This game has no words yet. Add a messages file like content/messages/es.json, list it in automata.toml, and write source = "es".',
        ),
      )
    const name = (language: Language): string => api.languageName(language)
    /** The words of one language's file, by key; none for a language the game has no file in. */
    const textsOf = (language: Language): Readonly<Record<string, string>> =>
      Object.hasOwn(words, language) ? (words[language]?.messages ?? {}) : {}
    const own = textsOf(source)

    const marksPath = join(game.folder, api.READ_MARKS_FILE)
    const text = yield* files.readText(marksPath)
    const parsed = text === undefined ? undefined : api.parseReadMarks(text)
    if (parsed?.ok === false)
      return yield* Effect.fail(new CliError(parsed.diagnostics.map(formatDiagnostic).join('\n')))
    let marks = parsed?.value

    let marked: WordsReport['marked']
    if (options.read !== undefined) {
      const { keys } = options.read
      const wanted = options.read.language
      const choices = readable(words, source)
      const list = choices.length === 0 ? '' : ` Mark one of: ${choices.join(', ')}.`
      if (wanted === source)
        return yield* Effect.fail(
          new CliError(
            `This game is written in ${name(source)}, so ${name(source)} is not read against anything.${list}`,
          ),
        )
      const language = choices.find((choice) => choice === wanted)
      if (language === undefined)
        return yield* Effect.fail(new CliError(`This game has no words in "${wanted}".${list}`))
      const theirs = textsOf(language)
      for (const key of keys) {
        if (!Object.hasOwn(theirs, key))
          return yield* Effect.fail(
            new CliError(
              `${name(language)} has no word called "${key}". Check the key in content/messages/${language}.json.`,
            ),
          )
        if (!Object.hasOwn(own, key))
          return yield* Effect.fail(
            new CliError(
              `${name(source)} has no word called "${key}", so the ${name(language)} one has nothing to be read against.`,
            ),
          )
      }
      marks = api.markRead(content, marks, language, keys.length === 0 ? undefined : keys)
      yield* files.write(marksPath, api.writeReadMarks(marks))
      const every = Object.keys(theirs)
        .filter((key) => Object.hasOwn(own, key))
        .sort()
      marked = { language, keys: keys.length === 0 ? every : keys }
    }

    const unread = api.unreadWords(content, marks).map(
      (word): UnreadWord => ({
        language: word.language,
        key: word.key,
        source: own[word.key] ?? '',
        text: textsOf(word.language)[word.key] ?? '',
      }),
    )
    return { source, unread, ...(marked === undefined ? {} : { marked }) }
  })
}

/**
 * What a person reads: which language the words were checked against, one block for each language with unread words
 * (each word beside the game's own), and how to mark one read.
 */
export function describeWords(report: WordsReport): readonly string[] {
  const names = languageName
  const lines: string[] = []
  if (report.marked !== undefined)
    lines.push(
      `Marked ${plural(report.marked.keys.length, 'word', 'words')} in ${names(report.marked.language)} as read.`,
      '',
    )
  lines.push(`Checked against ${names(report.source)} (${report.source}).`, '')
  const languages = LANGUAGES.filter((language) => report.unread.some((word) => word.language === language))
  if (languages.length === 0) {
    lines.push('A native speaker has read every translated word.')
    return lines
  }
  for (const language of languages) {
    const block = report.unread.filter((word) => word.language === language)
    // The two names line up their words under each other, whatever the languages are called.
    const width = Math.max(names(report.source).length, names(language).length) + 2
    lines.push(
      `${names(language)} (${language}): ${plural(block.length, 'word waits', 'words wait')} for a native speaker.`,
    )
    for (const word of block)
      lines.push(
        `  ${word.key}`,
        `    ${`${names(report.source)}:`.padEnd(width)}${word.source}`,
        `    ${`${names(language)}:`.padEnd(width)}${word.text}`,
      )
    lines.push('')
  }
  lines.push(
    `Once a native speaker has read a language, mark it: automata words --read ${languages[0] ?? 'es'}`,
  )
  return lines
}
