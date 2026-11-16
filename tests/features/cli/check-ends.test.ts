// How a game's levels end: what `automata.toml` names against what the game's sim can raise, one test per row.
import { expect, test } from 'vitest'
import { endProblems, simIds } from '#src/features/cli/check-ends.ts'
import { type Character, type GameContent, loadGame } from '#src/features/content/content.ts'
import { defineEvent, definePlugin, defineResource, z } from '#src/headless.ts'
import { readFiles } from '../../fixtures/content/kind.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

const DOOR: Character = {
  format: 1,
  id: 'door',
  body: 'fixed',
  size: { w: 1, h: 2 },
  color: '#ffffff',
  upright: false,
  kind: 'door',
  touch: 'sense',
}

/** The fixture game with these fields of the project written, and a door in its level when `door` says so. */
async function game(project: Record<string, unknown>, door = true): Promise<GameContent> {
  const loaded = await loadGame(readFiles(fixtureFiles))
  if (!loaded.ok) throw new Error('The fixture game does not load.')
  const content = loaded.value
  const level = content.levels['level-1']
  if (level === undefined) throw new Error('The fixture game has no level.')
  const things = door ? [...level.things, { id: 'door-1', character: 'door', x: 12.5, y: 7 }] : level.things
  return {
    ...content,
    project: { ...content.project, ...project },
    characters: { ...content.characters, door: DOOR },
    levels: { ...content.levels, 'level-1': { ...level, things } },
  }
}

const IDS = { events: ['door.touched', 'hero.fell', 'spark.taken'], resources: ['hero.score'] }
const sim = (read: (id: string) => unknown = () => ({ sparks: 0 })) => ({ ids: IDS, read })

const NEVER = (event: string): string =>
  `done = "${event}" can never happen: nothing in this game raises it. A door needs a character with "kind": "door" and "touch": "sense".`

test('a game whose done, lost and score are all real has no problem and no note', async () => {
  const content = await game({ done: 'door.touched', lost: 'hero.fell', score: 'hero.score.sparks' })
  expect(endProblems(content, sim())).toEqual({ problems: [], notes: [] })
})

test('done names an event the sim does not register', async () => {
  const { problems } = endProblems(await game({ done: 'gate.touched' }), sim())
  expect(problems).toEqual([{ file: 'automata.toml', path: 'done', message: NEVER('gate.touched') }])
})

test('done is a touch event of a kind a level of levels does not have', async () => {
  const { problems } = endProblems(await game({ done: 'door.touched' }, false), sim())
  expect(problems).toEqual([
    {
      file: 'content/levels/level-1.json',
      path: 'things',
      message: 'This level has no door, so it can never be finished. Put one in "things".',
    },
  ])
})

test('lost names an event the sim does not register', async () => {
  const { problems } = endProblems(await game({ lost: 'hero.drowned' }), sim())
  expect(problems).toEqual([
    {
      file: 'automata.toml',
      path: 'lost',
      message:
        'lost = "hero.drowned" can never happen: nothing in this game raises it. Write lost = "hero.fell" and the framework raises it when a hero falls out of the level, or name an event your own rules raise.',
    },
  ])
})

test.each([
  ['a resource the sim does not have', 'hero.coins.sparks', () => ({ sparks: 0 })],
  ['a field that is not a number', 'hero.score.name', () => ({ name: 'x' })],
  ['a field the resource lacks', 'hero.score.gems', () => ({ sparks: 0 })],
  ['a resource that cannot be read', 'hero.score.sparks', () => {
      throw new Error('no')
    }],
])('score names %s', async (_name, score, read) => {
  const { problems } = endProblems(await game({ score }), sim(read))
  expect(problems).toEqual([
    {
      file: 'automata.toml',
      path: 'score',
      message: `score = "${score}" is not a number this game counts. Name a resource and one of its numbers, like "hero.score.sparks".`,
    },
  ])
})

test('neither done nor lost is a note, and not a problem', async () => {
  expect(endProblems(await game({}), sim())).toEqual({
    problems: [],
    notes: [
      'This game can be neither won nor lost. Add done = "…" or lost = "…" to automata.toml, or give the player something to aim for.',
    ],
  })
})

test('done alone, or lost alone, is not the neither note', async () => {
  expect(endProblems(await game({ done: 'door.touched' }), sim()).notes).toEqual([])
  expect(endProblems(await game({ lost: 'hero.fell' }), sim()).notes).toEqual([])
})

test('a done that is not a touch event of a kind the game has is only held to the sim', async () => {
  const content = await game({ done: 'level.finished' })
  const ids = { events: ['level.finished'], resources: [] }
  expect(endProblems(content, { ids, read: () => undefined })).toEqual({ problems: [], notes: [] })
})

test('simIds reads the events and resources each plugin registers', () => {
  const plugin = definePlugin({
    name: 'ends',
    events: [defineEvent('ends.over', z.object({}))],
    resources: [defineResource('ends.score', z.object({ n: z.number() }), () => ({ n: 0 }))],
  })
  expect(simIds([plugin, definePlugin({ name: 'empty' })])).toEqual({
    events: ['ends.over'],
    resources: ['ends.score'],
  })
})
