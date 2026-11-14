// The live layer: the files on disk, the game's tools as child processes, the game's code by `import()`, and the
// terminal. It is the one place in the cli feature that touches the machine, so everything else runs in a test on
// files in memory. Ported in shape from AutomataFrameworkFailed@ed8592e8: packages/tools/src/shared/node/files.ts and
// process-runner.ts (a service with a live layer and a memory one); the code is new.
import { type ChildProcess, type SpawnOptions, type StdioOptions, spawn } from 'node:child_process'
import type { Dirent } from 'node:fs'
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Worker } from 'node:worker_threads'
import { Effect, Layer } from 'effect'
import type * as Headless from '../../headless.ts'
import type { Diagnostic } from '../content/content.ts'
import type { PluginDef } from '../sim/sim.ts'
import { commandAnswer } from './command-answer.ts'
import {
  CliError,
  Code,
  type CodeService,
  type CommandAnswer,
  Files,
  type FilesService,
  type GameCode,
  Out,
  type OutService,
  type Ports,
  Runner,
  type RunnerService,
  type SessionReply,
  type SessionWorker,
  type ToolName,
  type ToolResult,
  Tools,
  type ToolsService,
} from './ports.ts'

const WINDOWS = process.platform === 'win32'
/** How much of a tool's own words a failed step keeps. */
const KEPT_LINES = 60

const isMissing = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error.code === 'ENOENT' || error.code === 'ENOTDIR' || error.code === 'EISDIR')

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const firstLine = (error: unknown): string =>
  (error instanceof Error ? error.message : String(error)).split('\n')[0] ?? ''

// --- Files ---

async function walk(root: string, here: string, into: string[]): Promise<void> {
  let entries: Dirent[]
  try {
    entries = await readdir(join(root, here), { withFileTypes: true })
  } catch (error) {
    if (isMissing(error)) return
    throw error
  }
  for (const entry of entries) {
    const path = here === '' ? entry.name : `${here}/${entry.name}`
    if (entry.isDirectory()) await walk(root, path, into)
    else into.push(path)
  }
}

const filesLive: FilesService = {
  readText: (path) =>
    Effect.promise(async () => {
      try {
        return await readFile(path, 'utf8')
      } catch (error) {
        if (isMissing(error)) return undefined
        throw error
      }
    }),
  readBytes: (path) =>
    Effect.promise(async () => {
      try {
        return new Uint8Array(await readFile(path))
      } catch (error) {
        if (isMissing(error)) return undefined
        throw error
      }
    }),
  write: (path, data) =>
    Effect.tryPromise({
      try: async () => {
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, data)
      },
      catch: (error) => new CliError(`Could not write ${path}: ${firstLine(error)}`),
    }),
  list: (dir) =>
    Effect.promise(async () => {
      const found: string[] = []
      await walk(dir, '', found)
      return found.sort()
    }),
}

// --- Tools ---

/**
 * One word of a command for Windows' shell. A `.cmd` file can only be started through a shell, which reads one string,
 * so a word with a space or a quote in it (the folder's name, say) must be quoted.
 */
export function quoteForWindows(word: string): string {
  return /^[\w@%+=:,./\\-]+$/.test(word) ? word : `"${word.replaceAll('"', '\\"')}"`
}

const binOf = (tool: ToolName, cwd: string): string =>
  join(cwd, 'node_modules', '.bin', WINDOWS ? `${tool}.cmd` : tool)

const lastLines = (text: string): string => text.trimEnd().split('\n').slice(-KEPT_LINES).join('\n')

/** Starts the game's own tool: a list of arguments, never a shell string, except where Windows needs one. */
function start(
  tool: ToolName,
  args: readonly string[],
  cwd: string,
  stdio: 'inherit' | 'pipe',
): ChildProcess {
  const bin = binOf(tool, cwd)
  const wiring: StdioOptions = stdio === 'inherit' ? 'inherit' : ['ignore', 'pipe', 'pipe']
  const options: SpawnOptions = { cwd, stdio: wiring }
  // One string for the shell: Node warns about a list of arguments handed to a shell, which it only joins.
  return WINDOWS
    ? spawn([bin, ...args].map(quoteForWindows).join(' '), { ...options, shell: true, windowsHide: true })
    : spawn(bin, args, options)
}

