// The keyboard, read from the window: which of the bound keys are down right now. It never sends anything itself;
// `input.ts` asks it once per tick and reads the keys against the seats' controls.

/** What is down on the keyboard. */
export interface Keyboard {
  /** The codes of the bound keys that are down. */
  down(): ReadonlySet<string>
  /** Lets go of everything. A key still held stays up until it is pressed again: its repeats are not presses. */
  clear(): void
  destroy(): void
}

/** A key typed into a text field belongs to the field, not to the game. */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

/** `codes` gives every key any slot binds right now, asked on each event, so a key bound a moment ago is heard. */
export function createKeyboard(codes: () => ReadonlySet<string>, win: Window = window): Keyboard {
  const down = new Set<string>()

  const onKeyDown = (e: KeyboardEvent): void => {
    // A shortcut (Ctrl+R, Cmd+Left) is the browser's, and a key with no action is left alone.
    if (!codes().has(e.code) || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
    // Stops Space and the arrows scrolling the page the game sits in, repeats included.
    e.preventDefault()
    // A repeat is the same press going on: after `clear` it must not bring the key back down.
    if (!e.repeat) down.add(e.code)
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
    down: () => new Set(down),
    clear: () => down.clear(),
    destroy() {
      win.removeEventListener('keydown', onKeyDown)
      win.removeEventListener('keyup', onKeyUp)
      win.removeEventListener('blur', onBlur)
      down.clear()
    },
  }
}
