// A game's words as typed functions. Paraglide (inlang) turns the game's `content/messages/*.json` into a folder of
// generated code, one function for each word, so a game's own code calls `m.keeper_hello()` and a misspelt word is a
// mistake the compiler shows, not a key shown to a player. The words stay content, read at run time by `loadGame`; this
// is the second way into the same files, for code.
//
// A game commits no inlang project: it is made in a temporary folder for each compile, from the messages files the game
// loaded (the game's own language first, `source`, so it is Paraglide's base language). Paraglide's own strategies never
// run (`bindParaglide` answers `getLocale`). Paraglide empties the folder it writes to, so it writes to a temporary one and what differs is
// copied into the game's `outdir`: an unchanged compile touches nothing, and a dev server watching `outdir` never sees
// it empty. Ported from AutomataFrameworkFailed@ed8592e8: packages/content/src/shared/locale/compile-messages.ts and
// sync-folder.ts.
//
// The two packages are named here and nowhere else. They are loaded with Node's own `require` (it loads ES modules) from
// a string, and only when words are compiled, so no other command, and no game's page, ever loads the inlang SDK. That
// is also why `knip.json` lists them under `ignoreDependencies`: it cannot see a package loaded from a string.
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Effect } from 'effect'
import { formatDiagnostic, LANGUAGES, type Language } from '../content/content.ts'
import { readGame } from './game-folder.ts'
import { CliError, Files, type Ports } from './ports.ts'

const PARAGLIDE = '@inlang/paraglide-js'
const MESSAGE_FORMAT = '@inlang/plugin-message-format'
const SCHEMA = 'https://inlang.com/schema/inlang-message-format'
/** A word's generated file: `messages/<function name>.js`, with no folder between. */
const WORD_FILE = /^messages\/[^/]+\.js$/

/** The part of Paraglide's `CompilerOptions` used here. */
interface CompileOptions {
  readonly project: string
  readonly outdir: string
  readonly strategy: readonly string[]
  readonly emitGitIgnore: boolean
  readonly emitPrettierIgnore: boolean
  readonly emitReadme: boolean
}

/** Why `outdir` cannot take generated code, as a sentence; `undefined` when it can. */
export function outdirProblem(outdir: string): string | undefined {
  const segments = outdir.split('/')
  const relative =
    outdir !== '' &&
    !outdir.startsWith('/') &&
    !outdir.includes('\\') &&
    segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..')
  if (!relative) return `${outdir} must be a folder inside the game, written like src/paraglide.`
  if (segments[0] === 'content' || outdir === 'automata.toml')
    return `${outdir} is where the game's own files live. Choose another folder, like src/paraglide: it is emptied of what it does not need each time.`
  return undefined
}

/** The name Paraglide gives a word's function: what is not a letter, a digit or `_` becomes `_`. */
export const functionName = (key: string): string => key.replace(/[^A-Za-z0-9_]/g, '_')

/** The words that would be one function, as sentences: two keys that differ only in `.` and `-` collide. */
function collisions(keys: readonly string[]): string[] {
  const byName = new Map<string, string[]>()
  for (const key of keys) {
    const name = functionName(key)
    byName.set(name, [...(byName.get(name) ?? []), key])
  }
  return [...byName]
    .filter(([, same]) => same.length > 1)
    .map(
      ([name, same]) =>
        `${same.map((key) => `"${key}"`).join(' and ')} would both be the function ${name}. Rename one of them in every messages file.`,
    )
}

/** Every file under `folder`, as paths relative to it with `/`; none when it does not exist. */
async function filesUnder(folder: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(join(folder, prefix), { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return []
      throw error
    },
  )
  const found: string[] = []
  for (const entry of entries) {
    const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) found.push(...(await filesUnder(folder, path)))
    else found.push(path)
  }
  return found
}

