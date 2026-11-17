import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

// After a compaction a SessionStart hook prints the reminder that the rules file beats the summary, so a
// session that lost its place knows where to look. This file is the same in every repo that has CI.
const root = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '')
const read = (path: string) => readFileSync(`${root}/${path}`, 'utf8')
type Entry = { matcher: string; hooks: { type: string; command: string }[] }
const settings = JSON.parse(read('.claude/settings.json')) as { hooks: { SessionStart: Entry[] } }
const entry = settings.hooks.SessionStart[0]
const command = entry?.hooks[0]?.command ?? ''
const reminder = read('.claude/after-compaction.md')

test('one SessionStart hook runs after a compaction, and none runs at any other start', () => {
  expect(settings.hooks.SessionStart).toHaveLength(1)
  expect(entry?.matcher).toBe('compact')
  expect(entry?.hooks).toHaveLength(1)
  expect(entry?.hooks[0]?.type).toBe('command')
})

test('its command prints the reminder, byte for byte', () => {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root }
  expect(execFileSync('sh', ['-c', command], { env, encoding: 'utf8' })).toBe(reminder)
})

test('the reminder says the rules file beats the summary and where live state is', () => {
  for (const text of ['beats the summary', 'docs/superpowers/live/', 'fresh session'])
    expect(reminder, text).toContain(text)
})

test('every path the reminder names exists', () => {
  for (const path of ['CLAUDE.md', 'docs/superpowers/progress.md', '.claude/skills/']) {
    expect(reminder, path).toContain(path)
    expect(existsSync(`${root}/${path}`), path).toBe(true)
  }
})
