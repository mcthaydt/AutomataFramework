#!/usr/bin/env node
// The PreToolUse hook. Claude Code hands it each tool call as JSON on stdin; exit code 2 refuses the call and shows
// the reason to the session. Every rule here is a rule of docs/rules.md that a program can check, so it holds even
// when a session forgets the rule. `judge` is exported for tests/agent/guard.test.ts.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inScope, readState, repoRoot } from '../tools/scope.mjs'
import { hasCredit } from './git.mjs'

/** What to do instead of forcing a push. */
const REPLACE = 'Push a new branch and open a replacement pull request instead.'

/** What to do instead of a whole suite locally. */
const TARGET = 'Name the test file or folder to run it here, or push and wait for CI.'

/** What to do when a fix needs a file outside its scope. */
const NEW_FINDING =
  'A fix that needs it is a new finding: add it and start it on its own, or end this one with scope.mjs done.'

/** Commands that run a test suite. Locally they must name what they test; a whole suite runs in GitHub-hosted CI. */
const TEST_RUNNERS = [
  /^(npx |pnpm (exec |dlx )?|bunx )?vitest(\s|$)/,
  /^(npx |pnpm (exec |dlx )?)?playwright test(\s|$)/,
  /^pnpm (run )?test[\w:-]*(\s|$)/,
  /^npm (run )?test(\s|$)/,
  /^node --run test[\w:-]*(\s|$)/,
]

/** Commands that run every check at once: always CI's job. */
const WHOLE_CHECKS = [/^pnpm (run )?check(\s|$)/, /^node --run check(\s|$)/]

/** Whether a test command names a test file or folder, so it runs only what it names. */
const targeted = (command) => command.split(/\s+/).some((word) => /\/|\.(test|spec)\./.test(word))

/** Whether a command runs a whole suite: a test runner that names no test, or every check at once. */
function wholeSuite(command) {
  if (WHOLE_CHECKS.some((pattern) => pattern.test(command))) return true
  return TEST_RUNNERS.some((pattern) => pattern.test(command)) && !targeted(command)
}

/**
 * A shell command line cut into the commands it runs, each without its leading `NAME=value` settings. Heredoc bodies
 * and quoted strings are taken out first, so a commit message that mentions a command never counts as running it.
 */
function commands(line) {
  return line
    .replace(/<<-?\s*['"]?(\w+)['"]?[^\n]*\n[\s\S]*?\n\s*\1(?=\n|$)/g, '')
    .replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, '""')
    .split(/&&|\|\||[;|\n]/)
    .map((part) => part.trim().replace(/^(\w+=\S*\s+)+/, ''))
    .filter(Boolean)
}

/** Whether a `git ... push ...` command forces: `--force`, `--force-with-lease`, a short flag with `f`, or `+ref`. */
function forcesPush(command) {
  const words = command.split(/\s+/)
  if (words[0] !== 'git') return false
  let i = 1
  while (words[i]?.startsWith('-')) i += ['-C', '-c'].includes(words[i]) ? 2 : 1
  if (words[i] !== 'push') return false
  const forces = (word) => /^--force(-with-lease)?(=|$)/.test(word) || /^-[a-z]*f[a-z]*$/i.test(word)
  return words.slice(i + 1).some((word) => forces(word) || word.startsWith('+'))
}

/** Every `effort`-like setting in a tool's input that asks for more than high. */
function tooMuchEffort(name, input) {
  const found = []
  const walk = (value, key) => {
    if (typeof value === 'string') {
      const effortKey = /effort/i.test(key) || /effort/i.test(name)
      if (effortKey && /^(xhigh|max)$/i.test(value)) found.push(value)
      if (key === 'script' && /effort\s*:\s*['"](xhigh|max)['"]/i.test(value)) found.push('a workflow agent')
    } else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(v, k)
    }
  }
  walk(input, '')
  return found
}

/** The file an edit tool writes, if it is one. */
const editedFile = (input) => input.file_path ?? input.notebook_path ?? null

/** The nearest folder of `file` that exists, so a new file's repo can be found. */
function existingDir(file) {
  let dir = dirname(file)
  while (!existsSync(dir) && dir !== dirname(dir)) dir = dirname(dir)
  return dir
}

/** Why this call is refused, or null when it may run. */
export function judge({ tool_name: name = '', tool_input: input = {}, cwd = process.cwd() }) {
  if (name === 'Bash') {
    for (const command of commands(input.command ?? '')) {
      if (forcesPush(command)) return `Never force-push (docs/rules.md). ${REPLACE}`
      if (wholeSuite(command)) {
        return `Whole suites run in GitHub-hosted CI (docs/rules.md): \`${command}\`. ${TARGET}`
      }
    }
  }
  if (/^mcp__github__/.test(name)) {
    const texts = [input.title, input.body, input.message]
    const words = texts.filter((text) => typeof text === 'string').join('\n')
    if (hasCredit(words)) {
      return 'No AI attribution in commits or pull requests (docs/rules.md). Take the Claude credit line out.'
    }
  }
  const effort = tooMuchEffort(name, input)
  if (effort.length > 0) {
    return `Effort is low, medium or high, never above (docs/rules.md); this asked for ${effort.join(', ')}.`
  }
  const file = editedFile(input)
  if (file && /^(Edit|MultiEdit|Write|NotebookEdit)$/.test(name)) {
    const path = resolve(cwd, file)
    const root = repoRoot(existingDir(path))
    if (root) {
      const { active } = readState(root)
      const inRepo = relative(root, path).split('\\').join('/')
      if (!inScope(active, inRepo)) {
        const scope = `${active.id} (${active.files.join(', ')})`
        return `${inRepo} is outside the scope of ${scope}. ${NEW_FINDING}`
      }
    }
  }
  return null
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let call = {}
  try {
    call = JSON.parse(readFileSync(0, 'utf8'))
  } catch {
    // Not a tool call: nothing to judge.
  }
  const reason = judge(call)
  if (reason) {
    process.stderr.write(`${reason}\n`)
    process.exitCode = 2
  }
}
