import { expect, test } from 'vitest'
import { writeContent } from '#src/features/content/content.ts'
import { changed, expectRoundTrip, gameFiles, gameProblems, problemsOf } from '../../fixtures/content/kind.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

const critter = () => ({
  format: 1 as const,
  id: 'critter',
  rules: [
    {
      id: 'run-away',
      when: [{ sense: 'near', kind: 'hero', within: 3 }],
      do: { act: 'flee', from: 'hero', speed: 4 },
    },
    { id: 'wander', when: [], do: { act: 'wander', speed: 1, turnEvery: 90 } },
  ],
})
const file = 'content/behaviours/critter.json'
const said = (value: unknown): string[] => problemsOf('behaviour', value, file)

type Json = Record<string, unknown>
/** The example with one change made to its rules. */
const withRules = (change: (rules: Json[]) => void): ReturnType<typeof critter> => {
  const value = critter()
  change(value.rules as unknown as Json[])
  return value
}
const ruleAt = (rules: Json[], i: number): Json => rules[i] as Json

test('a behaviour reads, and writes back to the same bytes twice', () =>
  expectRoundTrip('behaviour', critter()))

test('the last rule says what to do when nothing else fits', () =>
  expect(
    said(
      withRules((rules) => {
        ruleAt(rules, 1).when = [{ sense: 'blocked' }]
      }),
    ),
  ).toEqual([
    `${file}: rules[1].when: The last rule is what the character does when nothing else fits, so its "when" must be [].`,
  ]))

test('a rule that always fits is not followed by others', () =>
  expect(
    said(
      withRules((rules) => {
        ruleAt(rules, 0).when = []
      }),
    ),
  ).toEqual([
    `${file}: rules[0].when: This rule always fits, so the rules after it are never reached. Move it to the end.`,
  ]))

test('two rules with one id', () =>
  expect(
    said(
      withRules((rules) => {
        ruleAt(rules, 1).id = 'run-away'
      }),
    ),
  ).toEqual([`${file}: rules[1].id: "run-away" is used twice. Each rule needs its own id.`]))

test('a sense or an act that does not exist names the choices', () => {
  expect(
    said(
      withRules((rules) => {
        ruleAt(rules, 0).when = [{ sense: 'smell' }]
      }),
    ),
  ).toEqual([`${file}: rules[0].when[0].sense: This must be one of: near, far, blocked, on-ground.`])
  expect(
    said(
      withRules((rules) => {
        ruleAt(rules, 1).do = { act: 'fly' }
      }),
    ),
  ).toEqual([`${file}: rules[1].do.act: This must be one of: stay, wander, flee, follow, jump.`])
})

test('a field the sense does not have', () =>
  expect(
    said(
      withRules((rules) => {
        ruleAt(rules, 0).when = [{ sense: 'near', kind: 'hero', within: 3, beyond: 4 }]
      }),
    ),
  ).toEqual([
    `${file}: rules[0].when[0].beyond: This is not something a behaviour has. Remove it or check the spelling.`,
  ]))

test('more than four things in a "when"', () =>
  expect(
    said(
      withRules((rules) => {
        ruleAt(rules, 0).when = Array.from({ length: 5 }, () => ({ sense: 'blocked' }))
      }),
    ),
  ).toEqual([`${file}: rules[0].when: This has more than 4 items, which is the most allowed.`]))

test('a missing field says what to write', () => {
  expect(
    said(
      withRules((rules) => {
        delete ruleAt(rules, 0).id
      }),
    ),
  ).toEqual([`${file}: rules[0].id: This is missing. Give the rule a name like "run-away".`])
  expect(
    said(
      withRules((rules) => {
        ruleAt(rules, 1).do = { act: 'wander', turnEvery: 90 }
      }),
    ),
  ).toEqual([`${file}: rules[1].do.speed: This is missing. Say how fast, in tiles a second, like 2.`])
})

test('an unknown key', () =>
  expect(said({ ...critter(), mood: 'cross' })).toEqual([
    `${file}: mood: This is not something a behaviour has. Remove it or check the spelling.`,
  ]))

/** The fixture game with kinds on its characters, a critter that uses `critter.json`, and that file. */
function critterGame(behaviour: unknown = critter(), replace: Record<string, string | undefined> = {}) {
  const kinds = {
    'content/characters/hero.json': changed(
      'character',
      fixtureFiles['content/characters/hero.json'],
      (c) => {
        c.kind = 'hero'
      },
    ),
    'content/characters/crate.json': changed(
      'character',
      fixtureFiles['content/characters/crate.json'],
      (c) => {
        c.kind = 'crate'
      },
    ),
  }
  return gameFiles(
    fixtureFiles,
    [
      {
        type: 'character',
        path: 'content/characters/critter.json',
        text: writeContent('character', {
          format: 1,
          id: 'critter',
          body: 'dynamic',
          size: { w: 0.6, h: 0.6 },
          color: '#7a9e3b',
          kind: 'critter',
          behaviour: 'critter',
        } as never),
      },
      { type: 'behaviour', path: file, text: writeContent('behaviour', behaviour as never) },
    ],
    { ...kinds, ...replace },
  )
}

test('a game with a critter and its behaviour loads', async () =>
  expect(await gameProblems(critterGame())).toEqual([]))

test('a kind that no character has', async () => {
  const flee = withRules((rules) => {
    ruleAt(rules, 0).do = { act: 'flee', from: 'heroo', speed: 4 }
    ruleAt(rules, 1).do = { act: 'follow', to: 'crat', speed: 1 }
  })
  expect(await gameProblems(critterGame(flee))).toEqual([
    `${file}: rules[0].do.from: There is no character of the kind "heroo". This game's kinds are: crate, critter, hero.`,
    `${file}: rules[1].do.to: There is no character of the kind "crat". This game's kinds are: crate, critter, hero.`,
  ])
  const near = withRules((rules) => {
    ruleAt(rules, 0).when = [
      { sense: 'near', kind: 'her', within: 3 },
      { sense: 'far', kind: 'crat', beyond: 2 },
    ]
  })
  expect(await gameProblems(critterGame(near))).toEqual([
    `${file}: rules[0].when[0].kind: There is no character of the kind "her". This game's kinds are: crate, critter, hero.`,
    `${file}: rules[0].when[1].kind: There is no character of the kind "crat". This game's kinds are: crate, critter, hero.`,
  ])
})

test('a character file that does not read does not make every kind look wrong', async () =>
  expect(
    await gameProblems(
      critterGame(critter(), {
        'content/characters/crate.json': changed(
          'character',
          fixtureFiles['content/characters/crate.json'],
          (c) => {
            c.color = 'red'
          },
        ),
      }),
    ),
  ).toEqual(['content/characters/crate.json: color: Write a colour as # and six digits, like #e4572e.']))

test('a character that names a behaviour the game does not have', async () =>
  expect(
    await gameProblems(
      critterGame(critter(), {
        'content/characters/critter.json': changed(
          'character',
          critterGame()['content/characters/critter.json'],
          (c) => {
            c.behaviour = 'critr'
          },
        ),
      }),
    ),
  ).toEqual([
    'content/characters/critter.json: behaviour: There is no behaviour called "critr". This game has: critter.',
  ]))
