// Reading one gamepad as the names of what is held on it.
import { expect, test } from 'vitest'
import { PAD_BUTTONS } from '#src/features/commands/commands.ts'
import { isUsable, type PadLike, readPad } from '#src/features/input/gamepad.ts'
import { type FakeGamepads, fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'

/** A fake pad in slot 0, read the way the game reads it. */
function pad(options?: Parameters<FakeGamepads['connect']>[1]): { fake: FakeGamepads; read: () => PadLike } {
  const fake = fakeGamepads()
  fake.connect(0, options)
  return { fake, read: () => fake.getGamepads()[0] as unknown as PadLike }
}

const held = (read: () => PadLike): string[] => [...readPad(read())].sort()

test('a pad at rest holds nothing', () => {
  const { read } = pad()
  expect(readPad(read())).toEqual(new Set())
})

test('each button is read by its name', () => {
  PAD_BUTTONS.forEach((name) => {
    const { fake, read } = pad()
    fake.press(name)
    expect(held(read), name).toEqual([name])
  })
})

test('a trigger counts from half way', () => {
  const { fake, read } = pad()
  fake.press('l2', 0, 0.49)
  expect(held(read)).toEqual([])
  fake.press('l2', 0, 0.5)
  expect(held(read)).toEqual(['l2'])
})

test('a stick resting off centre is still', () => {
  const { fake, read } = pad()
  fake.stick(0.2, 0.1)
  expect(held(read)).toEqual([])
})

test('a stick pushed right is right, and nothing else', () => {
  const { fake, read } = pad()
  fake.stick(0.3, 0.01)
  expect(held(read)).toEqual(['left-stick-right'])
})

test('a stick pushed to a corner is both directions', () => {
  const { fake, read } = pad()
  fake.stick(0.7, -0.7)
  expect(held(read)).toEqual(['left-stick-right', 'left-stick-up'])
})

test('the right stick has its own names', () => {
  const { fake, read } = pad()
  fake.stick(-1, 0, 0, 'right')
  expect(held(read)).toEqual(['right-stick-left'])
})

test('a pad the browser could not map holds nothing, and is not usable', () => {
  const { fake, read } = pad({ mapping: '' })
  fake.press('south')
  expect(readPad(read())).toEqual(new Set())
  expect(isUsable(read())).toBe(false)
})

test('a pad with fewer buttons or axes than the standard does not throw', () => {
  const bare: PadLike = { id: 'tiny', index: 0, connected: true, mapping: 'standard', axes: [], buttons: [] }
  expect(readPad(bare)).toEqual(new Set())
  expect(isUsable(bare)).toBe(true)
})

// Audit M2: a browser that calls a trigger pressed early must not make it count before half travel.
test('a trigger a browser calls pressed early still counts only from half way, and a face button by pressed alone', () => {
  const buttons = Array.from({ length: PAD_BUTTONS.length }, () => ({ pressed: false, value: 0 }))
  buttons[PAD_BUTTONS.indexOf('l2')] = { pressed: true, value: 0.2 }
  buttons[PAD_BUTTONS.indexOf('r2')] = { pressed: true, value: 0.7 }
  buttons[PAD_BUTTONS.indexOf('south')] = { pressed: true, value: 0 }
  const early: PadLike = {
    id: 'Standard Gamepad',
    index: 0,
    connected: true,
    mapping: 'standard',
    axes: [0, 0, 0, 0],
    buttons,
  }
  expect([...readPad(early)].sort()).toEqual(['r2', 'south'])
})
