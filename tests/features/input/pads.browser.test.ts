// Reading the browser's gamepads: the default source, what is kept from acting after a change of hands, and arrivals.
import { afterEach, expect, test, vi } from 'vitest'
import { createPads } from '#src/features/input/pads.ts'
import { fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'

afterEach(() => {
  Reflect.deleteProperty(navigator, 'getGamepads')
})

test("by default the pads are the browser's own", () => {
  const fake = fakeGamepads()
  Object.defineProperty(navigator, 'getGamepads', { value: fake.getGamepads, configurable: true })
  fake.connect(0)
  fake.press('south')
  const pads = createPads()
  expect(pads.list()).toEqual([{ index: 0, id: 'Standard Gamepad (STANDARD GAMEPAD)', usable: true }])
  expect([...(pads.read().get(0) ?? [])]).toEqual(['south'])
})

test('a pad past the four slots is listed as not usable', () => {
  const pads = createPads(() => [
    { id: 'far', index: 4, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: [] },
  ])
  expect(pads.list()).toEqual([{ index: 4, id: 'far', usable: false }])
  expect(pads.read().size).toBe(0)
})

test('mask hides what is held, per input, until each is let go', () => {
  const fake = fakeGamepads()
  fake.connect(0)
  const pads = createPads(fake.getGamepads)
  fake.press('south')
  fake.press('dpad-left')
  pads.mask()
  expect([...(pads.read().get(0) ?? [])]).toEqual([])
  fake.release('south')
  expect([...(pads.read().get(0) ?? [])]).toEqual([])
  fake.press('south')
  expect([...(pads.read().get(0) ?? [])]).toEqual(['south'])
})

test('mask on one pad leaves the others alone', () => {
  const fake = fakeGamepads()
  fake.connect(0)
  fake.connect(1)
  fake.press('south', 0)
  fake.press('south', 1)
  const pads = createPads(fake.getGamepads)
  pads.mask(1)
  const read = pads.read()
  expect([...(read.get(0) ?? [])]).toEqual(['south'])
  expect([...(read.get(1) ?? [])]).toEqual([])
})

test('onChange fires when a pad arrives and when it goes, not on every read', () => {
  const fake = fakeGamepads()
  const pads = createPads(fake.getGamepads)
  const changed = vi.fn()
  pads.onChange(changed)
  pads.read()
  expect(changed).not.toHaveBeenCalled()
  fake.connect(0)
  pads.read()
  pads.read()
  expect(changed).toHaveBeenCalledTimes(1)
  fake.unplug(0)
  pads.read()
  expect(changed).toHaveBeenCalledTimes(2)
})
