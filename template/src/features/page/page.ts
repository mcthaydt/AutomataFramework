// The page: loads the game's files, starts the game in an element, and keeps what the player changes. The sim decides
// everything; this file only shows it. Whatever goes wrong becomes a few lines of plain words in the page, never a blank
// screen and never an error nobody reads.
import {
  createLocale,
  type Frames,
  followLanguage,
  formatDiagnostic,
  type Game,
  type Host,
  INPUT_SETTINGS_DEFAULT,
  InputSettingsSchema,
  loadGame,
  openSettings,
  startGame,
  type Words,
  webHost,
} from '@automataframework/framework'
import { gamePlugins } from '../../headless.ts'
import { CONTROLS, hintFor } from './controls.ts'

/** The actions a player can press, from the controls. */
const ACTIONS: readonly string[] = Object.keys(CONTROLS)

/** The id the game's settings are saved under: the game's name. `automata create` writes the real one here. */
const GAME_ID = 'my-game'

/**
 * The sentences the page says before it has any of the game's words: while the files are loading, and when they could not
 * be read at all (`cannotStart` is also in the messages, as `page.cannot-start`, and said in the player's language once
 * there is one). Everything else it says is in `content/messages/`, in six languages.
 */
export const WORDS = {
  loading: 'Loading the game…',
  problemTitle: 'This game has a problem and cannot start.',
  problemFix: 'Fix the file named above, then load this page again.',
  cannotStart: 'This game could not start in this browser. Try another browser.',
} as const

export interface PageOptions {
  /** Reads one of the game's files by its path from the game's root. Default: fetches it from beside the page. */
  readonly read?: (path: string) => Promise<string>
  /** Default `webHost()`. */
  readonly host?: Host
  /** Default: the page's animation frames. A test hands its own. */
  readonly frames?: Frames
  /** Whether the screen is touched with a finger. Default: the device's own answer, `(pointer: coarse)`. */
  readonly coarse?: boolean
}

export interface Page {
  /** The running game, or `undefined` while loading and when there was a problem. */
  readonly game: Game | undefined
  /** Stops the game and empties the element. Safe to call twice. */
  stop(): void
}

/**
 * A `read` that fetches `path` from beside the page. A file that is not there, or that a server answers with a web
 * page (a single-page host does, with a 200), is "no such file": the game reads only TOML and JSON.
 */
function fetchBeside(base: string | URL): (path: string) => Promise<string> {
  return async (path) => {
    const response = await fetch(new URL(path, base))
    const type = response.headers.get('content-type') ?? ''
    if (!response.ok || type.toLowerCase().startsWith('text/html')) throw new Error(`${path}: no such file`)
    return response.text()
  }
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag)
  if (text !== undefined) made.textContent = text
  return made
}

function loading(): HTMLParagraphElement {
  const text = element('p', WORDS.loading)
  text.className = 'loading'
  return text
}

/** Loads the game and starts it in `root`. Never rejects: anything that goes wrong is words in `root`. */
export async function startPage(root: HTMLElement, options: PageOptions = {}): Promise<Page> {
  const { read = fetchBeside(new URL('./', location.href)), host = webHost() } = options
  const coarse = options.coarse ?? window.matchMedia('(pointer: coarse)').matches
  let game: Game | undefined
  let stopped = false
  let forgetHint = (): void => {}
  let forgetLanguage = (): void => {}
  /** Says a sentence in the player's language; `undefined` until there are words to say it in. */
  let say: Words | undefined

  const page: Page = {
    get game() {
      return game
    },
    stop() {
      if (stopped) return
      stopped = true
      forgetHint()
      forgetLanguage()
      game?.stop()
      game = undefined
      root.replaceChildren()
    },
  }

  /** Words in place of the game: `lines` are what went wrong, one each. */
  const problem = (title: string, lines: readonly string[], fix?: string): Page => {
    root.replaceChildren()
    const screen = element('div')
    screen.className = 'problem'
    screen.setAttribute('role', 'alert')
    const list = element('ul')
    for (const line of lines) list.append(element('li', line))
    screen.append(element('h1', title), list)
    if (fix !== undefined) screen.append(element('p', fix))
    root.append(screen)
    root.dataset.state = 'problem'
    return page
  }

  root.replaceChildren(loading())
  root.dataset.state = 'loading'
  try {
    const loaded = await loadGame(read)
    if (!loaded.ok)
      return problem(WORDS.problemTitle, loaded.diagnostics.map(formatDiagnostic), WORDS.problemFix)

    // What the player changed last time, kept in the host's store (a browser's own storage on the web).
    const settings = await openSettings({ game: GAME_ID, store: host.store })
    const controls = settings.section({
      name: 'controls',
      schema: InputSettingsSchema,
      initial: INPUT_SETTINGS_DEFAULT,
    })

    // The words in the player's language: the one they picked, else the host's, else the device's, else English.
    const locale = createLocale({ content: loaded.value, host, settings })
    forgetLanguage = followLanguage(locale)
    say = locale.words

    root.replaceChildren()
    const started = await startGame({
      content: loaded.value,
      plugins: gamePlugins,
      mount: root,
      controls: CONTROLS,
      host,
      locale,
      settings: controls.get(),
      ...(options.frames === undefined ? {} : { frames: options.frames }),
    })
    if (stopped) {
      started.stop()
      return page
    }
    game = started
    game.input.onBindings((changed) => void controls.set(changed))
    root.dataset.state = 'playing'

    // A player at a keyboard is told which keys to press, until the first time they press one of them.
    if (!coarse) {
      const hint = element('p')
      const draw = (): void => {
        hint.textContent = hintFor((action) => started.input.inputsFor(1, action)[0], locale.words)
      }
      draw()
      const unfollow = locale.onChange(draw)
      hint.className = 'hint'
      root.append(hint)
      const gone = (event: KeyboardEvent): void => {
        const used = ACTIONS.some((action) => started.input.inputsFor(1, action).includes(event.code))
        if (used) forgetHint()
      }
      forgetHint = () => {
        window.removeEventListener('keydown', gone)
        unfollow()
        hint.remove()
        forgetHint = () => {}
      }
      window.addEventListener('keydown', gone)
    }
    return page
  } catch (error) {
    // `loadGame` reports a bad file as words; this is a read that failed some other way, or a browser that cannot play.
    const reason = error instanceof Error ? error.message : String(error)
    return problem(say?.('page.cannot-start') ?? WORDS.cannotStart, [reason])
  }
}
