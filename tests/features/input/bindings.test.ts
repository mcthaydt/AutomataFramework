// Changing a key or button, keeping the change, and loading it back into a game that may have changed.
import { expect, test } from 'vitest'
import {
  applySettings,
  type Controls,
  INPUT_SETTINGS_DEFAULT,
  rebind,
  settingsOf,
} from '#src/features/input/input.ts'
import { deepFreeze } from '#src/lib/deep-freeze.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'

const c = fixtureControls

/** The controls after a change that must have been allowed. */
function changed(...args: Parameters<typeof rebind>): Controls {
  const answer = rebind(...args)
  if (!answer.ok) throw new Error(answer.message)
  return answer.controls
}

test('jump moves to K: K is its only key, and nothing else changes', () => {
  const answer = rebind(c, 'jump', 'keys', 'KeyK')
  expect(answer.ok).toBe(true)
  if (!answer.ok) return
  expect(answer.controls.jump?.keys).toEqual(['KeyK'])
  expect(answer.controls.left).toBe(c.left)
  expect(answer.controls.right).toBe(c.right)
  expect(answer.swapped).toBeUndefined()
})

test('taking a key another action has more of just takes it', () => {
  const answer = changed(c, 'jump', 'keys', 'KeyA')
  expect(answer.jump?.keys).toEqual(['KeyA'])
  expect(answer.left?.keys).toEqual(['ArrowLeft'])
})

test("taking an action's only button swaps", () => {
  const start: Controls = { ...c, left: { ...c.left, pad: ['dpad-left'] } as Controls[string] }
  const answer = rebind(start, 'left', 'pad', 'south')
  expect(answer.ok).toBe(true)
  if (!answer.ok) return
  expect(answer.controls.left?.pad).toEqual(['south'])
  expect(answer.controls.jump?.pad).toEqual(['dpad-left'])
  expect(answer.swapped).toBe('jump')
})

test('Escape, Tab, start and home are refused, in words', () => {
  expect(rebind(c, 'jump', 'keys', 'Escape')).toEqual({
    ok: false,
    reason: 'reserved',
    message: "Escape is kept for the game's menus. Pick another key.",
  })
  expect(rebind(c, 'jump', 'keys', 'Tab').ok).toBe(false)
  expect(rebind(c, 'jump', 'pad', 'start')).toEqual({
    ok: false,
    reason: 'reserved',
    message: "The start button is kept for the game's menus. Pick another button.",
  })
  expect(rebind(c, 'jump', 'pad', 'home').ok).toBe(false)
})

test('an action the game does not have is refused', () => {
  expect(rebind(c, 'fly', 'keys', 'KeyF')).toEqual({
    ok: false,
    reason: 'unknown-action',
    message: 'This game has no action called "fly".',
  })
})

test('a shared slot on controls with no shared keys is refused', () => {
  const plain: Controls = { jump: { label: 'Jump', keys: ['Space'], side: 'right' } }
  expect(rebind(plain, 'jump', 'shared-1', 'KeyW')).toEqual({
    ok: false,
    reason: 'no-shared',
    message: "This game's keys cannot be shared.",
  })
})

test("a key from the other person's half is refused", () => {
  expect(rebind(c, 'jump', 'shared-1', 'ArrowUp')).toEqual({
    ok: false,
    reason: 'other-half',
    message: "That key is the other person's. Pick another key.",
  })
  expect(rebind(c, 'jump', 'shared-1', 'KeyK').ok).toBe(true)
})

test("settingsOf is empty for the game's own controls, and holds only what changed", () => {
  expect(settingsOf(c, c)).toEqual(INPUT_SETTINGS_DEFAULT)
  expect(settingsOf(c, changed(c, 'jump', 'keys', 'KeyK'))).toEqual({
    format: 1,
    bindings: { jump: { keys: ['KeyK'] } },
  })
})

test('applySettings(defaults, settingsOf(defaults, changed)) gives back changed', () => {
  for (const next of [
    changed(c, 'jump', 'keys', 'KeyK'),
    changed(c, 'jump', 'shared-1', 'KeyK'),
    changed(c, 'jump', 'pad', 'west'),
  ]) {
    const back = applySettings(c, JSON.parse(JSON.stringify(settingsOf(c, next))))
    expect(back.controls).toEqual(next)
    expect(back.dropped).toEqual([])
  }
})

test('a key taken from another action survives a save and a load', () => {
  const next = changed(c, 'jump', 'keys', 'KeyA')
  const back = applySettings(c, settingsOf(c, next))
  expect(back.controls.jump?.keys).toEqual(['KeyA'])
  expect(back.controls.left?.keys).toEqual(['ArrowLeft'])
  expect(back.dropped).toEqual([])
})

test('a swapped button survives a save and a load', () => {
  const start: Controls = { ...c, left: { ...c.left, pad: ['dpad-left'] } as Controls[string] }
  const next = changed(start, 'left', 'pad', 'south')
  const back = applySettings(start, settingsOf(start, next))
  expect(back.controls).toEqual(next)
  expect(back.dropped).toEqual([])
})

test('saved bindings for an action the game no longer has are dropped and named', () => {
  const back = applySettings(c, {
    format: 1,
    bindings: { fly: { keys: ['KeyF'] }, jump: { keys: ['KeyK'] } },
  })
  expect(back.dropped).toEqual(['fly'])
  expect(back.controls.jump?.keys).toEqual(['KeyK'])
})

test("a saved key the game now uses for another action is dropped, and the game's own controls stand for it", () => {
  const defaults: Controls = { ...c, fire: { label: 'Fire', keys: ['KeyK'], side: 'right' } }
  const back = applySettings(defaults, { format: 1, bindings: { jump: { keys: ['KeyK'] } } })
  expect(back.controls.jump?.keys).toEqual(['Space', 'ArrowUp'])
  expect(back.dropped).toEqual(['jump'])
})

test('a saved menu key, or a shared keyboard the game lacks, is dropped', () => {
  const plain: Controls = { jump: { label: 'Jump', keys: ['Space'], side: 'right' } }
  expect(applySettings(plain, { format: 1, bindings: { jump: { keys: ['Escape'] } } }).dropped).toEqual([
    'jump',
  ])
  expect(
    applySettings(plain, { format: 1, bindings: { jump: { shared: [['KeyW'], ['ArrowUp']] } } }).dropped,
  ).toEqual(['jump'])
})

test("anything that is not saved bindings gives the game's own controls", () => {
  for (const nonsense of [null, 'x', { format: 2 }, { format: 1, bindings: 3 }]) {
    const back = applySettings(c, nonsense)
    expect(back.controls).toBe(c)
    expect(back.dropped).toEqual(['*'])
  }
})

test('nothing passed in is changed', () => {
  const frozen = deepFreeze(structuredClone(c))
  const saved = deepFreeze({
    format: 1,
    bindings: { jump: { keys: ['KeyA'] }, left: { keys: ['ArrowLeft'] } },
  })
  expect(() => rebind(frozen, 'jump', 'keys', 'KeyA')).not.toThrow()
  expect(() => applySettings(frozen, saved)).not.toThrow()
  expect(() => settingsOf(frozen, frozen)).not.toThrow()
})
