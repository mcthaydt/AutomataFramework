import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { git, node, OWNER, repo } from './run.ts'

// The fix loop's scope and tries (.claude/tools/scope.mjs), in a repo made for each test.
const scope = (dir: string, ...args: string[]) => node('.claude/tools/scope.mjs', args, { cwd: dir })

test('a finding gets three tries, and the fourth is refused with what to report', () => {
  const dir = repo()
  for (const tryNumber of [1, 2, 3]) {
    expect(scope(dir, 'start', 'A1', 'src/a.ts').stdout).toContain(`try ${tryNumber} of 3`)
    scope(dir, 'done')
  }
  const fourth = scope(dir, 'start', 'A1', 'src/a.ts')
  expect(fourth.status).toBe(1)
  expect(fourth.stderr).toContain('Report it as stuck')
})

test('one finding at a time: another cannot start until this one is done', () => {
  const dir = repo()
  scope(dir, 'start', 'A1', 'src/a.ts')
  expect(scope(dir, 'start', 'A2', 'src/b.ts')).toMatchObject({ status: 1 })
  scope(dir, 'done')
  expect(scope(dir, 'start', 'A2', 'src/b.ts')).toMatchObject({ status: 0 })
})

test('check fails on a file changed outside the scope, committed or not, and passes inside it', () => {
  const dir = repo()
  scope(dir, 'start', 'A1', 'src/*.ts')
  writeFileSync(join(dir, 'README.md'), 'Changed.\n')
  const outside = scope(dir, 'check')
  expect(outside.status).toBe(1)
  expect(outside.stderr).toContain('README.md')
  git(dir, ['checkout', 'README.md'])
  expect(scope(dir, 'check').status).toBe(0)
  git(dir, ['checkout', '-q', '-b', 'fix'])
  writeFileSync(join(dir, 'notes.md'), 'A note.\n')
  git(dir, ['add', 'notes.md'])
  git(dir, [...OWNER, '-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', 'notes'])
  expect(scope(dir, 'check').stderr).toContain('notes.md')
})

test('a start with no files is refused', () => {
  expect(scope(repo(), 'start', 'A1').status).toBe(1)
})
