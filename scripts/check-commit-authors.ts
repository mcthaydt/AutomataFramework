// Fails a pull request whose commits carry the wrong name for the Owner, or carry a Claude credit anywhere.
//
// Why: cloud sessions sometimes lose their git identity mid-run and commit as `Claude`, and some add a
// `Co-Authored-By: Claude` line. The Owner wants neither in these public repos. The rules, from the Owner:
//   - A commit that is the Owner's (its author or committer has his noreply email, his GitHub login, his old real
//     name or the name McThayDT) must be authored AND committed as exactly `McThayDT <107786093+...>`.
//   - A commit by `Claude <noreply@anthropic.com>` always fails.
//   - A Claude credit (a `Co-Authored-By: Claude` line, a `Claude-Session` line, "Generated with Claude Code" or its
//     "by" form) fails in any commit message and in the pull request's title or description.
//   - A pull request the Owner opened ends with the line "Requested by **McThayDT**", so a footer a tool appends
//     after it is caught even when it is not a credit this file knows.
//   - Everyone else keeps their own name. GitHub's own committer (a web edit, a merge button) is not the Owner.
//   - The Owner's other names (his old real name and his display name) never appear in a commit message or in the
//     pull request's title or description: the credit line reads "Requested by **McThayDT**". A session's
//     attribution template fills in the display name, so this catches it before it lands. The names are kept
//     only as hashes.
//
// This file has no dependencies on purpose: the workflow runs it with Node alone, and the same file lives in every
// repo of the project. It reads the commits from the GitHub API, so it needs no clone and sees the pull request as
// GitHub does (its linked login included).
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

/** The one identity the Owner's commits must carry. */
export const OWNER: { readonly name: string; readonly email: string; readonly login: string } = {
  name: 'McThayDT',
  email: '107786093+mcthaydt@users.noreply.github.com',
  login: 'mcthaydt',
}

const lower = (text: string): string => text.toLowerCase()

/**
 * The SHA-256 of the Owner's old real name, in lower case. The name must never come back, so a commit carrying it
 * counts as "his" and then fails the exact match. It is kept as a hash because the name itself may not appear in
 * these public repos, not even here.
 */
const OLD_NAME_HASH = '201f6494b670573dedc4e2baeb0499db0f3b19fdc6bc9d4982ac8ee84c42dcb7'

const sha = (text: string): string => createHash('sha256').update(text).digest('hex')

const isOldName = (name: string): boolean => sha(lower(name.trim())) === OLD_NAME_HASH

/**
 * The SHA-256 of each name of the Owner that may not appear in a pull request's words or a commit message, in lower
 * case: his old real name (its words joined by one space, as `OLD_NAME_HASH` is kept), and his display name with
 * and without its first word, each with its words joined by nothing, so the name run together as one word is caught
 * too.
 */
export const HIDDEN_NAMES: readonly string[] = [
  OLD_NAME_HASH,
  '8f714652fd5423e59a69279daff82a89eeacbd1b9154a237c4acd14f5d741151',
  'c2d990e3ac7c4fbe9bb2065bd0bfeeff4bd83bfab45a00b37c78d2d1e49cb12b',
]

/** Whether any run of one to three words of `text`, joined by a space or by nothing, hashes to one of `hashes`. */
export function namesHidden(text: string, hashes: readonly string[] = HIDDEN_NAMES): boolean {
  const words = lower(text)
    .split(/[^\p{L}]+/u)
    .filter(Boolean)
  return words.some((_, i) =>
    [1, 2, 3].some((size) => {
      const run = words.slice(i, i + size)
      if (run.length < size) return false
      return [run.join(' '), run.join('')].some((form) => hashes.includes(sha(form)))
    }),
  )
}

/** One side of a commit: who wrote it or who committed it. `login` is the GitHub account git's email maps to. */
export interface Person {
  name: string
  email: string
  login: string | null
}

/** What this check needs to know about one commit of the pull request. */
export interface CommitInfo {
  sha: string
  author: Person
  committer: Person
  message: string
}

/** One thing wrong. `where` says which commit (or the pull request text); `what` is a plain sentence. */
export interface Problem {
  kind: 'identity' | 'credit-in-commit' | 'credit-in-text' | 'name-in-commit' | 'name-in-text' | 'last-line'
  where: string
  what: string
}

const show = (person: Person): string => `${person.name} <${person.email}>`

/** Claude's own git identity (what a cloud session commits as when its settings reset). */
function isClaude(person: Person): boolean {
  return /^claude(\s|$)/i.test(person.name) || lower(person.email).endsWith('@anthropic.com')
}

