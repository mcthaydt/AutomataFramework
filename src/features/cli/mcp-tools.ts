// The tools `automata mcp` offers an agent. `create`, `check` and `replay` are the commands themselves, run as a child
// process through `Runner.command` with `--json` (audit C1: this long-lived server never loads a game's code, so every
// answer comes from the files as they are now); `content_types`, `schema` and `skill` read what the package ships; the
// `play_` tools run a game a few ticks at a time (`session.ts`). Every description is one sentence that says when to use
// the tool, and every answer is one text block.
import { basename, join } from 'node:path'
import { Effect } from 'effect'
import { z } from '../../lib/zod.ts'
import { kinds, schemaOf, skills } from './mcp-library.ts'
import { CliError, type Ports, Runner } from './ports.ts'
import type { Sessions } from './session.ts'

/** What a tool answers: the text, and whether it says something is wrong (so an agent reads it as a problem). */
export interface ToolAnswer {
  readonly text: string
  readonly isError?: boolean
}

export interface McpTool {
  readonly name: string
  readonly description: string
  /** What the tool's input must look like; the server refuses anything else before the tool runs. */
  readonly inputSchema: z.ZodType
  readonly run: (input: unknown) => Effect.Effect<ToolAnswer, CliError, Ports>
}

const json = (value: unknown, isError = false): ToolAnswer => ({
  text: JSON.stringify(value, null, 2),
  ...(isError ? { isError } : {}),
})

/** A tool, with its `run` given the input its schema has already read. */
function tool<S extends z.ZodType>(
  name: string,
  description: string,
  inputSchema: S,
  run: (input: z.output<S>) => Effect.Effect<ToolAnswer, CliError, Ports>,
): McpTool {
  return { name, description, inputSchema, run: (input) => run(input as z.output<S>) }
}

/** `automata <words> --json` in a child process; an exit status other than 0 is a result that says so, with its JSON. */
const command = (words: readonly string[]): Effect.Effect<ToolAnswer, CliError, Ports> =>
  Effect.flatMap(Runner, (runner) => runner.command(words, '.')).pipe(
    Effect.map((answer) => json(answer.json, answer.code !== 0)),
  )

/** The recording a name stands for: `level-1`, `level-1.json` and `replays/level-1.json` all mean the same file. */
const recordingPath = (folder: string, name: string): string =>
  join(folder, 'replays', basename(name.endsWith('.json') ? name : `${name}.json`))

const folder = z.string().describe("The game's folder.")
const session = z.string().describe('The session name play_start gave, like s1.')

/** The tools of one server, in the order `tools/list` gives them. `sessions` is the server's own play sessions. */
export function mcpTools(sessions: Sessions): readonly McpTool[] {
  return [
    tool(
      'create',
      'Make a new game in a new folder: use it to start a game, and it answers the files it wrote.',
      z.object({
        folder: z.string().describe('The new folder, named in small letters, numbers and dashes.'),
      }),
      (input) => command(['create', input.folder]),
    ),
    tool(
      'check',
      "Say whether a game is sound and what to fix: use it after every change to the game's files or code.",
      z.object({
        folder,
        only: z.string().optional().describe('Run one step: files, rules, lint, types, replays or tests.'),
        fix: z
          .boolean()
          .optional()
          .describe('Rewrite content files the standard way, and fix style where safe.'),
      }),
      (input) =>
        command([
          'check',
          input.folder,
          ...(input.only === undefined ? [] : ['--only', input.only]),
          ...(input.fix === true ? ['--fix'] : []),
        ]),
    ),
    tool(
      'replay',
      "Play a game's recordings and check each ends where it was recorded: use it to see whether a change altered how the game plays.",
      z.object({
        folder,
        file: z
          .string()
          .optional()
          .describe('One recording by name, like level-1; leave it out for all of them.'),
        accept: z.boolean().optional().describe('Record again with the hashes the game gives now.'),
        state: z.boolean().optional().describe('Also answer where everything is after the last tick.'),
      }),
      (input) =>
        command([
          'replay',
          input.file === undefined ? input.folder : recordingPath(input.folder, input.file),
          ...(input.accept === true ? ['--accept'] : []),
          ...(input.state === true ? ['--state'] : []),
        ]),
    ),
    tool(
      'content_types',
      'List the kinds of content file a game has, what each holds and where its files go.',
      z.object({}),
      () => Effect.map(kinds(), (all) => json(all)),
    ),
    tool(
      'schema',
      'Read the JSON Schema of one kind of content file, or of a recording (replay): use it before you write a file of that kind.',
      z.object({ type: z.string().describe('A kind from content_types, or replay.') }),
      (input) => Effect.map(schemaOf(input.type), (schema) => json(schema)),
    ),
    tool(
      'skill',
      "Read how to work on a game: with no name it lists the skills and when to read each, with a name it gives that skill's text.",
      z.object({ name: z.string().optional().describe('A skill from the list.') }),
      (input) =>
        Effect.flatMap(skills(), (all) => {
          if (input.name === undefined)
            return Effect.succeed(json(all.map(({ name, description }) => ({ name, description }))))
          const found = all.find((skill) => skill.name === input.name)
          return found === undefined
            ? Effect.fail(
                new CliError(
                  `There is no skill called "${input.name}". The skills are: ${all.map((skill) => skill.name).join(', ')}.`,
                ),
              )
            : Effect.succeed({ text: found.text })
        }),
    ),
    tool(
      'play_start',
      'Start playing a game so you can run it a few ticks at a time and see where everything is: it answers a session name.',
      z.object({
        folder,
        level: z.string().optional().describe("A level's name; leave it out for the game's first level."),
        players: z
          .array(z.number())
          .optional()
          .describe('The players, like [1, 2]; leave it out for one player.'),
        seed: z.number().optional().describe('The random seed; leave it out for 1.'),
      }),
      (input) =>
        Effect.map(
          sessions.start({
            folder: input.folder,
            ...(input.level === undefined ? {} : { level: input.level }),
            ...(input.players === undefined ? {} : { players: input.players }),
            ...(input.seed === undefined ? {} : { seed: input.seed }),
          }),
          (started) => json(started),
        ),
    ),
    tool(
      'play_step',
      'Run a started game for some ticks with some actions held, and read where everything is: 60 ticks are one second.',
      z.object({
        session,
        ticks: z.number().describe('How many ticks to play, from 1 to 3600.'),
        hold: z
          .record(z.string(), z.array(z.string()))
          .optional()
          .describe('The actions each player holds for all of these ticks, like {"1": ["right"]}.'),
      }),
      (input) =>
        Effect.map(sessions.step(input.session, input.ticks, input.hold ?? {}), (stepped) => json(stepped)),
    ),
    tool(
      'play_state',
      'Read where everything is in a started game without playing any ticks.',
      z.object({ session }),
      (input) => Effect.map(sessions.state(input.session), (state) => json({ state })),
    ),
    tool(
      'play_save',
      "Save what a started game has played so far as a recording in the game's replays/ folder, so automata replay can play it again.",
      z.object({
        session,
        file: z.string().describe("The recording's name: small letters, numbers and dashes."),
      }),
      (input) => Effect.map(sessions.save(input.session, input.file), (saved) => json(saved)),
    ),
    tool('play_stop', 'End a started game when you are done with it.', z.object({ session }), (input) =>
      Effect.as(sessions.stop(input.session), json({ stopped: true })),
    ),
  ]
}
