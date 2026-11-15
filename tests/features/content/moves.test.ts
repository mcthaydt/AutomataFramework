import { describe, expect, test } from 'vitest'
import {
  DEFAULT_HERO_CONTROLS,
  MOVE_NUMBERS,
  moveNumbers,
  moveNumbersOf,
  type TuningFile,
  tuningNumbers,
  writeContent,
} from '#src/features/content/content.ts'
import { gameFiles, gameProblems, problemsOf } from '../../fixtures/content/kind.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

/** The spec's table, typed out: id, value, min, max. The test is the second copy that has to agree with it. */
const SPEC: readonly (readonly [string, number, number, number])[] = [
  ['walk-speed', 6, 1, 20],
  ['walk-grip', 3, 0, 30],
  ['air-grip', 6, 0, 60],
  ['jump-speed', 12, 4, 30],
  ['jump-cut', 0.5, 0.1, 1],
  ['ledge-grace', 6, 0, 15],
  ['early-press', 6, 0, 15],
  ['fall-speed', 20, 5, 40],
  ['air-jumps', 1, 1, 3],
  ['air-jump-speed', 10, 4, 30],
  ['wall-slide-speed', 3, 0, 20],
  ['wall-jump-out', 7, 1, 20],
  ['wall-jump-up', 11, 4, 30],
  ['wall-jump-lock', 8, 0, 20],
  ['dash-speed', 18, 6, 40],
  ['dash-ticks', 10, 4, 30],
  ['dash-rest', 30, 0, 120],
  ['air-dashes', 1, 1, 3],
]

/** A tuning file with these numbers (id, value, and a range that holds it) and, optionally, controls. */
const tuning = (
  numbers: readonly (readonly [string, number] | readonly [string, number, number, number])[],
  controls?: TuningFile['controls'],
): TuningFile => ({
  format: 1,
  id: 'hero-moves',
  numbers: numbers.map(([id, value, min, max]) => ({
    id,
    about: 'A number.',
    value,
    min: min ?? 0,
    max: max ?? 100,
    step: 1,
  })),
  controls,
})

describe('the numbers', () => {
  test("the eighteen ids, values and limits are the spec's table", () => {
    expect(MOVE_NUMBERS.map((n) => [n.id, n.value, n.min, n.max])).toEqual(SPEC)
    for (const n of MOVE_NUMBERS) {
      expect(n.about.length, n.id).toBeGreaterThan(0)
      expect(n.about.length, n.id).toBeLessThanOrEqual(200)
      expect(n.value, n.id).toBeGreaterThanOrEqual(n.min)
      expect(n.value, n.id).toBeLessThanOrEqual(n.max)
    }
  })

  test('a file with none of them gives every framework value; undefined gives the same', () => {
    const fromFile = moveNumbers(tuning([['other', 1]]))
    expect(fromFile).toEqual(moveNumbers(undefined))
    expect(fromFile.walkSpeed).toBe(6)
    expect(fromFile.jumpSpeed).toBe(12)
    expect(fromFile.jumpCut).toBe(0.5)
    expect(fromFile.dashRest).toBe(30)
    expect(Object.keys(fromFile)).toHaveLength(18)
    expect(Object.isFrozen(fromFile)).toBe(true)
  })

  test('a number in the file is the number', () =>
    expect(moveNumbers(tuning([['walk-speed', 8.5]])).walkSpeed).toBe(8.5))

  test('a value outside the limits is held at the limit', () => {
    expect(moveNumbers(tuning([['jump-speed', 50, 0, 100]])).jumpSpeed).toBe(30)
    expect(moveNumbers(tuning([['jump-speed', 1, 0, 100]])).jumpSpeed).toBe(4)
  })

  test('a counted number with a fraction is floored', () =>
    expect(moveNumbers(tuning([['dash-ticks', 10.5, 0, 100]])).dashTicks).toBe(10))

  test('the same file gives the same object', () => {
    const file = tuning([['walk-speed', 7]])
    expect(moveNumbers(file)).toBe(moveNumbers(file))
  })
})

describe('the numbers from plain values', () => {
  test('nothing gives every framework value, frozen', () => {
    const none = moveNumbersOf({})
    expect(none).toEqual(moveNumbers(undefined))
    expect(Object.keys(none)).toHaveLength(18)
    expect(Object.isFrozen(none)).toBe(true)
  })

  test('a value is taken by its id; the rest stay the framework value', () => {
    const got = moveNumbersOf({ 'jump-speed': 15 })
    expect(got.jumpSpeed).toBe(15)
    expect(got.walkSpeed).toBe(6)
  })

  test('a value is held at the framework limit', () => {
    expect(moveNumbersOf({ 'jump-speed': 99 }).jumpSpeed).toBe(30)
    expect(moveNumbersOf({ 'jump-speed': 1 }).jumpSpeed).toBe(4)
  })

  test('a counted number with a fraction is floored', () =>
    expect(moveNumbersOf({ 'dash-ticks': 10.5 }).dashTicks).toBe(10))

  test('NaN and Infinity give the framework value, and an id nobody knows is ignored', () => {
    const got = moveNumbersOf({
      'jump-speed': Number.NaN,
      'walk-speed': Number.POSITIVE_INFINITY,
      nonsense: 3,
    })
    expect(got.jumpSpeed).toBe(12)
    expect(got.walkSpeed).toBe(6)
    expect(got).toEqual(moveNumbers(undefined))
  })

  test('the numbers of a tuning file, taken as plain values, are the numbers of the file', () => {
    const file = tuning([
      ['walk-speed', 8.5],
      ['jump-speed', 50, 0, 100],
      ['dash-ticks', 10.5, 0, 100],
      ['air-jumps', 2, 1, 3],
    ])
    expect(moveNumbersOf(tuningNumbers(file))).toEqual(moveNumbers(file))
  })
})

