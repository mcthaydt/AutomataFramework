import type { z } from 'zod'
import { type BehaviourFile, behaviourInfo } from './behaviour.ts'
import { type Character, type CharacterInput, characterInfo } from './character.ts'
import { type CuesFile, cuesInfo } from './cues.ts'
import { type FeelFile, feelInfo } from './feel.ts'
import { type Level, levelInfo } from './level.ts'
import { type MusicFile, musicInfo } from './music.ts'
import { type SoundFile, soundInfo } from './sound.ts'
import { type TilesetFile, tilesetInfo } from './tileset.ts'
import { type TuningFile, tuningInfo } from './tuning.ts'
import type { ContentTypeInfo } from './type-info.ts'

/**
 * The table of every kind of content file. A kind is one file (its type, its schema, its words, its checks) and one
 * row here, in this order; the project file, the loader, the writer and the schema script all work from this table.
 */
export const CONTENT_TYPES: {
  readonly level: ContentTypeInfo<Level, Level>
  readonly character: ContentTypeInfo<Character, CharacterInput>
  readonly tileset: ContentTypeInfo<TilesetFile, TilesetFile>
  readonly behaviour: ContentTypeInfo<BehaviourFile, BehaviourFile>
  readonly tuning: ContentTypeInfo<TuningFile, TuningFile>
  readonly feel: ContentTypeInfo<FeelFile, FeelFile>
  readonly sound: ContentTypeInfo<SoundFile, SoundFile>
  readonly music: ContentTypeInfo<MusicFile, MusicFile>
  readonly cues: ContentTypeInfo<CuesFile, CuesFile>
} = {
  level: levelInfo,
  character: characterInfo,
  tileset: tilesetInfo,
  behaviour: behaviourInfo,
  tuning: tuningInfo,
  feel: feelInfo,
  sound: soundInfo,
  music: musicInfo,
  cues: cuesInfo,
}

/** The name of a kind: what a `[[content]]` block's `type` says. */
export type ContentType = keyof typeof CONTENT_TYPES

/** The value a kind of file reads into. */
export type ContentValue<T extends ContentType> = z.output<(typeof CONTENT_TYPES)[T]['schema']>
