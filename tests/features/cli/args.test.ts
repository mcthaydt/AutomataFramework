import { expect, test } from 'vitest'
import { parseArgs } from '#src/features/cli/args.ts'

test('reads a command, a folder and its flags', () => {
  expect(parseArgs(['check', 'my game', '--only', 'files', '--json'])).toEqual({
    command: 'check',
    folder: 'my game',
    flags: { only: 'files', json: true },
    lists: {},
    rest: [],
  })
})

test('a flag may carry its value after an equals sign, and words after the folder are kept', () => {
  expect(parseArgs(['check', '--only=files', 'here', 'more'])).toEqual({
    command: 'check',
    folder: 'here',
    flags: { only: 'files' },
    lists: {},
    rest: ['more'],
  })
})

test('no folder is no folder', () => {
  expect(parseArgs(['replay', '--accept'])).toEqual({
    command: 'replay',
    flags: { accept: true },
    lists: {},
    rest: [],
  })
})

test('--help and -h, alone or after a command, and the word help', () => {
  expect(parseArgs([])).toEqual({ help: 'root' })
  expect(parseArgs(['--help'])).toEqual({ help: 'root' })
  expect(parseArgs(['-h'])).toEqual({ help: 'root' })
  expect(parseArgs(['help'])).toEqual({ help: 'root' })
  expect(parseArgs(['check', '-h'])).toEqual({ help: 'check' })
  expect(parseArgs(['replay', 'somewhere', '--help'])).toEqual({ help: 'replay' })
  expect(parseArgs(['help', 'play'])).toEqual({ help: 'play' })
})

test('--version', () => expect(parseArgs(['--version'])).toEqual({ version: true }))

test('an unknown word is a problem that names it', () => {
  expect(parseArgs(['chekc'])).toEqual({
    problem: 'There is no command called "chekc". Run automata --help to see the commands.',
  })
  expect(parseArgs(['help', 'chekc'])).toEqual({
    problem: 'There is no command called "chekc". Run automata --help to see the commands.',
  })
})

test('an option the command does not have is a problem that says where to see its options', () => {
  expect(parseArgs(['check', '--wat'])).toEqual({
    problem:
      'automata check does not have an option called --wat. Run automata check --help to see its options.',
  })
  // An option of another command is not this command's.
  expect(parseArgs(['check', '--accept'])).toMatchObject({ problem: expect.stringContaining('--accept') })
  // A switch is not given a value.
  expect(parseArgs(['check', '--json=yes'])).toMatchObject({ problem: expect.stringContaining('--json') })
})

test('an option that needs a value and has none is a problem', () => {
  expect(parseArgs(['check', '--only'])).toEqual({
    problem: '--only needs a value after it, like --only <value>.',
  })
  expect(parseArgs(['play', '--port', '--no-open'])).toEqual({
    problem: '--port needs a value after it, like --port <value>.',
  })
})

// `automata words --read es keeper.hello`: a flag that takes a language and then the words it applies to.
test('--read takes a language and every word after it up to the next option', () => {
  expect(parseArgs(['words', '--read', 'es', 'keeper.hello', 'keeper.bye', '--json'])).toEqual({
    command: 'words',
    flags: { json: true },
    lists: { read: ['es', 'keeper.hello', 'keeper.bye'] },
    rest: [],
  })
  expect(parseArgs(['words', 'my-game', '--read', 'es'])).toMatchObject({
    folder: 'my-game',
    lists: { read: ['es'] },
  })
  expect(parseArgs(['words', '--read=es', 'keeper.hello'])).toMatchObject({
    lists: { read: ['es', 'keeper.hello'] },
  })
})

test('--read with no language is a problem, and so is a list flag on a command that has none', () => {
  expect(parseArgs(['words', '--read'])).toEqual({
    problem: '--read needs a language after it, like --read es.',
  })
  expect(parseArgs(['words', '--read', '--json'])).toEqual({
    problem: '--read needs a language after it, like --read es.',
  })
  expect(parseArgs(['check', '--read', 'es'])).toMatchObject({ problem: expect.stringContaining('--read') })
})

test('every command has a lists table, empty unless it has a list flag', () => {
  expect(parseArgs(['check'])).toMatchObject({ lists: {} })
})

test('world takes a folder and --json, and no other flag', () => {
  expect(parseArgs(['world', 'my-game', '--json'])).toEqual({
    command: 'world',
    folder: 'my-game',
    flags: { json: true },
    lists: {},
    rest: [],
  })
  expect(parseArgs(['world', '--check'])).toEqual({
    problem:
      'automata world does not have an option called --check. Run automata world --help to see its options.',
  })
  expect(parseArgs(['help', 'world'])).toEqual({ help: 'world' })
})

test('picture reads its words as levels, and takes --folder, --what-it-is and --world', () => {
  expect(parseArgs(['picture', 'room-1', 'room-2', '--what-it-is', '--folder', 'my-game'])).toEqual({
    command: 'picture',
    folder: 'room-1',
    flags: { 'what-it-is': true, folder: 'my-game' },
    lists: {},
    rest: ['room-2'],
  })
  expect(parseArgs(['picture', '--world', '--json'])).toEqual({
    command: 'picture',
    flags: { world: true, json: true },
    lists: {},
    rest: [],
  })
  expect(parseArgs(['picture', '--folder'])).toEqual({
    problem: '--folder needs a value after it, like --folder <value>.',
  })
  expect(parseArgs(['picture', '--check'])).toMatchObject({ problem: expect.stringContaining('--check') })
})

test('check takes --ship as a switch', () => {
  expect(parseArgs(['check', 'game', '--ship'])).toEqual({
    command: 'check',
    folder: 'game',
    flags: { ship: true },
    lists: {},
    rest: [],
  })
})
