// The two-thumb touch scheme on the page, for a game whose hero the framework moves: the left half of the screen walks
// (a ring appears where the thumb lands and follows it), the right half jumps (on the tick the thumb lands), and a flick
// of the walking thumb is a dash. What a thumb means is decided by `thumb-rules.ts`; this file puts the two halves, the
// ring, the hints and the round buttons on the page and gives the rules the pointer events. It answers to the same
// `Touch` interface as the buttons (touch.ts), so the input does not know which it has.
import type { Words } from '../../lib/message.ts'
import type { Controls } from './controls.ts'
import { hintsShown } from './thumb-hints.ts'
import { createThumbRules, type Half } from './thumb-rules.ts'
import {
  BACKGROUND,
  BUTTON_PX,
  BUTTON_STYLE,
  buttonLabel,
  COLOR,
  EDGE_PX,
  GAP_PX,
  PRESSED_BACKGROUND,
  PRESSED_COLOR,
  type Touch,
} from './touch.ts'

/** The band under the level, on an upright phone, is this much of the screen's height. */
const BAND = 0.32
/** Over a wider screen the thumbs sit over the game; the camera keeps the heroes this far from the bottom. */
const ROOM_OVER_PX = 120
/**
 * A screen at least this tall (a tablet or a desktop window) keeps a taller room under the game: the hints' circle and
 * their words on the dark chips stand wholly under the floor instead of across its edge. A short phone on its side
 * cannot give that much of its height, so it keeps `ROOM_OVER_PX`.
 */
const TALL_PX = 600
const HINTS_ROOM_PX = 230
/** An upright screen narrower than this gets the band. */
const BAND_BELOW_PX = 600
const RING_PX = 112
const KNOB_PX = 48
const ARROW_PX = 96
/** The resting place of a thumb: its hint's middle is this far from the left or right edge and from the bottom. */
const REST_PX = 96
/** The round buttons sit above the jump half's resting corner: no lower than this, or half the overlay. */
const BUTTONS_FLOOR_PX = 200
/** A mount whose width moves more than this between two layouts has been turned, not nudged. */
const TURNED_PX = 24
/** How often the hints look at the clock, so they come back after a while with no touch. */
const HINT_LOOK_MS = 250

/** The actions the two thumbs already do; every other action is a round button. */
const THUMB_ACTIONS: ReadonlySet<string> = new Set(['left', 'right', 'jump', 'dash'])

/** The words of a hint: chalk on a dark chip (the Owner's choice), the same dark as the buttons, so they read on a pale sky. */
const CHIP = [
  'text-align:center',
  'font:var(--automata-touch-font,700 18px/1.1 system-ui,sans-serif)',
  `color:${COLOR}`,
  `background:${BACKGROUND}`,
  'padding:3px 8px',
  'border-radius:var(--automata-touch-radius,16px)',
].join(';')

const NO_TOUCH = [
  'touch-action:none',
  'user-select:none',
  '-webkit-user-select:none',
  '-webkit-touch-callout:none',
  '-webkit-tap-highlight-color:transparent',
].join(';')

const div = (className: string, style = ''): HTMLDivElement => {
  const el = document.createElement('div')
  el.className = className
  el.style.cssText = style
  return el
}

/**
 * The thumbs for `controls`. `words` (a `Locale`'s) names the halves and says the hints, in the player's language;
 * with none the halves take the controls' own labels and the hints show no sentence. `dash` says whether the hero
 * can dash. `win` and `now` are only for tests.
 */
