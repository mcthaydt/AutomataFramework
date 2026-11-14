// `automata create`: a new game in a new folder, made from the template. Only the name, the framework's line, the
// saves' id and the language the words are written in change; nothing is installed and no tool is run, so what was made is exactly the template's files.
import { join } from 'node:path'
import { Effect } from 'effect'
import {
  emptyReadMarks,
  LANGUAGES,
  type Language,
  parseReadMarks,
  READ_MARKS_FILE,
  writeReadMarks,
} from '../content/content.ts'
import { matchLanguage } from '../locale/locale.ts'
import { FRAMEWORK_VERSION } from '../sim/sim.ts'
import { paintArt } from './art.ts'
import { readGame } from './game-folder.ts'
import { CliError, Device, type DeviceService, Files, type Ports } from './ports.ts'
import { templateFiles } from './template.ts'

/** What a game's name looks like: small letters, numbers and dashes, starting with a letter. */
const NAME = /^[a-z][a-z0-9-]{0,39}$/
/** The name the template's files carry, to be replaced. */
const TEMPLATE_NAME = 'my-game'
/** The template's files whose `my-game` is the game's name. */
const NAMED = new Set(['package.json', 'src/features/page/page.ts', 'README.md'])
const FRAMEWORK = '@automataframework/framework'

/** The last part of a folder as typed: the game's name. */
export const nameOf = (folder: string): string => folder.split(/[\\/]/).at(-1) ?? ''

/** A `github:owner/repo#commit` spec, as the line pnpm needs to build a package it fetched from git. */
function builtLine(spec: string): string | undefined {
  const git = /^github:([^/#]+)\/([^/#]+)#(.+)$/.exec(spec)
  return git === null
    ? undefined
    : `${FRAMEWORK}@https://codeload.github.com/${git[1]}/${git[2]}/tar.gz/${git[3]}`
}

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes)

/** The codes a game's own language can be, as a sentence needs them: `zh, es, en, pt, ja, ko`. */
const CODES = LANGUAGES.join(', ')

/** The one line of `automata.toml` that names the language the game's own words are written in. */
const SOURCE_LINE = /^source = "[a-z]+"$/gm

/**
 * The language the new game is written in, settled before anything is written: the one asked for, else the first of the
 * machine's own languages the framework has words in, else a sentence that says to ask. Nobody is given English.
 */
const settleSource = (asked: string | undefined): Effect.Effect<Language, CliError, DeviceService> =>
  Effect.gen(function* () {
    if (asked !== undefined) {
      const language = LANGUAGES.find((one) => one === asked)
      if (language === undefined)
        return yield* Effect.fail(
          new CliError(
            `"${asked}" is not a language a game can be written in. Use one of ${CODES}, like --source es.`,
          ),
        )
      return language
    }
    const device = yield* Device
    for (const tag of yield* device.languages()) {
      const found = matchLanguage(tag, LANGUAGES)
      if (found !== undefined) return found
    }
    return yield* Effect.fail(
      new CliError(
        `Say which language you write the game's words in: add --source with one of ${CODES}, like automata create my-game --source es.`,
      ),
    )
  })

/** The template's project file with its one `source` line naming `source`; `undefined` when it has not exactly one. */
function projectFile(text: string, source: Language): string | undefined {
  return (text.match(SOURCE_LINE) ?? []).length === 1
    ? text.replace(SOURCE_LINE, `source = "${source}"`)
    : undefined
}

/** The template's marks file when it was made against `source`, else marks that have read nothing in `source`. */
function marksFile(text: string, source: Language): string {
  const parsed = parseReadMarks(text)
  return parsed.ok && parsed.value.source === source ? text : writeReadMarks(emptyReadMarks(source))
}

/** The template's `package.json` for a game called `name` that installs `framework`. */
function packageJson(text: string, name: string, framework: string): string {
  const made = JSON.parse(text) as {
    name: string
    dependencies: Record<string, string>
    pnpm?: { onlyBuiltDependencies: string[] }
  }
  made.name = name
  made.dependencies[FRAMEWORK] = framework
  const line = builtLine(framework)
  if (line !== undefined) made.pnpm = { onlyBuiltDependencies: [line] }
  return `${JSON.stringify(made, null, 2)}\n`
}

/**
 * Writes the template as a new game in `folder`; the game's name is the folder's last part. Fails, writing nothing, for a
 * name that is not a game's name and for a folder that has something in it (an empty one is used).
 */
export function createGame(options: {
  readonly folder: string
  readonly framework?: string
  /** The language the game's own words are written in: a code like `es`. Left out, the machine's own language is used. */
  readonly source?: string
}): Effect.Effect<
  { readonly folder: string; readonly source: Language; readonly files: readonly string[] },
  CliError,
  Ports
> {
  return Effect.gen(function* () {
    const { folder } = options
    const name = nameOf(folder)
    if (!NAME.test(name))
      return yield* Effect.fail(
        new CliError(
          `"${folder}" cannot be a game's folder. Use small letters, numbers and dashes, like my-game.`,
        ),
      )
    const files = yield* Files
    if ((yield* files.list(folder)).length > 0)
      return yield* Effect.fail(
        new CliError(
          `There is already something in ${folder}. Pick another name, or empty that folder first.`,
        ),
      )

    const source = yield* settleSource(options.source)

    const template = yield* templateFiles()
    // A template that cannot be given a language is found out before the first file is written.
    const project = template.find((file) => file.path === 'automata.toml')
    const named = project === undefined ? undefined : projectFile(decode(project.bytes), source)
    if (named === undefined)
      return yield* Effect.fail(
        new CliError(
          'The automata.toml in the template must have exactly one source line, like source = "en". Reinstall the framework.',
        ),
      )
    const written: string[] = []
    for (const file of template) {
      let data: string | Uint8Array = file.bytes
      if (file.path === 'package.json')
        data = packageJson(new TextDecoder().decode(file.bytes), name, options.framework ?? FRAMEWORK_VERSION)
      else if (file.path === 'automata.toml') data = named
      else if (file.path === READ_MARKS_FILE) data = marksFile(decode(file.bytes), source)
      else if (NAMED.has(file.path))
        data = new TextDecoder().decode(file.bytes).replaceAll(TEMPLATE_NAME, name)
      yield* files.write(join(folder, file.path), data)
      written.push(file.path)
    }
    // The pictures its figures make, painted now, so the new game has them and the package never carries one.
    const game = yield* readGame(folder)
    written.push(...(yield* paintArt(game)))
    return { folder, source, files: written }
  })
}
