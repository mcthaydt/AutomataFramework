// The keyboard, read from the window: which actions are held right now. It never sends anything itself; `input.ts`
// asks it once per tick.
import type { Controls } from './controls.ts'

/** What the game holds with the keyboard. */
export interface Keyboard {
  /** The actions with at least one of their keys down. */
  held(): Set<string>
  destroy(): void
}

/** A key typed into a text field belongs to the field, not to the game. */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

export function createKeyboard(controls: Controls, win: Window = window): Keyboard {
  // Key code -> the action it is bound to.
  const actionOf = new Map<string, string>()
  for (const [action, control] of Object.entries(controls))
    for (const code of control.keys) actionOf.set(code, action)
  const down = new Set<string>()

  const onKeyDown = (e: KeyboardEvent): void => {
    const action = actionOf.get(e.code)
    // A shortcut (Ctrl+R, Cmd+Left) is the browser's, and a key with no action is left alone.
    if (action === undefined || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
    // Stops Space and the arrows scrolling the page the game sits in. Key repeat is stopped too, but changes nothing.
    e.preventDefault()
    down.add(e.code)
  }
  // Always let go, wherever the event went, or a key released over a text field would stay held.
  const onKeyUp = (e: KeyboardEvent): void => {
    down.delete(e.code)
  }
  // A key released while another window had focus never reaches this one, so losing focus lets go of everything.
  const onBlur = (): void => down.clear()

  win.addEventListener('keydown', onKeyDown)
  win.addEventListener('keyup', onKeyUp)
  win.addEventListener('blur', onBlur)
  return {
    held() {
      const held = new Set<string>()
      for (const code of down) {
        const action = actionOf.get(code)
        if (action !== undefined) held.add(action)
      }
      return held
    },
    destroy() {
      win.removeEventListener('keydown', onKeyDown)
      win.removeEventListener('keyup', onKeyUp)
      win.removeEventListener('blur', onBlur)
      down.clear()
    },
  }
}
