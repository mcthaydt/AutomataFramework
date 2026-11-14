// The first-run screen of a player who has no language yet: six flags, and one press of Go. It holds no rule of its own:
// what is chosen, the order of the flags and what is kept are `createPicker`'s (`locale`). This draws it, and turns
// taps, keys and pad presses into `choose`, `move` and `go`. There is nothing to read until a flag is chosen: it has no
// words of its own to say in a language nobody has picked, so a player who cannot read the screen can still use it.
import type { Frames } from '../../lib/frames.ts'
import type { Language } from '../content/content.ts'
import { type PadLike, padMenu } from '../input/input.ts'
import { createPicker, LANGUAGE_TAGS, type Locale } from '../locale/locale.ts'
import { languageRow, pickerIcon } from './flags.ts'

/** The CSS custom properties a game sets, on the mount or any element above it, to dress the picker. */
export const PICKER_PROPERTIES: readonly string[] = [
  '--automata-picker-background',
  '--automata-picker-color',
  '--automata-picker-chosen',
  '--automata-picker-radius',
  '--automata-picker-font',
]

const DIALOG_STYLE = [
  'position:absolute',
  'inset:0',
  'box-sizing:border-box',
  'display:flex',
  'flex-direction:column',
  'align-items:center',
  'justify-content:center',
  'gap:16px',
  'padding:16px',
  'overflow:auto',
  'text-align:center',
  'background:var(--automata-picker-background,#14141e)',
  'color:var(--automata-picker-color,#fff)',
  'font:var(--automata-picker-font,700 22px/1.2 system-ui,sans-serif)',
  'outline:none',
  '-webkit-user-select:none',
  'user-select:none',
].join(';')

const GO_STYLE = [
  'min-width:64px',
  'min-height:64px',
  'padding:0 24px',
  'margin:0',
  'border:0',
  'display:flex',
  'align-items:center',
  'justify-content:center',
  'gap:12px',
  'border-radius:var(--automata-picker-radius,16px)',
  'background:var(--automata-picker-chosen,#fff)',
  'color:var(--automata-picker-background,#14141e)',
  'font:inherit',
  'cursor:pointer',
  'touch-action:manipulation',
  '-webkit-tap-highlight-color:transparent',
].join(';')

/**
 * Shows the picker over `mount`, which it fills. `done` resolves with the language once Go is pressed (by a tap or
 * click, Enter or Space, or the pad's accept) and the choice is kept; it never resolves after `destroy`. The picker
 * opens on the flag the device suggests, so one press starts the game in the player's own words, and on none when
 * there is nothing to suggest. ArrowLeft and ArrowUp, ArrowRight and ArrowDown, and the pad's directions, walk the
 * flags; Go does nothing until one is chosen.
 */
export function languagePicker(options: {
  readonly mount: HTMLElement
  readonly locale: Locale
  readonly frames?: Frames
  readonly gamepads?: () => readonly (PadLike | null)[]
}): { readonly done: Promise<Language>; destroy(): void } {
  const { mount, locale } = options
  const core = createPicker(locale)
  // The picker is placed against the mount, so a mount that is not positioned is made so while the picker is there.
  const restorePosition = getComputedStyle(mount).position === 'static' ? '' : undefined
  if (restorePosition !== undefined) mount.style.position = 'relative'

  const dialog = document.createElement('div')
  dialog.className = 'automata-picker'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.tabIndex = -1
  dialog.style.cssText = DIALOG_STYLE

  const globe = document.createElement('div')
  globe.className = 'automata-picker-globe'
  globe.setAttribute('aria-hidden', 'true')
  globe.append(pickerIcon('globe', 56))

  const title = document.createElement('h1')
  title.className = 'automata-picker-title'
  title.style.cssText = 'margin:0;font:inherit'

  dialog.append(globe, title)
  const row = languageRow({
    mount: dialog,
    languages: core.flags,
    chosen: core.chosen(),
    onChoose: (language) => core.choose(language),
  })

  const go = document.createElement('button')
  go.type = 'button'
  go.className = 'automata-picker-go'
  go.style.cssText = GO_STYLE
  const goWords = document.createElement('span')
  go.append(pickerIcon('check', 28), goWords)
  dialog.append(go)
  mount.append(dialog)

  let destroyed = false
  let finish: (language: Language) => void = () => undefined
  let fail: (error: unknown) => void = () => undefined
  const done = new Promise<Language>((resolve, reject) => {
    finish = resolve
    fail = reject
  })

  /** Shows what is chosen: the flag, the title and the words of Go in its language, or nothing to read at all. */
  const render = (): void => {
    const chosen = core.chosen()
    const said = core.words()
    row.choose(chosen)
    globe.style.display = chosen === undefined ? '' : 'none'
    title.style.display = said === undefined ? 'none' : ''
    title.textContent = said?.title ?? ''
    goWords.textContent = said?.go ?? ''
    goWords.style.display = said === undefined ? 'none' : ''
    go.setAttribute('aria-disabled', String(chosen === undefined))
    go.style.opacity = chosen === undefined ? '0.5' : '1'
    if (chosen === undefined || said === undefined) {
      dialog.removeAttribute('lang')
      dialog.removeAttribute('aria-label')
    } else {
      dialog.lang = LANGUAGE_TAGS[chosen]
      dialog.setAttribute('aria-label', said.title)
    }
  }
  const unlisten = core.onChange(render)
  render()

  /** Go: keeps the choice once. With no flag chosen, or after an earlier press, nothing happens. */
  const press = (): void => {
    const chosen = core.chosen()
    if (chosen === undefined || destroyed) return
    core.go().then(
      (answer) => {
        if (answer !== undefined && !destroyed) finish(chosen)
      },
      (error: unknown) => {
        if (!destroyed) fail(error)
      },
    )
  }
  const step = (by: -1 | 1): void => {
    core.move(by)
    const now = core.chosen()
    if (now !== undefined) row.focus(now)
  }
  go.addEventListener('click', press)
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') step(-1)
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') step(1)
    else if (event.key === 'Enter' || event.key === ' ') press()
    else return
    // The flag or button that has the focus must not also act on a key the picker has taken.
    event.preventDefault()
  }
  dialog.addEventListener('keydown', onKey)

  const pads = padMenu({
    ...(options.frames === undefined ? {} : { frames: options.frames }),
    ...(options.gamepads === undefined ? {} : { gamepads: options.gamepads }),
  })
  pads.on((pressed) => {
    if (pressed === 'left' || pressed === 'up') step(-1)
    else if (pressed === 'right' || pressed === 'down') step(1)
    else if (pressed === 'accept') press()
  })

  // Where the player's eyes and keys start: on the flag the device suggested, else on the picker itself.
  const first = core.chosen()
  if (first === undefined) dialog.focus()
  else row.focus(first)

  return {
    done,
    destroy() {
      if (destroyed) return
      destroyed = true
      unlisten()
      pads.destroy()
      row.destroy()
      dialog.remove()
      if (restorePosition !== undefined) mount.style.position = restorePosition
    },
  }
}
