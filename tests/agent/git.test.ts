import { join } from 'node:path'
import { expect, test } from 'vitest'
import { git, node, OWNER, ROOT, repo } from './run.ts'

// The git hooks (.claude/hooks/git/), turned on the way session-start.mjs turns them on, in a repo made for each test.
function hooked(files: Record<string, string> = {}): string {
  const dir = repo(files)
  git(dir, ['config', 'core.hooksPath', join(ROOT, '.claude/hooks/git')])
  return dir
}

/** Tries a commit of everything; returns git's error output, empty when the commit was made. */
function commit(dir: string, message: string, who: string[] = OWNER): string {
  git(dir, ['add', '-A'])
  try {
    git(dir, [...who, 'commit', '-q', '-m', message])
    return ''
  } catch (error) {
    return String((error as { stderr?: unknown }).stderr ?? error)
  }
}

test('a commit by the Owner, with a plain message, is made', () => {
  expect(commit(hooked({ 'a.md': 'a\n' }), 'docs: a')).toBe('')
})

test('a commit by anyone else is refused, with the fix', () => {
  const claude = ['-c', 'user.name=Claude', '-c', 'user.email=noreply@anthropic.com']
  const refused = commit(hooked({ 'a.md': 'a\n' }), 'docs: a', claude)
  expect(refused).toContain('not McThayDT')
  expect(refused).toContain('git config --global user.name "McThayDT"')
})

test('a message with a Claude credit line is refused', () => {
  const credit = 'Co-Authored-By: Claude <noreply@anthropic.com>'
  const refused = commit(hooked({ 'a.md': 'a\n' }), `docs: a\n\n${credit}`)
  expect(refused).toContain('Claude credit')
})

test('while a finding is active, a commit of a file outside its scope is refused', () => {
  const dir = hooked({ 'src/a.ts': 'a\n', 'src/b.ts': 'b\n' })
  node('.claude/tools/scope.mjs', ['start', 'A1', 'src/a.ts'], { cwd: dir })
  expect(commit(dir, 'fix: A1')).toContain('Outside the scope of A1: src/b.ts')
})
