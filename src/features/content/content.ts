// The content feature: every kind of content file, read into values with plain problems and written one way.
// Nothing here touches a file; callers hand in text and take text back.

export {
  type Act,
  type BehaviourFile,
  type BehaviourRule,
  BehaviourSchema,
  type Sense,
} from './behaviour.ts'
export { type Character, type CharacterInput, CharacterSchema } from './character.ts'
export { CONTENT_TYPES, type ContentType, type ContentValue } from './content-types.ts'
export {
  type Choice as ConversationChoice,
  type ConversationFile,
  type ConversationNode,
  ConversationSchema,
} from './conversation.ts'
export {
  type Cue,
  type CuesFile,
  CuesSchema,
  type MusicCue,
  type SoundCue,
  type StopMusicCue,
} from './cues.ts'
export {
  type ActorKey,
  type CameraKey,
  type CutsceneFile,
  type CutsceneLine,
  CutsceneSchema,
  type Ease,
} from './cutscene.ts'
export { type Diagnostic, formatDiagnostic } from './diagnostics.ts'
export { type Dust, type FeelFile, FeelSchema, type Freeze, type Shake } from './feel.ts'
export { Id } from './ids.ts'
export { jsonSchemaFor } from './json-schema.ts'
export { type Level, LevelSchema, type LevelStart, type LevelThing } from './level.ts'
export { type GameContent, loadGame } from './load.ts'
export { LANGUAGES, type Language, type MessagesFile, MessagesSchema } from './messages.ts'
export {
  type DrumPart,
  MAX_STEPS,
  type MusicFile,
  type MusicPart,
  MusicSchema,
  type TonePart,
} from './music.ts'
export { type Parsed, parseContent } from './parse.ts'
export { type ContentRef, PROJECT_FILE, type Project, ProjectSchema, parseProject } from './project.ts'
export {
  type NoiseVoice,
  type SoundFile,
  SoundSchema,
  type SoundVoice,
  type ToneVoice,
  type Wave,
} from './sound.ts'
export { type TileKind, type TilePicture, type TilesetFile, TilesetSchema, type TileWhen } from './tileset.ts'
export {
  type SharedKeys,
  type TuningControl,
  type TuningFile,
  type TuningNumber,
  TuningSchema,
  tuningNumbers,
} from './tuning.ts'
export type { ContentTypeInfo, EditorName, Listed, Report } from './type-info.ts'
export { writeContent } from './write.ts'
