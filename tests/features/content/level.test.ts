import { expect, test } from 'vitest'
import { formatDiagnostic, parseContent, writeContent } from '#src/features/content/content.ts'
import { exampleLevel } from '../../fixtures/content/example-level.ts'
import { expectRoundTrip, gameFiles, gameProblems } from '../../fixtures/content/kind.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

const FILE = 'content/levels/a.json'

/** What a person reads when this text is a level: one sentence per problem, none when it is fine. */
function problems(text: string): string[] {
  const parsed = parseContent('level', text, FILE)
  return parsed.ok ? [] : parsed.diagnostics.map(formatDiagnostic)
}
const withLevel = (change: (level: Record<string, unknown>) => void): string => {
  const level: Record<string, unknown> = exampleLevel()
  change(level)
  return JSON.stringify(level)
}

test('the example level parses', () => {
  const parsed = parseContent('level', JSON.stringify(exampleLevel()), FILE)
  expect(parsed.ok).toBe(true)
  if (parsed.ok) expect(parsed.value).toEqual(exampleLevel())
})

test('a level may set its sky and its ground', () => {
  const level = { ...exampleLevel(), sky: '#fdd4bd', ground: '#111314' }
  const parsed = parseContent('level', JSON.stringify(level), FILE)
  expect(parsed.ok && parsed.value).toEqual(level)
})

test("a level that sets neither has neither, so its sky and ground are the framework's own", () => {
  const parsed = parseContent('level', JSON.stringify(exampleLevel()), FILE)
  expect(parsed.ok && 'sky' in parsed.value).toBe(false)
  expect(parsed.ok && 'ground' in parsed.value).toBe(false)
})

test('a sky or a ground that is not a colour', () => {
  expect(problems(withLevel((l) => (l.sky = 'blue')))).toEqual([
    'content/levels/a.json: sky: Write a colour as # and six digits, like #9fd3f0.',
  ])
  expect(problems(withLevel((l) => (l.ground = '#123')))).toEqual([
    'content/levels/a.json: ground: Write a colour as # and six digits, like #3b4a5a.',
  ])
})

test('sky and ground are written right after the id', () => {
  const written = writeContent('level', { ...exampleLevel(), sky: '#fdd4bd', ground: '#111314' } as never)
  expect(Object.keys(JSON.parse(written))).toEqual([
    'format',
    'id',
    'sky',
    'ground',
    'tiles',
    'things',
    'starts',
  ])
})

test('text that is not JSON', () =>
  expect(problems('{ "format": 1,')).toEqual([
    'content/levels/a.json: This file is not valid JSON. Check for a missing comma, quote or bracket.',
  ]))

test('a missing field', () =>
  expect(problems(withLevel((l) => delete l.starts))).toEqual([
    'content/levels/a.json: starts: This is missing. A level needs at least one start point.',
  ]))

test('an unknown key', () =>
  expect(problems(withLevel((l) => (l.colour = 1)))).toEqual([
    'content/levels/a.json: colour: This is not something a level has. Remove it or check the spelling.',
  ]))

test('an unknown key inside a thing names the thing', () =>
  expect(
    problems(
      withLevel((l) => (((l.things as Record<string, unknown>[])[0] as Record<string, unknown>).hp = 3)),
    ),
  ).toEqual([
    'content/levels/a.json: things[0].hp: This is not something a level has. Remove it or check the spelling.',
  ]))

test('rows of different lengths', () =>
  expect(
    problems(withLevel((l) => (l.tiles = ['................', '...............', '################']))),
  ).toEqual([
    'content/levels/a.json: tiles[1]: This row has 15 tiles but the first row has 16. Every row must be the same length.',
  ]))

test('a tile that is not # or .', () =>
  expect(
    problems(withLevel((l) => (l.tiles = ['.......x........', '................', '################']))),
  ).toEqual(['content/levels/a.json: tiles[0]: Use only # (solid) and . (empty). Found "x".']))

test('two things with one id', () =>
  expect(
    problems(
      withLevel((l) => {
        const crate = { id: 'crate-1', character: 'crate', x: 3.5, y: 1.5 }
        l.things = [crate, { ...crate, x: 5.5 }]
      }),
    ),
  ).toEqual(['content/levels/a.json: things[1].id: "crate-1" is used twice. Each thing needs its own id.']))

test('a thing outside the level', () => {
  expect(
    problems(withLevel((l) => (l.things = [{ id: 'crate-1', character: 'crate', x: 40, y: 1.5 }]))),
  ).toEqual(['content/levels/a.json: things[0].x: 40 is outside the level, which is 16 tiles wide.'])
  expect(problems(withLevel((l) => (l.starts = [{ player: 1, x: 2.5, y: 9 }])))).toEqual([
    'content/levels/a.json: starts[0].y: 9 is outside the level, which is 3 tiles tall.',
  ])
})

