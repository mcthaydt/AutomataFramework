// The words after `automata`, read into a command, a folder and flags. Pure: it prints nothing and starts nothing, so
// one small test file covers every way a person can mistype. A problem is the whole sentence to print.
// Ported in shape from AutomataFrameworkFailed@ed8592e8: packages/tools/src/app/cli.ts (one small file parses the
// words; the work is in files a test runs with fakes).

export type CommandName = 'create' | 'check' | 'play' | 'replay' | 'art' | 'add' | 'words' | 'mcp'

/** The commands, in the order help lists them. One row per command in `cli.ts`'s table. */
export const COMMAND_NAMES: readonly CommandName[] = [
  'create',
  'check',
  'play',
  'replay',
  'art',
  'add',
  'words',
  'mcp',
]

/** A command and what was typed after it. */
export interface CommandInput {
  readonly command: CommandName
  /** The first word after the command that is not a flag: a folder, or for `create` the new game's name. */
  readonly folder?: string
  readonly flags: Readonly<Record<string, string | true>>
  /** Flags that take a value and then any more words, like `--read es keeper.hello`: every word, the value first. */
  readonly lists: Readonly<Record<string, readonly string[]>>
  /** Words after the folder. */
  readonly rest: readonly string[]
}

export type Parsed =
  | CommandInput
  | { readonly help: CommandName | 'root' }
  | { readonly version: true }
  | { readonly problem: string }

interface Flags {
  /** Flags that stand alone, like `--json`. */
  readonly switches: readonly string[]
  /** Flags that take a value, like `--only files`. */
  readonly values: readonly string[]
  /** Flags that take a value and then every word up to the next flag, like `--read es keeper.hello keeper.bye`. */
  readonly lists: readonly string[]
}

/** The flags each command knows. A flag a command does not know is a problem, so a typo is never ignored. */
const FLAGS: Readonly<Record<CommandName, Flags>> = {
  create: { switches: ['json'], values: ['framework', 'source'], lists: [] },
  check: { switches: ['fix', 'json'], values: ['only'], lists: [] },
  play: { switches: ['no-open'], values: ['port'], lists: [] },
  replay: { switches: ['accept', 'state', 'json'], values: [], lists: [] },
  art: { switches: ['check', 'json'], values: [], lists: [] },
  add: { switches: ['json'], values: ['type', 'path', 'about'], lists: [] },
  words: { switches: ['json'], values: [], lists: ['read'] },
  mcp: { switches: [], values: [], lists: [] },
}

const isCommand = (word: string): word is CommandName => (COMMAND_NAMES as readonly string[]).includes(word)

const noCommand = (word: string): Parsed => ({
  problem: `There is no command called "${word}". Run automata --help to see the commands.`,
})

/** Reads everything typed after `automata`. */
export function parseArgs(args: readonly string[]): Parsed {
  const [first, ...after] = args
  if (first === undefined || first === '--help' || first === '-h') return { help: 'root' }
  if (first === 'help') {
    const [about] = after
    return about === undefined ? { help: 'root' } : isCommand(about) ? { help: about } : noCommand(about)
  }
  if (first === '--version') return { version: true }
  if (!isCommand(first)) return noCommand(first)

  const known = FLAGS[first]
  const flags: Record<string, string | true> = {}
  const lists: Record<string, string[]> = {}
  const words: string[] = []
  for (let i = 0; i < after.length; i++) {
    const word = after[i] as string
    if (word === '--help' || word === '-h') return { help: first }
    if (!word.startsWith('--')) {
      words.push(word)
      continue
    }
    const [name = '', inline] = word.slice(2).split(/=(.*)/s, 2)
    if (known.lists.includes(name)) {
      // The value, then every word up to the next flag: those words belong to the flag, not to the folder.
      const head = inline ?? after[i + 1]
      if (head === undefined || head.startsWith('--'))
        return { problem: `--${name} needs a language after it, like --${name} es.` }
      if (inline === undefined) i++
      const list = [head]
      for (let next = after[i + 1]; next !== undefined && !next.startsWith('--'); next = after[i + 1]) {
        list.push(next)
        i++
      }
      lists[name] = list
    } else if (known.values.includes(name)) {
      const value = inline ?? after[++i]
      if (value === undefined || value.startsWith('--'))
        return { problem: `--${name} needs a value after it, like --${name} <value>.` }
      flags[name] = value
    } else if (known.switches.includes(name) && inline === undefined) {
      flags[name] = true
    } else {
      return {
        problem: `automata ${first} does not have an option called --${name}. Run automata ${first} --help to see its options.`,
      }
    }
  }
  const [folder, ...rest] = words
  return folder === undefined
    ? { command: first, flags, lists, rest }
    : { command: first, folder, flags, lists, rest }
}
