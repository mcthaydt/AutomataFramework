#!/usr/bin/env node
// The git hooks' checks, run by the small scripts in .claude/hooks/git/ once session-start.mjs has pointed git's
// `core.hooksPath` at them. A non-zero exit stops the commit, and git shows what this prints.
//
//   pre-commit           the author and the committer are exactly the Owner (docs/rules.md, "One author"), and every
//                        staged file is inside the active scope (.claude/tools/scope.mjs), when there is one
//   commit-msg <file>    the message carries no Claude credit (docs/rules.md, "No AI attribution")
//
// `problems` is exported for tests/agent/git.test.ts.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inScope, readState, repoRoot } from '../tools/scope.mjs'

/** The one identity every commit carries. */
export const OWNER = { name: 'McThayDT', email: '107786093+mcthaydt@users.noreply.github.com' }

/** How to put the identity back; cloud sessions lose it. */
export const FIX =
  'git config --global user.name "McThayDT" && git config --global user.email "107786093+mcthaydt@users.noreply.github.com"'

/**
 * A Claude credit, matched as a line of its own the way scripts/check-commit-authors.ts matches it, so a sentence
 * that only talks about credits is let through.
 */
export const CREDIT = [
  /^\s*co-authored-by:.*\b(claude|anthropic)\b/im,
  /^\s*claude-session:/im,
  /^[^\p{L}\p{N}]*(generated|created|made|written|authored) (with|by) \[?claude\b/imu,
]

/** Whether a commit message or pull request text carries a Claude credit. */
export const hasCredit = (text) => CREDIT.some((pattern) => pattern.test(text))

/** Name and email from a git identity line, `Name <email> 1700000000 +0000`. */
export function person(ident) {
  const match = /^(.*) <([^>]*)>/.exec(ident.trim())
  return match ? { name: match[1], email: match[2] } : { name: ident.trim(), email: '' }
}

const isOwner = ({ name, email }) => name === OWNER.name && email.toLowerCase() === OWNER.email

/** What is wrong with a commit about to be made, as plain sentences; empty when nothing is. */
export function problems({ author, committer, staged = [], active = null, message = null }) {
  const found = []
  for (const [role, who] of Object.entries({ author, committer })) {
    if (who && !isOwner(who)) {
      found.push(`The ${role} is ${who.name} <${who.email}>, not McThayDT. Fix: ${FIX}`)
    }
  }
  const outside = staged.filter((file) => !inScope(active, file))
  if (outside.length > 0) found.push(`Outside the scope of ${active.id}: ${outside.join(', ')}`)
  if (message !== null && hasCredit(message)) {
    found.push('The message has a Claude credit line. Take it out.')
  }
  return found
}

const git = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })

function main([hook, file]) {
  const root = repoRoot(process.cwd()) ?? process.cwd()
  if (hook === 'pre-commit') {
    return problems({
      author: person(git(['var', 'GIT_AUTHOR_IDENT'])),
      committer: person(git(['var', 'GIT_COMMITTER_IDENT'])),
      staged: git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean),
      active: readState(root).active,
    })
  }
  if (hook === 'commit-msg') return problems({ message: readFileSync(file, 'utf8') })
  return []
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const found = main(process.argv.slice(2))
  if (found.length > 0) {
    process.stderr.write(`Commit refused:\n${found.map((line) => `- ${line}`).join('\n')}\n`)
    process.exitCode = 1
  }
}
