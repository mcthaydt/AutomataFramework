// Paints a game's pictures: the one picture and atlas each figure and backdrop makes, written beside its file. The same
// functions `automata check` judges them with, so a person on the command line and an agent make the same bytes.
//
//   node scripts/art.ts <game folder>          paints what is missing or old, and says which
//   node scripts/art.ts <game folder> --check  paints nothing; says what is missing or old, and exits 1 if anything is
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { artFiles, artProblems, formatDiagnostic, loadGame } from '../src/features/content/content.ts'

/** Where the script says things; the test gives its own, the command line gives the console. */
export interface Io {
  readonly out: (line: string) => void
  readonly err: (line: string) => void
}

/** A file's bytes, or `undefined` when there is no such file. */
async function bytesOf(path: string): Promise<Uint8Array | undefined> {
  try {
    return await readFile(path)
  } catch {
    return undefined
  }
}

/** True when two files hold the same bytes. */
function same(a: Uint8Array | undefined, b: Uint8Array): boolean {
  return a !== undefined && a.length === b.length && a.every((byte, i) => byte === b[i])
}

/** Runs the command and gives the exit code: 0 when all is well, 1 when the game does not load or art is missing. */
export async function main(args: readonly string[], io: Io): Promise<number> {
  const check = args.includes('--check')
  const folder = args.find((arg) => !arg.startsWith('--')) ?? '.'
  const loaded = await loadGame((path) => readFile(join(folder, path), 'utf8'))
  if (!loaded.ok) {
    for (const diagnostic of loaded.diagnostics) io.err(formatDiagnostic(diagnostic))
    io.err('The game does not load, so nothing was painted. Fix the problems above, then run this again.')
    return 1
  }
  const read = async (path: string): Promise<Uint8Array | undefined> => bytesOf(join(folder, path))
  if (!check) {
    let painted = 0
    for (const file of artFiles(loaded.value)) {
      if (same(await read(file.path), file.bytes)) continue
      await mkdir(dirname(join(folder, file.path)), { recursive: true })
      await writeFile(join(folder, file.path), file.bytes)
      io.out(`Painted ${file.path}`)
      painted++
    }
    if (painted === 0) io.out('Every picture is already painted and up to date.')
  }
  const problems = await artProblems(loaded.value, read)
  for (const problem of problems) io.err(formatDiagnostic(problem))
  if (check && problems.length === 0) io.out('Every picture is painted and up to date.')
  return problems.length === 0 ? 0 : 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2), { out: (line) => console.log(line), err: (line) => console.error(line) })
    .then((code) => {
      process.exitCode = code
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    })
}
