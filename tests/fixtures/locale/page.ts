// What one page of the full game does about the player's language, loaded inside a frame by
// `tests/fixtures/saves/open-page.ts`. It builds everything from the real `webHost()` with no seams a game's own page
// would not have: the address may say what the device's languages are (`?device=ko-KR`), that its storage refuses
// (`?storage=refused`) or which game's settings it keeps (`?game=`), because a test cannot change a browser's own. The page opens the settings, makes a locale,
// follows it with `<html lang>`, starts the full game with it and shows, as text a test can read, the keeper's greeting,
// the level's name and what the game answers to a second player who cannot join. It has one real button for each
// language the game has. Every method runs in this frame: its own memory, with nothing in common with the next page
// but what the browser stored.
import { LANGUAGES, type Language, loadGame } from '#src/features/content/content.ts'
import { startGame } from '#src/features/game/game.ts'
import { createLocale, LANGUAGE_NAMES, levelName } from '#src/features/locale/locale.ts'
import { openSettings } from '#src/features/saves/saves.ts'
import { followLanguage, webHost } from '#src/features/web/web.ts'
import { readFullGame } from '../full-game/read.ts'
import { fixtureControls } from '../game/controls.ts'
import { manualFrames } from '../game/frames.ts'
import { heroPlugin } from '../game/hero.ts'

/** What a page shows, as a person would read it. */
interface Shown {
  /** `<html lang>`. */
  readonly lang: string
  /** The language the locale is in. */
  readonly language: Language
  readonly greeting: string
  readonly level: string
  /** What `addPlayer` said to a second player, who the one-player full game refuses. */
  readonly refused: string
  /** The touch buttons' own words, in the order left, right, jump, and the overlay's label. */
  readonly touch: { readonly overlay: string; readonly buttons: readonly string[] }
  /** The sim's tick: it keeps counting when the language changes. */
  readonly tick: number
  readonly canvas: boolean
  readonly pressed: readonly Language[]
}

/** How a button of the language row sits on the screen: its size, and whether the thing at its middle is itself. */
interface ButtonBox {
  readonly language: Language
  readonly name: string
  readonly width: number
  readonly height: number
  readonly inside: boolean
  readonly reachable: boolean
}

/** What the test can ask of one page of the full game. Every method runs inside that page. */
export interface LocalePage {
  shown(): Promise<Shown>
  /** Presses the language's own button, as a finger does, and answers once the page has said it. */
  tap(language: Language): Promise<void>
  buttons(): Promise<readonly ButtonBox[]>
  /** For each language, whether its name is drawn: a picture of the name differs from one of unassigned characters. */
  drawn(): Promise<Readonly<Record<Language, boolean>>>
  /** Plays on `ticks` ticks of this page's own game. */
  run(ticks: number): Promise<void>
  /**
   * A new game of the same locale, with the right key held for `ticks` ticks. With `change`, the language becomes
   * `change.to` once `change.at` ticks have run, and goes back at the end. Answers the sim's hash.
   */
  hashOfPlay(ticks: number, change?: { readonly at: number; readonly to: Language }): Promise<string>
  /** Whether the settings could be stored: false with `?storage=refused`. */
  stored(): Promise<boolean>
}

const FRAME = 1000 / 60
// The page lives in a `srcdoc` frame, which has no address of its own: what the test asked is on the script's.
const params = new URL(import.meta.url).searchParams

/** Which game's settings the page keeps: test files that run side by side in one browser each use their own. */
const gameId = params.get('game') ?? 'language-fixture'
const device = params.get('device')
const refused = params.get('storage') === 'refused'
const host = webHost({
  ...(device === null ? {} : { navigator: { language: device, languages: [device, 'en-US'] } }),
  ...(refused
    ? {
        storage: () => {
          throw new DOMException('blocked', 'SecurityError')
        },
      }
    : {}),
})

const loaded = await loadGame(readFullGame())
if (!loaded.ok) throw new Error('the full game did not load')
const content = loaded.value
const settings = await openSettings({ game: gameId, store: host.store })
const locale = createLocale({ content, host, settings })
followLanguage(locale)

// The page's own words and buttons, over the game.
document.body.style.cssText = 'margin:0;font:18px/1.3 system-ui,sans-serif;background:#111;color:#eee'
const mount = document.createElement('div')
mount.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;overflow:hidden'
const words = document.createElement('div')
words.style.cssText =
  'position:fixed;left:0;top:0;width:100%;z-index:2;padding:8px 16px;box-sizing:border-box'
const row = document.createElement('div')
row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px'
const lines = (['greeting', 'level', 'refused'] as const).map((id) => {
  const line = document.createElement('p')
  line.id = id
  line.style.cssText = 'margin:0;text-shadow:0 0 4px #000'
  return line
})
words.append(row, ...lines)
document.body.append(mount, words)

