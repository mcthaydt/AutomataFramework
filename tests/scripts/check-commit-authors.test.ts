import { describe, expect, test } from 'vitest'
import {
  type CommitInfo,
  explain,
  findProblems,
  OWNER,
  type Person,
} from '../../scripts/check-commit-authors.ts'

const owner: Person = { name: OWNER.name, email: OWNER.email, login: OWNER.login }
const claude: Person = { name: 'Claude', email: 'noreply@anthropic.com', login: null }
const stranger: Person = { name: 'Sam Rivers', email: 'sam@example.com', login: 'samr' }
const github: Person = { name: 'GitHub', email: 'noreply@github.com', login: 'web-flow' }

function commit(author: Person, extra: Partial<CommitInfo> = {}): CommitInfo {
  return { sha: '0123456789abcdef', author, committer: author, message: 'feat: a change', ...extra }
}

describe('who a commit may come from', () => {
  test('the Owner, named exactly, passes', () => {
    expect(findProblems([commit(owner)], 'A change', 'What it does.')).toEqual([])
  })

  test('the Owner on the web (GitHub as committer) passes', () => {
    expect(findProblems([commit(owner, { committer: github })], 'A change', '')).toEqual([])
  })

  test('someone else keeps their own name', () => {
    expect(findProblems([commit(stranger)], 'A change', '')).toEqual([])
  })

  test('Claude fails, as author and as committer', () => {
    const problems = findProblems([commit(claude)], 'A change', '')
    expect(problems.map((p) => p.what)).toEqual([
      expect.stringContaining('its author is Claude <noreply@anthropic.com>'),
      expect.stringContaining('its committer is Claude <noreply@anthropic.com>'),
    ])
  })

  test('his GitHub login with any other name fails', () => {
    const renamed: Person = { name: 'The Realest Alive', email: 'other@example.com', login: OWNER.login }
    expect(findProblems([commit(renamed)], 'A change', '')).toHaveLength(2)
  })

  test('his name with another email fails', () => {
    const wrongEmail: Person = { name: OWNER.name, email: 'someone@example.com', login: null }
    expect(findProblems([commit(wrongEmail)], 'A change', '')).toHaveLength(2)
  })

  test('his email with the name in another case fails', () => {
    const wrongCase: Person = { name: 'mcthaydt', email: OWNER.email.toUpperCase(), login: null }
    expect(findProblems([commit(wrongCase)], 'A change', '')).toHaveLength(2)
  })

  test('the Owner as author but Claude as committer fails once, for the committer', () => {
    const problems = findProblems([commit(owner, { committer: claude })], 'A change', '')
    expect(problems).toHaveLength(1)
    expect(problems[0]?.what).toContain('its committer')
  })

  test('a problem names the commit by its short id', () => {
    expect(findProblems([commit(claude)], 'A change', '')[0]?.where).toBe('commit 0123456')
  })
})

describe('Claude credits', () => {
  const trailers = [
    'Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>',
    'co-authored-by: claude <noreply@anthropic.com>',
    'Claude-Session: https://claude.ai/code/session_01',
    'Generated with [Claude Code](https://claude.com/claude-code)',
    '🤖 Generated with Claude Code',
  ]

  test.each(trailers)('a commit message with "%s" fails', (line) => {
    const problems = findProblems([commit(owner, { message: `feat: a change\n\nWhy.\n\n${line}` })], 'A', '')
    expect(problems).toHaveLength(1)
    expect(problems[0]?.kind).toBe('credit-in-commit')
    expect(problems[0]?.what).toContain(line)
  })

  test.each(trailers)('a pull request description with "%s" fails', (line) => {
    const problems = findProblems([commit(owner)], 'A change', `What it does.\n\n${line}`)
    expect(problems).toHaveLength(1)
    expect(problems[0]?.kind).toBe('credit-in-text')
  })

  test('a title with a credit fails too', () => {
    expect(findProblems([commit(owner)], 'Generated with Claude Code', '')).toHaveLength(1)
  })

  test('a sentence that only mentions a credit passes', () => {
    const prose =
      'It fails on a Co-Authored-By: Claude line, a Claude-Session line or Generated with Claude Code.'
    expect(findProblems([commit(owner, { message: `ci: a check\n\n${prose}` })], 'A check', prose)).toEqual(
      [],
    )
  })

  test('a person who co-authored with someone else passes', () => {
    const message = 'feat: a change\n\nCo-Authored-By: Sam Rivers <sam@example.com>'
    expect(findProblems([commit(owner, { message })], 'A change', '')).toEqual([])
  })

  test("the project's own credit line in a description passes", () => {
    const body = [
      '<!-- claude-projects-attribution: {"github_login":"mcthaydt"} -->',
      '_Requested by **McThayDT** · [project thread](https://claude.ai/code/project/chan_1?thread=cmsg_1)_',
    ].join('\n')
    expect(findProblems([commit(owner)], 'A change', body)).toEqual([])
  })
})

describe('the message a person reads', () => {
  test('a wrong name comes with the three commands that fix it', () => {
    const text = explain(findProblems([commit(claude)], 'A change', ''), 'main')
    expect(text).toContain('commit 0123456: its author is Claude <noreply@anthropic.com>')
    expect(text).toContain(`git config user.name "${OWNER.name}" && git config user.email "${OWNER.email}"`)
    expect(text).toContain('git rebase origin/main --exec "git commit --amend --no-edit --reset-author"')
    expect(text).toContain('git push --force-with-lease')
  })

  test('a credit in a commit says how to reword it, and one in the text says where to click', () => {
    const problems = findProblems(
      [commit(owner, { message: 'x\n\nClaude-Session: y' })],
      'A change',
      'Generated with Claude Code',
    )
    const text = explain(problems, 'main')
    expect(text).toContain('git rebase -i origin/main')
    expect(text).toContain('press the pencil by the description')
    expect(text).not.toContain('--reset-author')
  })
})
