#!/usr/bin/env node
// Picks a change's lane from what it changes, never from anyone's confidence (docs/rules.md, "How work runs"). The
// merge session runs it on a pull request's head before merging (.claude/skills/merge-and-release/SKILL.md).
//
//   node .claude/tools/lane.mjs [--base origin/main]
//
//   contained   docs, tests, one feature folder: a green full run merges it
//   wide        shared code, formats, the public surface, CI and setup: also graphify_impact and the
//               affected callers' tests
//   standing    a test game's golden or recording that moves, or a deletion: the Owner's standing yes
//               (2026-11-16) covers it when the plan calls for it, so a green full run merges it, with that yes
//               quoted and a before-and-after note after
//   closed      a release, a migration, a new dependency, a change to the approval and permission rules
//               themselves: never opens without the Owner
//
// It prints the lane on the first line, one reason per line after it, and last `audit: needed` or `audit: not
// needed`: risk, not task count, calls for an implementation audit (docs/rules.md, "How to work"), so wide and closed
// changes get one and contained and standing ones don't. The paths cover every repo of the project.
// `laneOf` is exported for tests/agent/lane.test.ts. No dependencies, on purpose: it runs with Node alone.
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { globToRegExp } from './scope.mjs'

/**
 * The test games' goldens and recordings. Moving one is a choice the Owner gave a standing yes to (2026-11-16):
 * a revert brings it back, so it merges on green when the plan calls for it.
 */
const GOLDENS = ['tests/golden/**', 'template/replays/**', 'replays/**', '**/*.golden.*']

/** Changing or removing one of these can't be taken back by a revert alone: the Owner sees it first. */
const CLOSED = ['.changeset/**', '.github/workflows/release.yml', '**/migrations/**']

/**
 * The approval and permission rules themselves, judged by effect rather than file type: a change here changes what
 * may merge without the Owner, so the Owner sees it first (the Owner, 2026-11-16).
 */
const RULES = [
  'docs/rules.md',
  'docs/decisions.md',
  '.claude/tools/lane.mjs',
  '.claude/hooks/**',
  '.claude/settings.json',
  '.claude/skills/merge-and-release/**',
  'scripts/check-agent-rules.ts',
  'scripts/check-commit-authors.ts',
  '.github/workflows/agent-rules.yml',
  '.github/workflows/commit-authors.yml',
]

/** Why a change to the rules waits for the Owner. */
const RULE_CHANGE = 'changes the approval or permission rules'

/** Many callers read these, so a mistake here travels far. */
const WIDE = [
  'src/lib/**',
  'src/index.ts',
  'src/headless.ts',
  'src/server.ts',
  'src/cli.ts',
  'schemas/**',
  'template/**',
  'functions/**',
  'docs/api/**',
  'docs/formats/**',
  '.github/**',
  '.claude/tools/**',
  '.claude/workflow.json',
  'scripts/**',
  'tests/fixtures/**',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.pnpmfile.cjs',
  'biome.json',
  'knip.json',
  'tsconfig*.json',
  '*.config.*',
]

/** Removing old notes is moving finished work, not deleting anything a revert could not bring back. */
const MAY_DELETE = ['docs/superpowers/**']

/** Why a change to a closed file waits for the Owner. */
const MOVES = 'a golden, recording or release file moves'

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

const matches = (globs, file) => globs.some((glob) => globToRegExp(glob).test(file))

/** The dependency names in a package.json's text. */
function dependencies(text) {
  try {
    const json = JSON.parse(text)
    return new Set(DEPENDENCY_FIELDS.flatMap((field) => Object.keys(json[field] ?? {})))
  } catch {
    return new Set()
  }
}

/**
 * The lane for a change. `changes` is a list of { status, file } as `git diff --name-status` gives them (A, M, D;
 * a rename counts as a change to its new name); `packages` holds the root package.json before and after, or null.
 */
export function laneOf(changes, packages = null) {
  const closed = []
  const standing = []
  const wide = []
  for (const { status, file } of changes) {
    if (matches(RULES, file)) closed.push(`${file}: ${RULE_CHANGE}`)
    else if (matches(CLOSED, file) && status !== 'A') closed.push(`${file}: ${MOVES}`)
    else if (matches(GOLDENS, file) && status !== 'A') standing.push(`${file}: ${MOVES}`)
    else if (status === 'D' && !matches(MAY_DELETE, file)) standing.push(`${file}: deleted`)
    else if (matches(WIDE, file)) wide.push(`${file}: shared by many callers`)
  }
  if (packages) {
    const before = dependencies(packages.before)
    const added = [...dependencies(packages.after)].filter((name) => !before.has(name))
    for (const name of added) closed.push(`${name}: a new dependency`)
  }
  const folders = changes.map(({ file }) => /^src\/features\/([^/]+)\//.exec(file)?.[1])
  const features = new Set(folders.filter(Boolean))
  if (features.size > 1) wide.push(`${features.size} feature folders: ${[...features].join(', ')}`)
  if (closed.length > 0) return { lane: 'closed', reasons: [...closed, ...standing], audit: true }
  if (standing.length > 0) return { lane: 'standing', reasons: standing, audit: wide.length > 0 }
  if (wide.length > 0) return { lane: 'wide', reasons: wide, audit: true }
  return { lane: 'contained', reasons: ['docs, tests or one feature folder only'], audit: false }
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
}

/** The root package.json at a commit, or an empty object when it has none. */
function packageAt(ref) {
  try {
    return git(['show', `${ref}:package.json`])
  } catch {
    return '{}'
  }
}

function main(args) {
  const at = args.indexOf('--base')
  const base = at >= 0 && args[at + 1] ? args[at + 1] : 'origin/main'
  const fork = git(['merge-base', base, 'HEAD']).trim()
  const lines = git(['diff', '--name-status', '-M', `${fork}...HEAD`])
    .split('\n')
    .filter(Boolean)
  const changes = lines.map((line) => {
    const [status = 'M', ...files] = line.split('\t')
    const kind = status.charAt(0)
    return { status: kind === 'R' ? 'M' : kind, file: files.at(-1) ?? '' }
  })
  return laneOf(changes, { before: packageAt(fork), after: packageAt('HEAD') })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { lane, reasons, audit } = main(process.argv.slice(2))
  const lines = [lane, ...reasons.map((reason) => `- ${reason}`), `audit: ${audit ? 'needed' : 'not needed'}`]
  process.stdout.write(`${lines.join('\n')}\n`)
}
