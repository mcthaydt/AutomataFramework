import { expect, test } from 'vitest'
import { parseArgs } from '#src/features/cli/args.ts'

test('reads a command, a folder and its flags', () => {
  expect(parseArgs(['check', 'my game', '--only', 'files', '--json'])).toEqual({
    command: 'check',
    folder: 'my game',
    flags: { only: 'files', json: true },
    rest: [],
  })
})

test('a flag may carry its value after an equals sign, and words after the folder are kept', () => {
  expect(parseArgs(['check', '--only=files', 'here', 'more'])).toEqual({
    command: 'check',
    folder: 'here',
    flags: { only: 'files' },
    rest: ['more'],
  })
})

test('no folder is no folder', () => {
  expect(parseArgs(['replay', '--accept'])).toEqual({ command: 'replay', flags: { accept: true }, rest: [] })
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
    problem: 'automata check does not have an option called --wat. Run automata check --help to see its options.',
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
