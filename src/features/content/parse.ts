import type { z } from 'zod'
import { CONTENT_TYPES, type ContentType } from './content-types.ts'
import { type Diagnostic, toDiagnostics, type Voice } from './diagnostics.ts'

/** What reading a file gives: the value, or every problem found in it. */
export type Parsed<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly diagnostics: readonly Diagnostic[] }

/** The value a content type reads into. */
export type ContentValue<T extends ContentType> = z.output<(typeof CONTENT_TYPES)[T]['schema']>

/**
 * Checks data already read out of a file (JSON or TOML) against a schema. Never throws: whatever goes wrong is
 * a problem with the file, and every problem found comes back at once.
 */
export function checkData<T>(schema: z.ZodType, data: unknown, file: string, voice: Voice): Parsed<T> {
  try {
    const result = schema.safeParse(data)
    if (result.success) return { ok: true, value: result.data as T }
    return { ok: false, diagnostics: toDiagnostics(result.error.issues, data, file, voice) }
  } catch {
    // A rule that failed on something it did not expect is still a problem with the file, never a crash.
    return {
      ok: false,
      diagnostics: [
        { file, path: '', message: 'This file could not be read. Check that it looks like the example.' },
      ],
    }
  }
}

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
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return {
      ok: false,
      diagnostics: [
        {
          file,
          path: '',
          message: 'This file is not valid JSON. Check for a missing comma, quote or bracket.',
        },
      ],
    }
  }
  return checkData<ContentValue<T>>(entry.schema, data, file, entry)
}
