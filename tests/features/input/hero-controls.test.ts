// The controls of a hero the framework moves: the tuning file's list, else what the game passed, else the framework's.
import { expect, test } from 'vitest'
import { parseContent, type TuningControl, writeContent } from '#src/features/content/content.ts'
import { applySettings, heroControls } from '#src/features/input/input.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { movesFiles, type Setup } from '../../fixtures/game/moves-game.ts'

const TUNING = 'content/tunings/hero-moves.json'

/** The moves fixture whose tuning file lists `controls` (or, with `undefined`, lists none). */
async function game(setup: Setup, controls: readonly TuningControl[] | undefined) {
  const files = movesFiles(setup)
  const parsed = parseContent('tuning', files[TUNING] ?? '', TUNING)
  if (!parsed.ok) throw new Error('the fixture tuning did not read')
  const { controls: _listed, ...rest } = parsed.value
  files[TUNING] = writeContent('tuning', (controls === undefined ? rest : { ...rest, controls }) as never)
  return loadFixtureGame(files)
}

const key = (action: string, label: string, keys: string[], side: 'left' | 'right'): TuningControl => ({
  action,
  label,
  keys,
  side,
})

test("the tuning file's list comes out in its own order", async () => {
  const listed = [
    key('jump', 'Jump', ['Space'], 'right'),
    key('right', 'Right', ['ArrowRight'], 'left'),
    key('left', 'Left', ['ArrowLeft'], 'left'),
  ]
  const controls = heroControls(await game({}, listed))
  expect(Object.keys(controls ?? {})).toEqual(['jump', 'right', 'left'])
  expect(controls?.jump?.keys).toEqual(['Space'])
})

test('a file with no list gives the framework four with dash on, and three with it off', async () => {
  expect(Object.keys(heroControls(await game({ dash: true }, undefined)) ?? {})).toEqual([
    'left',
    'right',
    'jump',
    'dash',
  ])
  expect(Object.keys(heroControls(await game({ dash: false }, undefined)) ?? {})).toEqual([
    'left',
    'right',
    'jump',
  ])
})

test('a file with no list leaves the controls a game passed in code as they were', async () => {
  const content = await game({}, undefined)
  expect(heroControls(content, fixtureControls)).toBe(fixtureControls)
})

test("a file with a list wins over the game's", async () => {
  const listed = [
    key('left', 'Left', ['ArrowLeft'], 'left'),
    key('right', 'Right', ['ArrowRight'], 'left'),
    key('jump', 'Jump', ['Space'], 'right'),
  ]
  const controls = heroControls(await game({}, listed), fixtureControls)
  expect(Object.keys(controls ?? {})).toEqual(['left', 'right', 'jump'])
  expect(controls).not.toBe(fixtureControls)
})

test('a game whose hero has no moves has none from here', async () => {
  expect(heroControls(await loadFixtureGame())).toBeUndefined()
  expect(heroControls(await loadFixtureGame(), fixtureControls)).toBeUndefined()
})

test("a player's saved bindings over these controls drop the one that does not fit and keep the rest", async () => {
  const controls = heroControls(await game({ dash: true }, undefined))
  if (controls === undefined) throw new Error('no controls')
  // The saved `jump` takes KeyX, which `dash` has by default: that one binding is dropped, `left` is kept.
  const saved = {
    format: 1,
    bindings: { jump: { keys: ['KeyX'] }, left: { keys: ['KeyJ'] } },
  }
  const applied = applySettings(controls, saved)
  expect(applied.dropped).toEqual(['jump'])
  expect(applied.controls.left?.keys).toEqual(['KeyJ'])
  expect(applied.controls.jump?.keys).toEqual(controls.jump?.keys)
})