describe('the controls', () => {
  test('the framework controls are left, right, jump and dash, in that order', () =>
    expect(DEFAULT_HERO_CONTROLS.map((c) => c.action)).toEqual(['left', 'right', 'jump', 'dash']))

  test("the framework controls pass the tuning file's own control checks, with dash and without", () => {
    const file = (controls: TuningFile['controls']) =>
      writeContent('tuning', tuning([['walk-speed', 6, 1, 20]], controls) as never)
    for (const controls of [DEFAULT_HERO_CONTROLS, DEFAULT_HERO_CONTROLS.slice(0, 3)]) {
      const parsed = problemsOf('tuning', JSON.parse(file(controls)))
      expect(parsed).toEqual([])
    }
  })
})

describe('the checks, in a game', () => {
  const heroFile = (moves: unknown): string =>
    writeContent('character', {
      format: 1,
      id: 'hero',
      body: 'dynamic',
      size: { w: 0.8, h: 1 },
      color: '#e4572e',
      upright: true,
      moves,
    } as never)
  const path = 'content/tunings/hero-moves.json'
  const game = (
    file: TuningFile,
    moves: unknown = { tuning: 'hero-moves' },
  ): Record<string, string | undefined> =>
    gameFiles(fixtureFiles, [{ type: 'tuning', path, text: writeContent('tuning', file as never) }], {
      'content/characters/hero.json': heroFile(moves),
    })

  test('a range outside the limits is named with what to write', async () => {
    expect(await gameProblems(game(tuning([['jump-speed', 12, 4, 50]])))).toEqual([
      `${path}: numbers[0].max: "jump-speed" can be 4 to 30 in a game, and this file lets it reach 50. Keep "min" and "max" inside 4 to 30.`,
    ])
    expect(await gameProblems(game(tuning([['jump-speed', 12, 1, 20]])))).toEqual([
      `${path}: numbers[0].min: "jump-speed" can be 4 to 30 in a game, and this file lets it go down to 1. Keep "min" and "max" inside 4 to 30.`,
    ])
  })

  test('a counted number with a fraction is named', async () =>
    expect(await gameProblems(game(tuning([['dash-ticks', 10.5, 4, 30]])))).toEqual([
      `${path}: numbers[0].value: "dash-ticks" is a whole number. Write one, like 10.`,
    ]))

  test('numbers inside the limits, and numbers the framework does not read, are fine', async () =>
    expect(
      await gameProblems(
        game(
          tuning([
            ['jump-speed', 12, 4, 30],
            ['crate-weight', 500, 0, 1000],
          ]),
        ),
      ),
    ).toEqual([]))

  test("a number a letter off one the hero reads is named, and one far from them is the game's own", async () => {
    expect(await gameProblems(game(tuning([['jump-sped', 12, 4, 30]])))).toEqual([
      `${path}: numbers[0].id: "jump-sped" is not a number the hero reads. Did you mean "jump-speed"? If it is a number of your own, give it a name that is not so close to "jump-speed".`,
    ])
    // Two letters off is a typo in a long name only.
    expect(await gameProblems(game(tuning([['wall-jump-uupp', 11, 4, 30]])))).toEqual([
      `${path}: numbers[0].id: "wall-jump-uupp" is not a number the hero reads. Did you mean "wall-jump-up"? If it is a number of your own, give it a name that is not so close to "wall-jump-up".`,
    ])
    expect(await gameProblems(game(tuning([['air-gri', 6, 0, 60]])))).toEqual([
      `${path}: numbers[0].id: "air-gri" is not a number the hero reads. Did you mean "air-grip"? If it is a number of your own, give it a name that is not so close to "air-grip".`,
    ])
    expect(await gameProblems(game(tuning([['air-xxip', 6, 0, 60]])))).toEqual([])
  })

  test('a controls list without jump is named', async () =>
    expect(
      await gameProblems(game(tuning([['walk-speed', 6, 1, 20]], [DEFAULT_HERO_CONTROLS[0] as never]))),
    ).toEqual([
      `${path}: controls: The hero's controls have no "right". Add it to "controls" with its keys, like ["ArrowRight"].`,
      `${path}: controls: The hero's controls have no "jump". Add it to "controls" with its keys, like ["Space"].`,
    ]))

  test('dash is asked for only when the hero dashes', async () => {
    const three = DEFAULT_HERO_CONTROLS.slice(0, 3)
    const file = tuning([['walk-speed', 6, 1, 20]], three)
    expect(await gameProblems(game(file))).toEqual([])
    expect(await gameProblems(game(file, { tuning: 'hero-moves', dash: true }))).toEqual([
      `${path}: controls: The hero's controls have no "dash". Add it to "controls" with its keys, like ["ShiftLeft"].`,
    ])
  })

  test("a tuning file with no controls is left to the framework's", async () =>
    expect(await gameProblems(game(tuning([['walk-speed', 6, 1, 20]])))).toEqual([]))

  test('a tuning no hero names is checked for none of this', async () => {
    const files = gameFiles(fixtureFiles, [
      { type: 'tuning', path, text: writeContent('tuning', tuning([['jump-speed', 12, 1, 99]]) as never) },
    ])
    expect(await gameProblems(files)).toEqual([])
  })
})
