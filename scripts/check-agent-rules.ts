// The rules of docs/rules.md that a program can check about the repo's own words and agent setup. Run by the
// `agent-rules` workflow on every pull request, with Node alone, so it holds on a docs-only change too.
//
//   - CLAUDE.md and docs/rules.md, which every session reads first, stay under 200 lines together, and CLAUDE.md
//     imports the rules page.
//   - No rule, decision or skill names an effort above high (the hooks' code may, to refuse it).
//   - Every skill under .claude/skills/ has the name of its folder and a description, which is how it loads.
//   - Every hook command in .claude/settings.json names a file that exists.
//   - No tracked file names a real demo game. They are private; the names are kept here only as hashes.
//
// This file has no dependencies on purpose. `problems` is exported for tests/scripts/check-agent-rules.test.ts.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** What every session reads first must stay short (the Owner, 2026-11-16). */
export const MAX_START_LINES = 200

/** The SHA-256 of each private name, in lower case, its words joined by one space or by none. */
export const PRIVATE_NAMES: readonly string[] = [
  'deebca3b8dbed33e218276d9d87de63ca952efa2ccd5213c9fcef691f81467f3',
  '6ae2db2cfb131d92925c6009abe22f32c8a928acb8d52b7eabc3c67ed2882855',
  'f603a3215a4f5b452e4012c6672c6c5fabfe2d12b97dcd22f1659787e288b567',
]

/** Reads a tracked file's text, or null when it is missing or not text. */
export type Read = (path: string) => string | null

const sha = (text: string): string => createHash('sha256').update(text).digest('hex')

/** Whether any word, or any two words side by side, of `text` hashes to one of `hashes`. */
export function namesPrivate(text: string, hashes: readonly string[] = PRIVATE_NAMES): boolean {
  const words = text
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter(Boolean)
  return words.some((word, i) => {
    const next = words[i + 1]
    const forms = next === undefined ? [word] : [word, `${word} ${next}`, `${word}${next}`]
    return forms.some((form) => hashes.includes(sha(form)))
  })
}

/** The skill's `name` and `description` from its front matter. */
function frontMatter(text: string): Record<string, string> {
  const block = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? ''
  const pairs = block.split('\n').map((line) => /^(\w+):\s*(.*)$/.exec(line))
  const found = pairs.filter((pair) => pair !== null)
  return Object.fromEntries(found.map((pair) => [pair[1] ?? '', pair[2] ?? '']))
}

/** Every problem with the repo's files, as plain sentences. `files` is every tracked path. */
export function problems(files: readonly string[], read: Read, hashes = PRIVATE_NAMES): string[] {
  const found: string[] = []
  const claude = read('CLAUDE.md') ?? ''
  const rules = read('docs/rules.md') ?? ''
  const lines = claude.split('\n').length + rules.split('\n').length - 2
  if (lines > MAX_START_LINES) {
    found.push(`CLAUDE.md and docs/rules.md are ${lines} lines together; keep them under ${MAX_START_LINES}.`)
  }
  if (!/^@docs\/rules\.md$/m.test(claude)) {
    found.push('CLAUDE.md must import the rules page: a line `@docs/rules.md`.')
  }

  const skills = files.filter((f) => f.startsWith('.claude/') && f.endsWith('.md'))
  for (const path of ['CLAUDE.md', 'docs/rules.md', 'docs/decisions.md', ...skills]) {
    if (/\bxhigh\b/i.test(read(path) ?? '')) {
      found.push(`${path} names an effort above high; no session runs above high.`)
    }
  }

  for (const path of files.filter((f) => /^\.claude\/skills\/[^/]+\/SKILL\.md$/.test(f))) {
    const meta = frontMatter(read(path) ?? '')
    const folder = path.split('/')[2]
    if (meta.name !== folder) found.push(`${path}: its front matter's name must be \`${folder}\`.`)
    if (!meta.description) found.push(`${path}: its front matter needs a description, which is how it loads.`)
  }

  const settings = read('.claude/settings.json')
  if (settings !== null) {
    for (const [, path] of settings.matchAll(/\$CLAUDE_PROJECT_DIR\/([\w./-]+)/g)) {
      if (path !== undefined && !files.includes(path)) {
        found.push(`.claude/settings.json runs ${path}, which is missing.`)
      }
    }
  }

  for (const path of files) {
    const text = read(path)
    if (text !== null && namesPrivate(text, hashes)) {
      found.push(`${path} names a private demo game. Take it out.`)
    }
  }
  return found
}

function main(): void {
  const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)
  const read: Read = (path) => {
    try {
      const bytes = readFileSync(path)
      return bytes.includes(0) ? null : bytes.toString('utf8')
    } catch {
      return null
    }
  }
  const found = problems(files, read)
  if (found.length === 0) {
    console.log(`The agent rules hold across ${files.length} files.`)
    return
  }
  console.error(found.map((line) => `- ${line}`).join('\n'))
  process.exitCode = 1
}

// Run only when started from the command line, not when a test imports the checks above.
if (process.argv[1] === fileURLToPath(import.meta.url)) main()
