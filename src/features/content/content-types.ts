import type { z } from 'zod'
import { type Character, type CharacterInput, CharacterSchema } from './character.ts'
import type { Voice } from './diagnostics.ts'
import { type Level, LevelSchema } from './level.ts'

/** Everything the content feature knows about one kind of file. */
export interface ContentTypeInfo<Out, In, Editor extends string> extends Voice {
  readonly schema: z.ZodType<Out, In>
  /** The editor that opens this kind of file. */
  readonly editor: Editor
  /** The name shown at the top of the file's JSON Schema. */
  readonly title: string
}

/** The two kinds of content file there are. Adding a kind is adding a row here. */
export const CONTENT_TYPES: {
  readonly level: ContentTypeInfo<Level, Level, 'levels'>
  readonly character: ContentTypeInfo<Character, CharacterInput, 'characters'>
} = {
  level: {
    schema: LevelSchema,
    editor: 'levels',
    title: 'Level',
    noun: 'level',
    missing: {
      format: 'Write "format": 1.',
      id: 'Give the level a name like "level-1".',
      tiles: 'Write the map as a list of text rows, using # for solid and . for empty.',
      things: 'Write [] if the level has no things in it.',
      'things.id': 'Give the thing a name like "crate-1".',
      'things.character': 'Say which character it is, like "crate".',
      'things.x': 'Say where the middle of it is, in tiles from the left.',
      'things.y': 'Say where the middle of it is, in tiles from the top.',
      starts: 'A level needs at least one start point.',
      'starts.player': 'Say which player starts here: 1, 2, 3 or 4.',
      'starts.x': 'Say where the hero starts, in tiles from the left.',
      'starts.y': 'Say where the hero starts, in tiles from the top.',
    },
  },
  character: {
    schema: CharacterSchema,
    editor: 'characters',
    title: 'Character',
    noun: 'character',
    missing: {
      format: 'Write "format": 1.',
      id: 'Give the character a name like "hero".',
      body: 'Write "dynamic" if it moves and falls, or "fixed" if it stays put.',
      size: 'Write the size in tiles, like { "w": 1, "h": 1 }.',
      'size.w': 'Write how wide it is, in tiles.',
      'size.h': 'Write how tall it is, in tiles.',
      color: 'Write the colour as # and six digits, like #e4572e.',
    },
  },
}

/** `'level'` or `'character'`. */
export type ContentType = keyof typeof CONTENT_TYPES
