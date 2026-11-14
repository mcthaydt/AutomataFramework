import { expect, test } from 'vitest'
import { main } from '#src/features/cli/cli.ts'
import { smallGame, under } from '../../fixtures/cli/game.ts'
import { memoryLayer } from '../../fixtures/cli/memory.ts'

const LEVEL = 'content/levels/level-1.json'
const game = (changes: Record<string, string> = {}) => ({ ...smallGame(), ...changes })

test('it starts vite in the game folder with --open', async () => {
  const memory = memoryLayer(under('game', game()))
  expect(await main(['play', 'game'], memory.layer)).toBe(0)
  expect(memory.out).toEqual(['Starting Crate Game. Press Ctrl+C to stop.'])
  expect(memory.ran).toEqual([{ tool: 'vite', args: ['--open'], cwd: 'game', how: 'serve' }])
})

test('--no-open leaves it out, and --port 4000 passes it on', async () => {
  const memory = memoryLayer(under('game', game()))
  expect(await main(['play', 'game', '--no-open', '--port', '4000'], memory.layer)).toBe(0)
  expect(memory.ran.map((call) => call.args)).toEqual([['--port', '4000']])
})

test('--port wat is refused before anything starts', async () => {
  const memory = memoryLayer(under('game', game()))
  expect(await main(['play', 'game', '--port', 'wat'], memory.layer)).toBe(2)
  expect(memory.err).toEqual(['--port needs a number, like --port 4000.'])
  expect(memory.ran).toEqual([])
})

test('not a game: the sentence, and vite is never started', async () => {
  const memory = memoryLayer({})
  expect(await main(['play', 'nowhere'], memory.layer)).toBe(2)
  expect(memory.err).toEqual([
    "nowhere is not a game: it has no automata.toml. Go to your game's folder, or name it: automata check <folder>.",
  ])
  expect(memory.ran).toEqual([])
})

test('vite not installed: the npm install sentence, exit 2', async () => {
  const memory = memoryLayer(under('game', game()), { tools: { vite: 'missing' } })
  expect(await main(['play', 'game'], memory.layer)).toBe(2)
  expect(memory.err).toEqual(["This game's tools are not installed yet. Run npm install in game, then try again."])
})

test('a broken content file is printed first, and the game still starts', async () => {
  const level = JSON.parse(smallGame()[LEVEL] as string) as { things: { x: unknown }[] }
  ;(level.things[0] as { x: unknown }).x = 'far'
  const memory = memoryLayer(under('game', game({ [LEVEL]: `${JSON.stringify(level, null, 2)}\n` })))
  expect(await main(['play', 'game'], memory.layer)).toBe(0)
  expect(memory.out).toEqual([
    'content/levels/level-1.json: things[0].x: This must be a number.',
    'Starting Crate Game. Press Ctrl+C to stop.',
  ])
  expect(memory.ran).toHaveLength(1)
})

test("vite's own exit code is the command's", async () => {
  const memory = memoryLayer(under('game', game()), { tools: { vite: { code: 3, output: '' } } })
  expect(await main(['play', 'game'], memory.layer)).toBe(3)
})
