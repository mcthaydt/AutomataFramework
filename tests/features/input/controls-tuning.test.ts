// A game keeps its controls in a tuning file and hands them to the input: what the content feature reads is what the
// input feature takes, with nothing lost on the way, and the fixture game's own controls come out the same either way.
import { expect, test } from 'vitest'
import { parseContent, type TuningControl } from '#src/features/content/content.ts'
import { checkControls, controlsFromList } from '#src/features/input/input.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'

const file = 'content/tunings/hero.json'

const NUMBER = { id: 'run-speed', about: 'How fast the hero runs.', value: 6, min: 1, max: 12, step: 0.5 }

/** A tuning file that lists the fixture game's controls, written the way an author or an agent writes it. */
const tuning = (controls: unknown): string =>
  JSON.stringify({ format: 1, id: 'hero', numbers: [NUMBER], controls })

const listed: TuningControl[] = Object.entries(fixtureControls).map(([action, control]) => ({
  action,
  ...control,
}))

test("a tuning file's controls go straight into controlsFromList, and come out as the game's own", () => {
  const parsed = parseContent('tuning', tuning(listed), file)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) return
  const controls = controlsFromList(parsed.value.controls ?? [])
  expect(controls).toEqual(fixtureControls)
  expect(() => checkControls(controls)).not.toThrow()
})

test('a tuning control with no gamepad buttons and no shared keys is a plain control', () => {
  const parsed = parseContent(
    'tuning',
    tuning([{ action: 'jump', label: 'Jump', keys: ['Space'], side: 'right' }]),
    file,
  )
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) return
  expect(controlsFromList(parsed.value.controls ?? [])).toEqual({
    jump: { label: 'Jump', keys: ['Space'], side: 'right' },
  })
})

// The two checks say the same thing: what the content feature refuses, the input would have refused too.
test('what a tuning file refuses for its controls, controlsFromList refuses as well', () => {
  const clash: TuningControl[] = [
    { action: 'left', label: 'Left', keys: ['KeyA'], side: 'left' },
    { action: 'right', label: 'Right', keys: ['KeyA'], side: 'left' },
  ]
  expect(parseContent('tuning', tuning(clash), file).ok).toBe(false)
  expect(() => controlsFromList(clash)).toThrow()
})

// Audit M6: the two copies of the checks say the same sentence, case by case, not only for one clash.
const shared = (a: string[], b: string[]): [string[], string[]] => [a, b]
const SAME_SENTENCE: readonly (readonly [string, TuningControl[], string])[] = [
  [
    'a key kept for menus',
    [{ action: 'jump', label: 'Jump', keys: ['Escape'], side: 'right' }],
    `The key Escape is kept for the game's menus. Give "jump" another key.`,
  ],
  [
    'one key for two actions',
    [
      { action: 'left', label: 'Left', keys: ['KeyA'], side: 'left' },
      { action: 'right', label: 'Right', keys: ['KeyA'], side: 'left' },
    ],
    'The key KeyA is used for both "left" and "right". Give each action its own key.',
  ],
  [
    'a button kept for menus',
    [{ action: 'jump', label: 'Jump', keys: ['Space'], side: 'right', pad: ['start'] }],
    `The gamepad button start is kept for the game's menus. Give "jump" another button.`,
  ],
  [
    'one button for two actions',
    [
      { action: 'left', label: 'Left', keys: ['KeyA'], side: 'left', pad: ['south'] },
      { action: 'right', label: 'Right', keys: ['KeyD'], side: 'left', pad: ['south'] },
    ],
    'The gamepad button south is used for both "left" and "right". Give each action its own button.',
  ],
  [
    'an empty label',
    [{ action: 'jump', label: '', keys: ['Space'], side: 'right' }],
    'The action "jump" needs a label, the word on its button, like "Jump".',
  ],
  [
    'no key for the second person',
    [{ action: 'jump', label: 'Jump', keys: ['Space'], side: 'right', shared: shared(['KeyW'], []) }],
    'The action "jump" has no key for the second person on a shared keyboard. Give it one.',
  ],
  [
    'a shared key kept for menus',
    [{ action: 'jump', label: 'Jump', keys: ['Space'], side: 'right', shared: shared(['Tab'], ['KeyW']) }],
    `The key Tab is kept for the game's menus. Give "jump" another key.`,
  ],
  [
    'a key on both halves',
    [{ action: 'jump', label: 'Jump', keys: ['Space'], side: 'right', shared: shared(['KeyW'], ['KeyW']) }],
    'The key KeyW is on both halves of a shared keyboard. Each person needs their own keys.',
  ],
  [
    'one shared key for two actions',
    [
      {
        action: 'left',
        label: 'Left',
        keys: ['KeyA'],
        side: 'left',
        shared: shared(['KeyA'], ['ArrowLeft']),
      },
      {
        action: 'right',
        label: 'Right',
        keys: ['KeyD'],
        side: 'left',
        shared: shared(['KeyA'], ['ArrowRight']),
      },
    ],
    'On a shared keyboard, the key KeyA is used for both "left" and "right". Give each action its own key.',
  ],
  [
    'some actions with shared keys and some without',
    [
      {
        action: 'left',
        label: 'Left',
        keys: ['KeyA'],
        side: 'left',
        shared: shared(['KeyA'], ['ArrowLeft']),
      },
      { action: 'right', label: 'Right', keys: ['KeyD'], side: 'left' },
    ],
    'The action "right" has no keys for a shared keyboard. Give every action "shared" keys, or none of them.',
  ],
  [
    'an action listed twice',
    [
      { action: 'jump', label: 'Jump', keys: ['Space'], side: 'right' },
      { action: 'jump', label: 'Jump', keys: ['KeyW'], side: 'right' },
    ],
    '"jump" is listed twice. Each action is listed once.',
  ],
]

for (const [name, list, sentence] of SAME_SENTENCE)
  test(`${name}: the tuning file and controlsFromList say the same sentence`, () => {
    const parsed = parseContent('tuning', tuning(list), file)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.diagnostics.map((d) => d.message)).toContain(sentence)
    expect(() => controlsFromList(list)).toThrow(sentence)
  })
