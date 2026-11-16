import { expect, test } from 'vitest'
import {
  type ContentType,
  formatDiagnostic,
  type Language,
  loadGame,
  parseContent,
  writeContent,
} from '#src/features/content/content.ts'
import { withSource } from '../../fixtures/content/kind.ts'
import { fullGameFiles, readFullGame } from '../../fixtures/full-game/read.ts'
import { fixtureFiles, readFixture } from '../../fixtures/game/read.ts'
import { readFiles as readTemplate, templateFiles } from '../../template/game.ts'

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

const FOUR = (fixtureFiles['automata.toml'] ?? '').replace('hero = "hero"\n', 'hero = "hero"\nplayers = 4\n')

test('a game for four whose level has two start points says which are missing', async () => {
  const two = edited('content/levels/level-1.json', (level) => {
    level.starts = [
      { player: 1, x: 2.5, y: 7.5 },
      { player: 2, x: 4.5, y: 7.5 },
    ]
  })
  expect(await problems({ 'automata.toml': FOUR, 'content/levels/level-1.json': two })).toEqual(
    [3, 4].map(
      (n) =>
        `content/levels/level-1.json: starts: This game is for up to 4 players, but this level has no start point for player ${n}. Add one to "starts", or lower players in automata.toml.`,
    ),
  )
})

