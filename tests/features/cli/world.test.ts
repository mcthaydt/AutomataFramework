import { expect, test } from 'vitest'
import { main } from '#src/features/cli/cli.ts'
import { describeWorld, type WorldReport } from '#src/features/cli/world.ts'
import { writeContent } from '#src/features/content/content.ts'
import { under } from '../../fixtures/cli/game.ts'
import { type Memory, memoryLayer } from '../../fixtures/cli/memory.ts'
import { linksFiles } from '../../fixtures/links-game/read.ts'

/** The links game in the folder `game`, with some files replaced (or taken out, with `undefined`). */
function game(changes: Readonly<Record<string, string | undefined>> = {}): Memory {
  const files = linksFiles(changes)
  const present = Object.fromEntries(
    Object.entries(files).filter((entry): entry is [string, string] => entry[1] !== undefined),
  )
  return memoryLayer(under('game', present))
}

/** Runs `automata world game <args>` and gives the exit code and what it said. */
async function run(
  memory: Memory,
  ...args: string[]
): Promise<{ code: number; out: string[]; err: string[] }> {
  const out = memory.out.length
  const err = memory.err.length
  const code = await main(['world', 'game', ...args], memory.layer)
  return { code, out: memory.out.slice(out), err: memory.err.slice(err) }
}

const reportOf = (out: readonly string[]): WorldReport => JSON.parse(out.join('\n')) as WorldReport

/** A `[[content]]` block of `automata.toml`, as the links fixture writes one. */
const listed = (type: string, path: string): string => `\n[[content]]\ntype = "${type}"\npath = "${path}"\n`

/** A level file: the links game's rows with a floor, and a start for each of its two players. */
const bareLevel = (id: string, tiles: readonly string[]): string =>
  writeContent('level', {
    format: 1,
    id,
    tiles,
    things: [],
    starts: [
      { player: 1, x: 2.5, y: 7.5 },
      { player: 2, x: 3.5, y: 7.5 },
    ],
  } as never)

const project = (more: string, without = ''): string =>
  `${linksFiles()['automata.toml']}${more}`.replace(without, '')

test('the report lists every level, door and join, and the places they make', async () => {
  const memory = game()
  const { code, out } = await run(memory, '--json')
  expect(code).toBe(0)
  expect(reportOf(out)).toEqual({
    ok: true,
    levels: [
      { level: 'room-1', at: { x: 0, y: 0 }, size: { w: 16, h: 9 }, start: true, order: 0 },
      { level: 'room-2', at: { x: 20, y: 0 }, size: { w: 16, h: 9 }, start: false, order: 1 },
      { level: 'room-3', at: { x: 36, y: 0 }, size: { w: 16, h: 9 }, start: false, order: 2 },
    ],
    doors: [
      { from: { level: 'room-1', thing: 'exit' }, to: { level: 'room-2', thing: 'door-in' } },
      { from: { level: 'room-2', thing: 'door-in' }, to: { level: 'room-1', thing: 'exit' } },
      { from: { level: 'room-3', thing: 'back' }, to: { level: 'room-1', thing: 'exit' } },
    ],
    joins: [{ a: 'room-2', b: 'room-3', along: 'y', from: 5, to: 8 }],
    places: [['room-1'], ['room-2', 'room-3']],
    notes: [],
  })
  expect(memory.err).toEqual([])
})

test('as words: a line for each level, door and join, one line for each place of more than one level', async () => {
  const { code, out, err } = await run(game())
  expect(code).toBe(0)
  expect(err).toEqual([])
  expect(out).toEqual([
    'room-1  16 by 9  at 0, 0  start',
    'room-2  16 by 9  at 20, 0',
    'room-3  16 by 9  at 36, 0',
    'room-1 exit leads to room-2 door-in',
    'room-2 door-in leads to room-1 exit',
    'room-3 back leads to room-1 exit',
    "room-2 and room-3 touch: room-2's right edge, rows 5 to 7",
    'room-2 and room-3 are one place.',
  ])
})

test('a game with no world file lists its levels with no place on the map and no joins', async () => {
  const memory = game({
    'automata.toml': project('', listed('world', 'content/worlds/world.json')),
    'content/worlds/world.json': undefined,
  })
  const { code, out } = await run(memory, '--json')
  expect(code).toBe(0)
  const report = reportOf(out)
  expect(report.levels.map((level) => [level.level, level.at])).toEqual([
    ['room-1', null],
    ['room-2', null],
    ['room-3', null],
  ])
  expect(report.joins).toEqual([])
  expect(report.places).toEqual([['room-1'], ['room-2'], ['room-3']])
})

