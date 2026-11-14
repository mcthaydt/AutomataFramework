// The shape of one row of the content table. Types only: every kind's own file builds its row from this, and the
// table in content-types.ts is the one place that lists them.
import type { z } from '../../lib/zod.ts'
import type { ContentType, ContentValue } from './content-types.ts'
import type { Voice } from './diagnostics.ts'

/** The five editors a kind of file belongs to (M3). Each editor has several parts; `part` names the one. */
export type EditorName = 'world' | 'characters' | 'feel' | 'sound' | 'story'

/** What a check may ask about the rest of the game. */
export interface Listed {
  /** True when automata.toml lists a file of this kind with this id (by file name, so a broken file still counts). */
  has(type: ContentType, id: string): boolean
  /** Every listed id of a kind, sorted. */
  ids(type: ContentType): readonly string[]
  /** The file's value, or undefined when it is not listed or did not read. A check skips what it cannot see. */
  get<T extends ContentType>(type: T, id: string): ContentValue<T> | undefined
}

/** Adds one problem to the file being checked. `path` is written like `things[0].character`. */
export type Report = (path: string, message: string) => void

/** Everything the content feature knows about one kind of file. */
export interface ContentTypeInfo<Out, In> extends Voice {
  readonly schema: z.ZodType<Out, In>
  /** The name shown at the top of the file's JSON Schema. */
  readonly title: string
  /** The field of `GameContent` the kind's files are put in: `'sounds'`. */
  readonly plural: string
  /** The editor that opens this kind of file. */
  readonly editor: EditorName
  /** The part of that editor: `'audio'`. */
  readonly part: string
  /** Puts free keys in one order before the file is written. */
  readonly tidy?: (value: Out) => Out
  /** Checks against other files; runs only when this file read and its id is right. */
  readonly check?: (value: Out, game: Listed, report: Report) => void
}
