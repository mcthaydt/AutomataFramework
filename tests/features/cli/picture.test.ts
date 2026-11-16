import { expect, test } from 'vitest'
import { main } from '#src/features/cli/cli.ts'
import type { PictureReport } from '#src/features/cli/picture.ts'
import { paintLevel, writeContent } from '#src/features/content/content.ts'
import { encodePng } from '#src/lib/png.ts'
import { under } from '../../fixtures/cli/game.ts'
import { type Memory, memoryLayer } from '../../fixtures/cli/memory.ts'
import { linksFiles, loadLinksGame } from '../../fixtures/links-game/read.ts'

/** The links game in the folder `game`, with some files replaced (or taken out, with `undefined`). */
function game(changes: Readonly<Record<string, string | undefined>> = {}): Memory {
  const present = Object.fromEntries(
    Object.entries(linksFiles(changes)).filter((entry): entry is [string, string] => entry[1] !== undefined),
  )
  return memoryLayer(under('game', present))
}

/** Runs `automata picture <args> --folder game` and gives the exit code and what it said. */
async function run(
  memory: Memory,
  ...args: string[]
): Promise<{ code: number; out: string[]; err: string[] }> {
  const out = memory.out.length
  const err = memory.err.length
  const code = await main(['picture', ...args, '--folder', 'game'], memory.layer)
  return { code, out: memory.out.slice(out), err: memory.err.slice(err) }
}

/** What is in the folder the pictures go in. */
const pictures = (memory: Memory): string[] =>
  [...memory.files.keys()].filter((path) => path.startsWith('game/.automata/')).sort()

const PNG = [137, 80, 78, 71]

test('a level named is drawn as it plays: one file, its path said, and no numbers to explain', async () => {
  const memory = game()
  const { code, out, err } = await run(memory, 'room-2')
  expect(code).toBe(0)
  expect(out).toEqual(['.automata/pictures/room-2.png'])
  expect(err).toEqual([])
  expect(pictures(memory)).toEqual(['game/.automata/pictures/room-2.png'])
  const bytes = memory.files.get('game/.automata/pictures/room-2.png') as Uint8Array
  expect([...bytes.slice(0, 4)]).toEqual(PNG)
  // The file is the framework's own picture of the level, byte for byte.
  expect([...bytes]).toEqual([...encodePng(paintLevel(await loadLinksGame(), 'room-2').picture)])
})

test('--what-it-is draws what the things hold, and says in words what each number is', async () => {
  const memory = game()
  const { code, out } = await run(memory, 'room-2', '--what-it-is')
  expect(code).toBe(0)
  expect(out).toEqual([
    '.automata/pictures/room-2.what.png',
    '1  room-2 door-in  to  to room-1, beside exit',
    '2  room-2 critter-1  walk  a path of 2 points: 7.5, 7.5 then 9.5, 7.5',
    '3  room-2 critter-1  reach  3',
    '4  room-2 button-1  opens  gate-1',
    '5  room-2 button-1  stays  yes',
  ])
  expect(pictures(memory)).toEqual(['game/.automata/pictures/room-2.what.png'])
})

test('with no level named, every level is drawn, in name order', async () => {
  const memory = game()
  const { code, out } = await run(memory)
  expect(code).toBe(0)
  expect(out).toEqual([
    '.automata/pictures/room-1.png',
    '.automata/pictures/room-2.png',
    '.automata/pictures/room-3.png',
  ])
})

test('--world alone draws only the map, and says each level and each door', async () => {
  const memory = game()
  const { code, out } = await run(memory, '--world')
  expect(code).toBe(0)
  expect(out).toEqual([
    '.automata/pictures/world.png',
    '1  room-1  level  at 0, 0',
    '2  room-2  level  at 20, 0',
    '3  room-3  level  at 36, 0',
    '4  room-1 exit  door  to room-2, beside door-in',
    '5  room-2 door-in  door  to room-1, beside exit',
    '6  room-3 back  door  to room-1, beside exit',
  ])
  expect(pictures(memory)).toEqual(['game/.automata/pictures/world.png'])
})

