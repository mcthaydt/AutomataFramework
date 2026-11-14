import { expect, test } from 'vitest'
import { tuningNumbers, writeContent } from '#src/features/content/content.ts'
import { changed, expectRoundTrip, gameFiles, gameProblems, problemsOf } from '../../fixtures/content/kind.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

type Json = Record<string, unknown>
const hero = () => ({
  format: 1 as const,
  id: 'hero',
  numbers: [
    {
      id: 'run-speed',
      about: 'How fast the hero runs, in tiles a second.',
      value: 6,
      min: 1,
      max: 12,
      step: 0.5,
    },
    {
      id: 'jump-speed',
      about: 'How hard the hero jumps, in tiles a second.',
      value: 12,
      min: 4,
      max: 20,
      step: 0.5,
    },
  ],
  controls: [
    {
      action: 'left',
      label: 'Left',
      keys: ['ArrowLeft', 'KeyA'],
      side: 'left',
      pad: ['dpad-left', 'left-stick-left'],
      shared: [['KeyA'], ['ArrowLeft']],
    },
    {
      action: 'right',
      label: 'Right',
      keys: ['ArrowRight', 'KeyD'],
      side: 'left',
      pad: ['dpad-right', 'left-stick-right'],
      shared: [['KeyD'], ['ArrowRight']],
    },
    {
      action: 'jump',
      label: 'Jump',
      keys: ['Space', 'ArrowUp'],
      side: 'right',
      pad: ['south'],
      shared: [['KeyW'], ['ArrowUp']],
    },
  ],
})
const file = 'content/tunings/hero.json'
const said = (value: unknown): string[] => problemsOf('tuning', value, file)

/** The example with one change made to its numbers or its controls. */
function withControl(i: number, change: (control: Json) => void): ReturnType<typeof hero> {
  const value = hero()
  change(value.controls[i] as unknown as Json)
  return value
}

test('a tuning reads, and writes back to the same bytes twice', () => expectRoundTrip('tuning', hero()))

test('a tuning with no controls is fine, and has none', () => {
  const { controls: _unused, ...plain } = hero()
  expectRoundTrip('tuning', plain)
})

test('tuningNumbers gives each value by its id, in a map with no prototype', () => {
  const numbers = tuningNumbers(hero() as never)
  expect(numbers['run-speed']).toBe(6)
  expect(numbers['jump-speed']).toBe(12)
  expect('toString' in numbers).toBe(false)
})

test('two numbers with one id', () => {
  const t = hero()
  Object.assign(t.numbers[1] as Json, { id: 'run-speed' })
  expect(said(t)).toEqual([
    `${file}: numbers[1].id: "run-speed" is used twice. Each number needs its own id.`,
  ])
})

test('a range that is the wrong way round, or a value outside it', () => {
  const t = hero()
  Object.assign(t.numbers[0] as Json, { min: 12, max: 1 })
  expect(said(t)).toEqual([`${file}: numbers[0].min: "min" must be less than "max".`])
  const u = hero()
  Object.assign(u.numbers[0] as Json, { value: 12, max: 10 })
  expect(said(u)).toEqual([`${file}: numbers[0].value: 12 is outside this number's range, 1 to 10.`])
})

test('a step that is not more than nothing', () => {
  const t = hero()
  Object.assign(t.numbers[0] as Json, { step: 0 })
  expect(said(t)).toEqual([`${file}: numbers[0].step: This must be more than 0.`])
})

test('an action listed twice', () =>
  expect(said(withControl(2, (c) => (c.action = 'left')))).toEqual([
    `${file}: controls[2].action: "left" is listed twice. Each action is listed once.`,
  ]))

test('an action name that is not small letters and dashes', () =>
  expect(said(withControl(0, (c) => (c.action = 'Left Turn')))).toEqual([
    `${file}: controls[0].action: Use small letters, numbers and dashes, like "jump".`,
  ]))

test('a label with only spaces, or one that is too long', () => {
  expect(said(withControl(2, (c) => (c.label = '  ')))).toEqual([
    `${file}: controls[2].label: The action "jump" needs a label, the word on its button, like "Jump".`,
  ])
  expect(said(withControl(2, (c) => (c.label = 'Jump very far')))).toEqual([
    `${file}: controls[2].label: This has more than 12 characters, which is the most allowed.`,
  ])
})

