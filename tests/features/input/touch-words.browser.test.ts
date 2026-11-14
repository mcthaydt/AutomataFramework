// The touch buttons in the player's words: `controls.<action>` when the game says it, the control's own label when not,
// and every word said again, with what is held kept, when the language changes.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createInput, type Input } from '#src/features/input/input.ts'
import type { Words } from '#src/lib/message.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'

let mount: HTMLDivElement
let input: Input | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
})
afterEach(() => {
  input?.destroy()
  input = undefined
  mount.remove()
  vi.restoreAllMocks()
})

/** Words from a table: a key it has is its text; any other comes back as itself, as a locale's do. */
const said =
  (table: Readonly<Record<string, string>>): Words =>
  (key) =>
    Object.hasOwn(table, key) ? (table[key] as string) : key

const make = (words?: Words): Input => {
  input = createInput({
    mount,
    controls: fixtureControls,
    gamepads: fakeGamepads().getGamepads,
    frames: manualFrames(),
    ...(words === undefined ? {} : { words }),
  })
  return input
}
const overlay = (): HTMLElement => {
  const found = mount.querySelector<HTMLElement>('.automata-touch')
  if (found === null) throw new Error('no touch buttons')
  return found
}
const button = (action: string): HTMLButtonElement => {
  const found = mount.querySelector<HTMLButtonElement>(`.automata-touch-button[data-action="${action}"]`)
  if (found === null) throw new Error(`no button for ${action}`)
  return found
}

test('with no words the overlay is "Touch controls" and each button says its own label', () => {
  make()
  expect(overlay().getAttribute('aria-label')).toBe('Touch controls')
  expect(['left', 'right', 'jump'].map((a) => button(a).textContent)).toEqual(['Left', 'Right', 'Jump'])
})

test('the overlay is labelled with the words it is given', () => {
  make(said({ 'automata.touch.label': 'Controles táctiles' }))
  expect(overlay().getAttribute('aria-label')).toBe('Controles táctiles')
})

test('each button says controls.<action> when the words have it, and its own label when not', () => {
  make(said({ 'controls.jump': 'Saltar', 'controls.left': 'Izquierda' }))
  expect(button('jump').textContent).toBe('Saltar')
  expect(button('jump').getAttribute('aria-label')).toBe('Saltar')
  expect(button('left').textContent).toBe('Izquierda')
  // The game said nothing for right: the control's own label stays.
  expect(button('right').textContent).toBe('Right')
})

test('relabel says every word again, the aria-label too, and keeps what is held', () => {
  const made = make(said({ 'controls.jump': 'Jump!' }))
  button('jump').dispatchEvent(
    new PointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', bubbles: true, cancelable: true }),
  )
  expect(button('jump').getAttribute('aria-pressed')).toBe('true')
  made.relabel(
    said({
      'automata.touch.label': '触屏按键',
      'controls.jump': '跳',
      'controls.left': '左',
      'controls.right': '右',
    }),
  )
  expect(overlay().getAttribute('aria-label')).toBe('触屏按键')
  expect(['left', 'right', 'jump'].map((a) => button(a).textContent)).toEqual(['左', '右', '跳'])
  expect(button('jump').getAttribute('aria-label')).toBe('跳')
  // The finger is still on Jump: it was not lifted, and the button was not made again.
  expect(button('jump').getAttribute('aria-pressed')).toBe('true')
  // A word taken away goes back to the control's own label.
  made.relabel(said({}))
  expect(button('jump').textContent).toBe('Jump')
  expect(overlay().getAttribute('aria-label')).toBe('Touch controls')
})