const frames = manualFrames()
const game = await startGame({
  content,
  plugins: [heroPlugin],
  mount,
  controls: fixtureControls,
  host,
  frames,
  locale,
})
// A finger on the screen brings the touch buttons up, as it does on a phone.
window.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', bubbles: true }))
frames.at(0)

const say = (): void => {
  const answer = game.addPlayer('keyboard')
  ;(lines[0] as HTMLElement).textContent = locale.words('keeper.hello')
  ;(lines[1] as HTMLElement).textContent = levelName(locale.words, content.project.start)
  ;(lines[2] as HTMLElement).textContent = answer.ok ? 'The second player joined.' : answer.message
  for (const button of row.querySelectorAll('button'))
    button.setAttribute('aria-pressed', String(button.dataset.language === locale.language()))
}

const languageButtons = new Map<Language, HTMLButtonElement>()
for (const language of LANGUAGES.filter((l) => locale.languages.includes(l))) {
  const button = document.createElement('button')
  button.type = 'button'
  button.dataset.language = language
  button.lang = language
  button.textContent = LANGUAGE_NAMES[language]
  button.style.cssText =
    'min-width:96px;min-height:48px;padding:0 16px;font:inherit;color:inherit;background:#333;border:2px solid #888;border-radius:8px'
  button.addEventListener('click', () => {
    void locale.set(language)
  })
  languageButtons.set(language, button)
  row.append(button)
}
locale.onChange(say)
say()

const heldKey = (type: 'keydown' | 'keyup'): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code: 'ArrowRight', bubbles: true, cancelable: true }))
}

const page: LocalePage = {
  async shown() {
    const buttons = [...mount.querySelectorAll<HTMLElement>('.automata-touch-button')]
    const byAction = (action: string): string =>
      buttons.find((b) => b.dataset.action === action)?.textContent ?? ''
    return {
      lang: document.documentElement.lang,
      language: locale.language(),
      greeting: lines[0]?.textContent ?? '',
      level: lines[1]?.textContent ?? '',
      refused: lines[2]?.textContent ?? '',
      touch: {
        overlay: mount.querySelector('.automata-touch')?.getAttribute('aria-label') ?? '',
        buttons: ['left', 'right', 'jump'].map(byAction),
      },
      tick: game.sim.tick,
      canvas: mount.querySelector('canvas') !== null,
      pressed: [...languageButtons]
        .filter(([, b]) => b.getAttribute('aria-pressed') === 'true')
        .map(([l]) => l),
    }
  },
  async tap(language) {
    const button = languageButtons.get(language)
    if (button === undefined) throw new Error(`The page has no button for ${language}.`)
    button.click()
    // `set` changes the words at once and then keeps the pick; the keeping is done a moment later.
    await new Promise((resolve) => setTimeout(resolve, 50))
  },
  async buttons() {
    return [...languageButtons].map(([language, button]) => {
      const r = button.getBoundingClientRect()
      const middle = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return {
        language,
        name: button.textContent ?? '',
        width: r.width,
        height: r.height,
        inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
        reachable: middle !== null && button.contains(middle),
      }
    })
  },
  async drawn() {
    const result = {} as Record<Language, boolean>
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 80
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (context === null) throw new Error('This browser has no 2D canvas.')
    const picture = (text: string, font: string): string => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.font = font
      context.textBaseline = 'top'
      context.fillText(text, 4, 4)
      return Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data).join(',')
    }
    for (const [language, button] of languageButtons) {
      const name = button.textContent ?? ''
      const font = `32px ${getComputedStyle(button).fontFamily}`
      // Unassigned characters are drawn as nothing or as the browser's empty box, whatever the font is: a name that
      // looks the same as them is not drawn.
      const empty = '͸'.repeat([...name].length)
      result[language] = picture(name, font) !== picture(empty, font)
    }
    return result
  },
  async run(ticks) {
    for (let i = 0; i < ticks; i++) frames.advance(FRAME)
  },
  async hashOfPlay(ticks, change) {
    const own = document.createElement('div')
    own.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;overflow:hidden;visibility:hidden'
    document.body.append(own)
    const playFrames = manualFrames()
    const before = locale.choice()
    const playing = await startGame({
      content,
      plugins: [heroPlugin],
      mount: own,
      controls: fixtureControls,
      host,
      frames: playFrames,
      locale,
    })
    try {
      playFrames.at(0)
      heldKey('keydown')
      for (let i = 0; i < ticks; i++) {
        if (change !== undefined && i === change.at) await locale.set(change.to)
        playFrames.advance(FRAME)
      }
      heldKey('keyup')
      return playing.sim.hash()
    } finally {
      playing.stop()
      own.remove()
      if (change !== undefined) await locale.set(before)
    }
  },
  async stored() {
    return (await host.store.check()).ok
  },
}

;(window as unknown as { savesPage: LocalePage }).savesPage = page
// Tells the frame's opener (`open-page.ts`) that the page can be asked things.
parent.postMessage({ savesPage: 'ready' }, '*')