/** Paraglide's own compile, over the messages written in `folder`, into `folder/built`. */
async function compileIn(folder: string, languages: readonly Language[]): Promise<string> {
  const project = join(folder, 'project.inlang')
  await mkdir(project)
  // Resolved from this package, so a game needs no inlang dependency of its own. (They are development dependencies
  // while no command runs this file; the command that does moves them to `dependencies`: tests/package.test.ts.)
  const plugin = createRequire(import.meta.url).resolve(MESSAGE_FORMAT)
  await writeFile(
    join(project, 'settings.json'),
    JSON.stringify({
      baseLocale: languages[0],
      locales: languages,
      modules: [plugin],
      'plugin.inlang.messageFormat': { pathPattern: './messages/{locale}.json' },
    }),
  )
  const { compile } = createRequire(import.meta.url)(PARAGLIDE) as {
    compile: (options: CompileOptions) => Promise<unknown>
  }
  const built = join(folder, 'built')
  await compile({
    project,
    outdir: built,
    strategy: ['baseLocale'],
    emitGitIgnore: false,
    emitPrettierIgnore: false,
    emitReadme: false,
  })
  return built
}

/**
 * Compiles the words of the game in `folder` into `<folder>/<outdir>`, and answers the files it wrote (new or changed),
 * as paths from `outdir`; an unchanged compile answers none. A word's file the compile no longer makes (a word taken
 * out) is removed. A game with no words, a words file the game cannot load, an `outdir` that is not a folder of its own, or two
 * words that would be one function, is a sentence and nothing is written.
 */
export function compileWords(options: {
  readonly folder: string
  readonly outdir: string
}): Effect.Effect<readonly string[], CliError, Ports> {
  return Effect.gen(function* () {
    const { folder, outdir } = options
    const problem = outdirProblem(outdir)
    if (problem !== undefined) return yield* Effect.fail(new CliError(problem))
    const game = yield* readGame(folder)
    if (!game.loaded.ok)
      return yield* Effect.fail(
        new CliError(
          `The game does not load, so its words cannot be compiled:\n${game.loaded.diagnostics.map(formatDiagnostic).join('\n')}`,
        ),
      )
    const messages = game.loaded.value.messages
    const source = game.loaded.value.project.source
    if (messages === undefined || source === undefined || !Object.hasOwn(messages, source))
      return yield* Effect.fail(
        new CliError(
          'This game has no words to compile. Add a messages file, list it in automata.toml, and write source.',
        ),
      )
    // The game's own language first: it is Paraglide's base language, the one a missing word falls back to.
    const languages = [
      source,
      ...LANGUAGES.filter((language) => language !== source && Object.hasOwn(messages, language)),
    ]
    const clashes = collisions(Object.keys(messages[source]?.messages ?? {}))
    if (clashes.length > 0) return yield* Effect.fail(new CliError(clashes.join('\n')))

    const built = yield* Effect.tryPromise({
      try: async () => {
        const temporary = await mkdtemp(join(tmpdir(), 'automata-words-'))
        try {
          await mkdir(join(temporary, 'messages'))
          for (const language of languages)
            await writeFile(
              join(temporary, 'messages', `${language}.json`),
              `${JSON.stringify({ $schema: SCHEMA, ...messages[language]?.messages }, null, 2)}\n`,
            )
          const folderBuilt = await compileIn(temporary, languages)
          const contents = new Map<string, Uint8Array>()
          for (const file of await filesUnder(folderBuilt))
            contents.set(file, new Uint8Array(await readFile(join(folderBuilt, file))))
          return contents
        } finally {
          await rm(temporary, { recursive: true, force: true })
        }
      },
      catch: (cause) =>
        new CliError(
          `Paraglide could not compile the words: ${cause instanceof Error ? (cause.message.split('\n')[0] ?? '') : String(cause)}`,
        ),
    })

    // Only what differs is written, and only what the compile no longer makes is removed.
    const files = yield* Files
    const target = join(folder, outdir)
    const written: string[] = []
    for (const [file, bytes] of built) {
      const current = yield* files.readBytes(join(target, file))
      if (current !== undefined && current.length === bytes.length && current.every((b, i) => b === bytes[i]))
        continue
      yield* files.write(join(target, file), bytes)
      written.push(file)
    }
    // Only a word's own code is taken away: a `.js` file right under `messages/`, which is where Paraglide writes one for
    // each word. Anything else of the game's, beside them or in a folder under `messages/`, is never touched.
    for (const file of yield* files.list(target))
      if (WORD_FILE.test(file) && !built.has(file)) yield* files.remove(join(target, file))
    return written.sort()
  })
}
