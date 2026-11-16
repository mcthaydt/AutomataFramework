import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { node, repo } from './run.ts'

// The PreToolUse hook (.claude/hooks/guard.mjs), fed tool calls the way Claude Code feeds it: exit 2 refuses.
function guard(call: Record<string, unknown>): { refused: boolean; reason: string } {
  const result = node('.claude/hooks/guard.mjs', [], { input: JSON.stringify(call) })
  expect([0, 2]).toContain(result.status)
  return { refused: result.status === 2, reason: result.stderr }
}

const bash = (command: string) => guard({ tool_name: 'Bash', tool_input: { command } })

/** A refusal whose reason says this. */
const refusal = (words: string) => ({ refused: true, reason: expect.stringContaining(words) })

describe('pushes', () => {
  test.each([
    'git push --force origin claude/a',
    'git push -f origin claude/a',
    'git push -uf origin claude/a',
    'git push --force-with-lease origin claude/a',
    'git push origin +main',
    'cd repo && git -C ../other push --force',
  ])('`%s` is refused: never force-push', (command) => {
    expect(bash(command)).toMatchObject(refusal('Never force-push'))
  })

  test.each([
    'git push -u origin claude/a',
    'git push --follow-tags origin main',
    'git commit -m "refuse git push --force"',
  ])('`%s` may run', (command) => {
    expect(bash(command).refused).toBe(false)
  })
})

describe('tests and checks run only in CI', () => {
  test.each([
    'pnpm test:node',
    'pnpm run typecheck',
    'pnpm lint',
    'cd x && npx vitest run tests/a.test.ts',
    'CI=1 pnpm exec playwright test',
    'node --run knip',
  ])('`%s` is refused', (command) => {
    expect(bash(command)).toMatchObject(refusal('GitHub-hosted CI'))
  })

  test.each([
    'grep -n vitest package.json',
    'pnpm format',
    'git commit -F - <<EOF\nfix: pnpm test runs again\nEOF',
  ])('`%s` may run', (command) => {
    expect(bash(command).refused).toBe(false)
  })
})

test('a pull request with a Claude credit line is refused; one that only talks about credits is not', () => {
  const pr = (body: string) => guard({ tool_name: 'mcp__github__create_pull_request', tool_input: { body } })
  const footer = '🤖 Generated with [Claude Code](https://claude.com/claude-code)'
  expect(pr(`Fixes it.\n\n${footer}`).refused).toBe(true)
  expect(pr('Fixes it.\n\nCo-Authored-By: Claude <noreply@anthropic.com>').refused).toBe(true)
  expect(pr('The hook refuses a Claude credit line in a commit.').refused).toBe(false)
})

test('no session or agent runs above high effort', () => {
  const refused = (tool_name: string, tool_input: Record<string, unknown>) =>
    guard({ tool_name, tool_input }).refused
  expect(refused('Agent', { prompt: 'p', effort: 'xhigh' })).toBe(true)
  expect(refused('Agent', { prompt: 'p', effort: 'max' })).toBe(true)
  expect(refused('mcp__hearthbot__set_effort_level', { level: 'xhigh' })).toBe(true)
  expect(refused('Workflow', { script: "agent('x', { effort: 'xhigh' })" })).toBe(true)
  expect(refused('Agent', { prompt: 'p', effort: 'high' })).toBe(false)
})

test('while a finding is active, an edit outside its files is refused', () => {
  const dir = repo()
  const started = node('.claude/tools/scope.mjs', ['start', 'A1', 'src/a.ts', 'tests/**'], { cwd: dir })
  expect(started.status).toBe(0)
  const edit = (file: string) =>
    guard({ tool_name: 'Edit', tool_input: { file_path: join(dir, file) }, cwd: dir })
  expect(edit('src/a.ts').refused).toBe(false)
  expect(edit('tests/deep/a.test.ts').refused).toBe(false)
  expect(edit('docs/superpowers/progress.md').refused).toBe(false)
  expect(edit('src/b.ts')).toMatchObject(refusal('outside the scope of A1'))
  expect(guard({ tool_name: 'Write', tool_input: { file_path: join(dir, 'new/c.ts') } }).refused).toBe(true)
  node('.claude/tools/scope.mjs', ['done'], { cwd: dir })
  expect(edit('src/b.ts').refused).toBe(false)
})

test('a call that is not JSON, or not a rule\'s business, runs', () => {
  expect(node('.claude/hooks/guard.mjs', [], { input: 'not json' }).status).toBe(0)
  expect(guard({ tool_name: 'Read', tool_input: { file_path: '/etc/hosts' } }).refused).toBe(false)
})
