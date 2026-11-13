// The content feature: level and character files, read into values with plain problems and written one way.
// Nothing here touches a file; callers hand in text and take text back.

export { type Character, type CharacterInput, CharacterSchema } from './character.ts'
export { CONTENT_TYPES, type ContentType, type ContentTypeInfo } from './content-types.ts'
export { type Diagnostic, formatDiagnostic } from './diagnostics.ts'
export { Id } from './ids.ts'
export { jsonSchemaFor } from './json-schema.ts'
export { type Level, LevelSchema, type Start, type Thing } from './level.ts'
export { type GameContent, loadGame } from './load.ts'
export { type ContentValue, type Parsed, parseContent } from './parse.ts'
export { type ContentRef, PROJECT_FILE, type Project, ProjectSchema, parseProject } from './project.ts'
export { writeContent } from './write.ts'
