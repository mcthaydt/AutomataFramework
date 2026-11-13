// The on-screen buttons: real `<button>`s in the bottom corners, one per action, shown once a finger touches the
// screen (or at once on a touch screen). Each finger holds the button it is on; sliding off, lifting, or a touch the
// system cancels lets go, so a hero never keeps running with nothing under the thumb.
import type { Controls } from './controls.ts'

/** What the game holds with the screen. */
export interface Touch {
  /** The actions with at least one finger on their button. */
  held(): Set<string>
  /** How many CSS pixels the buttons take from the bottom of the mount: 0 while they are hidden. */
  inset(): number
  /** Calls `listener` with the new room whenever the buttons show, hide or change size. Stops on `destroy`. */
  onInset(listener: (px: number) => void): void
  destroy(): void
}

/** Buttons are never smaller than this, so a thumb cannot miss. The page-wide minimum is 44 px; primary actions 48. */
const BUTTON_PX = 64
const GAP_PX = 12
const EDGE_PX = 16

// Dark enough that white 18 px bold words reach 4.5 to 1 over the lightest thing they can sit on, the sky.
const RESTING_BACKGROUND = 'rgba(20,20,30,0.55)'

const BUTTON_STYLE = [
  `min-width:${BUTTON_PX}px`,
  `min-height:${BUTTON_PX}px`,
  'padding:8px 14px',
  'box-sizing:border-box',
  'border:2px solid rgba(255,255,255,0.85)',
  'border-radius:16px',
  `background:${RESTING_BACKGROUND}`,
  'color:#fff',
  'font:700 18px/1.1 system-ui,sans-serif',
  'touch-action:none',
  'user-select:none',
  '-webkit-user-select:none',
  '-webkit-touch-callout:none',
  '-webkit-tap-highlight-color:transparent',
].join(';')

const groupStyle = (side: 'left' | 'right'): string =>
  `display:flex;gap:${GAP_PX}px;pointer-events:auto;${side === 'left' ? '' : 'margin-left:auto'}`

export function createTouch(mount: HTMLElement, controls: Controls, win: Window = window): Touch {
  // The buttons sit against the mount's own corners, so the mount has to be what they are positioned against.
  const restorePosition = getComputedStyle(mount).position === 'static' ? '' : undefined
  if (restorePosition !== undefined) mount.style.position = 'relative'

  const overlay = document.createElement('div')
  overlay.setAttribute('role', 'group')
  overlay.setAttribute('aria-label', 'Touch controls')
  // Notches and the home bar: stay inside the safe area on every edge.
  overlay.style.cssText = [
    'position:absolute',
    'left:0',
    'right:0',
    'bottom:0',
    'box-sizing:border-box',
    'align-items:flex-end',
    'pointer-events:none',
    `padding:${EDGE_PX}px max(${EDGE_PX}px,env(safe-area-inset-right)) max(${EDGE_PX}px,env(safe-area-inset-bottom)) max(${EDGE_PX}px,env(safe-area-inset-left))`,
  ].join(';')
  const groups = { left: document.createElement('div'), right: document.createElement('div') }
  for (const side of ['left', 'right'] as const) {
    groups[side].style.cssText = groupStyle(side)
    overlay.append(groups[side])
  }

  // Pointer id -> the action its finger is on.
  const fingers = new Map<number, string>()
  const buttons = new Map<string, HTMLButtonElement>()
  const show = (visible: boolean): void => {
    overlay.hidden = !visible
    overlay.style.display = visible ? 'flex' : 'none'
  }
  const paint = (): void => {
    const held = new Set(fingers.values())
    for (const [action, b] of buttons) {
      const pressed = held.has(action)
      b.setAttribute('aria-pressed', String(pressed))
      b.style.background = pressed ? 'rgba(255,255,255,0.55)' : RESTING_BACKGROUND
      b.style.color = pressed ? '#111' : '#fff'
    }
  }
  // The overlay is anchored to the bottom and as tall as its padding and buttons, so its height is the room taken. Hidden
  // (`display:none`) it has none.
  const inset = (): number => overlay.offsetHeight
  const insetListeners = new Set<(px: number) => void>()
  const insetWatcher = new ResizeObserver(() => {
    const px = inset()
    for (const l of insetListeners) l(px)
  })
  insetWatcher.observe(overlay)
  const letGo = (e: PointerEvent): void => {
    if (fingers.delete(e.pointerId)) paint()
  }

  for (const [action, control] of Object.entries(controls)) {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = control.label
    b.setAttribute('aria-label', control.label)
    b.setAttribute('aria-pressed', 'false')
    b.style.cssText = BUTTON_STYLE
    // A finger lands on the button, or slides onto it from the next one still touching the glass (a mouse only counts
    // with its button down). Either way the finger holds this action.
    const press = (e: PointerEvent): void => {
      // A touch is captured by the button it began on, which would hide a slide off it; let it go so `pointerleave`
      // tells us. Throws for a pointer the browser does not know, such as a made-up one.
      try {
        b.releasePointerCapture(e.pointerId)
      } catch {}
      fingers.set(e.pointerId, action)
      paint()
    }
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      press(e)
    })
    b.addEventListener('pointerenter', (e) => {
      if (e.buttons & 1) press(e)
    })
    for (const ending of ['pointerup', 'pointercancel', 'pointerleave'] as const)
      b.addEventListener(ending, letGo)
    // A long press must not open the system's menu over a button.
    b.addEventListener('contextmenu', (e) => e.preventDefault())
    buttons.set(action, b)
    groups[control.side].append(b)
  }
  mount.append(overlay)

  // Hidden until the player shows they have a finger: a touch screen from the start, anything else on first touch.
  show(win.matchMedia?.('(pointer: coarse)').matches === true)
  const onFirstTouch = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch') return
    show(true)
    win.removeEventListener('pointerdown', onFirstTouch, true)
  }
  win.addEventListener('pointerdown', onFirstTouch, true)
  const onBlur = (): void => {
    fingers.clear()
    paint()
  }
  win.addEventListener('blur', onBlur)

  return {
    held: () => new Set(fingers.values()),
    inset,
    onInset(listener) {
      insetListeners.add(listener)
    },
    destroy() {
      insetWatcher.disconnect()
      insetListeners.clear()
      win.removeEventListener('pointerdown', onFirstTouch, true)
      win.removeEventListener('blur', onBlur)
      fingers.clear()
      overlay.remove()
      if (restorePosition !== undefined) mount.style.position = restorePosition
    },
  }
}
