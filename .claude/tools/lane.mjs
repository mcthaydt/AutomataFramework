#!/usr/bin/env node
// Picks a change's lane from what it changes, never from anyone's confidence (docs/rules.md, "How work runs"). The
// merge session runs it on a pull request's head before merging (.claude/skills/merge-and-release/SKILL.md).
//
//   node .claude/tools/lane.mjs [--base origin/main]
//
//   contained   docs, tests, one feature folder: a green full run merges it
//   wide        shared code, formats, the public surface, CI and setup, the rules: also graphify_impact and the
//               affected callers' tests
//   closed      a golden or recording that moves, a deletion, a release, a migration, a new dependency: never
//               opens without the Owner
//
// It prints the lane on the first line and one reason per line after it. The paths cover every repo of the project.
// `laneOf` is exported for tests/agent/lane.test.ts. No dependencies, on purpose: it runs with Node alone.
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { globToRegExp } from './scope.mjs'

/** Changing or removing one of these can't be taken back by a revert alone: the Owner sees it first. */
const CLOSED = [
  'tests/golden/**',
  'template/replays/**',
  'replays/**',
  '**/*.golden.*',
  '.changeset/**',
  '.github/workflows/release.yml',
  '**/migrations/**',
]

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
  'docs/rules.md',
  'docs/decisions.md',
  '.github/**',
  '.claude/hooks/**',
  '.claude/tools/**',
  '.claude/settings.json',
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
  const wide = []
  for (const { status, file } of changes) {
    if (matches(CLOSED, file) && status !== 'A') closed.push(`${file}: ${MOVES}`)
    else if (status === 'D' && !matches(MAY_DELETE, file)) closed.push(`${file}: deleted`)
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
  if (closed.length > 0) return { lane: 'closed', reasons: closed }
  if (wide.length > 0) return { lane: 'wide', reasons: wide }
  return { lane: 'contained', reasons: ['docs, tests or one feature folder only'] }
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
  const lines = git(['diff', '--name-status', '-M', `${fork}...HEAD`]).split('\n').filter(Boolean)
  const changes = lines.map((line) => {
    const [status = 'M', ...files] = line.split('\t')
    const kind = status.charAt(0)
    return { status: kind === 'R' ? 'M' : kind, file: files.at(-1) ?? '' }
  })
  return laneOf(changes, { before: packageAt(fork), after: packageAt('HEAD') })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { lane, reasons } = main(process.argv.slice(2))
  process.stdout.write(`${lane}\n${reasons.map((reason) => `- ${reason}`).join('\n')}\n`)
}
