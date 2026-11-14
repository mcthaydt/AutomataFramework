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
