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
      expect.stringContaining(`keep them under ${MAX_START_LINES}`),
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

describe('an editor slice closes, and the next starts, only after its design review loop passes', () => {
  const roadmap = (three: string, four: string) =>
    `# Roadmap\n\n## Slice 2: Files\n\n1. Done: levels.\n\n## Slice 3: World\n\n${three}\n\n## Slice 4: Characters\n\n${four}\n`
  const review = 'docs/superpowers/audits/2026-11-20-slice-3-design-review.md'

  test('a slice still being built needs no review yet, and a later slice may have its spec done', () => {
    expect(
      check({
        'docs/roadmap.md': roadmap(
          '1. Done: mockups.\n2. Now: the editor.',
          '1. Done: the spec.\n2. Next: the editor.',
        ),
      }),
    ).toEqual([])
  })

  test('closing slice 3, or starting slice 4, without a passed review fails', () => {
    const closed = check({
      'docs/roadmap.md': roadmap(
        '1. Done: mockups.\n2. Done: the editor.',
        '1. Done: the spec.\n2. Next: the editor.',
      ),
    })
    expect(closed).toEqual([expect.stringContaining('Slice 3 is closed')])
    const started = check({ 'docs/roadmap.md': roadmap('1. Now: the editor.', '1. Now: the editor.') })
    expect(started).toEqual([expect.stringContaining('slice-3-design-review.md')])
    const unpassed = {
      'docs/roadmap.md': roadmap('1. Done: the editor.', '1. Now: x.'),
      [review]: 'Recheck: 2 left\n',
    }
    expect(check(unpassed)).toEqual([expect.stringContaining('Slice 3')])
  })

  test('a passed recheck lets slice 3 close and slice 4 start; slices before 3 need none', () => {
    const files = {
      'docs/roadmap.md': roadmap('1. Done: the editor.', '1. Now: the editor.'),
      [review]: '# Review\n\nScope: drift check against approved mockups\n\nRecheck: passed\n',
    }
    expect(check(files)).toEqual([])
  })
})

test('a design review record without its scope line does not pass the gate', () => {
  const roadmap = '## Slice 3: World\n\n1. Done: the editor.\n'
  const review = 'docs/superpowers/audits/2026-11-20-slice-3-design-review.md'
  expect(check({ 'docs/roadmap.md': roadmap, [review]: 'Recheck: passed\n' })).toEqual([
    expect.stringContaining('Scope:'),
  ])
})
