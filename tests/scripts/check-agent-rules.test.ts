import { createHash } from 'node:crypto'
import { describe, expect, test } from 'vitest'
import {
  MAX_CONSTRAINT_LINES,
  MAX_START_LINES,
  namesPrivate,
  problems,
} from '../../scripts/check-agent-rules.ts'

// A made-up private name, so this test never holds a real one.
const SECRET = [createHash('sha256').update('moon garden').digest('hex')]

const SKILL = '---\nname: review-graph\ndescription: Use when reviewing.\n---\n\n# Body\n'
const GOOD: Record<string, string> = {
  'CLAUDE.md': '# Repo\n\n@docs/rules.md\n',
  'docs/rules.md': '# Rules\n\nEffort is low, medium or high.\n',
  '.claude/skills/review-graph/SKILL.md': SKILL,
  '.claude/settings.json': '{ "command": "node \\"$CLAUDE_PROJECT_DIR/.claude/hooks/guard.mjs\\"" }',
  '.claude/hooks/guard.mjs': "// refuses 'xhigh'\n",
}

function check(changes: Record<string, string | null> = {}): string[] {
  const files = { ...GOOD, ...changes }
  const paths = Object.keys(files).filter((path) => files[path] !== null)
  return problems(paths, (path) => files[path] ?? null, SECRET)
}

test('the repo as it should be has no problems', () => {
  expect(check()).toEqual([])
})

describe('each rule fails when broken', () => {
  test('the start-up pages over the limit', () => {
    expect(check({ 'docs/rules.md': 'line\n'.repeat(MAX_START_LINES) })).toEqual([
      expect.stringContaining('keep them under 200'),
    ])
  })

  test('a constraints page over its limit', () => {
    const long = check({ 'docs/constraints.md': '- a rule\n'.repeat(MAX_CONSTRAINT_LINES + 1) })
    expect(long).toEqual([expect.stringContaining('prune it under 40')])
  })

  test('CLAUDE.md without the rules import', () => {
    expect(check({ 'CLAUDE.md': '# Repo\n' })).toEqual([expect.stringContaining('@docs/rules.md')])
  })

  test('an effort above high in a rule or a skill, but not in a hook that refuses it', () => {
    expect(check({ 'docs/rules.md': 'Run at xhigh.\n' })).toEqual([expect.stringContaining('docs/rules.md')])
    expect(check({ '.claude/skills/a/notes.md': 'xhigh\n' })).toEqual([expect.stringContaining('notes.md')])
  })

  test('a skill whose name is not its folder, or without a description', () => {
    const skill = (text: string) => check({ '.claude/skills/review-graph/SKILL.md': text })
    const named = skill(SKILL.replace('review-graph', 'reviews'))
    expect(named).toEqual([expect.stringContaining('`review-graph`')])
    const described = skill(SKILL.replace(/description.*\n/, ''))
    expect(described).toEqual([expect.stringContaining('needs a description')])
  })

  test('a hook that names a missing file', () => {
    const missing = check({ '.claude/hooks/guard.mjs': null })
    expect(missing).toEqual([expect.stringContaining('guard.mjs, which is missing')])
  })

  test('a file that names a private game, as one word or two', () => {
    expect(check({ 'src/a.ts': '// Moon Garden is next.\n' })).toEqual([expect.stringContaining('src/a.ts')])
    expect(namesPrivate('the moon-garden level', SECRET)).toBe(true)
    expect(namesPrivate('a garden on the moon', SECRET)).toBe(false)
  })
})