async function runTool(
  tool: ToolName,
  args: readonly string[],
  cwd: string,
): Promise<ToolResult | 'missing'> {
  if (!(await exists(binOf(tool, cwd)))) return 'missing'
  return new Promise((resolve) => {
    const child = start(tool, args, cwd, 'pipe')
    // stdout and stderr in the order they came, so a tool's lines read as they would in a terminal.
    const chunks: string[] = []
    const take = (data: Buffer): void => void chunks.push(data.toString())
    child.stdout?.on('data', take)
    child.stderr?.on('data', take)
    child.on('error', () => resolve('missing'))
    child.on('close', (code) => resolve({ code: code ?? 1, output: lastLines(chunks.join('')) }))
  })
}

/** Stops a child and what it started. Windows has no signals, so a shell's child is ended by its process tree. */
function stop(child: ChildProcess, signal: NodeJS.Signals): void {
  if (WINDOWS && child.pid !== undefined) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'])
  else child.kill(signal)
}

async function serveTool(tool: ToolName, args: readonly string[], cwd: string): Promise<number | 'missing'> {
  if (!(await exists(binOf(tool, cwd)))) return 'missing'
  return new Promise((resolve) => {
    const child = start(tool, args, cwd, 'inherit')
    // Ctrl+C and a closed terminal reach the child, so no dev server is left running behind a stopped command.
    let stopped = false
    const pass = (signal: NodeJS.Signals) => (): void => {
      stopped = true
      stop(child, signal)
    }
    const onInt = pass('SIGINT')
    const onTerm = pass('SIGTERM')
    process.on('SIGINT', onInt)
    process.on('SIGTERM', onTerm)
    const done = (result: number | 'missing'): void => {
      process.off('SIGINT', onInt)
      process.off('SIGTERM', onTerm)
      resolve(result)
    }
    child.on('error', () => done('missing'))
    child.on('close', (code) => done(stopped ? 0 : (code ?? 0)))
  })
}

const toolsLive: ToolsService = {
  run: (tool, args, cwd) => Effect.promise(() => runTool(tool, args, cwd)),
  serve: (tool, args, cwd) => Effect.promise(() => serveTool(tool, args, cwd)),
}

// --- Code ---

const problemIn = (message: string): { readonly problem: Diagnostic } => ({
  problem: { file: 'src/headless.ts', path: '', message },
})

/** The game's rules: `gamePlugins` from its own `src/headless.ts`, loaded as it is (Node runs TypeScript that only has types to take out). */
async function loadRules(folder: string): Promise<GameCode['rules']> {
  const file = join(folder, 'src', 'headless.ts')
  if (!(await exists(file)))
    return problemIn("This file is missing. It lists the game's rules: export const gamePlugins = [ ... ].")
  let loaded: Record<string, unknown>
  try {
    loaded = (await import(pathToFileURL(file).href)) as Record<string, unknown>
  } catch (error) {
    return problemIn(`This file could not be loaded. ${firstLine(error)}`)
  }
  const plugins = loaded.gamePlugins
  if (!Array.isArray(plugins))
    return problemIn("This file must export gamePlugins, the list of the game's plugins.")
  const actions = loaded.actions
  return {
    plugins: plugins as readonly PluginDef[],
    // The list of what a player can hold, when the game keeps one: a play session refuses a name that is not on it.
    ...(Array.isArray(actions) && actions.every((name) => typeof name === 'string')
      ? { actions: actions as readonly string[] }
      : {}),
  }
}

/**
 * The game's own copy of the framework, from `node_modules` in the game's folder. It is imported the way the game's own
 * rules import it, through Node's loader and with no path work of our own (a `realpath` here expanded Windows' short
 * folder names where the loader did not, and the command and the rules then held two copies of the framework, each with
 * components the other did not know). A game's broken rules are not an error here: the framework still loads, so the files can still be checked.
 */
async function loadCode(folder: string): Promise<GameCode> {
  const manifestFile = join(folder, 'node_modules', '@automataframework', 'framework', 'package.json')
  let text: string
  try {
    text = await readFile(manifestFile, 'utf8')
  } catch (error) {
    if (!isMissing(error)) throw error
    throw new CliError(
      `This game's tools are not installed yet. Run npm install in ${folder}, then try again.`,
    )
  }
  const manifest = JSON.parse(text) as { exports?: Record<string, { import?: string } | string> }
  const entry = manifest.exports?.['./headless']
  const relative = typeof entry === 'string' ? entry : entry?.import
  if (relative === undefined)
    throw new CliError(
      `The framework installed in ${folder} has no headless entry. Run npm install in ${folder} to get a whole copy.`,
    )
  const entryFile = join(dirname(manifestFile), relative)
  const framework = (await import(pathToFileURL(entryFile).href)) as typeof Headless
  return { framework, rules: await loadRules(folder) }
}

