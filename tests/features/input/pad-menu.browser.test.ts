// The pad's menu for a screen shown while no game runs: a press of the pad is a menu press, and what is held when the
// menu is made waits for a fresh press, so the button that closed the last screen is not heard again.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { type MenuPress, padMenu } from '#src/features/input/input.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { type FakeGamepads, fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'

const FRAME = 1000 / 60

let fake: FakeGamepads
let frames: ManualFrames
let menu: ReturnType<typeof padMenu> | undefined
let heard: MenuPress[]

beforeEach(() => {
  fake = fakeGamepads()
  frames = manualFrames()
  heard = []
})
afterEach(() => {
  menu?.destroy()
  menu = undefined
})

const make = (): ReturnType<typeof padMenu> => {
  menu = padMenu({ frames, gamepads: fake.getGamepads })
  menu.on((press) => heard.push(press))
  frames.at(0)
  return menu
}

test('a direction held for one frame is pressed once', () => {
  fake.connect(0)
  make()
  fake.press('dpad-right')
  frames.advance(FRAME)
  expect(heard).toEqual(['right'])
  fake.release('dpad-right')
  frames.advance(FRAME)
  expect(heard).toEqual(['right'])
})

test('south is accept', () => {
  fake.connect(0)
  make()
  fake.press('south')
  frames.advance(FRAME)
  expect(heard).toEqual(['accept'])
})

// Review Focus 5: the press that ended the screen before this one is still down when this one opens.
test('a button held when the menu is made does nothing until it is let go and pressed again', () => {
  fake.connect(0)
  fake.press('south')
  make()
  frames.advance(FRAME)
  frames.advance(FRAME)
  expect(heard).toEqual([])
  fake.release('south')
  frames.advance(FRAME)
  expect(heard).toEqual([])
  fake.press('south')
  frames.advance(FRAME)
  expect(heard).toEqual(['accept'])
})

test('after destroy nothing is heard and no frame is asked for', () => {
  fake.connect(0)
  const made = make()
  expect(frames.pending).toBe(true)
  made.destroy()
  expect(frames.pending).toBe(false)
  fake.press('south')
  frames.advance(FRAME)
  expect(heard).toEqual([])
  expect(frames.pending).toBe(false)
})

test('a listener that is taken away hears nothing more', () => {
  fake.connect(0)
  const made = make()
  const extra: MenuPress[] = []
  const stop = made.on((press) => extra.push(press))
  fake.press('dpad-left')
  frames.advance(FRAME)
  stop()
  fake.release('dpad-left')
  frames.advance(FRAME)
  fake.press('dpad-up')
  frames.advance(FRAME)
  expect(extra).toEqual(['left'])
  expect(heard).toEqual(['left', 'up'])
})

// Plan U, Task 2: the main menu lets a second player join with their own pad, so a press says which pad it came from.
test('the pad that pressed is named', () => {
  fake.connect(2)
  menu = padMenu({ frames, gamepads: fake.getGamepads })
  const named: [MenuPress, number][] = []
  menu.on((press, pad) => named.push([press, pad]))
  frames.at(0)
  fake.press('south', 2)
  frames.advance(FRAME)
  expect(named).toEqual([['accept', 2]])
})