export function createThumbs(
  mount: HTMLElement,
  controls: Controls,
  options: {
    readonly dash: boolean
    readonly win?: Window
    readonly words?: Words
    readonly now?: () => number
  },
): Touch {
  const win = options.win ?? window
  const now = options.now ?? ((): number => performance.now())
  let words = options.words
  const restorePosition = getComputedStyle(mount).position === 'static' ? '' : undefined
  if (restorePosition !== undefined) mount.style.position = 'relative'

  const rules = createThumbRules({ dash: options.dash })
  let swapped = false
  let shape: 'band' | 'over' = 'over'
  let visible = false
  let lastTouch = now()
  /** The mount's size at the last layout, to tell a turned screen from a small resize. */
  let seen: { readonly w: number; readonly wide: boolean } | undefined

  const root = div('automata-thumbs', 'position:absolute;left:0;right:0;bottom:0;top:0;pointer-events:none')
  const half = (name: Half): HTMLDivElement => {
    const el = div(
      'automata-thumb-half',
      `position:absolute;top:0;bottom:0;width:50%;pointer-events:auto;${NO_TOUCH}`,
    )
    el.dataset.half = name
    el.setAttribute('role', 'group')
    return el
  }
  const halves = { walk: half('walk'), jump: half('jump') }

  // What each half says, in words or in the controls' own labels.
  const said = (key: string): string | undefined => {
    const text = words?.(key)
    return text === undefined || text === key ? undefined : text
  }
  const walkLabel = (): string =>
    said('automata.thumbs.walk') ??
    [controls.left?.label, controls.right?.label].filter((l) => l !== undefined).join(' / ')
  const jumpLabel = (): string => said('automata.thumbs.jump') ?? controls.jump?.label ?? 'Jump'

  const ring = div(
    'automata-thumb-ring',
    [
      'position:absolute',
      `width:${RING_PX}px`,
      `height:${RING_PX}px`,
      'box-sizing:border-box',
      'border-radius:50%',
      'border:var(--automata-touch-border,2px solid rgba(255,255,255,0.85))',
      `background:${BACKGROUND}`,
      'pointer-events:none',
      'display:none',
    ].join(';'),
  )
  const knob = div(
    'automata-thumb-knob',
    [
      'position:absolute',
      `width:${KNOB_PX}px`,
      `height:${KNOB_PX}px`,
      `left:${(RING_PX - KNOB_PX) / 2 - 1}px`,
      `top:${(RING_PX - KNOB_PX) / 2 - 1}px`,
      'border-radius:50%',
      `background:${COLOR}`,
      'opacity:0.85',
    ].join(';'),
  )
  ring.append(knob)
  const arrowShape = (): HTMLDivElement =>
    div(
      'automata-thumb-arrow-mark',
      [
        'position:absolute',
        'inset:24px',
        `background:${COLOR}`,
        'clip-path:polygon(50% 0,100% 100%,0 100%)',
        'opacity:0.85',
      ].join(';'),
    )
  const arrow = div(
    'automata-thumb-arrow',
    [
      'position:absolute',
      `bottom:${REST_PX - ARROW_PX / 2}px`,
      `width:${ARROW_PX}px`,
      `height:${ARROW_PX}px`,
      'box-sizing:border-box',
      'border-radius:50%',
      'border:var(--automata-touch-border,2px solid rgba(255,255,255,0.85))',
      `background:${BACKGROUND}`,
      'pointer-events:none',
      'display:none',
    ].join(';'),
  )
  arrow.append(arrowShape())

  // The hints: a faint ring and arrow at the thumbs' resting places, each with its words under it.
  const hint = (
    kind: 'walk' | 'jump',
  ): { readonly box: HTMLDivElement; readonly picture: HTMLDivElement; readonly words: HTMLDivElement } => {
    const box = div(
      'automata-thumb-hint',
      [
        'position:absolute',
        `bottom:${REST_PX - RING_PX / 2}px`,
        `width:${RING_PX}px`,
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'pointer-events:none',
      ].join(';'),
    )
    box.dataset.hint = kind
    const picture = div(
      'automata-thumb-hint-picture',
      [
        'position:relative',
        `width:${RING_PX}px`,
        `height:${RING_PX}px`,
        'box-sizing:border-box',
        'border-radius:50%',
        'border:2px dashed currentColor',
        // Only the picture is faint: the words stand on a dark chip at full strength, so they read on any sky.
        'opacity:0.55',
      ].join(';'),
    )
    if (kind === 'jump') picture.append(arrowShape())
    const text = div('automata-thumb-hint-words', `margin-top:6px;${CHIP}`)
    box.append(picture, text)
    return { box, picture, words: text }
  }
  const hints = { walk: hint('walk'), jump: hint('jump') }
  const dashHint = div('automata-thumb-hint', `margin-top:4px;${CHIP}`)
  dashHint.dataset.hint = 'dash'
  // The dash hint rides in the walk hint's box, under its words. The box stays up while either is due, and when only the
  // dash is due the walk hint's picture and words are hidden but keep their room, so the dash words stay where they were.
  hints.walk.box.append(dashHint)

  // Buttons for what the thumbs do not: the dash mark in a game with dash, then each action of the game's own.
  const buttons = new Map<string, HTMLButtonElement>()
  const buttonBox = div(
    'automata-thumb-buttons',
    `position:absolute;display:flex;flex-direction:column-reverse;gap:${GAP_PX}px;pointer-events:none`,
  )
  const fingers = new Map<number, string>()
  const masked = new Set<number>()
  const tapped = new Set<string>()
  /** Lets go of every finger: the window lost focus, or the screen turned or changed shape. */
  const release = (): void => {
    rules.clear()
    fingers.clear()
    masked.clear()
  }
  const addButton = (action: string, label: string): void => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'automata-touch-button'
    b.dataset.action = action
    b.textContent = label
    b.setAttribute('aria-label', label)
    b.setAttribute('aria-pressed', 'false')
    b.style.cssText = `${BUTTON_STYLE};pointer-events:auto;min-width:${BUTTON_PX}px`
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      try {
        b.releasePointerCapture(e.pointerId)
      } catch {}
      fingers.set(e.pointerId, action)
      masked.delete(e.pointerId)
      tapped.add(action)
      lastTouch = now()
      paint()
    })
    for (const ending of ['pointerup', 'pointercancel', 'pointerleave'] as const)
      b.addEventListener(ending, (e) => {
        masked.delete(e.pointerId)
        if (fingers.delete(e.pointerId)) paint()
      })
    b.addEventListener('contextmenu', (e) => e.preventDefault())
    buttons.set(action, b)
    buttonBox.append(b)
  }
  const buttonLabelOf = (action: string): string => {
    // A game whose controls do not list dash (the framework's own are used) names the mark in the player's words.
    if (action === 'dash' && controls.dash === undefined) return said('automata.thumbs.dash') ?? 'Dash'
    return buttonLabel(words ?? ((key) => key), action, controls[action]?.label ?? action)
  }
  if (options.dash) addButton('dash', buttonLabelOf('dash'))
  for (const action of Object.keys(controls))
    if (!THUMB_ACTIONS.has(action)) addButton(action, buttonLabelOf(action))

  root.append(halves.walk, halves.jump, hints.walk.box, hints.jump.box, ring, arrow, buttonBox)
  mount.append(root)

  const insetListeners = new Set<(px: number) => void>()
  const inset = (): number => (visible && shape === 'band' ? root.offsetHeight : 0)
  const room = (): number => {
    if (!visible || shape !== 'over') return 0
    return mount.clientHeight >= TALL_PX ? HINTS_ROOM_PX : ROOM_OVER_PX
  }

  const heldByButtons = (): Set<string> =>
    new Set([...fingers].filter(([id]) => !masked.has(id)).map(([, action]) => action))

  /** Where everything goes: the band or the whole mount, the walking half on the left or the right. */
  const layout = (): void => {
    const upright = mount.clientHeight > mount.clientWidth && mount.clientWidth < BAND_BELOW_PX
    const next = upright ? 'band' : 'over'
    const w = mount.clientWidth
    const h = mount.clientHeight
    // A tablet turned from upright to sideways is `over` both times, so the shape alone does not see it. A turn flips
    // which side is longer or moves the width a lot; a browser bar sliding in and out only moves the height.
    const wide = w > h
    const turned = seen !== undefined && (wide !== seen.wide || Math.abs(w - seen.w) > TURNED_PX)
    seen = { w, wide }
    if (next !== shape || turned) {
      shape = next
      // The halves are somewhere else now: fingers that were on the old ones mean nothing here.
      release()
    }
    const bandPx = Math.round(mount.clientHeight * BAND)
    root.style.top = shape === 'band' ? 'auto' : '0'
    root.style.height = shape === 'band' ? `${bandPx}px` : ''
    halves.walk.style.left = swapped ? '50%' : '0'
    halves.jump.style.left = swapped ? '0' : '50%'
    // The resting places: a thumb's middle is 96 px in from its edge and from the bottom, inside the safe area.
    const edge = (which: 'left' | 'right', across: number): string =>
      `calc(max(${REST_PX}px,env(safe-area-inset-${which},0px) + ${EDGE_PX}px + ${across / 2}px) - ${across / 2}px)`
    const place = (el: HTMLElement, side: 'left' | 'right', across: number): void => {
      el.style[side] = edge(side, across)
      el.style[side === 'left' ? 'right' : 'left'] = ''
    }
    place(hints.walk.box, swapped ? 'right' : 'left', RING_PX)
    place(hints.jump.box, swapped ? 'left' : 'right', RING_PX)
    place(arrow, swapped ? 'left' : 'right', ARROW_PX)
    // The round buttons: above the jump half's resting corner, no lower than 200 px or half the screen (over the game),
    // or just above the band.
    buttonBox.style.bottom = `${shape === 'band' ? bandPx + GAP_PX : Math.max(BUTTONS_FLOOR_PX, mount.clientHeight / 2)}px`
    place(buttonBox, swapped ? 'left' : 'right', BUTTON_PX)
    paint()
    const px = inset()
    for (const l of insetListeners) l(px)
  }

  const paint = (): void => {
    const held = rules.held()
    const at = rules.ring()
    ring.style.display = visible && at !== undefined ? 'block' : 'none'
    if (at !== undefined) {
      ring.style.left = `${at.cx - RING_PX / 2}px`
      ring.style.top = `${at.cy - RING_PX / 2}px`
      knob.style.transform = `translate(${at.x - at.cx}px,${at.y - at.cy}px)`
    }
    const walking = held.has('left') || held.has('right')
    ring.style.background = walking ? PRESSED_BACKGROUND : BACKGROUND
    knob.style.background = walking ? PRESSED_COLOR : COLOR
    arrow.style.display = visible && held.has('jump') ? 'block' : 'none'
    arrow.style.background = PRESSED_BACKGROUND
    const down = heldByButtons()
    for (const [action, b] of buttons) {
      const pressed = down.has(action)
      b.setAttribute('aria-pressed', String(pressed))
      b.style.background = pressed ? PRESSED_BACKGROUND : BACKGROUND
      b.style.color = pressed ? PRESSED_COLOR : COLOR
    }
    refreshHints()
  }

  function refreshHints(): void {
    // A finger on the glass is not "left alone": the hints stay away for as long as one is down, still or moving.
    if (rules.touching() || fingers.size > 0) lastTouch = now()
    const shownNow = hintsShown(rules.uses(), now() - lastTouch, options.dash)
    hints.walk.box.style.display = visible && (shownNow.walk || shownNow.dash) ? 'flex' : 'none'
    const walkShown = shownNow.walk ? 'visible' : 'hidden'
    hints.walk.picture.style.visibility = walkShown
    hints.walk.words.style.visibility = walkShown
    hints.jump.box.style.display = visible && shownNow.jump ? 'flex' : 'none'
    hints.walk.words.textContent = said('automata.thumbs.walk-hint') ?? ''
    hints.jump.words.textContent = said('automata.thumbs.jump-hint') ?? ''
    dashHint.textContent = said('automata.thumbs.dash-hint') ?? ''
    // A chip with no words in it (a game with no words) is not drawn.
    dashHint.style.display = shownNow.dash && dashHint.textContent !== '' ? 'block' : 'none'
    for (const text of [hints.walk.words, hints.jump.words])
      text.style.display = text.textContent === '' ? 'none' : ''
  }

  const label = (): void => {
    halves.walk.setAttribute('aria-label', walkLabel())
    halves.jump.setAttribute('aria-label', jumpLabel())
  }

  // The two halves listen to a finger each, and keep it with a capture so a thumb that slides off the glass is still
  // theirs until it lifts.
  const local = (e: PointerEvent): { readonly x: number; readonly y: number } => {
    const box = root.getBoundingClientRect()
    return { x: e.clientX - box.left, y: e.clientY - box.top }
  }
  for (const name of ['walk', 'jump'] as const) {
    const el = halves[name]
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      try {
        el.setPointerCapture(e.pointerId)
      } catch {}
      const at = local(e)
      lastTouch = now()
      rules.down(e.pointerId, name, at.x, at.y, e.timeStamp)
      paint()
    })
    el.addEventListener('pointermove', (e) => {
      const at = local(e)
      rules.move(e.pointerId, at.x, at.y, e.timeStamp)
      paint()
    })
    for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
      el.addEventListener(ending, (e) => {
        lastTouch = now()
        rules.up(e.pointerId)
        paint()
      })
    // Nothing a thumb does may open the system's menu, scroll the page or select a word.
    el.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  const show = (on: boolean): void => {
    visible = on
    root.hidden = !on
    root.style.display = on ? 'block' : 'none'
    layout()
  }
  const watcher = new ResizeObserver(layout)
  watcher.observe(mount)
  label()
  show(win.matchMedia?.('(pointer: coarse)').matches === true)
  const onFirstTouch = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch') return
    show(true)
    win.removeEventListener('pointerdown', onFirstTouch, true)
  }
  win.addEventListener('pointerdown', onFirstTouch, true)
  const onBlur = (): void => {
    release()
    paint()
  }
  win.addEventListener('blur', onBlur)
  const timer = win.setInterval(refreshHints, HINT_LOOK_MS)

  return {
    held: () => new Set([...rules.held(), ...heldByButtons()]),
    drain() {
      const out = new Set([...rules.drain(), ...heldByButtons(), ...tapped])
      tapped.clear()
      return out
    },
    mask() {
      rules.mask()
      // A tap that landed just before the screen it ended must not jump the hero when play resumes.
      tapped.clear()
      for (const id of fingers.keys()) masked.add(id)
      paint()
    },
    setSwapped(on) {
      swapped = on
      layout()
    },
    inset,
    room,
    onInset(listener) {
      insetListeners.add(listener)
    },
    relabel(next) {
      words = next
      label()
      for (const [action, b] of buttons) {
        const text = buttonLabelOf(action)
        b.textContent = text
        b.setAttribute('aria-label', text)
      }
      refreshHints()
    },
    destroy() {
      win.clearInterval(timer)
      watcher.disconnect()
      insetListeners.clear()
      win.removeEventListener('pointerdown', onFirstTouch, true)
      win.removeEventListener('blur', onBlur)
      release()
      root.remove()
      if (restorePosition !== undefined) mount.style.position = restorePosition
    },
  }
}
