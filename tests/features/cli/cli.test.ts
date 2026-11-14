import { Effect, Layer } from 'effect'
import { expect, test } from 'vitest'
import { main } from '#src/features/cli/cli.ts'
import { Out } from '#src/features/cli/ports.ts'
import { FRAMEWORK_VERSION } from '#src/features/sim/sim.ts'
import { memoryLayer } from '../../fixtures/cli/memory.ts'

// The words the help prints, as a person reads them. Written out here, so a change to the help is a change to a test.
const ROOT_HELP = `automata: make a game, check it, play it.

  automata create <name>   Make a new game in a new folder called <name>.
  automata check           Say whether this game is sound, and what to fix if it is not.
  automata play            Play this game in your browser.
  automata replay          Play this game's recordings and check they end where they did.
  automata mcp             Let an agent use these commands (an MCP server).

Run a command with --help to see its options. Each works on the game in this folder, or in the folder you name.`

test('automata with no words prints the help and exits 0', async () => {
  const memory = memoryLayer({})
  expect(await main([], memory.layer)).toBe(0)
  expect(memory.out).toEqual([ROOT_HELP])
  expect(memory.err).toEqual([])
})

test('--help and help give the same words', async () => {
  for (const args of [['--help'], ['help'], ['-h']]) {
    const memory = memoryLayer({})
    expect(await main(args, memory.layer)).toBe(0)
    expect(memory.out).toEqual([ROOT_HELP])
  }
})

test('a command with --help prints its own help', async () => {
  const memory = memoryLayer({})
  expect(await main(['check', '--help'], memory.layer)).toBe(0)
  expect(memory.out[0]).toMatch(/^automata check \[folder\]\n/)
  expect(memory.out[0]).toContain('--only <step>  Run one step.')
})

test('automata mcp --help says what an agent’s program does with it', async () => {
  const memory = memoryLayer({})
  expect(await main(['mcp', '--help'], memory.layer)).toBe(0)
  expect(memory.out).toEqual([
    `automata mcp

Lets an agent use automata's commands as tools, over the Model Context Protocol. An agent's own program starts
this; it waits for messages and prints nothing a person reads. A game made by automata create is already set up
for it, in .mcp.json.`,
  ])
})

test('automata --version prints the framework version', async () => {
  const memory = memoryLayer({})
  expect(await main(['--version'], memory.layer)).toBe(0)
  expect(memory.out).toEqual([FRAMEWORK_VERSION])
})

test('an unknown command says so on stderr and exits 2', async () => {
  const memory = memoryLayer({})
  expect(await main(['chekc'], memory.layer)).toBe(2)
  expect(memory.err).toEqual(['There is no command called "chekc". Run automata --help to see the commands.'])
  expect(memory.out).toEqual([])
})

test('an error nobody planned for is reported, not thrown', async () => {
  const memory = memoryLayer({})
  // A terminal that fails once: the command cannot print, which nobody planned for.
  const broken = Layer.succeed(Out, {
    line: () =>
      Effect.sync(() => {
        throw new Error('the pipe broke')
      }),
    error: (text) => Effect.sync(() => void memory.err.push(text)),
  })
  expect(await main(['--help'], Layer.mergeAll(memory.layer, broken))).toBe(2)
  expect(memory.err).toHaveLength(1)
  expect(memory.err[0]).toMatch(/^Something went wrong inside automata\. Please report this:\n/)
  expect(memory.err[0]).toContain('the pipe broke')
})