/** Any trace of the Owner: his email, his login, his old name, or the name he uses now. */
function isOwner(person: Person): boolean {
  return (
    lower(person.email) === OWNER.email ||
    lower(person.login ?? '') === OWNER.login ||
    isOldName(person.name) ||
    lower(person.name) === lower(OWNER.name)
  )
}

/** The name and email, exactly. (Email case does not matter to git or GitHub; the name's does.) */
function isExactOwner(person: Person): boolean {
  return person.name === OWNER.name && lower(person.email) === OWNER.email
}

/**
 * The Claude credits that must not appear. Each is matched as a line of its own (a footer may start with an emoji
 * or a bullet), so a sentence that only talks about them, like this check's own description, is let through.
 */
const CREDITS: readonly { readonly pattern: RegExp; readonly label: string }[] = [
  { pattern: /^\s*co-authored-by:.*\b(claude|anthropic)\b/im, label: 'a "Co-Authored-By: Claude" line' },
  { pattern: /^\s*claude-session:/im, label: 'a "Claude-Session" line' },
  {
    // "Generated with Claude Code" and its other spellings: "by", and the tool's own italic footer
    // (`_Generated by [Claude Code](...)_`), which starts with an underscore.
    pattern: /^[^\p{L}\p{N}]*(generated|created|made|written|authored) (with|by) \[?claude\b/iu,
    label: 'a "Generated with Claude Code" line',
  },
]

/** The first credit found in `text`, with the line it is on, or null. */
function findCredit(text: string): { label: string; line: string } | null {
  for (const { pattern, label } of CREDITS) {
    const line = text.split('\n').find((candidate) => pattern.test(candidate))
    if (line !== undefined) return { label, line: line.trim() }
  }
  return null
}

/** The short form of a commit id, as people see it on GitHub. */
const short = (sha: string): string => sha.slice(0, 7)

/**
 * Everything wrong with a pull request. Pure: give it the commits and the pull request's title and description,
 * and it returns the problems, none when all is well.
 */
export function findProblems(
  commits: readonly CommitInfo[],
  title: string,
  body: string,
  hidden: readonly string[] = HIDDEN_NAMES,
): Problem[] {
  const problems: Problem[] = []
  for (const commit of commits) {
    const where = `commit ${short(commit.sha)}`
    for (const [role, person] of [
      ['author', commit.author],
      ['committer', commit.committer],
    ] as const) {
      if (isClaude(person)) {
        problems.push({
          kind: 'identity',
          where,
          what: `its ${role} is ${show(person)}, and Claude may not be on a commit`,
        })
      } else if (isOwner(person) && !isExactOwner(person)) {
        problems.push({
          kind: 'identity',
          where,
          what: `its ${role} is ${show(person)}, and it must be exactly ${show(OWNER)}`,
        })
      }
    }
    const credit = findCredit(commit.message)
    if (credit !== null) {
      problems.push({
        kind: 'credit-in-commit',
        where,
        what: `its message has ${credit.label}: ${credit.line}`,
      })
    }
    if (namesHidden(commit.message, hidden)) {
      problems.push({
        kind: 'name-in-commit',
        where,
        what: `its message names the Owner other than ${OWNER.name}`,
      })
    }
  }
  const credit = findCredit(`${title}\n${body}`)
  if (credit !== null) {
    problems.push({
      kind: 'credit-in-text',
      where: 'the pull request',
      what: `its title or description has ${credit.label}: ${credit.line}`,
    })
  }
  if (namesHidden(`${title}\n${body}`, hidden)) {
    problems.push({
      kind: 'name-in-text',
      where: 'the pull request',
      what: `its title or description names the Owner other than ${OWNER.name}: write ${OWNER.name} there`,
    })
  }
  return problems
}

/** The line the Owner's pull requests end with. */
const CREDIT_LINE = `Requested by **${OWNER.name}**`

/**
 * Whether the description of a pull request opened by `opener` ends with the credit line, ignoring trailing blank
 * lines. Only the Owner's own pull requests are held to it.
 */
export function checkLastLine(body: string, opener: string | null): Problem | null {
  if (lower(opener ?? '') !== OWNER.login) return null
  const last = body.trimEnd().split('\n').at(-1)?.trim() ?? ''
  if (last === CREDIT_LINE) return null
  return {
    kind: 'last-line',
    where: 'the pull request',
    what: `its description ends with "${last}", and it must end with ${CREDIT_LINE}`,
  }
}

/** The text a person reads when the check fails: what is wrong, then the commands that put it right. */
export function explain(problems: readonly Problem[], base: string): string {
  const lines = ['This pull request cannot go in yet. Here is what is wrong:', '']
  for (const problem of problems) lines.push(`  - ${problem.where}: ${problem.what}`)
  if (problems.some((problem) => problem.kind === 'identity')) {
    lines.push(
      '',
      'To put the names right, run these three commands in your copy of the repository. They give every commit',
      `in this pull request the name ${OWNER.name}, so use them only when every commit here is yours:`,
      '',
      `  git config user.name "${OWNER.name}" && git config user.email "${OWNER.email}"`,
      `  git rebase origin/${base} --exec "git commit --amend --no-edit --reset-author"`,
      '  git push --force-with-lease',
    )
  }
  if (problems.some((problem) => problem.kind === 'credit-in-commit' || problem.kind === 'name-in-commit')) {
    lines.push(
      '',
      'To take a Claude line or a name out of a commit message, run this, change "pick" to "reword" on that commit,',
      `save, then delete the line (or write ${OWNER.name} for the name) in the message that opens, and push again:`,
      '',
      `  git rebase -i origin/${base}`,
      '  git push --force-with-lease',
    )
  }
  if (problems.some((problem) => problem.kind === 'credit-in-text')) {
    lines.push(
      '',
      'To take a Claude line out of the pull request, open it on GitHub, press the pencil by the description (or',
      'the title), delete that line and save. This check then runs again by itself.',
    )
  }
  if (problems.some((problem) => problem.kind === 'last-line')) {
    lines.push(
      '',
      'To put the end right, open the pull request on GitHub and press the pencil by the description. There,',
      `make ${CREDIT_LINE} the last line (delete anything after it) and save. This check then runs again by itself.`,
    )
  }
  if (problems.some((problem) => problem.kind === 'name-in-text')) {
    lines.push(
      '',
      'To put the name right, open the pull request on GitHub, press the pencil by the description (or the title),',
      `write ${OWNER.name} where the other name is and save. This check then runs again by itself.`,
    )
  }
  return lines.join('\n')
}

// ---- Reading the pull request from GitHub ------------------------------------------------------------------

interface RawPerson {
  name?: string
  email?: string
}
interface RawCommit {
  sha: string
  commit: { author?: RawPerson | null; committer?: RawPerson | null; message: string }
  author?: { login: string } | null
  committer?: { login: string } | null
}

/** One GET from the GitHub API, as JSON. */
async function get(path: string, token: string): Promise<unknown> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${path}.`)
  return response.json()
}

function toPerson(raw: RawPerson | null | undefined, user: { login: string } | null | undefined): Person {
  return { name: raw?.name ?? '', email: raw?.email ?? '', login: user?.login ?? null }
}

/** The commits of a pull request, oldest first. GitHub lists at most 250 for one. */
async function readCommits(repo: string, number: string, token: string): Promise<CommitInfo[]> {
  const commits: CommitInfo[] = []
  for (let page = 1; page <= 3; page++) {
    const raw = (await get(
      `/repos/${repo}/pulls/${number}/commits?per_page=100&page=${page}`,
      token,
    )) as RawCommit[]
    for (const item of raw) {
      commits.push({
        sha: item.sha,
        author: toPerson(item.commit.author, item.author),
        committer: toPerson(item.commit.committer, item.committer),
        message: item.commit.message,
      })
    }
    if (raw.length < 100) break
  }
  return commits
}

/** Reads the pull request named by the environment, prints what is wrong, and fails the job if anything is. */
async function main(): Promise<void> {
  const { GITHUB_REPOSITORY: repo, PR_NUMBER: number, GH_TOKEN: token } = process.env
  if (repo === undefined || number === undefined || token === undefined) {
    throw new Error('GITHUB_REPOSITORY, PR_NUMBER and GH_TOKEN must be set.')
  }
  const pull = (await get(`/repos/${repo}/pulls/${number}`, token)) as {
    title: string
    body: string | null
    base: { ref: string }
    user: { login: string } | null
  }
  const commits = await readCommits(repo, number, token)
  const problems = findProblems(commits, pull.title, pull.body ?? '')
  const lastLine = checkLastLine(pull.body ?? '', pull.user?.login ?? null)
  if (lastLine !== null) problems.push(lastLine)
  if (problems.length === 0) {
    console.log(`All ${commits.length} commits and the pull request text are fine.`)
    return
  }
  console.error(explain(problems, pull.base.ref))
  process.exitCode = 1
}

// Run only when started from the command line, not when a test imports the checks above.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