test('a key two actions both use', () =>
  expect(said(withControl(2, (c) => (c.keys = ['Space', 'KeyD'])))).toEqual([
    `${file}: controls[2].keys[1]: The key KeyD is used for both "right" and "jump". Give each action its own key.`,
  ]))

test('a key kept for the game’s menus', () =>
  expect(said(withControl(2, (c) => (c.keys = ['Escape'])))).toEqual([
    `${file}: controls[2].keys[0]: The key Escape is kept for the game's menus. Give "jump" another key.`,
  ]))

test('a gamepad button that does not exist', () =>
  expect(said(withControl(2, (c) => (c.pad = ['turbo'])))).toEqual([
    `${file}: controls[2].pad[0]: "turbo" is not a gamepad button the game knows. Use a name like "south", "dpad-left" or "left-stick-up".`,
  ]))

test('a gamepad button kept for the game’s menus', () =>
  expect(said(withControl(2, (c) => (c.pad = ['start'])))).toEqual([
    `${file}: controls[2].pad[0]: The gamepad button start is kept for the game's menus. Give "jump" another button.`,
  ]))

test('a gamepad button two actions both use', () =>
  expect(said(withControl(2, (c) => (c.pad = ['dpad-left'])))).toEqual([
    `${file}: controls[2].pad[0]: The gamepad button dpad-left is used for both "left" and "jump". Give each action its own button.`,
  ]))

test('some actions with keys for a shared keyboard and some without', () =>
  expect(
    said(
      withControl(0, (c) => {
        delete c.shared
      }),
    ),
  ).toEqual([
    `${file}: controls[0]: The action "left" has no keys for a shared keyboard. Give every action "shared" keys, or none of them.`,
  ]))

test('a shared keyboard needs both halves', () =>
  expect(said(withControl(2, (c) => (c.shared = [['KeyW']])))).toHaveLength(1))

test('a key on both halves of a shared keyboard', () =>
  expect(said(withControl(2, (c) => (c.shared = [['KeyW'], ['KeyA']])))).toEqual([
    `${file}: controls[2].shared[1][0]: The key KeyA is on both halves of a shared keyboard. Each person needs their own keys.`,
  ]))

test('a key two actions share on one half of a shared keyboard', () =>
  expect(said(withControl(2, (c) => (c.shared = [['KeyA'], ['ArrowUp']])))).toEqual([
    `${file}: controls[2].shared[0][0]: On a shared keyboard, the key KeyA is used for both "left" and "jump". Give each action its own key.`,
  ]))

test('a person with no key on a shared keyboard', () => {
  expect(said(withControl(2, (c) => (c.shared = [[], ['ArrowUp']])))).toEqual([
    `${file}: controls[2].shared[0]: The action "jump" has no key for the first person on a shared keyboard. Give it one.`,
  ])
  expect(said(withControl(2, (c) => (c.shared = [['KeyW'], []])))).toEqual([
    `${file}: controls[2].shared[1]: The action "jump" has no key for the second person on a shared keyboard. Give it one.`,
  ])
})

test('a missing field says what to write', () => {
  const t = hero()
  delete (t.numbers[0] as Partial<Json>).step
  expect(said(t)).toEqual([
    `${file}: numbers[0].step: This is missing. Write how far one nudge moves it, like 0.5.`,
  ])
})

test('an unknown key', () =>
  expect(said({ ...hero(), mood: 'cross' })).toEqual([
    `${file}: mood: This is not something a tuning has. Remove it or check the spelling.`,
  ]))

/** The fixture game with a tuning called hero listed, and the hero naming `name` as its tuning. */
const gameWithTuning = (name: string): Record<string, string | undefined> =>
  gameFiles(fixtureFiles, [{ type: 'tuning', path: file, text: writeContent('tuning', hero() as never) }], {
    'content/characters/hero.json': changed(
      'character',
      fixtureFiles['content/characters/hero.json'],
      (c) => {
        c.tuning = name
      },
    ),
  })

test('a hero that names a tuning the game has', async () =>
  expect(await gameProblems(gameWithTuning('hero'))).toEqual([]))

test('a character that names a tuning the game does not have', async () =>
  expect(await gameProblems(gameWithTuning('hera'))).toEqual([
    'content/characters/hero.json: tuning: There is no tuning called "hera". This game has: hero.',
  ]))
