// Ported from AutomataFrameworkFailed@ed8592e8: packages/automata/src/app/screens/menu-input.ts. A screen's gamepad and
// arrow keys: the pad walks the controls of the screen, its bottom button presses the one in focus and its right button
// goes back; the keyboard's arrows walk too, and Escape goes back. Enter and Space are left to the browser, which already
// presses a focused button with them, except for the one case the browser gets wrong: a key still held from the last
// screen, whose repeats it would press on this one.
import type { Frames } from '../../lib/frames.ts'
import { type PadLike, padMenu } from '../input/input.ts'
import { type Box, nextFocus } from './focus.ts'

type Direction = 'up' | 'down' | 'left' | 'right'

const CONTROLS = 'button, [role="slider"], [role="switch"]'
const ARROWS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}
/** The two keys a browser presses a focused control with. */
const PRESS_KEYS: ReadonlySet<string> = new Set(['Enter', 'Space'])

/**
 * What a screen's controls are right now: the enabled, shown ones in `root`, or, while a dialog is open, only the
 * dialog's own (the dialog is the whole world while it is open). A row of a list that has scrolled out of sight is not
 * one of them; the one in sight beside it is, and taking the focus scrolls the next into view.
 */
function controlsIn(root: HTMLElement): HTMLElement[] {
  const scope = root.querySelector<HTMLElement>('[role="alertdialog"]') ?? root
  return [...scope.querySelectorAll<HTMLElement>(CONTROLS)].filter((control) => {
    if ((control as HTMLButtonElement).disabled || control.closest('[inert]') !== null) return false
    const box = control.getBoundingClientRect()
    if (box.width <= 0 || box.height <= 0) return false
    const list = control.closest<HTMLElement>('[role="region"]')?.getBoundingClientRect()
    return list === undefined || (box.bottom > list.top && box.top < list.bottom)
  })
}

const boxOf = (control: HTMLElement): Box => {
  const box = control.getBoundingClientRect()
  return { x: box.left, y: box.top, w: box.width, h: box.height }
}

/**
 * Drives the focus of the screen in `root` from gamepads and arrow keys. Whatever a pad holds when it is made does
 * nothing until it is let go, and nor does an Enter or Space still held from the last screen (its repeats are not
 * pressed). Stops listening and asking for frames on `destroy`.
 */
export function menuKeys(options: {
  readonly root: HTMLElement
  readonly frames?: Frames
  readonly gamepads?: () => readonly (PadLike | null)[]
  /** Escape, or the gamepad's right button. */
  readonly onBack?: () => void
  /** The gamepad's start button. Nothing, unless a screen says what it does. */
  readonly onPause?: () => void
  /** Called on each move and press, for the screen's sounds. */
  readonly onSound?: (what: 'move' | 'press' | 'back') => void
}): { destroy(): void } {
  const { root, onBack, onSound } = options
  const pads = padMenu({
    ...(options.frames === undefined ? {} : { frames: options.frames }),
    ...(options.gamepads === undefined ? {} : { gamepads: options.gamepads }),
  })

  const sendKey = (target: EventTarget, type: 'keydown' | 'keyup', key: string): void => {
    target.dispatchEvent(new KeyboardEvent(type, { key, code: key, bubbles: true, cancelable: true }))
  }
  const dialogOpen = (): boolean => root.querySelector('[role="alertdialog"]') !== null
  const focused = (): HTMLElement | undefined => {
    const active = document.activeElement
    return active instanceof HTMLElement && root.contains(active) ? active : undefined
  }

  /** Moves the focus one control the way `direction` says; the first control when nothing in the screen has it. */
  const walk = (direction: Direction): void => {
    const controls = controlsIn(root)
    const now = focused()
    const from = now === undefined ? -1 : controls.indexOf(now)
    const to = from < 0 ? 0 : nextFocus(controls.map(boxOf), from, direction)
    const target = controls[to]
    if (target === undefined || (to === from && from >= 0)) return
    target.focus()
    onSound?.('move')
  }

  /** A slider takes left and right itself (a key press it already understands); everything else walks. */
  const steer = (direction: Direction): void => {
    const now = focused()
    if (now?.getAttribute('role') === 'slider' && (direction === 'left' || direction === 'right')) {
      const key = direction === 'left' ? 'ArrowLeft' : 'ArrowRight'
      sendKey(now, 'keydown', key)
      sendKey(now, 'keyup', key)
      onSound?.('move')
      return
    }
    walk(direction)
  }

  const goBack = (): void => {
    onSound?.('back')
    // An open dialog hears Escape itself, once; the screen is told only when there is none.
    if (dialogOpen()) sendKey(window, 'keydown', 'Escape')
    else onBack?.()
  }

  const stopPad = pads.on((press) => {
    if (press === 'up' || press === 'down' || press === 'left' || press === 'right') steer(press)
    else if (press === 'accept') {
      const now = focused()
      if (now === undefined) return
      onSound?.('press')
      now.click()
    } else if (press === 'back') goBack()
    else if (press === 'pause') options.onPause?.()
  })

  // Keys whose first press this screen saw, so a repeat of one it did not see is known to be held over.
  const fresh = new Set<string>()
  const heldOver = new Set<string>()
  const onKeyDown = (event: KeyboardEvent): void => {
    if (PRESS_KEYS.has(event.code)) {
      if (!event.repeat) {
        fresh.add(event.code)
        return
      }
      if (fresh.has(event.code)) return
      heldOver.add(event.code)
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key === 'Escape') {
      if (!dialogOpen()) onBack?.()
      return
    }
    const direction = ARROWS[event.key]
    // Up and down always walk; left and right are the slider's own when one has the focus.
    if (direction === undefined) return
    if (focused()?.getAttribute('role') === 'slider' && (direction === 'left' || direction === 'right')) return
    event.preventDefault()
    walk(direction)
  }
  const onKeyUp = (event: KeyboardEvent): void => {
    fresh.delete(event.code)
    // The release of a key held over from the last screen is not a press either (a space presses on release).
    if (!heldOver.delete(event.code)) return
    event.preventDefault()
    event.stopImmediatePropagation()
  }
  window.addEventListener('keydown', onKeyDown, { capture: true })
  window.addEventListener('keyup', onKeyUp, { capture: true })

  return {
    destroy() {
      stopPad()
      pads.destroy()
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      window.removeEventListener('keyup', onKeyUp, { capture: true })
    },
  }
}