test('two players with one number', () =>
  expect(
    problems(
      withLevel((l) => {
        l.starts = [
          { player: 1, x: 2.5, y: 1.5 },
          { player: 1, x: 4.5, y: 1.5 },
        ]
      }),
    ),
  ).toEqual([
    'content/levels/a.json: starts[1].player: Player 1 already has a start point. Each player needs only one.',
  ]))

test('a wrong kind of value says what it should be', () =>
  expect(problems(withLevel((l) => (l.id = 7)))).toEqual(['content/levels/a.json: id: This must be text.']))

test('an id that is not lower-case words', () =>
  expect(problems(withLevel((l) => (l.id = 'Level One')))).toEqual([
    'content/levels/a.json: id: Use lower-case words joined by dashes, like "level-1".',
  ]))

test('every problem in a file is reported, not only the first', () => {
  const found = problems(
    withLevel((l) => {
      delete l.starts
      l.colour = 1
    }),
  )
  expect(found).toHaveLength(2)
  expect(found).toContain(
    'content/levels/a.json: starts: This is missing. A level needs at least one start point.',
  )
  expect(found).toContain(
    'content/levels/a.json: colour: This is not something a level has. Remove it or check the spelling.',
  )
})

test('parseContent never throws', () => {
  for (const text of ['', 'null', '[]', '"x"', '5', 'a'.repeat(5_000_000)]) {
    const parsed = parseContent('level', text, FILE)
    expect(parsed.ok, text.slice(0, 10)).toBe(false)
    if (!parsed.ok) expect(parsed.diagnostics.length).toBeGreaterThan(0)
  }
})

test('a file that is not an object says what a level file looks like', () =>
  expect(problems('[]')).toEqual([
    'content/levels/a.json: This must be an object: the file should start with { and end with }.',
  ]))

test('a level may name a tileset, written right after the id', () => {
  const level = {
    ...exampleLevel(),
    tileset: 'meadow',
    tiles: ['....~~~~........', '................', 'GGGGGGGGGGGGGGGG'],
  }
  const written = writeContent('level', level as never)
  expect(Object.keys(JSON.parse(written))).toEqual(['format', 'id', 'tileset', 'tiles', 'things', 'starts'])
  expect(parseContent('level', written, FILE).ok).toBe(true)
})

test('with a tileset a row may hold any letter from ! to ~, and the sentence changes', () => {
  const tilesetRows = (rows: string[]) =>
    withLevel((l) => {
      l.tileset = 'meadow'
      l.tiles = rows
    })
  expect(problems(tilesetRows(['....~~~~........', '................', 'GGGGGGGGGGGGGGGG']))).toEqual([])
  expect(problems(tilesetRows(['.... ~~~........', '................', 'GGGGGGGGGGGGGGGG']))).toEqual([
    'content/levels/a.json: tiles[0]: Use one letter per tile, with no spaces. Found " ".',
  ])
})

test('without a tileset a row still holds only # and .', () =>
  expect(
    problems(withLevel((l) => (l.tiles = ['....GGGG........', '................', '################']))),
  ).toEqual(['content/levels/a.json: tiles[0]: Use only # (solid) and . (empty). Found "G".']))

test('a thing named like a player’s hero is refused', () => {
  expect(
    problems(withLevel((l) => (l.things = [{ id: 'player-1', character: 'crate', x: 3.5, y: 1.5 }]))),
  ).toEqual([
    'content/levels/a.json: things[0].id: "player-1" is the name of player 1\'s hero. Give this thing another id.',
  ])
  expect(
    problems(withLevel((l) => (l.things = [{ id: 'player-5', character: 'crate', x: 3.5, y: 1.5 }]))),
  ).toEqual([])
})

/** The fixture game with a tileset called meadow listed, and its level using it. */
const withTilesetFiles = (letters: string[]): Record<string, string | undefined> => ({
  ...fixtureFiles,
  'automata.toml': `${fixtureFiles['automata.toml'] ?? ''}\n[[content]]\ntype = "tileset"\npath = "content/tilesets/meadow.json"\n`,
  'content/tilesets/meadow.json': writeContent('tileset', {
    format: 1,
    id: 'meadow',
    image: 'art/meadow.png',
    tileSize: 16,
    columns: 4,
    tiles: letters.map((letter, i) => ({ id: `tile-${i}`, letter, solid: true, pictures: [{ frame: i }] })),
  } as never),
  'content/levels/level-1.json': `${JSON.stringify({ ...JSON.parse(fixtureFiles['content/levels/level-1.json'] ?? ''), tileset: 'meadow' }, null, 2)}\n`,
})

