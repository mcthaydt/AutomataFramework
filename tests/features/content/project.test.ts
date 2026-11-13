import { expect, test } from 'vitest'
import { formatDiagnostic, PROJECT_FILE, parseProject } from '#src/features/content/content.ts'
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
    'automata.toml: content[0].type: This must be one of: level, character.',
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
