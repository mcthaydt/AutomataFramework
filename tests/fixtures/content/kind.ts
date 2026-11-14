// Helpers every kind's test uses, so each test reads as the sentences it checks and nothing else.
import { expect } from 'vitest'
import {
  type ContentType,
  formatDiagnostic,
  loadGame,
  parseContent,
  writeContent,
} from '#src/features/content/content.ts'

/** What a person reads when this value is a file of `type`: one sentence per problem, none when it is fine. */
export function problemsOf(type: ContentType, value: unknown, file = `content/x/${type}.json`): string[] {
  const parsed = parseContent(type, JSON.stringify(value), file)
  return parsed.ok ? [] : parsed.diagnostics.map(formatDiagnostic)
}

/** The value written, read back and written again: the same value, and the same bytes both times. */
export function expectRoundTrip(type: ContentType, value: unknown): void {
  const written = writeContent(type, value as never)
  const parsed = parseContent(type, written, `content/x/${type}.json`)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) return
  expect(parsed.value).toEqual(value)
  expect(writeContent(type, parsed.value as never)).toBe(written)
  expect(writeContent(type, value as never)).toBe(written)
}

/** A `read` over files by path, as `loadGame` takes it; a path with no file is a rejection, as on disk. */
export const readFiles =
  (files: Readonly<Record<string, string | undefined>>) =>
  async (path: string): Promise<string> => {
    const text = files[path]
    if (text === undefined) throw new Error(`${path}: no such file`)
    return text
  }

/** What a person reads when this game does not load: one sentence per problem, none when it loads. */
export async function gameProblems(files: Readonly<Record<string, string | undefined>>): Promise<string[]> {
  const loaded = await loadGame(readFiles(files))
  return loaded.ok ? [] : loaded.diagnostics.map(formatDiagnostic)
}

/** The fixture game's files (`tests/fixtures/game`), and a way to add files to it, for tests that need a whole game. */
export interface GameFile {
  readonly type: ContentType
  readonly path: string
  /** The file's text, or `undefined` to list it with no file there. */
  readonly text: string | undefined
}

/**
 * The files of a game: `base` (the fixture game's files), each of `extra` listed in `automata.toml` and written, and
 * `replace` over any path. A test then reads it with `gameProblems`.
 */
export function gameFiles(
  base: Readonly<Record<string, string>>,
  extra: readonly GameFile[],
  replace: Readonly<Record<string, string | undefined>> = {},
): Record<string, string | undefined> {
  const listed = extra.map((f) => `\n[[content]]\ntype = "${f.type}"\npath = "${f.path}"\n`).join('')
  const files: Record<string, string | undefined> = {
    ...base,
    'automata.toml': `${base['automata.toml'] ?? ''}${listed}`,
  }
  for (const f of extra) files[f.path] = f.text
  return { ...files, ...replace }
}

/** A file's JSON with one change made, written the way `writeContent` writes it. */
export function changed(
  type: ContentType,
  text: string | undefined,
  change: (v: Record<string, unknown>) => void,
): string {
  const value = JSON.parse(text ?? '') as Record<string, unknown>
  change(value)
  return writeContent(type, value as never)
}
