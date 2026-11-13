import { expect, test } from 'vitest'
import { formatDiagnostic, parseContent } from '#src/features/content/content.ts'

// The level file as an author writes it: 16 tiles wide, 3 tall, one crate and one start.
export const exampleLevel = () => ({
  format: 1,
  id: 'level-1',
  tiles: ['................', '................', '################'],
  things: [{ id: 'crate-1', character: 'crate', x: 8.5, y: 1.5 }],
  starts: [{ player: 1, x: 2.5, y: 1.5 }],
})

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
