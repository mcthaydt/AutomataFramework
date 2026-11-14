import { Effect } from 'effect'
import { expect, test } from 'vitest'
import { main } from '#src/features/cli/cli.ts'
import { readGame } from '#src/features/cli/game-folder.ts'
import { CliError, type GameCode } from '#src/features/cli/ports.ts'
import * as framework from '#src/headless.ts'
import { smallGame, under } from '../../fixtures/cli/game.ts'
import { type Memory, memoryLayer } from '../../fixtures/cli/memory.ts'

const read = (memory: Memory, folder = 'game') => Effect.runPromise(readGame(folder).pipe(Effect.provide(memory.layer)))
const failure = async (memory: Memory, folder = 'game'): Promise<string> => {
  const result = await Effect.runPromise(Effect.either(readGame(folder).pipe(Effect.provide(memory.layer))))
  if (result._tag === 'Right') throw new Error('readGame did not fail')
  return result.left.message
}

test('a folder with no automata.toml is not a game', async () => {
  const memory = memoryLayer({})
  expect(await failure(memory)).toBe(
    "game is not a game: it has no automata.toml. Go to your game's folder, or name it: automata check <folder>.",
  )
})

test('the same sentence, exit 2, from the command, in a folder with a space in its name', async () => {
  const memory = memoryLayer({})
  expect(await main(['check', 'my games/first one'], memory.layer)).toBe(2)
  expect(memory.err).toEqual([
    "my games/first one is not a game: it has no automata.toml. Go to your game's folder, or name it: automata check <folder>.",
  ])
  expect(memory.out).toEqual([])
})

test('a game is read with its own copy of the framework, and its recordings are listed', async () => {
  const memory = memoryLayer(
    under('game', {
      ...smallGame(),
      'replays/b.json': '{}',
      'replays/a.json': '{}',
      'replays/notes.txt': 'not a recording',
    }),
  )
  const game = await read(memory)
  expect(game.loaded.ok).toBe(true)
  expect(game.code?.framework).toBe(framework)
  expect(game.content).toBe(framework)
  expect(game.recordings).toEqual(['replays/a.json', 'replays/b.json'])
  expect(game.codeProblem).toBeUndefined()
  expect(game.codeError).toBeUndefined()
})

test('a game that is not installed is still read, with the command\'s own copy of the framework', async () => {
  const notInstalled = new CliError("This game's tools are not installed yet. Run npm install in game, then try again.")
  const memory = memoryLayer(under('game', smallGame()), { code: notInstalled })
  const game = await read(memory)
  expect(game.loaded.ok).toBe(true)
  expect(game.code).toBeUndefined()
  expect(game.codeError).toBe(notInstalled.message)
  expect(typeof game.content.loadGame).toBe('function')
})

test('broken rules give the problem, and the game\'s framework is still there for its files (audit M1)', async () => {
  const code: GameCode = {
    framework,
    rules: { problem: { file: 'src/headless.ts', path: '', message: 'This file is missing.' } },
  }
  const memory = memoryLayer(under('game', smallGame()), { code })
  const game = await read(memory)
  expect(game.code?.framework).toBe(framework)
  expect(game.codeProblem).toEqual({ file: 'src/headless.ts', path: '', message: 'This file is missing.' })
})

test('a game whose files do not read still comes back, with the problems', async () => {
  const files = under('game', smallGame())
  files['game/content/levels/level-1.json'] = '{ not json'
  const game = await read(memoryLayer(files))
  expect(game.loaded.ok).toBe(false)
})

test('a game at the root of the files is read from "."', async () => {
  const game = await read(memoryLayer(smallGame()), '.')
  expect(game.loaded.ok).toBe(true)
})
