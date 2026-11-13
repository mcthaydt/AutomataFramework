import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { expect, test } from 'vitest'
import { checkArchitecture, type SourceFiles } from './architecture/rules.ts'

const ROOT = join(import.meta.dirname, '..')

/** Every `.ts` file under `dir`, keyed by its path from the repo root with `/`. */
function readTree(dir: string, into: Record<string, string> = {}): SourceFiles {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) readTree(path, into)
    else if (entry.name.endsWith('.ts'))
      into[relative(ROOT, path).split('\\').join('/')] = readFileSync(path, 'utf8')
  }
  return into
}

test('imports go down, nothing cycles, the sim side is pure, and every package stays in its place', () => {
  const violations = checkArchitecture(readTree(join(ROOT, 'src')))
  expect(violations.map((v) => `${v.file}: ${v.rule}: ${v.detail}`)).toEqual([])
})
