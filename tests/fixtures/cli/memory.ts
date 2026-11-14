// The cli feature's ports on files in memory, so every command runs in a Node test with no disk, no child process and no
// terminal. `files` is the folder as a map; a test reads it after the command ran to see what was written.
import { Effect, Layer } from 'effect'
import { main } from '#src/features/cli/cli.ts'
import { commandAnswer } from '#src/features/cli/command-answer.ts'
import { readGame } from '#src/features/cli/game-folder.ts'
import {
  CliError,
  Code,
  Files,
  type GameCode,
  Out,
  type Ports,
  Runner,
  type RunnerService,
  type ToolName,
  type ToolResult,
  Tools,
} from '#src/features/cli/ports.ts'
import { sessionHost } from '#src/features/cli/session.ts'
import * as framework from '#src/headless.ts'

export interface MemoryOptions {
  /** What each tool answers; a tool not named exits 0 with no output. `'missing'` is a tool the game has not installed. */
  readonly tools?: Partial<Record<ToolName, ToolResult | 'missing'>>
  /**
   * The game's code, or the error loading it gives. Default: the framework with no plugins. A function is asked each time
   * the game is loaded, so a test can change the rules between two sessions the way an agent edits a file.
   */
  readonly code?: GameCode | CliError | (() => GameCode | CliError)
}

export interface ToolCall {
  readonly tool: ToolName
  readonly args: readonly string[]
  readonly cwd: string
  /** `run` ended, or `serve` handed over the terminal. */
  readonly how: 'run' | 'serve'
}

export interface Memory {
  readonly layer: Layer.Layer<Ports>
  /** The files now, keyed by path with `/`. */
  readonly files: Map<string, string | Uint8Array>
  /** Every line printed on stdout, then on stderr, in order. */
  readonly out: string[]
  readonly err: string[]
  readonly ran: ToolCall[]
}

/** A path as the memory keys it: `/`-joined, with no leading `./`. */
const keyOf = (path: string): string => path.replaceAll('\\', '/').replace(/^\.\//, '')

const asText = (data: string | Uint8Array | undefined): string | undefined => {
  if (data === undefined || typeof data === 'string') return data
  return new TextDecoder().decode(data)
}

const asBytes = (data: string | Uint8Array | undefined): Uint8Array | undefined => {
  if (data === undefined || typeof data !== 'string') return data
  return new TextEncoder().encode(data)
}

/** The ports over `initial`. Paths are the keys of the map, so a game's folder is `'.'` or a prefix the test chooses. */
export function memoryLayer(
  initial: Readonly<Record<string, string | Uint8Array>>,
  options: MemoryOptions = {},
): Memory {
  const files = new Map<string, string | Uint8Array>(Object.entries(initial).map(([k, v]) => [keyOf(k), v]))
  const out: string[] = []
  const err: string[] = []
  const ran: ToolCall[] = []
  const answer = (tool: ToolName): ToolResult | 'missing' => options.tools?.[tool] ?? { code: 0, output: '' }
  const core = Layer.mergeAll(
    Layer.succeed(Files, {
      readText: (path) => Effect.sync(() => asText(files.get(keyOf(path)))),
      readBytes: (path) => Effect.sync(() => asBytes(files.get(keyOf(path)))),
      write: (path, data) => Effect.sync(() => void files.set(keyOf(path), data)),
      list: (dir) =>
        Effect.sync(() => {
          const here = keyOf(dir)
          const prefix = here === '' || here === '.' ? '' : here.endsWith('/') ? here : `${here}/`
          return [...files.keys()]
            .filter((key) => key.startsWith(prefix))
            .map((key) => key.slice(prefix.length))
            .sort()
        }),
    }),
    Layer.succeed(Tools, {
      run: (tool, args, cwd) =>
        Effect.sync(() => {
          ran.push({ tool, args, cwd, how: 'run' })
          return answer(tool)
        }),
      serve: (tool, args, cwd) =>
        Effect.sync(() => {
          ran.push({ tool, args, cwd, how: 'serve' })
          const result = answer(tool)
          return result === 'missing' ? result : result.code
        }),
    }),
    Layer.succeed(Code, {
      load: () => {
        const given = options.code ?? { framework, rules: { plugins: [] } }
        const code = typeof given === 'function' ? given() : given
        return code instanceof CliError ? Effect.fail(code) : Effect.succeed(code)
      },
    }),
  )
  const base = Layer.merge(
    core,
    Layer.succeed(Out, {
      line: (text) => Effect.sync(() => void out.push(text)),
      error: (text) => Effect.sync(() => void err.push(text)),
    }),
  )
  // The child process a command runs in is `main` called here with its own output, on the same files and the same code
  // (asked afresh each time, as a new process would). A play session's "Worker" is the same session code in this
  // process, loading the game afresh each time one starts.
  const runner: RunnerService = {
    command: (args) =>
      Effect.flatMap(
        Effect.promise(async () => {
          const stdout: string[] = []
          const stderr: string[] = []
          const child = Layer.mergeAll(
            core,
            Layer.succeed(Out, {
              line: (text) => Effect.sync(() => void stdout.push(text)),
              error: (text) => Effect.sync(() => void stderr.push(text)),
            }),
            Layer.succeed(Runner, runner),
          )
          const code = await main([...args, '--json'], child)
          return { code, stdout: stdout.join('\n'), stderr: stderr.join('\n') }
        }),
        (ended) => commandAnswer(ended.code, ended.stdout, ended.stderr),
      ),
    worker: (folder) =>
      Effect.sync(() => {
        const host = sessionHost(() => Effect.runPromise(Effect.provide(readGame(folder), base)))
        return { call: async (message) => host.call(message), end: async () => host.end() }
      }),
  }
  const layer = Layer.merge(base, Layer.succeed(Runner, runner))
  return { layer, files, out, err, ran }
}