test('a one-player game with one start point loads as before', async () => {
  expect(await problems()).toEqual([])
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

/** What a person reads when the full game, with these changes, does not load. */
async function fullProblems(overrides: Record<string, string | undefined>): Promise<string[]> {
  const loaded = await loadGame(readFullGame(overrides))
  return loaded.ok ? [] : loaded.diagnostics.map(formatDiagnostic)
}
const listed = (type: string, path: string): string => `\n[[content]]\ntype = "${type}"\npath = "${path}"\n`

test('two files of a new kind with one id say "a cue list" and "a messages file", not "a cues"', async () => {
  const toml = fullGameFiles['automata.toml'] ?? ''
  expect(
    await fullProblems({
      'automata.toml': toml + listed('cues', 'other/cues.json'),
      'other/cues.json': fullGameFiles['content/cues/cues.json'],
    }),
  ).toEqual(['other/cues.json: id: There is already a cue list called "cues", in content/cues/cues.json.'])
  expect(
    await fullProblems({
      'automata.toml': toml + listed('messages', 'other/en.json'),
      'other/en.json': fullGameFiles['content/messages/en.json'],
    }),
  ).toEqual(['other/en.json: id: There is already a messages file called "en", in content/messages/en.json.'])
})

test('a sound listed as the wrong kind is one problem, and the cues that play it are not told it is missing', async () => {
  const toml = (fullGameFiles['automata.toml'] ?? '').replace(
    'type = "sound"\npath = "content/sounds/jump.json"',
    'type = "music"\npath = "content/sounds/jump.json"',
  )
  expect(await fullProblems({ 'automata.toml': toml })).toEqual([
    'content/sounds/jump.json: This file is listed as a music track, but it reads as a sound. Change its type in automata.toml.',
  ])
})

/** The fixture game with a messages file (one word) for each language, listed, and `source` when one is given. */
function withWords(languages: readonly Language[], source?: Language): Record<string, string> {
  const listing = languages.map((id) => listed('messages', `content/messages/${id}.json`)).join('')
  const toml = `${fixtureFiles['automata.toml']}${listing}`
  const text = source === undefined ? toml : withSource(toml, source)
  const files: Record<string, string> = { 'automata.toml': text }
  for (const id of languages)
    files[`content/messages/${id}.json`] = writeContent('messages', {
      format: 1,
      id,
      messages: { 'keeper.hello': 'x' },
    })
  return files
}

test('a game with words and no source does not load, and says what to write', async () =>
  expect(await problems(withWords(['es']))).toEqual([
    'automata.toml: source: Write the language your team writes the game\'s words in, like source = "es".',
  ]))

test('a source whose file is not listed does not load, and names the file to list', async () =>
  expect(await problems(withWords(['es'], 'ko'))).toEqual([
    'automata.toml: source: This game\'s words are written in Korean (source = "ko"), but no ko.json is listed. List content/messages/ko.json, or change source.',
  ]))

test('a source with no words at all does not load', async () => {
  const toml = withSource(fixtureFiles['automata.toml'] ?? '', 'ko')
  expect(await problems({ 'automata.toml': toml })).toEqual([
    'automata.toml: source: This game lists no words, so it has no language to name. Take the source line out, or list a messages file like content/messages/ko.json.',
  ])
})

test('a game written in Korean loads with no English file', async () =>
  expect(await problems(withWords(['ko', 'es'], 'ko'))).toEqual([]))

// The flow's four fields (plan U, Task 1) are checked against the rest of the game. The template has words (written in
// English), two figures and one level; a second level is added where the order has two.

// The template's project file with the lines that name how a level ends, which these tests add themselves.
const plainFiles: Record<string, string> = {
  ...templateFiles,
  'automata.toml': (templateFiles['automata.toml'] ?? '').replace(
    /^(players|levels|done|lost|score) = .*\n/gm,
    '',
  ),
}

const level2 = writeContent('level', {
  ...(JSON.parse(templateFiles['content/levels/level-1.json'] ?? '') as Record<string, unknown>),
  id: 'level-2',
} as never)

const twoLevels: Record<string, string> = {
  ...plainFiles,
  'automata.toml': `${plainFiles['automata.toml']}\n[[content]]\ntype = "level"\npath = "content/levels/level-2.json"\n`,
  'content/levels/level-2.json': level2,
}

/** The project file of `files` (the template's, or `twoLevels`) with these lines after `hero`. */
const withLines = (files: Record<string, string>, ...lines: string[]): Record<string, string> => ({
  ...files,
  'automata.toml': (files['automata.toml'] ?? '').replace(
    'hero = "hero"\n',
    `hero = "hero"\n${lines.join('\n')}\n`,
  ),
})

async function flowProblems(files: Record<string, string>): Promise<string[]> {
  const loaded = await loadGame(readTemplate(files))
  return loaded.ok ? [] : loaded.diagnostics.map(formatDiagnostic)
}

test('levels, done, warnings and splash that fit the game load', async () => {
  const files = withLines(
    twoLevels,
    'levels = ["level-1", "level-2"]',
    'done = "door.touched"',
    'warnings = ["level.level-1.name"]',
    'splash = "hero"',
  )
  expect(await flowProblems(files)).toEqual([])
})

test('a level in the order that is not listed says which levels there are', async () =>
  expect(await flowProblems(withLines(twoLevels, 'levels = ["level-1", "level-9"]'))).toEqual([
    'automata.toml: levels[1]: No level has the id "level-9". The levels are: level-1, level-2.',
  ]))

test('a start level that is not in the order says where to add it', async () =>
  expect(await flowProblems(withLines(twoLevels, 'levels = ["level-2"]'))).toEqual([
    'automata.toml: start: "level-1" is not in levels. Add it there, or take the levels line out.',
  ]))

test('a warning the source language has no words for says which file to add it to', async () =>
  expect(await flowProblems(withLines(plainFiles, 'warnings = ["warning.flashing"]'))).toEqual([
    'automata.toml: warnings[0]: The game\'s words have no "warning.flashing". Add it to content/messages/en.json.',
  ]))

test('a game with no words cannot have warnings, and is told what to do', async () => {
  const loaded = await loadGame(
    readFixture({
      'automata.toml': (fixtureFiles['automata.toml'] ?? '').replace(
        'hero = "hero"\n',
        'hero = "hero"\nwarnings = ["warning.flashing"]\n',
      ),
    }),
  )
  expect(loaded.ok ? [] : loaded.diagnostics.map(formatDiagnostic)).toEqual([
    'automata.toml: warnings: This game lists no words, so a warning has nothing to say. List a messages file, or take the warnings line out.',
  ])
})

test('a splash that is not a listed figure says which figures there are', async () =>
  expect(await flowProblems(withLines(plainFiles, 'splash = "logo"'))).toEqual([
    'automata.toml: splash: No figure has the id "logo". The figures are: crate, door, hero.',
  ]))
