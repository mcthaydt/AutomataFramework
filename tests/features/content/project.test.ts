import { expect, test } from 'vitest'
import {
  CONTENT_TYPES,
  formatDiagnostic,
  levelOrder,
  nextLevel,
  PROJECT_FILE,
  type Project,
  parseProject,
} from '#src/features/content/content.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

const FIXTURE = fixtureFiles[PROJECT_FILE] ?? ''

/** What a person reads when this text is the project file: one sentence per problem, none when it is fine. */
function problems(text: string): string[] {
  const parsed = parseProject(text)
  return parsed.ok ? [] : parsed.diagnostics.map(formatDiagnostic)
}

test('the project file is called automata.toml', () => expect(PROJECT_FILE).toBe('automata.toml'))

test('the fixture project parses', () => {
  const parsed = parseProject(FIXTURE)
  expect(parsed.ok && parsed.value).toEqual({
    format: 1,
    name: 'Crate Game',
    start: 'level-1',
    hero: 'hero',
    content: [
      { type: 'level', path: 'content/levels/level-1.json' },
      { type: 'character', path: 'content/characters/hero.json' },
      { type: 'character', path: 'content/characters/crate.json' },
    ],
  })
})

test('text that is not TOML names the file and says what is wrong, on one line', () => {
  const found = problems('name = ')
  expect(found).toHaveLength(1)
  expect(found[0]).toMatch(/^automata\.toml: This file is not valid TOML\. \S[^\n]*$/)
})

// Put first: a key written after a [[content]] block would belong to that block.
test('an unknown key', () =>
  expect(problems(`colour = 1\n${FIXTURE}`)).toEqual([
    'automata.toml: colour: This is not something a project has. Remove it or check the spelling.',
  ]))

test('a missing field says what to write', () =>
  expect(problems(FIXTURE.replace('name = "Crate Game"\n', ''))).toEqual([
    'automata.toml: name: This is missing. Write the name of your game, like name = "Crate Game".',
  ]))

test('a name that is empty', () =>
  expect(problems(FIXTURE.replace('"Crate Game"', '""'))).toEqual([
    'automata.toml: name: This needs at least 1 character.',
  ]))

test('a content type that does not exist', () =>
  expect(problems(FIXTURE.replace('type = "level"', 'type = "leve"'))).toEqual([
    `automata.toml: content[0].type: This must be one of: ${Object.keys(CONTENT_TYPES).join(', ')}.`,
  ]))

test('a path that leaves the game, or is not a .json file', () => {
  const use = 'Use a path inside the game, like content/levels/level-1.json.'
  expect(problems(FIXTURE.replace('content/levels/level-1.json', '../x.json'))).toEqual([
    `automata.toml: content[0].path: ${use}`,
  ])
  expect(problems(FIXTURE.replace('content/levels/level-1.json', '/etc/x.json'))).toEqual([
    `automata.toml: content[0].path: ${use}`,
  ])
  expect(problems(FIXTURE.replace('content/levels/level-1.json', 'content/levels/level-1.txt'))).toEqual([
    `automata.toml: content[0].path: ${use}`,
  ])
})

test('the same file listed twice', () =>
  expect(problems(`${FIXTURE}\n[[content]]\ntype = "level"\npath = "content/levels/level-1.json"\n`)).toEqual(
    ['automata.toml: content[3].path: This file is already listed.'],
  ))

test('a project with no players line parses exactly as before', () => {
  const parsed = parseProject(FIXTURE)
  expect(parsed.ok && 'players' in parsed.value).toBe(false)
})

test('players = 2, 3 or 4 is kept', () => {
  for (const n of [2, 3, 4]) {
    const parsed = parseProject(FIXTURE.replace('hero = "hero"\n', `hero = "hero"\nplayers = ${n}\n`))
    expect(parsed.ok && parsed.value.players).toBe(n)
  }
})