const codeLive: CodeService = {
  load: (folder) =>
    Effect.tryPromise({
      try: () => loadCode(folder),
      catch: (error) =>
        error instanceof CliError ? error : new CliError(`Could not load the game: ${firstLine(error)}`),
    }),
}

// --- The terminal ---

const outLive: OutService = {
  line: (text) => Effect.sync(() => void process.stdout.write(`${text}\n`)),
  error: (text) => Effect.sync(() => void process.stderr.write(`${text}\n`)),
}

/** What is typed or piped into this process, a line at a time (for `automata mcp`). */
export const stdinLines = (): AsyncIterable<string> => createInterface({ input: process.stdin })

// --- Play sessions ---

/** The Worker's file: the built one beside this code, or the source one when the code itself runs from source. */
const sessionWorkerFile = (): URL =>
  new URL(import.meta.url.endsWith('.ts') ? './session-worker.ts' : './session-worker.js', import.meta.url)

/** A session's Worker, spoken to by numbered messages. A Worker that stops answers every message waiting with a sentence. */
function startWorker(folder: string): SessionWorker {
  // `stdout: true`: a Worker's output would otherwise go straight to this process's stdout, past the console that
  // `automata mcp` points at stderr, and a game's rules that print would break the protocol. It goes to stderr instead.
  const worker = new Worker(sessionWorkerFile(), { workerData: { folder }, stdout: true })
  worker.stdout.on('data', (chunk: Buffer) => void process.stderr.write(chunk))
  const waiting = new Map<number, (reply: SessionReply) => void>()
  let next = 0
  let over: string | undefined
  const settle = (sentence: string): void => {
    over = sentence
    for (const done of waiting.values()) done({ ok: false, sentence, ended: true })
    waiting.clear()
  }
  worker.on('message', (answer: { id: number; reply: SessionReply }) => {
    waiting.get(answer.id)?.(answer.reply)
    waiting.delete(answer.id)
  })
  worker.on('error', (error) => settle(`The game stopped: ${firstLine(error)}`))
  worker.on('exit', () => settle('The session has ended.'))
  return {
    call: (message) =>
      new Promise((resolve) => {
        if (over !== undefined) return resolve({ ok: false, sentence: over, ended: true })
        const id = next++
        waiting.set(id, resolve)
        worker.postMessage({ id, message })
      }),
    end: async () => {
      await worker.terminate()
    },
  }
}

/** The command's own file: the built `cli.js` beside this code, or the source `cli.ts` when the code itself runs from source. */
const cliFile = (): URL =>
  new URL(import.meta.url.endsWith('.ts') ? '../../cli.ts' : './cli.js', import.meta.url)

/**
 * `automata <words> --json` as a child process (audit C1): the game's rules load in a process of its own, which ends when
 * the command does, so the next command reads the files as they are then. Its input is closed, so it never waits.
 */
function runCommand(args: readonly string[], cwd: string): Effect.Effect<CommandAnswer, CliError> {
  return Effect.flatMap(
    Effect.async<{ code: number; stdout: string; stderr: string }, CliError>((resume) => {
      const child = spawn(process.execPath, [fileURLToPath(cliFile()), ...args, '--json'], {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8')
      })
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8')
      })
      child.on('error', (error) =>
        resume(Effect.fail(new CliError(`automata could not be started: ${firstLine(error)}`))),
      )
      child.on('close', (code) => resume(Effect.succeed({ code: code ?? 2, stdout, stderr })))
      return Effect.sync(() => void child.kill())
    }),
    (ended) => commandAnswer(ended.code, ended.stdout, ended.stderr),
  )
}

const runnerLive: RunnerService = {
  command: runCommand,
  worker: (folder) => Effect.sync(() => startWorker(folder)),
}

/** What a command run from a terminal reaches the world through. */
export const liveLayer: Layer.Layer<Ports> = Layer.mergeAll(
  Layer.succeed(Files, filesLive),
  Layer.succeed(Tools, toolsLive),
  Layer.succeed(Code, codeLive),
  Layer.succeed(Out, outLive),
  Layer.succeed(Runner, runnerLive),
)
