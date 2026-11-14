// Every help text, written for a first-time author: no plan names, no constants, what each option does. Tests quote
// these, and the README names the same commands and flags (a test holds the two together).
import type { CommandName } from './args.ts'

export const ROOT_HELP = `automata: make a game, check it, play it.

  automata create <name>   Make a new game in a new folder called <name>.
  automata check           Say whether this game is sound, and what to fix if it is not.
  automata play            Play this game in your browser.
  automata replay          Play this game's recordings and check they end where they did.
  automata mcp             Let an agent use these commands (an MCP server).

Run a command with --help to see its options. Each works on the game in this folder, or in the folder you name.`

const CHECK_HELP = `automata check [folder]

Says whether the game is sound, one step after another, and what to fix if it is not.

  files     every content file reads, is listed, and is written the standard way
  rules     the game's rules can be replayed: no clock, no dice of their own, no files
  lint      the code's style (Biome)
  types     the code's types (TypeScript)
  replays   every recording in replays/ still ends where it did
  tests     the game's own tests (Vitest)

  --fix          Rewrite content files the standard way, and fix the code's style where that is safe.
  --only <step>  Run one step.
  --json         Print the answer as JSON, for an agent or another tool.`

const REPLAY_HELP = `automata replay [folder or file]

Plays this game's recordings, with nobody at the controls, and checks each ends where it was recorded.
A recording is a file in replays/: the keys that were held, tick by tick.

  --accept   Record again: keep the keys, write the hashes the game gives now.
  --state    Also print where everything is after the last tick.
  --json     Print the answer as JSON, for an agent or another tool.`

const CREATE_HELP = `automata create <name>

Makes a new game in a new folder called <name>: one level, a hero, a crate to push, and everything a game needs
to be checked and played. Use small letters, numbers and dashes, like my-game.

  --framework <spec>  Which framework the game installs. Leave it out for the one that made the game.
  --json              Print what was made as JSON.`

const PLAY_HELP = `automata play [folder]

Plays the game in your browser. It stays running and shows your changes as you make them. Press Ctrl+C to stop.

  --no-open     Do not open the browser: just print the address.
  --port <n>    Use this port.`

const MCP_HELP = `automata mcp

Lets an agent use automata's commands as tools, over the Model Context Protocol. An agent's own program starts
this; it waits for messages and prints nothing a person reads. A game made by automata create is already set up
for it, in .mcp.json.`

const HELP: Readonly<Record<CommandName | 'root', string>> = {
  root: ROOT_HELP,
  check: CHECK_HELP,
  replay: REPLAY_HELP,
  create: CREATE_HELP,
  play: PLAY_HELP,
  mcp: MCP_HELP,
}

/** The help for the whole command, or for one command. */
export function helpFor(about: CommandName | 'root'): string {
  return HELP[about]
}
