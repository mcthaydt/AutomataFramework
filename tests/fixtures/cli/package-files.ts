// What the package ships for an agent to read (`schemas/` and `skills/`), put into the memory layer where `automata mcp`
// looks for it: under the package's own folder.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { packageRoot } from '#src/features/cli/template.ts'

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))

/** The text of a file of the package, by its path from the package's folder. */
export const packageText = (path: string): string => readFileSync(join(ROOT, path), 'utf8')

/** Every file under `schemas/` and `skills/`, keyed by where the command reads it from. */
export function packageFilesInMemory(): Record<string, string> {
  const files: Record<string, string> = {}
  for (const folder of ['schemas', 'skills']) {
    for (const entry of readdirSync(join(ROOT, folder), { recursive: true, encoding: 'utf8' })) {
      const path = `${folder}/${entry.replaceAll('\\', '/')}`
      if (statSync(join(ROOT, path)).isFile()) files[join(packageRoot(), path)] = packageText(path)
    }
  }
  return files
}
