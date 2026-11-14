// The four things every command reaches through, so a command is a plain Effect program and a test runs it on files in
// memory: the files, the game's own tools, the game's own code, and the output. The live versions are in `live.ts`.
// Ported from AutomataFrameworkFailed@ed8592e8: packages/tools/src/shared/node/files.ts and process-runner.ts (their
// shape: services with a live layer and a memory one); nothing else came over.
import { Context, type Effect } from 'effect'
import type * as Headless from '../../headless.ts'
import type { Diagnostic } from '../content/content.ts'
import type { PluginDef } from '../sim/sim.ts'
import type { GameState } from './state.ts'

/**
 * Something the command could not do. `message` is the whole sentence a person reads, and the command exits 2.
 * A class of its own (and not Effect's `Data.TaggedError`, whose `extends` call a declaration build cannot name).
 */
export class CliError extends Error {
  readonly _tag = 'CliError'
  constructor(message: string) {
    super(message)
    this.name = 'CliError'
  }
}

/** The files, as the command sees them. Paths are absolute, or relative to the folder the command was started in. */
export interface FilesService {
  /** `undefined` when there is no such file. */
  readonly readText: (path: string) => Effect.Effect<string | undefined>
  readonly readBytes: (path: string) => Effect.Effect<Uint8Array | undefined>
  /** Writes the file, making the folders it needs. */
  readonly write: (path: string, data: string | Uint8Array) => Effect.Effect<void, CliError>
  /** Every file under `dir`, `/`-joined from `dir`, sorted; `[]` when there is none. */
  readonly list: (dir: string) => Effect.Effect<readonly string[]>
}
export const Files: Context.Tag<FilesService, FilesService> =
  Context.GenericTag<FilesService>('automata/Files')

/** The tools a game installs for itself, started from its own `node_modules/.bin`. */
export type ToolName = 'biome' | 'tsc' | 'vitest' | 'vite'

export interface ToolResult {
  readonly code: number
  /** The tool's own last lines, stdout and stderr in the order they came. */
  readonly output: string
}

export interface ToolsService {
  /** Runs the game's own tool to its end. `'missing'` when the game has not installed it. */
  readonly run: (
    tool: ToolName,
    args: readonly string[],
    cwd: string,
  ) => Effect.Effect<ToolResult | 'missing'>
  /** Starts it with this terminal's own input and output, and resolves with its exit code when it ends. */
  readonly serve: (tool: ToolName, args: readonly string[], cwd: string) => Effect.Effect<number | 'missing'>
}
export const Tools: Context.Tag<ToolsService, ToolsService> =
  Context.GenericTag<ToolsService>('automata/Tools')

/** The game's own copy of the framework's headless entry, and its rules, or why they did not load. */
export interface GameCode {
  readonly framework: typeof Headless
  /** `actions` is the game's own list of what a player can hold, when `src/headless.ts` exports one. */
  readonly rules:
    | { readonly plugins: readonly PluginDef[]; readonly actions?: readonly string[] }
    | { readonly problem: Diagnostic }
}

export interface CodeService {
  /** Loads the game's framework and its `src/headless.ts` from `folder`. */
  readonly load: (folder: string) => Effect.Effect<GameCode, CliError>
}
export const Code: Context.Tag<CodeService, CodeService> = Context.GenericTag<CodeService>('automata/Code')

export interface OutService {
  /** One line on stdout. */
  readonly line: (text: string) => Effect.Effect<void>
  /** One line on stderr. */
  readonly error: (text: string) => Effect.Effect<void>
}
export const Out: Context.Tag<OutService, OutService> = Context.GenericTag<OutService>('automata/Out')

/** What a play session is told, one message at a time. */
export type SessionMessage =
  | {
      readonly kind: 'start'
      readonly level?: string
      readonly players?: readonly number[]
      readonly seed?: number
    }
  /** Holds, for each player named (`"1"`), those actions for `ticks` ticks. */
  | { readonly kind: 'step'; readonly ticks: number; readonly hold: Readonly<Record<string, readonly string[]>> }
  | { readonly kind: 'state' }
  /** The recording so far, as the file `automata replay` reads. */
  | { readonly kind: 'recording' }

/** What a session answers. `sentence` is the whole thing a person or an agent reads; `ended` says the session is gone. */
export type SessionReply =
  | {
      readonly ok: true
      readonly state: GameState
      /** The events the last step raised, one name for each, in order. */
      readonly events: readonly string[]
      /** `recording` only: the replay file's text. */
      readonly recording?: string
      readonly level: string
    }
  | { readonly ok: false; readonly sentence: string; readonly ended?: boolean }

/** One play session, somewhere the game's code is loaded afresh: a Worker, or in a test the test's own process. */
export interface SessionWorker {
  readonly call: (message: SessionMessage) => Promise<SessionReply>
  /** Ends the session and frees everything it holds. Safe to call twice. */
  readonly end: () => Promise<void>
}

/**
 * Runs a game's code in a fresh place (audit C1): Node keeps every module it has imported, so a long-lived
 * `automata mcp` never imports a game's rules itself. `worker` starts a play session's own Worker, which loads the game
 * as it is when the session starts.
 */
export interface RunnerService {
  readonly worker: (folder: string) => Effect.Effect<SessionWorker, CliError>
}
export const Runner: Context.Tag<RunnerService, RunnerService> =
  Context.GenericTag<RunnerService>('automata/Runner')

/** What a command may ask for. */
export type Ports = FilesService | ToolsService | CodeService | OutService | RunnerService
