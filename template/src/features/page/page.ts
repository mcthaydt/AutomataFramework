// The page: loads the game's files, starts the game in an element, and keeps what the player changes. The sim decides
// everything; this file only shows it. Whatever goes wrong becomes a few lines of plain words in the page, never a blank
// screen and never an error nobody reads.
import {
  ArtError,
  createAudio,
  createLocale,
  type Frames,
  followLanguage,
  formatDiagnostic,
  type Game,
  type GameAudio,
  type Host,
  INPUT_SETTINGS_DEFAULT,
  InputSettingsSchema,
  languagePicker,
  listFromManifest,
  loadGame,
  loadRecordings,
  openSettings,
  playHint,
  type ReadPicture,
  RecordingError,
  type Speaker,
  startGame,
  TOUCH_SETTINGS_DEFAULT,
  TouchSettingsSchema,
  type Words,
  webHost,
  webSpeaker,
} from '@automataframework/framework'
import { gamePlugins } from '../../headless.ts'

/** The id the game's settings are saved under: the game's name. `automata create` writes the real one here. */
const GAME_ID = 'my-game'

/**
 * The sentences the page says before it has a language to say them in: when the game's files could not be read at all.
 * They are for the developer, who reads English. `problemTitle` and `cannotStart` are also in the messages
 * (`page.problem-title`, `page.cannot-start`) and said in the player's language once there is one. Everything else it
 * says is in `content/messages/`, in six languages. While loading the page says nothing: a mark that turns, with no
 * letters, because no language is the default.
 */
export const WORDS = {
  problemTitle: 'This game has a problem and cannot start.',
  problemFix: 'Fix the file named above, then load this page again.',
  cannotStart: 'This game could not start in this browser. Try another browser.',
} as const

export interface PageOptions {
  /** Reads one of the game's files by its path from the game's root. Default: fetches it from beside the page. */
  readonly read?: (path: string) => Promise<string>
  /** Reads one of the game's pictures by its path from the game's root. Default: fetches it from beside the page. */
  readonly readPicture?: ReadPicture
  /** Reads a recorded sound by its path from the game's root; `undefined` when there is none. Default: fetches it. */
  readonly readBytes?: (path: string) => Promise<Uint8Array | undefined>
  /** What plays the sound. Default `webSpeaker()`. A test hands a test speaker, which plays nothing. */
  readonly speaker?: Speaker
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
  /** The game's sound: what its cues asked for and whether the sound is on. `undefined` while loading and on a problem. */
  readonly audio: GameAudio | undefined
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

/** A `readBytes` that fetches `path` from beside the page: a file that is not there is `undefined`. */
function fetchBytesBeside(base: string | URL): (path: string) => Promise<Uint8Array | undefined> {
  return async (path) => {
    const response = await fetch(new URL(path, base))
    return response.ok ? new Uint8Array(await response.arrayBuffer()) : undefined
  }
}

/** A `readPicture` that fetches `path` from beside the page: a picture that is not there is "no such file". */
function fetchPictureBeside(base: string | URL): ReadPicture {
  return async (path) => {
    const response = await fetch(new URL(path, base))
    if (!response.ok) throw new Error(`${path}: no such file`)
    return response.blob()
  }
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag)
  if (text !== undefined) made.textContent = text
  return made
}

/** The mark shown while the files load: no letters, since the player has no language yet. */
function loading(): HTMLDivElement {
  const mark = element('div')
  mark.className = 'loading'
  mark.setAttribute('role', 'status')
  mark.setAttribute('aria-busy', 'true')
  return mark
}

