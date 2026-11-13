import { z } from 'zod'
import { CONTENT_TYPES, type ContentType } from './content-types.ts'

/**
 * The JSON Schema of a content file, for agents and editors: a title, every field with a plain description,
 * and no keys beyond the listed ones. Fields with a default are not required.
 */
export function jsonSchemaFor(type: ContentType): object {
  const entry = CONTENT_TYPES[type]
  return { ...z.toJSONSchema(entry.schema, { io: 'input' }), title: entry.title }
}
