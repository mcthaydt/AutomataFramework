// Changing a binding while the game is running: waiting for the next key or pad press, and keeping the change.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { controlsCommand } from '#src/features/commands/commands.ts'
import { createInput, type Input } from '#src/features/input/input.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { type FakeGamepads, fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'

let mount: HTMLDivElement
let input: Input
let fake: FakeGamepads
let frames: ManualFrames

const make = (settings?: unknown): Input => {
  input = createInput({
    mount,
    controls: fixtureControls,
    gamepads: fake.getGamepads,
    frames,
    ...(settings === undefined ? {} : { settings }),
  })
  return input
}
/** A key event on the window; says whether the page's default was stopped. */
const key = (type: 'keydown' | 'keyup', code: string, init: KeyboardEventInit = {}): boolean => {
  const event = new KeyboardEvent(type, { code, bubbles: true, cancelable: true, ...init })
  // From the page, as a browser sends it: the capture phase of the window comes before everything else.
  document.body.dispatchEvent(event)
  return event.defaultPrevented
}

beforeEach(() => {
  fake = fakeGamepads()
  frames = manualFrames()
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
  make()
})
afterEach(() => {
  input.destroy()
  mount.remove()
  vi.restoreAllMocks()
})

test('the next key pressed is the answer, and the game does not see it', async () => {
  const capture = input.capture('keys')
  expect(key('keydown', 'KeyK')).toBe(true)
  await expect(capture.done).resolves.toEqual({ ok: true, input: 'KeyK' })
  expect(input.poll(0)).toEqual([])
})

test("a held key's repeats are not the answer", async () => {
  const capture = input.capture('keys')
  key('keydown', 'Enter', { repeat: true })
  key('keydown', 'KeyK')
  await expect(capture.done).resolves.toEqual({ ok: true, input: 'KeyK' })
})

test('Escape cancels, and is not passed on', async () => {
  const seen = vi.fn()
  window.addEventListener('keydown', seen)
  const capture = input.capture('keys')
  expect(key('keydown', 'Escape')).toBe(true)
  await expect(capture.done).resolves.toEqual({ ok: false, reason: 'cancelled' })
  expect(seen).not.toHaveBeenCalled()
  window.removeEventListener('keydown', seen)
})

test('the next gamepad press is the answer; what was already down is not', async () => {
  fake.connect(0)
  fake.press('south')
  const capture = input.capture('pad')
  frames.advance(16)
  fake.press('west')
  frames.advance(16)
  await expect(capture.done).resolves.toEqual({ ok: true, input: 'west' })
})

test('a stick direction can be the answer', async () => {
  fake.connect(0)
  const capture = input.capture('pad')
  frames.advance(16)
  fake.press('left-stick-up')
  frames.advance(16)
  await expect(capture.done).resolves.toEqual({ ok: true, input: 'left-stick-up' })
})

test('start cancels a gamepad capture', async () => {
  fake.connect(0)
  const capture = input.capture('pad')
  frames.advance(16)
  fake.press('start')
  frames.advance(16)
  await expect(capture.done).resolves.toEqual({ ok: false, reason: 'cancelled' })
})

test('a second capture cancels the first', async () => {
  const first = input.capture('keys')
  const second = input.capture('keys')
  await expect(first.done).resolves.toEqual({ ok: false, reason: 'cancelled' })
  key('keydown', 'KeyK')
  await expect(second.done).resolves.toEqual({ ok: true, input: 'KeyK' })
})

test('cancel gives up, once', async () => {
  const capture = input.capture('keys')
  capture.cancel()
  key('keydown', 'KeyK')
  await expect(capture.done).resolves.toEqual({ ok: false, reason: 'cancelled' })
})

test('a Space answer does not press the button that has the focus', async () => {
  const button = document.createElement('button')
  const clicked = vi.fn()
  button.addEventListener('click', clicked)
  mount.append(button)
  button.focus()
  const capture = input.capture('keys')
  key('keydown', 'Space')
  key('keyup', 'Space')
  await expect(capture.done).resolves.toEqual({ ok: true, input: 'Space' })
  expect(clicked).not.toHaveBeenCalled()
})

test('the game is silent while a capture waits and plays again after', () => {
  fake.connect(0)
  fake.press('dpad-right')
  expect(input.poll(0)).toEqual([controlsCommand(0, 1, 0, ['right'])])
  const capture = input.capture('pad')
  expect(input.poll(1)).toEqual([controlsCommand(1, 1, 1, [])])
  capture.cancel()
  // What was held when it ended does nothing until it is let go.
  expect(input.poll(2)).toEqual([])
  fake.release('dpad-right')
  input.poll(3)
  fake.press('dpad-right')
  expect(input.poll(4)).toEqual([controlsCommand(4, 1, 2, ['right'])])
})

test("the answer's key coming up is swallowed once, and a later press of it plays", async () => {
  const capture = input.capture('keys')
  key('keydown', 'KeyK')
  await capture.done
  input.rebind('jump', 'keys', 'KeyK')
  expect(key('keyup', 'KeyK')).toBe(true)
  key('keydown', 'KeyK')
  expect(input.poll(0)).toEqual([controlsCommand(0, 1, 0, ['jump'])])
  key('keyup', 'KeyK')
  expect(input.poll(1)).toEqual([controlsCommand(1, 1, 1, [])])
})

test('rebind changes what the keys do at once', () => {
  expect(input.rebind('jump', 'keys', 'KeyK').ok).toBe(true)
  key('keydown', 'KeyK')
  expect(input.poll(0)).toEqual([controlsCommand(0, 1, 0, ['jump'])])
  key('keyup', 'KeyK')
  key('keydown', 'Space')
  expect(input.poll(1)).toEqual([controlsCommand(1, 1, 1, [])])
})

test('a newly bound key is listened to, and stops scrolling the page', () => {
  expect(key('keydown', 'KeyK')).toBe(false)
  input.rebind('jump', 'keys', 'KeyK')
  expect(key('keydown', 'KeyK')).toBe(true)
})

test('settings round-trips through a new input', () => {
  input.rebind('jump', 'keys', 'KeyK')
  input.rebind('left', 'pad', 'west')
  const first = input
  const saved = JSON.parse(JSON.stringify(first.settings()))
  const second = make(saved)
  expect(second.controls()).toEqual(first.controls())
  first.destroy()
})

test('nothing changed saves nothing', () => {
  expect(input.settings()).toEqual({ format: 1, bindings: {} })
})

test('saved bindings that no longer fit are dropped, not thrown', () => {
  input.destroy()
  const second = make({ format: 1, bindings: { fly: { keys: ['KeyF'] } } })
  expect(second.dropped()).toEqual(['fly'])
  expect(second.controls()).toEqual(fixtureControls)
})

test("resetBindings gives back the game's own controls and tells onBindings", () => {
  const told = vi.fn()
  input.onBindings(told)
  input.rebind('jump', 'keys', 'KeyK')
  expect(told).toHaveBeenLastCalledWith({ format: 1, bindings: { jump: { keys: ['KeyK'] } } })
  input.resetBindings()
  expect(told).toHaveBeenLastCalledWith({ format: 1, bindings: {} })
  expect(input.controls()).toEqual(fixtureControls)
})

test('a refused rebind changes nothing and says why', () => {
  const told = vi.fn()
  input.onBindings(told)
  const answer = input.rebind('jump', 'keys', 'Tab')
  expect(answer.ok).toBe(false)
  expect(input.controls()).toEqual(fixtureControls)
  expect(told).not.toHaveBeenCalled()
})
