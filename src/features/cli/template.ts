// The template: the game folder in this package's `template/`, read as the files `automata create` writes. Three of its
// files have another name there, because the real one would act on this repository (`package.json`, `biome.json`) or
// be dropped from the package by npm (`.gitignore`).
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Effect } from 'effect'
import { CliError, Files, type FilesService } from './ports.ts'

/** The template's name for each file that is written under another. */
export const RENAMED: Readonly<Record<string, string>> = {
  'package.template.json': 'package.json',
  'biome.template.json': 'biome.json',
  gitignore: '.gitignore',
}

/** The package's own name, which marks its `package.json` among the ones above this file. */
const PACKAGE_NAME = '@automataframework/framework'

/** The `name` a `package.json` gives itself. */
const nameIn = (manifest: string): string | undefined =>
  (JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string }).name

/**
 * The folder of this package: the nearest `package.json` above this file that names it. The same answer from
 * `src/features/cli/` and from `dist/`, wherever the package is installed.
 */
export function packageRoot(): string {
  let here = dirname(fileURLToPath(import.meta.url))
  for (;;) {
    const manifest = join(here, 'package.json')
    if (existsSync(manifest) && nameIn(manifest) === PACKAGE_NAME) return here
    const above = dirname(here)
    if (above === here) throw new Error(`The ${PACKAGE_NAME} package's own folder was not found.`)
    here = above
  }
}

/** One file of a new game: its path from the game's root, with the real names, and its bytes. */
export interface TemplateFile {
  readonly path: string
  readonly bytes: Uint8Array
}

/** The template as it will be written, in path order. */
export function templateFiles(): Effect.Effect<readonly TemplateFile[], CliError, FilesService> {
  return Effect.gen(function* () {
    const files = yield* Files
    const root = join(packageRoot(), 'template')
    const found: TemplateFile[] = []
    for (const name of yield* files.list(root)) {
      const bytes = yield* files.readBytes(join(root, name))
      if (bytes === undefined)
        return yield* Effect.fail(new CliError(`The template's ${name} could not be read from ${root}.`))
      found.push({ path: RENAMED[name] ?? name, bytes })
    }
    if (found.length === 0) return yield* Effect.fail(new CliError(`The template is not in ${root}.`))
    return found.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  })
}
