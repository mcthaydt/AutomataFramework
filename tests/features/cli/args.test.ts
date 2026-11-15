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

test('add reads its kind, its path and its note as values, and the folder before them', () => {
  const words = ['add', 'game', '--type', 'figure', '--path=content/figures/keeper.json']
  expect(parseArgs([...words, '--about', 'The keeper.', '--json'])).toEqual({
    command: 'add',
    folder: 'game',
    flags: { type: 'figure', path: 'content/figures/keeper.json', about: 'The keeper.', json: true },
    lists: {},
    rest: [],
  })
  expect(parseArgs(['add', '--type'])).toEqual({
    problem: '--type needs a value after it, like --type <value>.',
  })
  expect(parseArgs(['add', '--check'])).toMatchObject({ problem: expect.stringContaining('--check') })
})

test('scene reads its action, its level and its folder, and --as', () => {
  expect(parseArgs(['scene', 'from-level', 'level-1'])).toEqual({
    command: 'scene',
    flags: {},
    lists: {},
    rest: [],
    action: 'from-level',
    level: 'level-1',
  })
  expect(parseArgs(['scene', 'from-level', 'level-1', 'my game', '--as', 'meadow', '--json'])).toEqual({
    command: 'scene',
    folder: 'my game',
    flags: { as: 'meadow', json: true },
    lists: {},
    rest: [],
    action: 'from-level',
    level: 'level-1',
  })
})

test('scene without an action, with one it does not know, or without a level says what to type', () => {
  expect(parseArgs(['scene'])).toEqual({
    problem: 'automata scene needs an action, like: automata scene from-level level-1',
  })
  expect(parseArgs(['scene', 'frm-level', 'level-1'])).toEqual({
    problem:
      'automata scene does not know "frm-level". What it can do is: from-level, like: automata scene from-level level-1',
  })
  expect(parseArgs(['scene', 'from-level'])).toEqual({
    problem: 'automata scene from-level needs the level to move, like: automata scene from-level level-1',
  })
})
