// Runs the sessions' hooks and tools (.claude/) the way Claude Code and git run them: as Node programs, in a git repo
// made for the test. They are plain JavaScript with no types, so the tests drive them from outside.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT: string = fileURLToPath(new URL('../../', import.meta.url))
export const OWNER: string[] = [
  '-c',
  'user.name=McThayDT',
  '-c',
  'user.email=107786093+mcthaydt@users.noreply.github.com',
]

/** What a program printed and how it ended. */
export interface Ran {
  status: number | null
  stdout: string
  stderr: string
}

/** Where a program runs, and what it reads on stdin. */
export interface Options {
  cwd?: string
  input?: string
}

/** Runs one of `.claude/`'s programs with Node. */
export function node(script: string, args: string[] = [], options: Options = {}): Ran {
  const result = spawnSync('node', [join(ROOT, script), ...args], {
    cwd: options.cwd ?? ROOT,
    input: options.input ?? '',
    encoding: 'utf8',
  })
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

/** Runs git in `dir`, and returns what it printed. */
export function git(dir: string, args: string[]): string {
  return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

/** A new git repo with one commit by the Owner, and the given files written but not added. */
export function repo(files: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'agent-'))
  git(dir, ['init', '-q', '-b', 'main'])
  git(dir, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(dir, 'README.md'), 'A test repo.\n')
  git(dir, ['add', '.'])
  git(dir, [...OWNER, 'commit', '-q', '-m', 'first'])
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
  return dir
}
