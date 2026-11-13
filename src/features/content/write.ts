import type { z } from 'zod'
import { CONTENT_TYPES, type ContentType } from './content-types.ts'
import { formatDiagnostic, toDiagnostics } from './diagnostics.ts'

/**
 * The one way to write a content file. The value is checked first, then written with keys in the schema's
 * order, two spaces of indent, one tile row per line and a newline at the end, so two writers of the same
 * value give the same bytes and merges stay small. Throws, naming every problem, if the value is not valid.
 */
export function writeContent<T extends ContentType>(
  type: T,
  value: z.input<(typeof CONTENT_TYPES)[T]['schema']>,
): string {
  const entry = CONTENT_TYPES[type]
  const result = (entry.schema as z.ZodType).safeParse(value)
  if (!result.success)
    throw new Error(toDiagnostics(result.error.issues, value, type, entry).map(formatDiagnostic).join('\n'))
  return `${JSON.stringify(result.data, null, 2)}\n`
}