test('a level nothing leads to, and that the map does not place, is a note and is last', async () => {
  const memory = game({
    'automata.toml': project(listed('level', 'content/levels/room-4.json')),
    'content/levels/room-4.json': bareLevel('room-4', [...Array(8).fill('#..............#'), '#'.repeat(16)]),
  })
  const { code, out } = await run(memory)
  expect(code).toBe(0)
  expect(out.at(-1)).toBe('Nothing leads to room-4 yet.')
  expect(out).toContain('room-4  16 by 9')
  const report = reportOf((await run(memory, '--json')).out)
  expect(report.levels.at(-1)).toEqual({
    level: 'room-4',
    at: null,
    size: { w: 16, h: 9 },
    start: false,
    order: null,
  })
  expect(report.notes).toEqual(['Nothing leads to room-4 yet.'])
})

test('a level that joins another is not a note, even when it is not in the level list', async () => {
  // room-3 is left out of `levels`, but room-2 and room-3 join, so a player can walk to it.
  const text = linksFiles()['automata.toml'] ?? ''
  const memory = game({
    'automata.toml': text.replace('levels = ["room-1", "room-2", "room-3"]', 'levels = ["room-1", "room-2"]'),
  })
  const { out } = await run(memory, '--json')
  expect(reportOf(out).notes).toEqual([])
})

test('a place past eight levels is a note, and so is one past 16,384 tiles; neither is a failure', async () => {
  const strip = (id: string): string =>
    bareLevel(id, [...Array(5).fill('#..............#'), ...Array(3).fill('.'.repeat(16)), '#'.repeat(16)])
  const ids = Array.from({ length: 9 }, (_, i) => `strip-${i + 1}`)
  const big = bareLevel('wide', [...Array(129).fill('.'.repeat(130)), '#'.repeat(130)])
  const world = {
    format: 1,
    id: 'world',
    levels: [
      { level: 'room-1', at: { x: 0, y: 0 } },
      ...ids.map((level, i) => ({ level, at: { x: i * 16, y: 20 } })),
      { level: 'wide', at: { x: 0, y: 100 } },
    ],
  }
  const memory = game({
    'automata.toml': project(
      [
        ...ids.map((id) => listed('level', `content/levels/${id}.json`)),
        listed('level', 'content/levels/wide.json'),
      ].join(''),
    ),
    'content/worlds/world.json': writeContent('world', world as never),
    ...Object.fromEntries(ids.map((id) => [`content/levels/${id}.json`, strip(id)])),
    'content/levels/wide.json': big,
  })
  const { code, out } = await run(memory, '--json')
  expect(code).toBe(0)
  expect(reportOf(out).notes).toEqual([
    'Nothing leads to wide yet.',
    'The place of strip-1 has 9 levels (1,296 tiles). The whole place runs at once, so keep a place to 8 levels and 16,384 tiles at most.',
    'The place of wide has 1 level (16,900 tiles). The whole place runs at once, so keep a place to 8 levels and 16,384 tiles at most.',
  ])
})

test('a game that does not load answers one sentence, lists nothing and exits 1', async () => {
  const memory = game({ 'content/levels/room-2.json': '{ "format": 1 }' })
  const words = await run(memory)
  expect(words.code).toBe(1)
  expect(words.out).toEqual([])
  expect(words.err).toHaveLength(1)
  expect(words.err[0]).toMatch(/^The game does not load, so its world cannot be listed\. /)
  expect(words.err[0]).toMatch(/cannot be listed\. content\/levels\/[a-z0-9.-]+: /)
  const json = reportOf((await run(memory, '--json')).out)
  expect(json).toMatchObject({ ok: false, levels: [], doors: [], joins: [], places: [], notes: [] })
  expect(json.sentence).toBe(words.err[0])
})

test('a folder that is not a game is the one sentence, exit 2', async () => {
  const memory = memoryLayer({})
  expect(await main(['world', 'nowhere'], memory.layer)).toBe(2)
  expect(memory.err[0]).toContain('nowhere is not a game')
})

test('a join that runs along the bottom, and rows that differ, are said in each level’s own rows and columns', () => {
  const report: WorldReport = {
    ok: true,
    levels: [
      { level: 'top', at: { x: 0, y: 0 }, size: { w: 16, h: 9 }, start: true, order: 0 },
      { level: 'below', at: { x: 4, y: 9 }, size: { w: 16, h: 9 }, start: false, order: 1 },
      { level: 'east', at: { x: 16, y: 2 }, size: { w: 16, h: 9 }, start: false, order: 2 },
    ],
    doors: [{ from: { level: 'top', thing: 'hatch' }, to: { level: 'below' } }],
    joins: [
      { a: 'top', b: 'below', along: 'x', from: 4, to: 7 },
      { a: 'top', b: 'east', along: 'y', from: 3, to: 4 },
    ],
    places: [['top', 'below', 'east']],
    notes: [],
  }
  expect(describeWorld(report)).toEqual({
    out: [
      'top  16 by 9  at 0, 0  start',
      'below  16 by 9  at 4, 9',
      'east  16 by 9  at 16, 2',
      'top hatch leads to below',
      "top and below touch: top's bottom edge, columns 4 to 6 (columns 0 to 2 of below)",
      "top and east touch: top's right edge, row 3 (row 1 of east)",
      'top, below and east are one place.',
    ],
    err: [],
  })
})
