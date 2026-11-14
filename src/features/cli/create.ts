// `automata create`: a new game in a new folder, made from the template. Only the name, the framework's line and the
// saves' id change; nothing is installed and no tool is run, so what was made is exactly the template's files.
import { join } from 'node:path'
import { Effect } from 'effect'
import { FRAMEWORK_VERSION } from '../sim/sim.ts'
import { CliError, Files, type Ports } from './ports.ts'
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
}): Effect.Effect<{ readonly folder: string; readonly files: readonly string[] }, CliError, Ports> {
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

    const template = yield* templateFiles()
    const written: string[] = []
    for (const file of template) {
      let data: string | Uint8Array = file.bytes
      if (file.path === 'package.json')
        data = packageJson(new TextDecoder().decode(file.bytes), name, options.framework ?? FRAMEWORK_VERSION)
      else if (NAMED.has(file.path))
        data = new TextDecoder().decode(file.bytes).replaceAll(TEMPLATE_NAME, name)
      yield* files.write(join(folder, file.path), data)
      written.push(file.path)
    }
    return { folder, files: written }
  })
}
