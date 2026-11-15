// The browser's own gestures kept off a game while it is played, and everything put back as it was afterwards.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { guardPlay } from '#src/features/game/guard.ts'

let mount: HTMLDivElement

beforeEach(() => {
  mount = document.createElement('div')
  document.body.append(mount)
})
afterEach(() => {
  mount.remove()
})

test('the mount takes every touch and selects nothing; the page is not pulled or bounced', () => {
  const undo = guardPlay(mount)
  expect(getComputedStyle(mount).touchAction).toBe('none')
  // Each browser keeps the spelling it knows: WebKit reads the prefixed one, the others the plain one.
  const select = mount.style.getPropertyValue('user-select') || mount.style.getPropertyValue('-webkit-user-select')
  expect(select).toBe('none')
  expect(getComputedStyle(document.documentElement).overscrollBehaviorY).toBe('none')
  expect(getComputedStyle(document.body).overscrollBehaviorY).toBe('none')
  undo()
})

test('a right click on the game opens no menu; elsewhere on the page it still does', () => {
  const undo = guardPlay(mount)
  const onGame = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
  mount.dispatchEvent(onGame)
  expect(onGame.defaultPrevented).toBe(true)
  const elsewhere = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
  document.body.dispatchEvent(elsewhere)
  expect(elsewhere.defaultPrevented).toBe(false)
  undo()
  const after = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
  mount.dispatchEvent(after)
  expect(after.defaultPrevented).toBe(false)
})

test('the undo puts back what the page had, its own values included', () => {
  mount.style.setProperty('touch-action', 'pan-y')
  document.documentElement.style.setProperty('overscroll-behavior', 'contain')
  const undo = guardPlay(mount)
  undo()
  expect(mount.style.getPropertyValue('touch-action')).toBe('pan-y')
  expect(mount.style.getPropertyValue('user-select')).toBe('')
  expect(document.documentElement.style.getPropertyValue('overscroll-behavior')).toBe('contain')
  expect(document.body.style.getPropertyValue('overscroll-behavior')).toBe('')
  document.documentElement.style.removeProperty('overscroll-behavior')
})
