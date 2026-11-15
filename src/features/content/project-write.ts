// The one way a program adds a file to `automata.toml`. A person writes that file by hand, with comments and their own
// line ends, so this never reads it into a value and prints it again: it adds one `[[content]]` block at the end and
// leaves every byte that was there where it was. `automata add`, an agent's `add` tool and the editors all call it,
// so a file listed by any of them is listed the same way.
import { CONTENT_TYPES } from './content-types.ts'
import type { Diagnostic } from './diagnostics.ts'
import type { Parsed } from './parse.ts'
import { type FolderRef, PATH_HINT, PROJECT_FILE, parseProject } from './project.ts'
import { isGamePath, list } from './shared.ts'

/** The file to list: any kind and path are accepted here and refused with a sentence, so a command can pass what it was typed. */
export interface ListedFile {
  readonly type: string
  readonly path: string
}

const refuse = (message: string): Parsed<string> => ({
  ok: false,
  diagnostics: [{ file: PROJECT_FILE, path: '', message }],
})

/** A `[[content]]` block line, written the way the file lists its files (`[[ content ]]` is the same line to TOML). */
const BLOCK_LINE = /^[ \t]*\[\[[ \t]*content[ \t]*\]\]/m

/** The line end the text already uses: the first one it has, or `\n` for a text with none. */
const lineEndOf = (text: string): string => /\r?\n/.exec(text)?.[0] ?? '\n'

/** A note may hold any text on one line: a line break, or a control character TOML refuses in a comment, may not. */
function badNote(note: string): boolean {
  for (let i = 0; i < note.length; i++) {
    const code = note.charCodeAt(i)
    if ((code < 32 && code !== 9) || code === 127) return true
  }
  return false
}

/**
 * `text` (an `automata.toml`) with `entry` listed at the end, or what is wrong. `about` is one line of words written
 * above the block as a `#` comment, the way `automata create` writes its blocks. Text that already lists the file is
 * given back as it is. Never throws; the answer has been read again and lists `entry` last.
 */
export function listContent(text: string, entry: ListedFile, about?: string): Parsed<string> {
  const project = parseProject(text)
  if (!project.ok) return project

  const problems: Diagnostic[] = []
  if (!Object.hasOwn(CONTENT_TYPES, entry.type))
    problems.push({
      file: PROJECT_FILE,
      path: '',
      message: `There is no kind of file called "${entry.type}". The kinds are: ${list(Object.keys(CONTENT_TYPES))}.`,
    })
  if (!isGamePath(entry.path, '.json')) problems.push({ file: PROJECT_FILE, path: '', message: PATH_HINT })
  if (about !== undefined && badNote(about))
    problems.push({
      file: PROJECT_FILE,
      path: '',
      message: 'Write the note on one line, with no line break in it.',
    })
  if (problems.length > 0) return { ok: false, diagnostics: problems }

  const listed = project.value.content.find((ref) => ref.path === entry.path)
  if (listed !== undefined)
    return listed.type === entry.type
      ? { ok: true, value: text }
      : refuse(`${entry.path} is already listed as a ${listed.type}, not a ${entry.type}.`)
  // A file directly inside a folder the project lists for this kind is already part of the game.
  const folder = entry.path.slice(0, Math.max(0, entry.path.lastIndexOf('/')))
  if (project.value.folders?.some((ref) => ref.type === entry.type && ref.folder === folder))
    return { ok: true, value: text }

  const block = `{ type = ${JSON.stringify(entry.type)}, path = ${JSON.stringify(entry.path)} }`
  if (!BLOCK_LINE.test(text))
    return refuse(
      `This automata.toml lists its files in one "content = […]" value. Add this file there by hand: ${block}.`,
    )

  const eol = lineEndOf(text)
  // The text must end in a line end and then one blank line; take what it already has into account, and add the rest.
  const ending = /(?:\r?\n)*$/.exec(text)?.[0] ?? ''
  const lineEnds = ending === '' ? 0 : ending.split('\n').length - 1
  const lead = eol.repeat(Math.max(0, 2 - lineEnds))
  const note = about === undefined || about === '' ? '' : `# ${about}${eol}`
  const next = `${text}${lead}${note}[[content]]${eol}type = ${JSON.stringify(entry.type)}${eol}path = ${JSON.stringify(entry.path)}${eol}`

  // The promise of the function, kept by looking: the answer reads, and this file is the last one it lists.
  const again = parseProject(next)
  const last = again.ok ? again.value.content.at(-1) : undefined
  const kept =
    again.ok &&
    last?.type === entry.type &&
    last.path === entry.path &&
    again.value.content.length === project.value.content.length + 1
  if (!kept)
    return refuse(
      `This automata.toml could not take the new block as it is written. Add this file by hand: ${block}.`,
    )
  return { ok: true, value: next }
}

/** Two folder lines are the same when they name one kind and one place. */
const sameFolder = (a: FolderRef, b: FolderRef): boolean => a.type === b.type && a.folder === b.folder

/**
 * `text` (an `automata.toml`) with a `[[content]]` folder block added at its end for each ref it does not already list,
 * each after one blank line. The same text back when it lists them all, and when it is not valid TOML or lists its files
 * in one `content = […]` value (a block cannot be added to that). Comments, blank lines and the line ends the text uses
 * are left as they are. The Sound and Feel editors and `automata` all call this, so a folder is listed the same way by
 * each.
 */
export function withFolders(text: string, refs: readonly FolderRef[]): string {
  const project = parseProject(text)
  if (!project.ok) return text
  const have = project.value.folders ?? []
  const fresh = refs.filter(
    (ref, i) => !have.some((h) => sameFolder(h, ref)) && refs.findIndex((r) => sameFolder(r, ref)) === i,
  )
  if (fresh.length === 0) return text
  const eol = lineEndOf(text)
  const ending = /(?:\r?\n)*$/.exec(text)?.[0] ?? ''
  const lineEnds = ending === '' ? 0 : ending.split('\n').length - 1
  let next = `${text}${eol.repeat(Math.max(0, 2 - lineEnds))}`
  fresh.forEach((ref, i) => {
    next += `${i === 0 ? '' : eol}[[content]]${eol}type = ${JSON.stringify(ref.type)}${eol}folder = ${JSON.stringify(ref.folder)}${eol}`
  })
  // The promise, kept by looking: the answer reads, and every new folder is in it.
  const again = parseProject(next)
  return again.ok && (again.value.folders?.length ?? 0) === have.length + fresh.length ? next : text
}