test('a level whose letters are all in its tileset loads', async () =>
  expect(await gameProblems(withTilesetFiles(['G', '#']))).toEqual([]))

test('a level names a tileset the game does not have', async () => {
  const files = withTilesetFiles(['G', '#'])
  files['content/levels/level-1.json'] = (files['content/levels/level-1.json'] ?? '').replace(
    '"meadow"',
    '"medow"',
  )
  expect(await gameProblems(files)).toEqual([
    'content/levels/level-1.json: tileset: There is no tileset called "medow". This game has: meadow.',
  ])
})

test('a row uses a letter the tileset does not have', async () =>
  expect(await gameProblems(withTilesetFiles(['G', '~']))).toEqual([
    'content/levels/level-1.json: tiles[8]: The letter "#" is not in the tileset "meadow". It has: G, ~.',
  ]))

// Joints: pins and ropes that hold things (plan P).

const pin = () => ({ id: 'seesaw', kind: 'pin', thing: 'plank-1', x: 4, y: 1.5, turn: { min: -25, max: 25 } })
const rope = () => ({
  id: 'swing',
  kind: 'rope',
  thing: 'crate-1',
  holder: 'plank-1',
  from: { x: 8.5, y: 1 },
  to: { x: 4, y: 0.5 },
  slack: 0.5,
})
/** The example level with a plank beside its crate, and these joints. */
const withJoints = (...joints: unknown[]): string =>
  withLevel((l) => {
    l.things = [
      { id: 'crate-1', character: 'crate', x: 8.5, y: 1.5 },
      { id: 'plank-1', character: 'plank', x: 4, y: 1.5 },
    ]
    l.joints = joints
  })

test('a level with one pin and one rope reads, and is written the same bytes twice', () => {
  expect(problems(withJoints(pin(), rope()))).toEqual([])
  expectRoundTrip('level', JSON.parse(withJoints(pin(), rope())))
})

test('joints are written last, and a level without them is written as it was', () => {
  const written = writeContent('level', JSON.parse(withJoints(pin())))
  expect(Object.keys(JSON.parse(written)).at(-1)).toBe('joints')
  expect(Object.keys(JSON.parse(writeContent('level', exampleLevel() as never)))).toEqual([
    'format',
    'id',
    'tiles',
    'things',
    'starts',
  ])
})

test('the fixture game’s files still write to their committed bytes', () => {
  for (const [path, type] of [
    ['content/characters/crate.json', 'character'],
    ['content/characters/hero.json', 'character'],
    ['content/levels/level-1.json', 'level'],
  ] as const) {
    const text = fixtureFiles[path] as string
    const parsed = parseContent(type, text, path)
    expect(parsed.ok && writeContent(type, parsed.value as never), path).toBe(text)
  }
})

test('a joint that names a thing the level does not have', () =>
  expect(problems(withJoints({ ...pin(), thing: 'plnk' }))).toEqual([
    'content/levels/a.json: joints[0].thing: There is no thing called "plnk". This level has: crate-1, plank-1.',
  ]))

test('a holder the level does not have', () =>
  expect(problems(withJoints({ ...rope(), holder: 'plnk' }))).toEqual([
    'content/levels/a.json: joints[0].holder: There is no thing called "plnk". This level has: crate-1, plank-1.',
  ]))

test('a hero cannot be joined to anything', () => {
  const hero =
    'content/levels/a.json: joints[0].thing: A hero cannot be joined to anything. Join a thing from this level\'s "things".'
  expect(problems(withJoints({ ...pin(), thing: 'player-1' }))).toEqual([hero])
  expect(problems(withJoints({ ...rope(), holder: 'player-2' }))).toEqual([hero.replace('thing', 'holder')])
})

test('a thing cannot be joined to itself', () =>
  expect(problems(withJoints({ ...rope(), holder: 'crate-1' }))).toEqual([
    'content/levels/a.json: joints[0].holder: A thing cannot be joined to itself. Leave "holder" out to join it to the level.',
  ]))

test('two joints with one id', () =>
  expect(problems(withJoints(pin(), { ...rope(), id: 'seesaw' }))).toEqual([
    'content/levels/a.json: joints[1].id: "seesaw" is used twice. Each joint needs its own id.',
  ]))

test('a turn whose min is not less than its max', () =>
  expect(problems(withJoints({ ...pin(), turn: { min: 10, max: 10 } }))).toEqual([
    'content/levels/a.json: joints[0].turn.min: "min" must be less than "max".',
  ]))

test('a turn that leaves out where the thing starts', () =>
  expect(problems(withJoints({ ...pin(), turn: { min: 10, max: 30 } }))).toEqual([
    'content/levels/a.json: joints[0].turn: The thing starts level, so "min" must be 0 or less and "max" 0 or more.',
  ]))

