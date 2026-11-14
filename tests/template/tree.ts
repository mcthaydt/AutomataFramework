// The template folder, read from disk as a map: its path from `template/` (with `/`) to its text.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The template's folder. */
export const TEMPLATE: string = fileURLToPath(new URL('../../template/', import.meta.url))

/** Every file under `template/`, by its path from there. */
export function templateTree(): Record<string, string> {
  const files: Record<string, string> = {}
  for (const entry of readdirSync(TEMPLATE, { recursive: true, encoding: 'utf8' })) {
    const path = entry.replaceAll('\\', '/')
    if (statSync(join(TEMPLATE, entry)).isFile()) files[path] = readFileSync(join(TEMPLATE, entry), 'utf8')
  }
  return files
}

/** A `read` over the template's files, as `loadGame` takes it. An override replaces a file. */
export function readTemplate(
  overrides: Readonly<Record<string, string>> = {},
): (path: string) => Promise<string> {
  const files = { ...templateTree(), ...overrides }
  return async (path) => {
    const text = files[path]
    if (text === undefined) throw new Error(`${path}: no such file`)
    return text
  }
}
