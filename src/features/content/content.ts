// The content feature: level and character files, read into values with plain problems and written one way.
// Nothing here touches a file; callers hand in text and take text back.

export { type Character, type CharacterInput, CharacterSchema } from './character.ts'
export { CONTENT_TYPES, type ContentType, type ContentValue } from './content-types.ts'
export { type Diagnostic, formatDiagnostic } from './diagnostics.ts'
export { Id } from './ids.ts'
export { jsonSchemaFor } from './json-schema.ts'
export { type Level, LevelSchema, type LevelStart, type LevelThing } from './level.ts'
export { type GameContent, loadGame } from './load.ts'
export { type Parsed, parseContent } from './parse.ts'
export { type ContentRef, PROJECT_FILE, type Project, ProjectSchema, parseProject } from './project.ts'
export { type TileKind, type TilePicture, type TilesetFile, TilesetSchema, type TileWhen } from './tileset.ts'
export type { ContentTypeInfo, EditorName, Listed, Report } from './type-info.ts'
export { writeContent } from './write.ts'
