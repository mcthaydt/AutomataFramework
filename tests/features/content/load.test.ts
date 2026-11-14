import { expect, test } from 'vitest'
import {
  type ContentType,
  formatDiagnostic,
  loadGame,
  parseContent,
  writeContent,
} from '#src/features/content/content.ts'
import { fixtureFiles, readFixture } from '../../fixtures/game/read.ts'

/** What a person reads when the game does not load: one sentence per problem, none when it loads. */
async function problems(overrides: Record<string, string | undefined> = {}): Promise<string[]> {
  const loaded = await loadGame(readFixture(overrides))
  return loaded.ok ? [] : loaded.diagnostics.map(formatDiagnostic)
}

/** A fixture file with one change made to its JSON. */
function edited(path: string, change: (value: Record<string, unknown>) => void): string {
  const value = JSON.parse(fixtureFiles[path] ?? '') as Record<string, unknown>
  change(value)
  return JSON.stringify(value)
}

test('the fixture game loads, frozen', async () => {
  const loaded = await loadGame(readFixture())
  expect(loaded.ok).toBe(true)
  if (!loaded.ok) return
  expect(loaded.value.project.name).toBe('Crate Game')
  expect(Object.keys(loaded.value.levels)).toEqual(['level-1'])
  expect(Object.keys(loaded.value.characters).sort()).toEqual(['crate', 'hero'])
  expect(loaded.value.characters.hero?.upright).toBe(true)
  expect(loaded.value.characters.crate?.upright).toBe(false)
  expect(Object.isFrozen(loaded.value)).toBe(true)
  expect(Object.isFrozen(loaded.value.levels['level-1'])).toBe(true)
  expect(Object.isFrozen(loaded.value.levels['level-1']?.things[0])).toBe(true)
})

test('the fixture files are written the way writeContent writes them', () => {
  for (const [path, type] of [
    ['content/levels/level-1.json', 'level'],
    ['content/characters/hero.json', 'character'],
    ['content/characters/crate.json', 'character'],
  ] as [string, ContentType][]) {
    const text = fixtureFiles[path] ?? ''
    const parsed = parseContent(type, text, path)
    expect(parsed.ok, path).toBe(true)
    // Cast: which schema `type` picked is not known to the type system here, and the call rechecks the value.
    if (parsed.ok) expect(writeContent(type, parsed.value as never), path).toBe(text)
  }
})

test('a missing project file', async () =>
  expect(await problems({ 'automata.toml': undefined })).toEqual([
    'automata.toml: This file is missing. Every game needs it at the top of its repository.',
  ]))

test('TOML that does not parse', async () => {
  const found = await problems({ 'automata.toml': 'name = ' })
  expect(found).toHaveLength(1)
  expect(found[0]).toMatch(/^automata\.toml: This file is not valid TOML\. \S[^\n]*$/)
})

test('a listed file that is missing', async () =>
  expect(await problems({ 'content/characters/crate.json': undefined })).toEqual([
    'content/characters/crate.json: This file is listed in automata.toml but is missing.',
  ]))

test('a file name that does not match its id', async () =>
  expect(
    await problems({
      'content/characters/crate.json': edited('content/characters/crate.json', (c) => (c.id = 'box')),
    }),
  ).toEqual(['content/characters/crate.json: id: This must be "crate", the same as the file name.']))

test('two files with one id', async () =>
  expect(
    await problems({
      'automata.toml': `${fixtureFiles['automata.toml']}\n[[content]]\ntype = "character"\npath = "other/crate.json"\n`,
      'other/crate.json': fixtureFiles['content/characters/crate.json'],
    }),
  ).toEqual([
    'other/crate.json: id: There is already a character called "crate", in content/characters/crate.json.',
  ]))

test('a thing that points at no character', async () =>
  expect(
    await problems({
      'content/levels/level-1.json': edited('content/levels/level-1.json', (l) => {
        ;((l.things as Record<string, unknown>[])[0] as Record<string, unknown>).character = 'crat'
      }),
    }),
  ).toEqual([
    'content/levels/level-1.json: things[0].character: There is no character called "crat". This game has: crate, hero.',
  ]))