test('a rope whose ends are in one place needs slack', () => {
  const stuck = { ...rope(), to: { x: 8.5, y: 1 } }
  expect(problems(withJoints({ ...stuck, slack: undefined }))).toEqual([
    'content/levels/a.json: joints[0].to: A rope needs some length. Move its two ends apart, or give it "slack".',
  ])
  expect(problems(withJoints({ ...stuck, slack: 0 }))).toHaveLength(1)
  expect(problems(withJoints(stuck))).toEqual([])
})

test('a joint outside the level', () => {
  expect(problems(withJoints({ ...pin(), x: 40 }))).toEqual([
    'content/levels/a.json: joints[0].x: 40 is outside the level, which is 16 tiles wide.',
  ])
  expect(problems(withJoints({ ...rope(), to: { x: 4, y: 9 } }))).toEqual([
    'content/levels/a.json: joints[0].to.y: 9 is outside the level, which is 3 tiles tall.',
  ])
})

test('a joint with a field missing, or a kind that is not one', () => {
  const { thing: _thing, ...noThing } = pin()
  expect(problems(withJoints(noThing))).toEqual([
    'content/levels/a.json: joints[0].thing: This is missing. Say which thing is held, like "plank-1".',
  ])
  expect(problems(withJoints({ ...pin(), kind: 'weld' }))).toEqual([
    'content/levels/a.json: joints[0].kind: This must be one of: pin, rope.',
  ])
})

/** The fixture game with a fixed wall character, a level that has two walls and a crate, and these joints. */
function wallGame(...joints: unknown[]) {
  const wall = writeContent('character', {
    format: 1,
    id: 'wall',
    body: 'fixed',
    size: { w: 1, h: 1 },
    color: '#444444',
    upright: false,
  })
  const pillar = writeContent('character', {
    format: 1,
    id: 'pillar',
    body: 'fixed',
    size: { w: 1, h: 1 },
    color: '#555555',
    upright: false,
  })
  const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] as string)
  level.things.push({ id: 'wall-1', character: 'wall', x: 4.5, y: 7.5 })
  level.things.push({ id: 'pillar-1', character: 'pillar', x: 12.5, y: 7.5 })
  level.joints = joints
  return gameFiles(
    fixtureFiles,
    [
      { type: 'character', path: 'content/characters/wall.json', text: wall },
      { type: 'character', path: 'content/characters/pillar.json', text: pillar },
    ],
    {
      'content/levels/level-1.json': writeContent('level', level),
    },
  )
}

test('a fixed thing cannot be joined to the level or to another fixed thing', async () => {
  const sentence =
    'content/levels/level-1.json: joints[0].thing: The character "wall" is "fixed", so it never moves and cannot be joined to the level. Make it "dynamic", or remove this joint.'
  const tie = { id: 'tie', kind: 'pin', thing: 'wall-1', x: 4.5, y: 7.5 }
  expect(await gameProblems(wallGame(tie))).toEqual([sentence])
  // held by another fixed thing: the sentence says who holds it, not "the level"
  expect(await gameProblems(wallGame({ ...tie, holder: 'pillar-1' }))).toEqual([
    'content/levels/level-1.json: joints[0].thing: The characters "wall" and "pillar" are both "fixed", so neither moves and this joint holds nothing. Make one of them "dynamic", or remove this joint.',
  ])
  // a fixed thing may be the holder of a thing that moves
  expect(
    await gameProblems(
      wallGame({ id: 'hang', kind: 'pin', thing: 'crate-1', holder: 'wall-1', x: 4.5, y: 7.5 }),
    ),
  ).toEqual([])
})

test('a pin on a character that is upright cannot turn, and the sentence says so', async () => {
  const crate = JSON.parse(fixtureFiles['content/characters/crate.json'] as string)
  const upright = writeContent('character', { ...crate, upright: true })
  const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] as string)
  const files = (joint: unknown) =>
    gameFiles(fixtureFiles, [], {
      'content/characters/crate.json': upright,
      'content/levels/level-1.json': writeContent('level', { ...level, joints: [joint] }),
    })
  const pinned = { id: 'seesaw', kind: 'pin', thing: 'crate-1', x: 6.5, y: 7.5 }
  expect(await gameProblems(files(pinned))).toEqual([
    'content/levels/level-1.json: joints[0].thing: The character "crate" is "upright", so it cannot turn on a pin. Set "upright" to false, or hold it with a rope.',
  ])
  // a rope holds an upright thing without trouble
  const roped = { id: 'tie', kind: 'rope', thing: 'crate-1', from: { x: 6.5, y: 7 }, to: { x: 6.5, y: 4 } }
  expect(await gameProblems(files(roped))).toEqual([])
})