test('players = 1, 0, 5, 2.5 or "two" is refused, in words', () => {
  const message =
    'automata.toml: players: Write how many can play at once, 2, 3 or 4, like players = 2. Leave the line out for a one-player game.'
  for (const value of ['1', '0', '5', '2.5', '"two"'])
    expect(
      problems(FIXTURE.replace('hero = "hero"\n', `hero = "hero"\nplayers = ${value}\n`)),
      value,
    ).toEqual([message])
})

test('a project with no source line has no source key at all', () => {
  const parsed = parseProject(FIXTURE)
  expect(parsed.ok && Object.hasOwn(parsed.value, 'source')).toBe(false)
})

test('source = "ko" is kept', () => {
  const parsed = parseProject(FIXTURE.replace('hero = "hero"\n', 'hero = "hero"\nsource = "ko"\n'))
  expect(parsed.ok && parsed.value.source).toBe('ko')
})

test('a source that is not one of the six is refused, in words', () => {
  const message = 'automata.toml: source: Write one of zh, es, en, pt, ja or ko, like source = "es".'
  for (const value of ['"fr"', '"EN"', '1', '""']) {
    const file = FIXTURE.replace('hero = "hero"\n', `hero = "hero"\nsource = ${value}\n`)
    expect(problems(file), value).toEqual([message])
  }
})

// The flow's four fields (plan U, Task 1): the order of the levels, what ends one, the warnings and the splash.

/** The fixture project with these lines written after `hero`, before the first `[[content]]` block. */
const withLines = (...lines: string[]): string =>
  FIXTURE.replace('hero = "hero"\n', `hero = "hero"\n${lines.join('\n')}\n`)

/** The project read from `text`, or a failure naming what was wrong. */
function projectOf(text: string): Project {
  const parsed = parseProject(text)
  if (!parsed.ok) throw new Error(parsed.diagnostics.map(formatDiagnostic).join('\n'))
  return parsed.value
}

test('levels, done, warnings and splash are kept when written', () => {
  const project = projectOf(
    withLines(
      'levels = ["level-1", "level-2"]',
      'done = "door.touched"',
      'warnings = ["warning.flashing", "warning.loud"]',
      'splash = "logo"',
    ),
  )
  expect(project.levels).toEqual(['level-1', 'level-2'])
  expect(project.done).toBe('door.touched')
  expect(project.warnings).toEqual(['warning.flashing', 'warning.loud'])
  expect(project.splash).toBe('logo')
})

test('a project that writes none of the four has none of the four keys at all', () => {
  const project = projectOf(FIXTURE)
  for (const key of ['levels', 'done', 'warnings', 'splash']) expect(key in project, key).toBe(false)
})

test('levels: one to 64 ids, none twice, each a plain id', () => {
  expect(problems(withLines('levels = ["level-1", "level-2", "level-1"]'))).toEqual([
    'automata.toml: levels[2]: This level is already in the list.',
  ])
  expect(problems(withLines('levels = []'))).toEqual(['automata.toml: levels: This needs at least 1 item.'])
  const many = Array.from({ length: 65 }, (_, i) => `"level-${i + 1}"`).join(', ')
  expect(problems(withLines(`levels = [${many}]`))).toEqual([
    'automata.toml: levels: This has more than 64 items, which is the most allowed.',
  ])
  expect(problems(withLines('levels = ["Level One"]'))).toEqual([
    'automata.toml: levels[0]: Use lower-case words joined by dashes, like "level-1".',
  ])
})

test('done: the name of an event, in the same words a cue uses', () => {
  const sentence = 'automata.toml: done: Write the event that ends a level, like done = "door.touched".'
  for (const value of ['""', '"Door Touched"', '"door."', '"1door"', '3'])
    expect(problems(withLines(`done = ${value}`)), value).toEqual([sentence])
})