test('--world with a level named draws both', async () => {
  const memory = game()
  const { out } = await run(memory, 'room-1', '--world')
  expect(out.filter((line) => line.startsWith('.automata/'))).toEqual([
    '.automata/pictures/room-1.png',
    '.automata/pictures/world.png',
  ])
})

test('--json answers each picture with its kind, level, path and legend, and nothing else', async () => {
  const memory = game()
  const { code, out } = await run(memory, 'room-2', '--what-it-is', '--world', '--json')
  expect(code).toBe(0)
  const report = JSON.parse(out.join('\n')) as PictureReport
  expect(report.ok).toBe(true)
  expect(report.pictures.map((p) => [p.kind, p.level, p.path, p.legend.length])).toEqual([
    ['what-it-is', 'room-2', '.automata/pictures/room-2.what.png', 5],
    ['world', null, '.automata/pictures/world.png', 6],
  ])
  expect(report.pictures[0]?.legend[0]).toEqual({
    n: 1,
    level: 'room-2',
    thing: 'door-in',
    value: 'to',
    shown: 'tag',
    says: 'to room-1, beside exit',
  })
})

test('a level that is not there is one sentence that names the levels, exit 2, and nothing is written', async () => {
  const memory = game()
  const { code, out, err } = await run(memory, 'room-1', 'room-9')
  expect(code).toBe(2)
  expect(out).toEqual([])
  expect(err).toEqual(['There is no level called "room-9". The levels are: room-1, room-2, room-3.'])
  expect(pictures(memory)).toEqual([])
})

test('a game that does not load draws nothing and says why, exit 1', async () => {
  const memory = game({ 'content/levels/room-2.json': '{ "format": 1 }' })
  const { code, out, err } = await run(memory, 'room-1')
  expect(code).toBe(1)
  expect(out).toEqual([])
  expect(err).toHaveLength(1)
  expect(err[0]).toMatch(/^The game does not load, so nothing was painted\. content\/levels\//)
  expect(pictures(memory)).toEqual([])
})

test('a game with no world file has no map to draw, and the levels named are still drawn', async () => {
  const memory = game({
    'automata.toml': (linksFiles()['automata.toml'] ?? '').replace(
      '\n[[content]]\ntype = "world"\npath = "content/worlds/world.json"\n',
      '',
    ),
    'content/worlds/world.json': undefined,
  })
  const { code, out, err } = await run(memory, 'room-1', '--world')
  expect(code).toBe(1)
  expect(out).toEqual(['.automata/pictures/room-1.png'])
  expect(err).toEqual([
    'This game has no world file, so there is no map to draw. Write one in content/worlds/ and list it in automata.toml.',
  ])
})

test('a map that cannot fit in one picture says so, and how to draw the levels instead', async () => {
  const world = {
    format: 1,
    id: 'world',
    levels: [
      { level: 'room-1', at: { x: 0, y: 0 } },
      { level: 'room-2', at: { x: 5000, y: 0 } },
    ],
  }
  const memory = game({ 'content/worlds/world.json': writeContent('world', world as never) })
  const { code, err } = await run(memory, '--world')
  expect(code).toBe(1)
  expect(err).toEqual([
    'The map is too big for one picture. Name the levels you want: automata picture room-1 room-2.',
  ])
  expect(pictures(memory)).toEqual([])
})

test('with no --folder it works on the game in the folder it is run in', async () => {
  const present = Object.fromEntries(
    Object.entries(linksFiles()).filter((entry): entry is [string, string] => entry[1] !== undefined),
  )
  const memory = memoryLayer(present)
  expect(await main(['picture', 'room-3'], memory.layer)).toBe(0)
  expect(memory.out).toEqual(['.automata/pictures/room-3.png'])
  expect(memory.files.has('.automata/pictures/room-3.png')).toBe(true)
})

test('the picture command has its help', async () => {
  const memory = memoryLayer({})
  expect(await main(['picture', '--help'], memory.layer)).toBe(0)
  expect(memory.out[0]).toMatch(/^automata picture \[level …\]/)
  for (const flag of ['--what-it-is', '--world', '--folder', '--json']) expect(memory.out[0]).toContain(flag)
})
