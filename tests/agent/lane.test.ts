import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { expect, test } from 'vitest'
import { git, node, OWNER, repo } from './run.ts'

// The lane script (.claude/tools/lane.mjs), on a branch made in a repo made for each test: the lane comes from the
// changed files alone.
const BASE = {
  'package.json': '{ "dependencies": { "pixi.js": "8.0.0" } }\n',
  'tests/golden/run.json': '{ "hash": 1 }\n',
  'docs/superpowers/old.md': 'Old notes.\n',
  'src/features/level/load.ts': 'export const a = 1\n',
}

/** The lane and reasons for a branch that writes `files` (null deletes one) on top of BASE. */
function lane(files: Record<string, string | null>): string[] {
  const dir = repo(BASE)
  git(dir, ['add', '-A'])
  git(dir, [...OWNER, 'commit', '-q', '-m', 'base'])
  git(dir, ['checkout', '-q', '-b', 'change'])
  for (const [path, text] of Object.entries(files)) {
    if (text === null) rmSync(join(dir, path))
    else {
      mkdirSync(dirname(join(dir, path)), { recursive: true })
      writeFileSync(join(dir, path), text)
    }
  }
  git(dir, ['add', '-A'])
  git(dir, [...OWNER, 'commit', '-q', '-m', 'change'])
  return node('.claude/tools/lane.mjs', ['--base', 'main'], { cwd: dir }).stdout.trim().split('\n')
}

test('docs, tests and one feature folder are contained', () => {
  const change = lane({ 'README.md': 'New words.\n', 'src/features/level/load.ts': 'export const a = 2\n' })
  expect(change[0]).toBe('contained')
})

test('shared code, setup and two feature folders are wide', () => {
  expect(lane({ 'src/lib/zod.ts': 'export const z = 1\n' })[0]).toBe('wide')
  expect(lane({ 'biome.json': '{}\n' })[0]).toBe('wide')
  const two = lane({ 'src/features/level/load.ts': 'export const a = 2\n', 'src/features/sim/b.ts': '1\n' })
  expect(two[0]).toBe('wide')
  expect(two.join('\n')).toContain('2 feature folders')
})

test('a golden that moves, a deletion and a new dependency are closed; a new golden is not', () => {
  expect(lane({ 'tests/golden/run.json': '{ "hash": 2 }\n' })[0]).toBe('closed')
  const deleted = lane({ 'src/features/level/load.ts': null })
  expect(deleted).toEqual(['closed', '- src/features/level/load.ts: deleted'])
  const added = '{ "dependencies": { "pixi.js": "8.0.0", "lodash": "4.0.0" } }\n'
  const dependency = lane({ 'package.json': added })
  expect(dependency).toEqual(['closed', '- lodash: a new dependency'])
  expect(lane({ 'tests/golden/new.json': '{ "hash": 3 }\n' })[0]).toBe('contained')
  expect(lane({ 'docs/superpowers/old.md': null })[0]).toBe('contained')
})
