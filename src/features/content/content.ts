// The content feature: every kind of content file, read into values with plain problems and written one way.
// Nothing here touches a file; callers hand in text and take text back.

export { type ArtFile, artFiles, artProblems, paintedPath, photosUsed } from './art.ts'
export {
  type BackdropFile,
  type BackdropLayer,
  type BackdropProp,
  BackdropSchema,
  type LayerKind,
} from './backdrop.ts'
export {
  type Act,
  type BehaviourFile,
  type BehaviourRule,
  BehaviourSchema,
  type Sense,
} from './behaviour.ts'
export {
  type Character,
  type CharacterInput,
  CharacterSchema,
  type Clip,
  type HeroMoves,
  type HeroMovesInput,
} from './character.ts'
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
export { type Buzz, type Dust, type FeelFile, FeelSchema, type Freeze, type Shake } from './feel.ts'
export {
  type FigureFile,
  type FigureMove,
  type FigurePaint,
  type FigurePart,
  type FigurePose,
  FigureSchema,
  type FigureVariant,
} from './figure.ts'
export { Id } from './ids.ts'
export { jsonSchemaFor } from './json-schema.ts'
export {
  type Level,
  type LevelJoint,
  type LevelPoint,
  LevelSchema,
  type LevelStart,
  type LevelThing,
  type LevelView,
} from './level.ts'
export { type GameContent, loadGame } from './load.ts'
export {
  LANGUAGES,
  type Language,
  languageName,
  type MessagesFile,
  MessagesSchema,
  placeholdersOf,
} from './messages.ts'
export {
  DEFAULT_HERO_CONTROLS,
  MOVE_NUMBERS,
  type MoveNumberInfo,
  type MoveNumbers,
  moveNumbers,
  moveNumbersOf,
} from './moves.ts'
export {
  type DrumPart,
  MAX_STEPS,
  type MusicFile,
  type MusicPart,
  MusicSchema,
  type TonePart,
} from './music.ts'
export { paintBackdrop } from './paint-backdrop.ts'
export { paintFigure } from './paint-figure.ts'
export { MissingPhotoError, paintScene } from './paint-scene.ts'
export { type Parsed, parseContent } from './parse.ts'
export { MAX_PHOTO_SIDE, type PhotoFile, PhotoSchema, photoPictureProblem } from './photo.ts'
export { PHOTO_LIBRARY, type PhotoPixels, type PhotoRecord, type Photos } from './photo-library.ts'
export { type MaterialTile, materialTile } from './photo-tile.ts'
export {
  type ContentRef,
  levelOrder,
  nextLevel,
  PROJECT_FILE,
  type Project,
  ProjectSchema,
  parseProject,
} from './project.ts'
export { type ListedFile, listContent } from './project-write.ts'
export {
  emptyReadMarks,
  markRead,
  parseReadMarks,
  READ_MARKS_FILE,
  type ReadMarks,
  readMark,
  unreadWords,
  writeReadMarks,
} from './read-marks.ts'
export {
  type FlatMaterial,
  type MaterialTop,
  type PhotoMaterial,
  type SceneFile,
  type SceneGround,
  type SceneLetter,
  type SceneMaterial,
  type ScenePaint,
  SceneSchema,
  type TilesMaterial,
} from './scene.ts'
export { sceneFromLevel } from './scene-from-level.ts'
export {
  covers,
  GROUND_SHAPES,
  type GroundGrid,
  type GroundShape,
  gapsUnder,
  LEDGE_DEEP,
  lineAt,
  runBottom,
  runTop,
  type SlopeRun,
  shapesOf,
  slopeRuns,
  surfaceAt,
  tilesUnder,
} from './scene-ground.ts'
export {
  type Atlas,
  atlasOf,
  atlasText,
  backdropSheet,
  type Frame,
  figureSheet,
  groundPageTiles,
  SHEET_COLUMNS,
  type Sheet,
  sceneSheet,
} from './sheet.ts'
export {
  type NoiseVoice,
  type SoundFile,
  SoundSchema,
  type SoundVoice,
  type ToneVoice,
  type Wave,
} from './sound.ts'
export { type TileKind, type TilePicture, type TilesetFile, TilesetSchema, type TileWhen } from './tileset.ts'
export { translationProblems } from './translations.ts'
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