test('warnings: one to eight keys, none twice, each a message key', () => {
  expect(problems(withLines('warnings = ["warning.a", "warning.b", "warning.a"]'))).toEqual([
    'automata.toml: warnings[2]: This warning is already in the list.',
  ])
  expect(problems(withLines('warnings = []'))).toEqual([
    'automata.toml: warnings: This needs at least 1 item.',
  ])
  const nine = Array.from({ length: 9 }, (_, i) => `"warning.w${i}"`).join(', ')
  expect(problems(withLines(`warnings = [${nine}]`))).toEqual([
    'automata.toml: warnings: This has more than 8 items, which is the most allowed.',
  ])
  expect(problems(withLines('warnings = ["Flashing lights"]'))).toEqual([
    'automata.toml: warnings[0]: Use lower-case words joined by dots or dashes, like "keeper.hello".',
  ])
})

test('splash: the id of a figure, a plain id', () =>
  expect(problems(withLines('splash = "My Logo"'))).toEqual([
    'automata.toml: splash: Use lower-case words joined by dashes, like "level-1".',
  ]))

test('levelOrder is the levels line, or the start level alone', () => {
  expect(levelOrder(projectOf(FIXTURE))).toEqual(['level-1'])
  expect(levelOrder(projectOf(withLines('levels = ["level-2", "level-1"]')))).toEqual(['level-2', 'level-1'])
})

test('nextLevel is the level after, and nothing after the last or for an unknown level', () => {
  const project = projectOf(withLines('levels = ["level-1", "level-2", "level-3"]'))
  expect(nextLevel(project, 'level-1')).toBe('level-2')
  expect(nextLevel(project, 'level-2')).toBe('level-3')
  expect(nextLevel(project, 'level-3')).toBeUndefined()
  expect(nextLevel(project, 'level-9')).toBeUndefined()
  expect(nextLevel(projectOf(FIXTURE), 'level-1')).toBeUndefined()
})

const SOUNDS = '\n[[content]]\ntype = "sound"\nfolder = "content/sounds"\n'

test('a block with a folder reads into folders, and content keeps only the paths', () => {
  const project = projectOf(`${FIXTURE}${SOUNDS}`)
  expect(project.folders).toEqual([{ type: 'sound', folder: 'content/sounds' }])
  expect(project.content).toHaveLength(3)
  expect(project.content.every((entry) => entry.type !== 'sound')).toBe(true)
})

test('a project with no folder block has no folders key', () => {
  expect('folders' in projectOf(FIXTURE)).toBe(false)
})

test('a block with both a path and a folder is refused', () =>
  expect(
    problems(
      `${FIXTURE}\n[[content]]\ntype = "sound"\npath = "content/sounds/a.json"\nfolder = "content/sounds"\n`,
    ),
  ).toEqual(['automata.toml: content[3]: Write a path or a folder, not both.']))

test('a block with neither is refused', () =>
  expect(problems(`${FIXTURE}\n[[content]]\ntype = "sound"\n`)).toEqual([
    'automata.toml: content[3]: Write where the file is, like path = "content/levels/level-1.json", or a folder, like folder = "content/sounds".',
  ]))

test('a folder that ends in a slash, climbs out, or names a file is refused', () => {
  const use = 'Use a folder inside the game, like content/sounds.'
  for (const folder of ['content/sounds/', '../sounds', '/sounds', 'content/a.json'])
    expect(problems(`${FIXTURE}\n[[content]]\ntype = "sound"\nfolder = "${folder}"\n`)).toEqual([
      `automata.toml: content[3].folder: ${use}`,
    ])
})

test('the same folder listed twice for one kind is refused', () =>
  expect(problems(`${FIXTURE}${SOUNDS}${SOUNDS}`)).toEqual([
    'automata.toml: content[4].folder: This folder is already listed.',
  ]))

test('one folder listed for two kinds is refused', () =>
  expect(
    problems(`${FIXTURE}${SOUNDS}\n[[content]]\ntype = "music"\nfolder = "content/sounds"\n`),
  ).toEqual([
    'automata.toml: content[4].folder: This folder is already listed for sounds. A folder holds one kind of file.',
  ]))
