// The speech box: what a player reads and presses while someone talks or a cutscene plays. One box along the bottom of
// the mount, above the touch buttons, with the speaker's name, the words, the answers to pick from, and Next or Skip.
// It knows nothing of the sim: `story.ts` tells it what to show and hears what was pressed. Real `<button>`s, at least
// 48 px tall, with words on them; the words are set as text, never as markup, because another team wrote them.
//
// Keys. A button's own Enter and Space are not relied on: the input's keyboard calls `preventDefault` on every bound
// key at the window, and Space is most games' jump, so the box hears its keys itself. Enter presses the button that has
// the focus (or the first answer, Next or Skip, in that order), Space does the same but never Skip, because a player still
// tapping jump when a cutscene starts would skip it unseen. The digits 1 to 4 pick an answer, and Up and Down move among the
// buttons. A key held down is one press (`repeat` is never a press), and a key the box does not use is left alone.
import type { BoxWords } from './words.ts'

/** What the box shows. */
export interface BoxState {
  /** The speaker's name, already in words; none for a line nobody speaks. */
  readonly speaker?: string
  readonly text: string
  /** The answers, already in words. When there are any, the player must pick one. */
  readonly choices: readonly string[]
  /** Show the Next button. */
  readonly next: boolean
  /** Show the Skip button. */
  readonly skip: boolean
}

/** What a press does. */
export interface BoxPress {
  next(): void
  choose(choice: number): void
  skip(): void
}

/** What `createBox` gives back. */
export interface StoryBox {
  /** `undefined` hides the box and gives the focus back to whatever had it. */
  show(state: BoxState | undefined): void
  /** Moves the focus to the next (1) or the one before (-1) of the buttons showing; it stops at the ends. */
  move(by: 1 | -1): void
  /** Presses the button that has the focus. */
  press(): void
  /** How many CSS pixels the touch buttons take from the bottom: the box sits above them. */
  setInset(px: number): void
  /** While held (the game is paused) the box stays and its buttons do nothing. */
  setHeld(on: boolean): void
  destroy(): void
}

/** What a game may set, on the mount or any element above it, to dress the box. Each falls back to the box's own look. */
export const STORY_PROPERTIES: readonly string[] = [
  '--automata-story-background',
  '--automata-story-color',
  '--automata-story-border',
  '--automata-story-radius',
  '--automata-story-font',
  '--automata-story-button-background',
  '--automata-story-button-color',
]

/** The words a box has when a game gives none. */
const DEFAULT_BOX_WORDS: BoxWords = { next: 'Next', skip: 'Skip' }

const EDGE_PX = 12
const MAX_WIDTH_PX = 640
const BUTTON_PX = 48
/** Where the room above the touch buttons is shorter than this, answers sit two to a row. */
const TIGHT_PX = 480
/** The words may take this share of the mount's height before they scroll inside the box. */
const TEXT_SHARE = 0.4

const BACKGROUND = 'var(--automata-story-background,rgba(20,20,30,0.88))'
const COLOR = 'var(--automata-story-color,#fff)'
const BUTTON_BACKGROUND = 'var(--automata-story-button-background,rgba(255,255,255,0.16))'
const BUTTON_COLOR = 'var(--automata-story-button-color,#fff)'

const BOX_STYLE = [
  'position:absolute',
  'box-sizing:border-box',
  'display:flex',
  'flex-direction:column',
  'gap:10px',
  'margin:0 auto',
  `max-width:${MAX_WIDTH_PX}px`,
  'padding:12px 14px',
  'overflow:hidden',
  'pointer-events:auto',
  'z-index:10',
  `background:${BACKGROUND}`,
  `color:${COLOR}`,
  'border:var(--automata-story-border,2px solid rgba(255,255,255,0.85))',
  'border-radius:var(--automata-story-radius,16px)',
  'font:var(--automata-story-font,18px/1.35 system-ui,sans-serif)',
].join(';')

/** The words take the room left over and scroll inside the box, so the buttons never scroll away. */
const TEXT_STYLE = [
  'flex:1 1 auto',
  'min-height:0',
  'overflow-y:auto',
  'white-space:pre-wrap',
  'overflow-wrap:anywhere',
].join(';')

