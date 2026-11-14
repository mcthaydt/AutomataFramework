// A folder read as a game: its project file and the content it lists, through the framework the game installed (or this
// command's own copy when it is not installed yet), its rules, and the recordings beside them. Every step of `automata
// check` and `automata replay` starts from this, so a game is read once and the same way everywhere.
import { join, resolve } from 'node:path'
import { Effect, Runtime } from 'effect'
import type * as Headless from '../../headless.ts'
import {
  type Diagnostic,
  type GameContent,
  loadGame,
  type Parsed,
  parseContent,
  writeContent,
} from '../content/content.ts'
import { CliError, Code, type CodeService, Files, type FilesService, type GameCode } from './ports.ts'

/** The part of the framework `check` reads files with: the game's own copy when it has one. */
type ContentApi = Pick<typeof Headless, 'loadGame' | 'parseContent' | 'writeContent'>

/** This command's own copy, for a game that is not installed yet. */
const OWN_CONTENT: ContentApi = { loadGame, parseContent, writeContent }

export interface GameFolder {
  /** The folder as the command was given it. Every path below is from here. */
  readonly folder: string
  /** The game's content, read, or every problem found in it. */
  readonly loaded: Parsed<GameContent>
  /** The game's own framework and rules; `undefined` when the game is not installed (see `codeError`). */
  readonly code: GameCode | undefined
  /** What read the content: `code`'s framework, or this command's own copy. */
  readonly content: ContentApi
  /** Why `code` is missing: the sentence that says to run npm install. */
  readonly codeError?: string
  /** Set when the game's rules could not be loaded: what is wrong with `src/headless.ts`. */
  readonly codeProblem?: Diagnostic
  /** Every `.json` file in `replays/`, from the game's root, in name order. */
  readonly recordings: readonly string[]
}

/** The path to name a folder by in a sentence: the one typed, or where "." is. */
const shown = (folder: string): string => (folder === '.' ? resolve('.') : folder)

/** A `read` for `loadGame` over the files port: a file that is not there is a rejection, as `loadGame` expects. */
function readerOver(files: FilesService, folder: string): Effect.Effect<(path: string) => Promise<string>> {
  return Effect.map(Effect.runtime<never>(), (runtime) => async (path: string) => {
    const text = await Runtime.runPromise(runtime)(files.readText(join(folder, path)))
    if (text === undefined) throw new Error(`${path}: no such file`)
    return text
  })
}

/**
 * Reads the game in `folder`. A folder with no `automata.toml` is not a game and is the one failure. A game that is not
 * installed, or whose rules do not load, is still read: its files can be checked, and the report says what is missing.
 */
export function readGame(folder: string): Effect.Effect<GameFolder, CliError, CodeService | FilesService> {
  return Effect.gen(function* () {
    const files = yield* Files
    const project = yield* files.readText(join(folder, 'automata.toml'))
    if (project === undefined)
      return yield* Effect.fail(
        new CliError(
          `${shown(folder)} is not a game: it has no automata.toml. Go to your game's folder, or name it: automata check <folder>.`,
        ),
      )

    const loadedCode = yield* Effect.either(Effect.flatMap(Code, (c) => c.load(folder)))
    const code = loadedCode._tag === 'Right' ? loadedCode.right : undefined
    const content = code?.framework ?? OWN_CONTENT
    const read = yield* readerOver(files, folder)
    const loaded = yield* Effect.promise(() => content.loadGame(read))
    const recordings = (yield* files.list(join(folder, 'replays')))
      .filter((name) => name.endsWith('.json'))
      .map((name) => `replays/${name}`)

    return {
      folder,
      loaded,
      code,
      content,
      recordings,
      ...(loadedCode._tag === 'Left' ? { codeError: loadedCode.left.message } : {}),
      ...(code !== undefined && 'problem' in code.rules ? { codeProblem: code.rules.problem } : {}),
    }
  })
}
