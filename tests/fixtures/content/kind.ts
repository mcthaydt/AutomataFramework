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