test('a start level that does not exist', async () =>
  expect(
    await problems({
      'automata.toml': (fixtureFiles['automata.toml'] ?? '').replace(
        'start = "level-1"',
        'start = "level-9"',
      ),
    }),
  ).toEqual(['automata.toml: start: There is no level called "level-9". This game has: level-1.']))

test('a hero that does not exist', async () =>
  expect(
    await problems({
      'automata.toml': (fixtureFiles['automata.toml'] ?? '').replace('hero = "hero"', 'hero = "heroo"'),
    }),
  ).toEqual(['automata.toml: hero: There is no character called "heroo". This game has: crate, hero.']))

test('a path that leaves the repository stops at the project file', async () =>
  expect(
    await problems({
      'automata.toml': (fixtureFiles['automata.toml'] ?? '').replace(
        'content/levels/level-1.json',
        '../x.json',
      ),
    }),
  ).toEqual([
    'automata.toml: content[0].path: Use a path inside the game, like content/levels/level-1.json.',
  ]))

test('problems in several files all come back, in the order of the project file', async () =>
  expect(
    await problems({
      'content/levels/level-1.json': edited('content/levels/level-1.json', (l) => {
        ;((l.things as Record<string, unknown>[])[0] as Record<string, unknown>).character = 'crat'
      }),
      'content/characters/hero.json': edited('content/characters/hero.json', (c) => (c.speed = 3)),
      'content/characters/crate.json': edited('content/characters/crate.json', (c) => (c.color = 'red')),
    }),
  ).toEqual([
    'content/levels/level-1.json: things[0].character: There is no character called "crat". This game has: crate, hero.',
    'content/characters/hero.json: speed: This is not something a character has. Remove it or check the spelling.',
    'content/characters/crate.json: color: Write a colour as # and six digits, like #e4572e.',
  ]))

test('a read that rejects with something that is not an Error is still a problem, not a throw', async () => {
  const readFile = readFixture()
  const crateRejects = async (path: string): Promise<string> => {
    if (path.endsWith('crate.json')) throw 'boom'
    return readFile(path)
  }
  const loaded = await loadGame(crateRejects)
  expect(loaded.ok ? [] : loaded.diagnostics.map(formatDiagnostic)).toEqual([
    'content/characters/crate.json: This file is listed in automata.toml but is missing.',
  ])
})

test('a read that throws at once, or rejects for the project file, never throws out of loadGame', async () => {
  for (const read of [
    () => {
      throw new Error('no disk')
    },
    () => Promise.reject(42),
  ]) {
    const loaded = await loadGame(read)
    expect(loaded.ok ? [] : loaded.diagnostics.map(formatDiagnostic)).toEqual([
      'automata.toml: This file is missing. Every game needs it at the top of its repository.',
    ])
  }
})

test('a file listed as the wrong kind says so in one sentence', async () => {
  const toml = (fixtureFiles['automata.toml'] ?? '').replace(
    'type = "character"\npath = "content/characters/crate.json"',
    'type = "level"\npath = "content/characters/crate.json"',
  )
  expect(await problems({ 'automata.toml': toml })).toContain(
    'content/characters/crate.json: This file is listed as a level, but it reads as a character. Change its type in automata.toml.',
  )
})

test('a name every object has is an ordinary name', async () => {
  const level = edited('content/levels/level-1.json', (v) => {
    ;((v.things as Record<string, unknown>[])[0] as Record<string, unknown>).character = 'constructor'
  })
  expect(await problems({ 'content/levels/level-1.json': level })).toEqual([
    'content/levels/level-1.json: things[0].character: There is no character called "constructor". This game has: crate, hero.',
  ])
  const loaded = await loadGame(readFixture())
  expect(loaded.ok).toBe(true)
  if (loaded.ok) expect('toString' in loaded.value.characters).toBe(false)
})
