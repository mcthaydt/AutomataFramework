import type { z } from 'zod'
import { CONTENT_TYPES, type ContentType } from './content-types.ts'
import { type Diagnostic, toDiagnostics } from './diagnostics.ts'

/** What reading a file gives: the value, or every problem found in it. */
export type Parsed<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly diagnostics: readonly Diagnostic[] }

/** The value a content type reads into. */
export type ContentValue<T extends ContentType> = z.output<(typeof CONTENT_TYPES)[T]['schema']>

/**
 * Reads the text of a content file. Never throws: text that is not JSON, or JSON that is not a valid file,
 * comes back as plain problems naming `file` and the place, all of them at once.
 */
export function parseContent<T extends ContentType>(
  type: T,
  text: string,
  file: string,
): Parsed<ContentValue<T>> {
  const entry = CONTENT_TYPES[type]
  const bad = (diagnostics: Diagnostic[]): Parsed<ContentValue<T>> => ({ ok: false, diagnostics })
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return bad([
      {
        file,
        path: '',
        message: 'This file is not valid JSON. Check for a missing comma, quote or bracket.',
      },
    ])
  }
  try {
    const result = (entry.schema as z.ZodType).safeParse(data)
    if (result.success) return { ok: true, value: result.data as ContentValue<T> }
    return bad(toDiagnostics(result.error.issues, data, file, entry))
  } catch {
    // A rule that failed on something it did not expect is still a problem with the file, never a crash.
    return bad([
      { file, path: '', message: 'This file could not be read. Check that it looks like the example.' },
    ])
  }
}
