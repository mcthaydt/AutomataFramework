// Gamepad presses for menus: a held direction repeats like a held key, and the buttons answer once.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createInput, type Input, type MenuPress } from '#src/features/input/input.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { type FakeGamepads, fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'

let mount: HTMLDivElement
let input: Input
let fake: FakeGamepads
let frames: ManualFrames
let heard: MenuPress[]

beforeEach(() => {
  fake = fakeGamepads()
  frames = manualFrames()
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
  input = createInput({ mount, controls: fixtureControls, gamepads: fake.getGamepads, frames })
  heard = []
  input.onMenu((press) => heard.push(press))
})
afterEach(() => {
  input.destroy()
  mount.remove()
  vi.restoreAllMocks()
})

test('dpad-down is one "down" at once, another after 400 ms, then one every 120 ms', () => {
  fake.connect(0)
  fake.press('dpad-down')
  const counts: number[] = []
  for (const ms of [0, 399, 400, 519, 520]) {
    frames.at(ms)
    counts.push(heard.length)
  }
  expect(counts).toEqual([1, 1, 2, 2, 3])
  expect(new Set(heard)).toEqual(new Set(['down']))
})

test('letting go and pressing again starts over', () => {
  fake.connect(0)
  fake.press('dpad-left')
  frames.at(0)
  fake.release('dpad-left')
  frames.at(16)
  fake.press('dpad-left')
  frames.at(32)
  expect(heard).toEqual(['left', 'left'])
})

test('the left stick walks a menu along its stronger axis only', () => {
  fake.connect(0)
  fake.stick(0.6, 0.8)
  frames.at(0)
  expect(heard).toEqual(['down'])
})

test('south is accept, east is back, start is pause, once per press', () => {
  fake.connect(0)
  fake.press('south')
  frames.at(0)
  frames.at(16)
  fake.release('south')
  fake.press('east')
  frames.at(32)
  fake.release('east')
  fake.press('start')
  frames.at(48)
  frames.at(5000)
  expect(heard).toEqual(['accept', 'back', 'pause'])
})

test('menu presses come through while the input is silenced', () => {
  fake.connect(0)
  const release = input.silence()
  fake.press('dpad-up')
  frames.at(0)
  expect(heard).toEqual(['up'])
  release()
})

test('a pad that is not usable sends nothing', () => {
  fake.connect(0, { mapping: '' })
  fake.press('south')
  fake.press('dpad-down')
  frames.at(0)
  expect(heard).toEqual([])
})

test('a gamepad answer is not also a menu press', async () => {
  fake.connect(0)
  const capture = input.capture('pad')
  frames.at(0)
  fake.press('south')
  frames.at(16)
  await expect(capture.done).resolves.toEqual({ ok: true, input: 'south' })
  frames.at(32)
  expect(heard).toEqual([])
})

test('start cancels a capture and does not also pause', async () => {
  fake.connect(0)
  const capture = input.capture('pad')
  frames.at(0)
  fake.press('start')
  frames.at(16)
  await expect(capture.done).resolves.toEqual({ ok: false, reason: 'cancelled' })
  frames.at(32)
  expect(heard).toEqual([])
})