const BUTTON_STYLE = [
  `min-height:${BUTTON_PX}px`,
  'box-sizing:border-box',
  'padding:8px 16px',
  'border:2px solid currentColor',
  'border-radius:var(--automata-story-radius,16px)',
  `background:${BUTTON_BACKGROUND}`,
  `color:${BUTTON_COLOR}`,
  'font:inherit',
  'font-weight:700',
  'text-align:left',
  'cursor:pointer',
  '-webkit-tap-highlight-color:transparent',
].join(';')

/** A digit key's answer, 0 to 3, or undefined for any other key. */
function digitOf(e: KeyboardEvent): number | undefined {
  const match = /^(?:Digit|Numpad)([1-4])$/.exec(e.code)
  return match === null ? undefined : Number(match[1]) - 1
}

/**
 * Puts the box in `mount`, hidden. `on` hears each press once; the box then waits for its next `show`, so a double tap
 * is one press. `ignores` says which keys belong to someone else (a second player's arrows) and are left alone. With
 * `watching` there are no buttons and no keys: the box only shows what is said.
 */
export function createBox(
  mount: HTMLElement,
  on: BoxPress,
  words: BoxWords = DEFAULT_BOX_WORDS,
  options: { readonly watching?: boolean; readonly ignores?: (e: KeyboardEvent) => boolean } = {},
): StoryBox {
  const watching = options.watching === true
  // The box sits against the mount's own edges, so the mount has to be what it is positioned against.
  const restorePosition = getComputedStyle(mount).position === 'static' ? '' : undefined
  if (restorePosition !== undefined) mount.style.position = 'relative'

  const root = document.createElement('div')
  root.className = 'automata-story'
  root.setAttribute('role', 'group')
  root.hidden = true
  root.style.cssText = `${BOX_STYLE};display:none`
  const speaker = document.createElement('div')
  speaker.dataset.story = 'speaker'
  speaker.style.cssText = 'font-weight:700;flex:none'
  const text = document.createElement('div')
  text.dataset.story = 'text'
  text.setAttribute('aria-live', 'polite')
  text.style.cssText = TEXT_STYLE
  const choices = document.createElement('div')
  choices.dataset.story = 'choices'
  choices.style.cssText = 'display:grid;gap:8px;flex:none'
  const actions = document.createElement('div')
  actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;flex:none'
  const next = document.createElement('button')
  next.type = 'button'
  next.dataset.story = 'next'
  next.textContent = words.next
  next.style.cssText = `${BUTTON_STYLE};text-align:center;min-width:96px`
  const skip = document.createElement('button')
  skip.type = 'button'
  skip.dataset.story = 'skip'
  skip.textContent = words.skip
  skip.style.cssText = `${BUTTON_STYLE};text-align:center;min-width:96px`
  actions.append(next, skip)
  root.append(speaker, text, choices, ...(watching ? [] : [actions]))
  mount.append(root)

  let inset = 0
  let held = false
  let shown = false
  // False after a press, until the next `show`: one press counts once.
  let ready = false
  let before: Element | null = null

  const buttons = (): HTMLButtonElement[] =>
    [...choices.querySelectorAll('button'), next, skip].filter((b) => !b.hidden && b.style.display !== 'none')

  /** The room above the touch buttons decides how the answers sit and how much the words may take. */
  const layout = (): void => {
    const room = Math.max(0, mount.clientHeight - inset - EDGE_PX * 2)
    root.style.left = `${EDGE_PX}px`
    root.style.right = `${EDGE_PX}px`
    root.style.bottom = `${inset + EDGE_PX}px`
    root.style.maxHeight = `${room}px`
    text.style.maxHeight = `${Math.floor(mount.clientHeight * TEXT_SHARE)}px`
    choices.style.gridTemplateColumns = room < TIGHT_PX ? 'repeat(2,minmax(0,1fr))' : 'minmax(0,1fr)'
  }
  const resize = new ResizeObserver(layout)
  resize.observe(mount)

  const pressed = (act: () => void): void => {
    if (held || watching || !shown || !ready) return
    ready = false
    act()
  }
  const choose = (n: number): void => pressed(() => on.choose(n))

  const hide = (): void => {
    root.hidden = true
    root.style.display = 'none'
    shown = false
    const back = before
    before = null
    if (back instanceof HTMLElement && back.isConnected) back.focus()
  }

  const focused = (): HTMLButtonElement | undefined => buttons().find((b) => b === document.activeElement)

  const pressButton = (b: HTMLButtonElement): void => {
    if (b === skip) pressed(() => on.skip())
    else if (b === next) pressed(() => on.next())
    else choose(Number(b.dataset.choice))
  }

  const move = (by: 1 | -1): void => {
    const list = buttons()
    if (list.length === 0) return
    const at = list.findIndex((b) => b === document.activeElement)
    const to = Math.min(list.length - 1, Math.max(0, at < 0 ? (by === 1 ? 0 : list.length - 1) : at + by))
    list[to]?.focus()
  }

  /** The button Enter or Space reaches when none has the focus: an answer, then Next, then Skip. */
  const fallback = (allowSkip: boolean): HTMLButtonElement | undefined =>
    buttons().find((b) => b !== skip || allowSkip)

  const onKey = (e: KeyboardEvent): void => {
    if (!shown || watching || held || options.ignores?.(e) === true) return
    const inside = root.contains(document.activeElement)
    const digit = digitOf(e)
    if (digit !== undefined) {
      if (choices.querySelectorAll('button').length > digit) {
        e.preventDefault()
        if (!e.repeat) choose(digit)
      }
    } else if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
      e.preventDefault()
      if (!e.repeat) move(e.code === 'ArrowDown' ? 1 : -1)
    } else if (e.code === 'Enter' || e.code === 'Space' || e.key === ' ') {
      const space = e.code !== 'Enter'
      const target = (inside ? focused() : undefined) ?? fallback(!space)
      // Space on Skip, or with nothing but Skip showing, does nothing: a native click on it would skip.
      if (target === undefined || (space && target === skip)) {
        if (inside) e.preventDefault()
        return
      }
      e.preventDefault()
      if (!e.repeat) pressButton(target)
    }
  }
  // A button's own click on Space comes on the key's release: it must not skip.
  const onKeyUp = (e: KeyboardEvent): void => {
    if (shown && !watching && (e.code === 'Space' || e.key === ' ') && root.contains(document.activeElement))
      e.preventDefault()
  }
  const onClick = (e: MouseEvent): void => {
    const target = e.target instanceof Element ? e.target.closest('button') : null
    if (target !== null && root.contains(target)) pressButton(target)
  }
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('keyup', onKeyUp, true)
  root.addEventListener('click', onClick)

  return {
    show(state) {
      if (state === undefined) {
        if (shown) hide()
        return
      }
      if (!shown) {
        before = root.contains(document.activeElement) ? null : document.activeElement
        shown = true
      }
      ready = true
      root.hidden = false
      root.style.display = 'flex'
      speaker.textContent = state.speaker ?? ''
      speaker.style.display = state.speaker === undefined || state.speaker === '' ? 'none' : 'block'
      text.textContent = state.text
      text.scrollTop = 0
      choices.replaceChildren(
        ...(watching
          ? []
          : state.choices.map((choice, i) => {
              const b = document.createElement('button')
              b.type = 'button'
              b.dataset.choice = String(i)
              b.textContent = choice
              b.style.cssText = BUTTON_STYLE
              return b
            })),
      )
      next.hidden = !state.next
      next.style.display = state.next ? '' : 'none'
      skip.hidden = !state.skip
      skip.style.display = state.skip ? '' : 'none'
      actions.style.display = state.next || state.skip ? 'flex' : 'none'
      layout()
      // The first answer has the focus, else Next. Skip never takes it by itself.
      if (!watching) (choices.querySelector('button') ?? (state.next ? next : null))?.focus()
    },
    move,
    press() {
      const b = focused()
      if (b !== undefined) pressButton(b)
    },
    setInset(px) {
      inset = px
      layout()
    },
    setHeld(on) {
      held = on
    },
    destroy() {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('keyup', onKeyUp, true)
      resize.disconnect()
      root.remove()
      if (restorePosition !== undefined) mount.style.position = restorePosition
    },
  }
}
