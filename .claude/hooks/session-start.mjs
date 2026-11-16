#!/usr/bin/env node
// The SessionStart hook. Claude Code runs it when a session opens in this repo, and adds what it prints to the
// session's context. Run it by hand (`node .claude/hooks/session-start.mjs`) when a session opened somewhere else.
//
// 1. Sets git's identity to the Owner's: globally in a cloud session, whose settings reset; in this repo otherwise.
// 2. Points git's `core.hooksPath` at .claude/hooks/git in this repo, and in a cloud session in the project's other
//    clones beside it too, so every commit passes the identity, credit and scope checks in git.mjs.
// 3. Prints the few things a session must do first.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { OWNER } from './git.mjs'

/** The project's repos: the framework, its examples, editors and site, and the private notes. */
const PROJECT = /github\.com[/:]mcthaydt\/automata(framework(examples|editors|site)?|private)(\.git)?$/i

const here = dirname(fileURLToPath(import.meta.url))
const hooks = join(here, 'git')
const root = resolve(here, '..', '..')
const cloud = process.env.CLAUDE_CODE_REMOTE === 'true'

function git(dir, args) {
  const options = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  return execFileSync('git', ['-C', dir, ...args], options).trim()
}

/** Whether `dir` is a clone of one of the project's repos. */
function isProject(dir) {
  try {
    return existsSync(join(dir, '.git')) && PROJECT.test(git(dir, ['remote', 'get-url', 'origin']))
  } catch {
    return false
  }
}

const scope = cloud ? '--global' : '--local'
git(root, ['config', scope, 'user.name', OWNER.name])
git(root, ['config', scope, 'user.email', OWNER.email])

const parent = dirname(root)
const siblings = cloud ? readdirSync(parent).map((name) => join(parent, name)) : []
const clones = [root, ...siblings.filter((dir) => dir !== root && isProject(dir))]
for (const dir of clones) git(dir, ['config', '--local', 'core.hooksPath', hooks])

const lines = [
  `Git: commits are McThayDT's, and the git hooks are on in ${clones.length} clone(s).`,
  'First: turn on the caveman skill (/caveman) for notes and reports; code, docs and commits stay plain.',
  'The shared rules are AutomataFramework docs/rules.md; workflow steps are skills in its .claude/skills/.',
]
process.stdout.write(`${lines.join('\n')}\n`)
