// The flags: one drawing for each language a game can ship in, and a row of real buttons that shows them. A flag is
// the language's picture, not its name, so a player who cannot read the screen's words can still find their own; the
// name is on the button for a screen reader. The drawings are the framework's own files, read as text and parsed as
// pictures: nothing is put on the page as a string of HTML.
import type { Language } from '../content/content.ts'
import { LANGUAGE_NAMES, LANGUAGE_TAGS } from '../locale/locale.ts'
import check from './library/check.svg?raw'
import en from './library/flags/en.svg?raw'
import es from './library/flags/es.svg?raw'
import ja from './library/flags/ja.svg?raw'
import ko from './library/flags/ko.svg?raw'
import pt from './library/flags/pt.svg?raw'
import zh from './library/flags/zh.svg?raw'
import globe from './library/globe.svg?raw'

const FLAGS: Readonly<Record<Language, string>> = { zh, es, en, pt, ja, ko }
const ICONS = { globe, check } as const

/** A drawing from its text, as a node of this page. Said to no one: its button or its place says what it is. */
function drawing(text: string): SVGSVGElement {
  const parsed = new DOMParser().parseFromString(text, 'image/svg+xml')
  const node = document.importNode(parsed.documentElement, true) as unknown as SVGSVGElement
  node.setAttribute('aria-hidden', 'true')
  node.setAttribute('focusable', 'false')
  return node
}

/** The flag of a language as a drawing: no words in it, hidden from a screen reader (its button has the name). */
export function languageFlag(language: Language): SVGSVGElement {
  const flag = drawing(FLAGS[language])
  flag.style.cssText = 'width:60px;height:40px;display:block;border-radius:4px;box-shadow:0 0 0 1px #8888'
  return flag
}

/** One of the picker's two icons, drawn in the colour of the words around it. */
export function pickerIcon(name: keyof typeof ICONS, size: number): SVGSVGElement {
  const icon = drawing(ICONS[name])
  icon.style.cssText = `width:${size}px;height:${size}px;display:block`
  return icon
}

/** A flag button's own look: big enough for a thumb, the drawing in the middle. */
const FLAG_STYLE = [
  'width:72px',
  'height:56px',
  'padding:0',
  'margin:0',
  'border:0',
  'background:transparent',
  'display:flex',
  'align-items:center',
  'justify-content:center',
  'border-radius:var(--automata-picker-radius,16px)',
  'cursor:pointer',
  'touch-action:manipulation',
  '-webkit-tap-highlight-color:transparent',
  'outline-offset:2px',
].join(';')

/**
 * One real button for each language, in the order given, three across (two rows fit a phone held sideways). A press, or
 * focus arriving, calls `onChoose`. The chosen one says so to a screen reader (`aria-pressed`) and to the eye (a
 * 4-pixel outline).
 */
export function languageRow(options: {
  readonly mount: HTMLElement
  readonly languages: readonly Language[]
  readonly chosen: Language | undefined
  readonly onChoose: (language: Language) => void
}): {
  choose(language: Language | undefined): void
  focus(language: Language): void
  destroy(): void
} {
  const row = document.createElement('div')
  row.className = 'automata-picker-flags'
  row.setAttribute('role', 'group')
  row.style.cssText =
    'display:grid;grid-template-columns:repeat(3,72px);gap:12px;max-width:360px;justify-content:center'
  const buttons = new Map<Language, HTMLButtonElement>()
  for (const language of options.languages) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'automata-flag'
    button.dataset.language = language
    button.lang = LANGUAGE_TAGS[language]
    button.setAttribute('aria-label', LANGUAGE_NAMES[language])
    button.setAttribute('aria-pressed', 'false')
    button.style.cssText = FLAG_STYLE
    button.append(languageFlag(language))
    button.addEventListener('click', () => options.onChoose(language))
    // Tab (or a screen reader's cursor) arriving on a flag is choosing it, so one press of Go is all that is left.
    button.addEventListener('focus', () => options.onChoose(language))
    buttons.set(language, button)
    row.append(button)
  }
  options.mount.append(row)
  const choose = (language: Language | undefined): void => {
    for (const [one, button] of buttons) {
      const on = one === language
      button.setAttribute('aria-pressed', String(on))
      button.style.outline = on ? '4px solid var(--automata-picker-chosen,#fff)' : 'none'
    }
  }
  choose(options.chosen)
  return {
    choose,
    focus: (language) => buttons.get(language)?.focus(),
    destroy: () => row.remove(),
  }
}
