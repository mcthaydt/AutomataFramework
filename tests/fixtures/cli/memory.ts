// The cli feature's ports on files in memory, so every command runs in a Node test with no disk, no child process and no
// terminal. `files` is the folder as a map; a test reads it after the command ran to see what was written.
import { Effect, Layer } from 'effect'
import {
  CliError,
  Code,
  Files,
  type GameCode,
  Out,
  type Ports,
  type ToolName,
  type ToolResult,
  Tools,
} from '#src/features/cli/ports.ts'
import * as framework from '#src/headless.ts'

export interface MemoryOptions {
  /** What each tool answers; a tool not named exits 0 with no output. `'missing'` is a tool the game has not installed. */
  readonly tools?: Partial<Record<ToolName, ToolResult | 'missing'>>
  /** The game's code, or the error loading it gives. Default: the framework with no plugins. */
  readonly code?: GameCode | CliError
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
  const answer = (tool: ToolName): ToolResult | 'missing' =>
    options.tools?.[tool] ?? { code: 0, output: '' }
  const layer = Layer.mergeAll(
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
        const code = options.code ?? { framework, rules: { plugins: [] } }
        return code instanceof CliError ? Effect.fail(code) : Effect.succeed(code)
      },
    }),
    Layer.succeed(Out, {
      line: (text) => Effect.sync(() => void out.push(text)),
      error: (text) => Effect.sync(() => void err.push(text)),
    }),
  )
  return { layer, files, out, err, ran }
}