/** Loads the game and starts it in `root`. Never rejects: anything that goes wrong is words in `root`. */
export async function startPage(root: HTMLElement, options: PageOptions = {}): Promise<Page> {
  const here = new URL('./', location.href)
  const {
    read = fetchBeside(here),
    readPicture = fetchPictureBeside(here),
    readBytes = fetchBytesBeside(here),
    host = webHost(),
  } = options
  const coarse = options.coarse ?? window.matchMedia('(pointer: coarse)').matches
  let game: Game | undefined
  let audio: GameAudio | undefined
  let speaker: Speaker | undefined
  let stopped = false
  let forgetHint = (): void => {}
  let forgetLanguage = (): void => {}
  let forgetPicker = (): void => {}
  /** Says a sentence in the player's language; `undefined` until there are words to say it in. */
  let say: Words | undefined

  const page: Page = {
    get game() {
      return game
    },
    get audio() {
      return audio
    },
    stop() {
      if (stopped) return
      stopped = true
      forgetHint()
      forgetLanguage()
      forgetPicker()
      game?.stop()
      game = undefined
      // The page made the audio and its speaker, so the page closes them: a game never stops its own music.
      audio?.close()
      audio = undefined
      if (options.speaker === undefined) speaker?.close()
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

  /** What went wrong that is not a bad file: a read that failed some other way, or a browser that cannot play. */
  const report = (error: unknown): Page => {
    const reason = error instanceof Error ? error.message : String(error)
    // A picture that is missing or old: it is the game's pictures that need painting again, not the browser. The words
    // are there by now, so the player reads it in their language.
    if (error instanceof RecordingError)
      return problem(say?.('page.problem-title') ?? WORDS.problemTitle, [reason], WORDS.problemFix)
    if (error instanceof ArtError)
      return problem(
        say?.('page.problem-title') ?? WORDS.problemTitle,
        [reason],
        say?.('page.paint-again') ?? WORDS.problemFix,
      )
    return problem(say?.('page.cannot-start') ?? WORDS.cannotStart, [reason])
  }

  root.replaceChildren(loading())
  root.dataset.state = 'loading'
  try {
    // A page cannot list a folder, so the folders `automata.toml` lists are read from the manifest the build writes.
    const loaded = await loadGame(read, listFromManifest(read))
    if (!loaded.ok)
      return problem(WORDS.problemTitle, loaded.diagnostics.map(formatDiagnostic), WORDS.problemFix)
    // Recorded sounds, read and judged before anything plays. A game with none reads nothing.
    const recordings = await loadRecordings(loaded.value, readBytes)

    // What the player changed last time, kept in the host's store (a browser's own storage on the web).
    const settings = await openSettings({ game: GAME_ID, store: host.store })
    const controls = settings.section({
      name: 'controls',
      schema: InputSettingsSchema,
      initial: INPUT_SETTINGS_DEFAULT,
    })
    // Which thumb walks and whether the phone may buzz: the framework reads them, and a settings screen can change them.
    const touch = settings.section({
      name: 'touch',
      schema: TouchSettingsSchema,
      initial: TOUCH_SETTINGS_DEFAULT,
    })

    // The words in the player's language: the one they picked, else the host's. A player who has neither is asked, with
    // flags, before anything is said in any language.
    const locale = createLocale({ content: loaded.value, host, settings })
    forgetLanguage = followLanguage(locale)

    /** The game, in the player's language. Anything that goes wrong is words in `root`. */
    const play = async (): Promise<Page> => {
      try {
        say = locale.words
        root.replaceChildren()
        speaker = options.speaker ?? webSpeaker({ host })
        audio = createAudio({ content: loaded.value, speaker, recordings })
        const started = await startGame({
          content: loaded.value,
          plugins: gamePlugins,
          audio,
          mount: root,
          host,
          locale,
          readPicture,
          settings: controls.get(),
          touchSettings: touch.get(),
          ...(options.frames === undefined ? {} : { frames: options.frames }),
        })
        if (stopped) {
          started.stop()
          return page
        }
        game = started
        game.input.onBindings((changed) => void controls.set(changed))
        root.dataset.state = 'playing'

        // A player at a keyboard or a gamepad is told what to press, until the first time they press it. The framework
        // says it in the player's words, for the device in use; a thumb has its own hints on the screen.
        if (!coarse) {
          // The hint names the dash when this hero has it, so a developer who switches it on in hero.json is not told
          // less than the game does.
          const dash = loaded.value.characters[loaded.value.project.hero]?.moves?.dash === true
          const hint = element('p')
          const draw = (): void => {
            hint.textContent = playHint({
              device: started.input.device(1),
              first: (action) => started.input.inputsFor(1, action)[0],
              dash,
              words: locale.words,
            })
          }
          draw()
          const unfollowWords = locale.onChange(draw)
          const unfollowDevice = started.input.onDevice(draw)
          const unfollow = (): void => {
            unfollowWords()
            unfollowDevice()
          }
          hint.className = 'hint'
          root.append(hint)
          const gone = (event: KeyboardEvent): void => {
            const used = Object.keys(started.input.controls()).some((action) =>
              started.input.inputsFor(1, action).includes(event.code),
            )
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
        return report(error)
      }
    }

    if (locale.asked()) return await play()

    // Nobody has said what language to play in: show the flags, and start the game when Go is pressed. The page is
    // handed back now, so a caller can stop it while it waits.
    root.replaceChildren()
    root.dataset.state = 'picking'
    const picker = languagePicker({
      mount: root,
      locale,
      ...(options.frames === undefined ? {} : { frames: options.frames }),
    })
    forgetPicker = () => {
      picker.destroy()
      forgetPicker = () => {}
    }
    void picker.done.then(
      () => {
        forgetPicker()
        if (!stopped) return play()
        return undefined
      },
      (error: unknown) => report(error),
    )
    return page
  } catch (error) {
    return report(error)
  }
}
