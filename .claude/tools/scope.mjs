#!/usr/bin/env node
// Holds a session to one finding's (or one task's) files, and counts its tries: the fix loop of the review graph
// (.claude/skills/review-graph/SKILL.md). The state is `.claude/scope.json` at the top of the repo, which git ignores.
//
//   node .claude/tools/scope.mjs start <id> <file or glob>...   name the files and count a try (one past fixTries is refused)
//   node .claude/tools/scope.mjs done                            end the active one (its tries are kept)
//   node .claude/tools/scope.mjs check                           fail if a file outside the scope changed since start
//   node .claude/tools/scope.mjs show                            print the state
//
// While one is active, the guard hook refuses an edit outside it and the pre-commit hook refuses a commit of one.
// The functions are exported for those hooks and for tests/agent/scope.test.ts. No dependencies, on purpose: it runs
// with Node alone, in any repo of the project.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The operating numbers of docs/rules.md (.claude/workflow.json), read beside this file. */
const SETTINGS = JSON.parse(readFileSync(new URL('../workflow.json', import.meta.url), 'utf8'))

/** A unit that fails its corrections has a problem in the plan that made it, which the loop cannot see. */
export const MAX_TRIES = SETTINGS.fixTries

/** Files any active scope may change: its state, the tracker, the reports and the constraints (the learning edge). */
export const ALWAYS = [
  '.claude/scope.json',
  'docs/superpowers/progress.md',
  'docs/superpowers/audits/**',
  'docs/constraints.md',
]

/** The top of the git repo that holds `dir`, or null outside one. */
export function repoRoot(dir) {
  try {
    return git(dir, ['rev-parse', '--show-toplevel']).trim()
  } catch {
    return null
  }
}

function git(dir, args) {
  return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
}

const statePath = (root) => join(root, '.claude', 'scope.json')

/** The repo's scope state: how many tries each id has had, and the active one, if any. */
export function readState(root) {
  try {
    return JSON.parse(readFileSync(statePath(root), 'utf8'))
  } catch {
    return { tries: {}, active: null }
  }
}

function writeState(root, state) {
  mkdirSync(join(root, '.claude'), { recursive: true })
  writeFileSync(statePath(root), `${JSON.stringify(state, null, 2)}\n`)
}

/** What a stuck report holds (the shape is in the review graph skill). */
const STUCK = 'unit, verdict, reason, evidence, scope. The plan needs a look, not a fourth try.'

/** A glob as a regular expression: `**` crosses folders, `*` and `?` stay inside one. */
export function globToRegExp(glob) {
  let pattern = ''
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i]
    if (glob.startsWith('**/', i)) {
      pattern += '(?:.*/)?'
      i += 2
    } else if (glob.startsWith('**', i)) {
      pattern += '.*'
      i += 1
    } else if (char === '*') pattern += '[^/]*'
    else if (char === '?') pattern += '[^/]'
    else pattern += char.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${pattern}$`)
}

/** Whether a repo-relative path (forward slashes) is inside the active scope. With none active, everything is. */
export function inScope(active, file) {
  if (!active) return true
  return [...active.files, ...ALWAYS].some((glob) => globToRegExp(glob).test(file))
}

/** Start (or start again) one id. Returns the message to print, and whether it was refused. */
export function start(root, id, files) {
  const state = readState(root)
  if (!id || files.length === 0) return { ok: false, message: 'Usage: start <id> <file or glob>...' }
  if (state.active && state.active.id !== id) {
    const message = `${state.active.id} is still active. Finish it first: node .claude/tools/scope.mjs done`
    return { ok: false, message }
  }
  const tries = (state.tries[id] ?? 0) + 1
  if (tries > MAX_TRIES) {
    const message = `${id} has had ${MAX_TRIES} tries. Report it as stuck and go on: ${STUCK}`
    return { ok: false, message }
  }
  const base = git(root, ['rev-parse', 'HEAD']).trim()
  writeState(root, { tries: { ...state.tries, [id]: tries }, active: { id, files, base } })
  return { ok: true, message: `${id}: try ${tries} of ${MAX_TRIES}. Scope: ${files.join(', ')}` }
}

/** End the active id; its tries stay counted, so a red check that sends it back starts at the next try. */
export function done(root) {
  const state = readState(root)
  if (!state.active) return { ok: true, message: 'Nothing is active.' }
  writeState(root, { ...state, active: null })
  return { ok: true, message: `${state.active.id} done.` }
}

/** The files changed since the active id started, committed or not, that are outside its scope. */
export function outside(root) {
  const { active } = readState(root)
  if (!active) return []
  const lists = [
    git(root, ['diff', '--name-only', `${active.base}...HEAD`]),
    git(root, ['diff', '--name-only', 'HEAD']),
    git(root, ['ls-files', '--others', '--exclude-standard']),
  ]
  const changed = new Set(lists.join('\n').split('\n').filter(Boolean))
  return [...changed].filter((file) => !inScope(active, file))
}

function main([command, ...rest]) {
  const root = repoRoot(process.cwd())
  if (!root) return { ok: false, message: 'Run this inside a git repo.' }
  if (command === 'start') return start(root, rest[0], rest.slice(1))
  if (command === 'done') return done(root)
  if (command === 'show') return { ok: true, message: JSON.stringify(readState(root), null, 2) }
  if (command === 'check') {
    const files = outside(root)
    if (files.length === 0) return { ok: true, message: 'Every changed file is inside the scope.' }
    return { ok: false, message: `Outside the scope of ${readState(root).active.id}:\n${files.join('\n')}` }
  }
  if (command === 'clear') {
    rmSync(statePath(root), { force: true })
    return { ok: true, message: 'Scope state cleared.' }
  }
  return { ok: false, message: 'Usage: scope.mjs start <id> <files...> | done | check | show | clear' }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = main(process.argv.slice(2))
  const out = result.ok ? process.stdout : process.stderr
  out.write(`${result.message}\n`)
  process.exitCode = result.ok ? 0 : 1
}
