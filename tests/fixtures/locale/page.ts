// What one page of the full game does about the player's language, loaded inside a frame by
// `tests/fixtures/saves/open-page.ts`. It builds everything from the real `webHost()` with no seams a game's own page
// would not have: the address may say what the device's languages are (`?device=ko-KR`), that its storage refuses
// (`?storage=refused`), which language the player chose last time (`?saved=ko`), which game's settings it keeps
// (`?game=`), which language the game's own words are written in (`?source=ko`) and a word one language lacks
// (`?drop=es:keeper.hello`), or that it is the watching page (`?watch`), because a test cannot change a browser's own.
// A player who has not chosen is shown the picker; once the game is playing the page shows the keeper's greeting, the
// level's name and what the game answers to a second player who cannot join, and a row of flags to change language.
// Every method runs in this frame: its own memory, with nothing in common with the next page but what the browser stored.
import { createRecorder, Player } from '#src/features/commands/commands.ts'
import { type GameContent, type Language, loadGame, writeContent } from '#src/features/content/content.ts'
import { startGame } from '#src/features/game/game.ts'
import { watchReplay } from '#src/features/game/watch.ts'
import { createGameSim } from '#src/features/level/level.ts'
import {
  createLocale,
  LANGUAGE_SETTINGS_DEFAULT,
  LanguageSettingsSchema,
  type Locale,
  levelName,
} from '#src/features/locale/locale.ts'
import { Transform } from '#src/features/physics/physics.ts'
import { openSettings } from '#src/features/saves/saves.ts'
import { followLanguage, languagePicker, languageRow, webHost } from '#src/features/web/web.ts'
import { withSource } from '../content/kind.ts'
import { OPENING_PATH, withoutOpening } from '../full-game/no-opening.ts'
import { readFullGamePicture } from '../full-game/pictures.ts'
import { fullGameFiles } from '../full-game/read.ts'
import { fixtureControls } from '../game/controls.ts'
import { manualFrames } from '../game/frames.ts'
import { heroPlugin } from '../game/hero.ts'
import { fakeGamepads } from '../input/fake-gamepads.ts'

/** What a page shows once the game is playing, as a person would read it. */
interface Shown {
  /** `picking` while the picker shows, `watching` while the recording plays, `playing` once the game does. */
  readonly phase: 'picking' | 'watching' | 'playing'
  /** `<html lang>`: empty while the player has no language. */
  readonly lang: string
  /** The language the locale is in; `undefined` while the player has none. */
  readonly language: Language | undefined
  readonly greeting: string
  readonly level: string
  /** What `addPlayer` said to a second player, who the one-player full game refuses. */
  readonly refused: string
  /** The touch buttons' own words, in the order left, right, jump, and the overlay's label. */
  readonly touch: { readonly overlay: string; readonly buttons: readonly string[] }
  /** The sim's tick: it keeps counting when the language changes. */
  readonly tick: number
  readonly canvas: boolean
  /** How many canvases are on the page: one game, never two. */
  readonly canvases: number
  /** The flags of the settings row that are pressed. */
  readonly pressed: readonly Language[]
}

/** The picker as a player sees it. */
interface PickerShown {
  /** The flags in the order shown. */
  readonly flags: readonly Language[]
  readonly pressed: readonly Language[]
  readonly title: string
  readonly titleVisible: boolean
  readonly go: string
  readonly goDisabled: boolean
  /** Every letter the dialog shows, as a player would see it. Empty until a flag is chosen. */
  readonly text: string
  /** The dialog's `lang`, empty until a flag is chosen. */
  readonly lang: string
  readonly flagNames: Readonly<Record<string, { readonly name: string; readonly lang: string }>>
  /** How far from the top of the page each flag, and then Go, stands: choosing a flag must not move them. */
  readonly tops: { readonly flags: readonly number[]; readonly go: number }
}

/** How a flag or Go sits on the screen: its size, and whether the thing at its middle is itself. */
interface ButtonBox {
  readonly language: Language | 'go'
  readonly name: string
  readonly width: number
  readonly height: number
  readonly inside: boolean
  readonly reachable: boolean
}

/** How a press of Go is made. */
export type PressHow = 'touch' | 'enter' | 'pad'

/** What the test can ask of one page of the full game. Every method runs inside that page. */
export interface LocalePage {
  /** Answers once the game is on screen. A page that is asking for a language answers once Go has started it. */
  started(): Promise<void>
  shown(): Promise<Shown>
  /** The picker, or `undefined` when none is showing. */
  picker(): Promise<PickerShown | undefined>
  /** Taps a flag of the picker, as a finger does. */
  tapFlag(language: Language): Promise<void>
  /** Presses Go the way a touch pointer, the Enter key or the pad's south button does; answers once the page has said it. */
  press(how: PressHow): Promise<void>
  /** Presses Go twice in one task: one game starts, and the settings are written once. */
  pressTwice(): Promise<{ readonly canvases: number; readonly writes: number }>
  /** A key pressed where the player's focus is: `ArrowRight`, `ArrowLeft`... */
  key(key: string): Promise<void>
  /** Moves the focus to a flag, as Tab does. */
  focusFlag(language: Language): Promise<void>
  /** Presses a pad button for one frame. */
  padPress(name: 'south' | 'dpad-left' | 'dpad-right'): Promise<void>
  /** Taps the watching page's picture, which takes it over. */
  takeOver(): Promise<void>
  /** Presses the language's own flag in the settings row, as a finger does, and answers once the page has said it. */
  tap(language: Language): Promise<void>
  /** The flags and Go on screen, each measured. */
  buttons(): Promise<readonly ButtonBox[]>
  /** For each flag on screen, whether its drawing has more than one colour. */
  drawn(): Promise<Readonly<Partial<Record<Language, boolean>>>>
  /** Plays on `ticks` ticks of this page's own game. */
  run(ticks: number): Promise<void>
  /** Holds the right key for `ticks` ticks and answers how far the hero went. */
  holdRight(ticks: number): Promise<number>
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
const SETTINGS_KEY = `automata.${gameId}.settings`

// How many times the page's settings were written: a press of Go keeps the choice once.
let writes = 0
const realSetItem = Storage.prototype.setItem
Storage.prototype.setItem = function (this: Storage, key: string, value: string): void {
  if (key === SETTINGS_KEY) writes++
  realSetItem.call(this, key, value)
}

const host = webHost({
  ...(device === null ? {} : { navigator: { language: device, languages: [device] } }),
  ...(refused
    ? {
        storage: () => {
          throw new DOMException('blocked', 'SecurityError')
        },
      }
    : {}),
})

/** The full game, with the language its words are written in and a word one language lacks, as the address says. */
async function loadContent(): Promise<GameContent> {
  const files: Record<string, string> = { ...fullGameFiles, [OPENING_PATH]: withoutOpening() }
  const source = params.get('source')
  if (source !== null) files['automata.toml'] = withSource(files['automata.toml'] ?? '', source as Language)
  const drop = params.get('drop')
  if (drop !== null) {
    const [language, key] = drop.split(':') as [Language, string]
    const path = `content/messages/${language}.json`
    const file = JSON.parse(files[path] ?? '{}') as { messages: Record<string, string> }
    file.messages = Object.fromEntries(Object.entries(file.messages).filter(([name]) => name !== key))
    files[path] = writeContent('messages', file as never)
  }
  const loaded = await loadGame(async (path) => {
    const text = files[path]
    if (text === undefined) throw new Error(`${path}: no such file`)
    return text
  })
  if (!loaded.ok) throw new Error('the full game did not load')
  return loaded.value
}

const content = await loadContent()
const settings = await openSettings({ game: gameId, store: host.store })
const section = settings.section({
  name: 'language',
  schema: LanguageSettingsSchema,
  initial: LANGUAGE_SETTINGS_DEFAULT,
})
// `?saved=ko` is a player who chose Korean last time: it is kept before the locale is made, as the picker's own `go`
// would have kept it.
const saved = params.get('saved')
if (saved !== null) await section.set({ format: 1, language: saved as Language })
const watchMode = params.has('watch')
let locale: Locale = createLocale({ content, host, settings, ...(watchMode ? { watching: true } : {}) })
let stopFollowing = followLanguage(locale)

// The page's own words and flags, over the game.
document.body.style.cssText = 'margin:0;font:18px/1.3 system-ui,sans-serif;background:#111;color:#eee'
const mount = document.createElement('div')
mount.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;overflow:hidden'
const words = document.createElement('div')
words.style.cssText =
  'position:fixed;left:0;top:0;width:100%;z-index:2;padding:8px 16px;box-sizing:border-box'
const lines = (['greeting', 'level', 'refused'] as const).map((id) => {
  const line = document.createElement('p')
  line.id = id
  line.style.cssText = 'margin:0;text-shadow:0 0 4px #000'
  return line
})
words.append(...lines)
document.body.append(mount, words)

const frames = manualFrames()
const pickerFrames = manualFrames()
const pads = fakeGamepads()
pads.connect(0)

let phase: Shown['phase'] = 'picking'
let game: Awaited<ReturnType<typeof startGame>> | undefined
let flagsRow: ReturnType<typeof languageRow> | undefined
let picker: ReturnType<typeof languagePicker> | undefined
let watcher: Awaited<ReturnType<typeof watchReplay>> | undefined
/** The last pick a flag made, so a test waits for it to be kept rather than for a while. */
let picking: Promise<unknown> = Promise.resolve()
let begun: { promise: Promise<void>; resolve(): void; reject(error: unknown): void }
const newBegun = (): typeof begun => {
  let resolve: () => void = () => undefined
  let reject: (error: unknown) => void = () => undefined
  const promise = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  // A test that never asks must not leave an unhandled rejection behind.
  promise.catch(() => undefined)
  return { promise, resolve, reject }
}
begun = newBegun()

const say = (): void => {
  const current = game
  ;(lines[0] as HTMLElement).textContent = locale.language() === undefined ? '' : locale.words('keeper.hello')
  ;(lines[1] as HTMLElement).textContent =
    locale.language() === undefined ? '' : levelName(locale.words, content.project.start)
  ;(lines[2] as HTMLElement).textContent = (() => {
    if (current === undefined) return ''
    const answer = current.addPlayer('keyboard')
    return answer.ok ? 'The second player joined.' : answer.message
  })()
  flagsRow?.choose(locale.language())
}

/** The game, on screen, with a row of flags to change language. */
async function play(): Promise<void> {
  try {
    game = await startGame({
      content,
      plugins: [heroPlugin],
      mount,
      controls: fixtureControls,
      host,
      frames,
      locale,
      readPicture: readFullGamePicture,
    })
    // A finger on the screen brings the touch buttons up, as it does on a phone.
    window.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', bubbles: true }),
    )
    frames.at(0)
    flagsRow = languageRow({
      mount: words,
      languages: locale.listed(),
      chosen: locale.language(),
      onChoose: (language) => {
        if (language === locale.language()) return
        picking = locale.set(language)
      },
    })
    locale.onChange(say)
    phase = 'playing'
    say()
    begun.resolve()
  } catch (error) {
    begun.reject(error)
    throw error
  }
}

/** From here a player with no language is asked, and everyone else plays. */
async function enter(): Promise<void> {
  if (!locale.asked()) {
    phase = 'picking'
    picker = languagePicker({
      mount,
      locale,
      frames: pickerFrames,
      gamepads: pads.getGamepads,
    })
    pickerFrames.at(0)
    const chosen = picker.done
    // The page goes on once Go is pressed; a refused store does not stop it.
    void chosen.then(
      async () => {
        picker?.destroy()
        picker = undefined
        await play()
      },
      (error: unknown) => begun.reject(error),
    )
    return
  }
  await play()
}

/** A recording of the game standing still: what a page shows before anyone has pressed Play. */
async function recording() {
  const sim = await createGameSim({ content, plugins: [heroPlugin] })
  const recorder = createRecorder(sim)
  for (let i = 0; i < 30; i++) recorder.step([])
  const replay = recorder.replay()
  sim.dispose()
  return replay
}

if (watchMode) {
  phase = 'watching'
  watcher = await watchReplay({
    content,
    plugins: [heroPlugin],
    mount,
    host,
    replay: await recording(),
    frames,
    readPicture: readFullGamePicture,
  })
  frames.at(0)
  ;(lines[1] as HTMLElement).textContent = levelName(locale.words, content.project.start)
} else void enter()

/** A player who already has a language is not asked: the game starts by itself, and a call waits until it has. */
let starting = !watchMode && locale.asked()

const heldKey = (type: 'keydown' | 'keyup'): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code: 'ArrowRight', bubbles: true, cancelable: true }))
}
/** Lets what a press started run on, as far as it goes without a game to wait for. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 20))

const dialog = (): HTMLElement | null => document.querySelector<HTMLElement>('.automata-picker')
const flagButtons = (): HTMLButtonElement[] => [
  ...document.querySelectorAll<HTMLButtonElement>('.automata-flag'),
]
const flagOf = (language: Language): HTMLButtonElement => {
  const found = flagButtons().find((button) => button.dataset.language === language)
  if (found === undefined) throw new Error(`The page has no flag for ${language}.`)
  return found
}
const goButton = (): HTMLButtonElement | null =>
  document.querySelector<HTMLButtonElement>('.automata-picker-go')
const canvases = (): number => document.querySelectorAll('canvas').length

const page: LocalePage = {
  async started() {
    await begun.promise
  },
  async shown() {
    const buttons = [...mount.querySelectorAll<HTMLElement>('.automata-touch-button')]
    const byAction = (action: string): string =>
      buttons.find((b) => b.dataset.action === action)?.textContent ?? ''
    return {
      phase,
      lang: document.documentElement.lang,
      language: locale.language(),
      greeting: lines[0]?.textContent ?? '',
      level: lines[1]?.textContent ?? '',
      refused: lines[2]?.textContent ?? '',
      touch: {
        overlay: mount.querySelector('.automata-touch')?.getAttribute('aria-label') ?? '',
        buttons: ['left', 'right', 'jump'].map(byAction),
      },
      tick: game?.sim.tick ?? 0,
      canvas: mount.querySelector('canvas') !== null,
      canvases: canvases(),
      pressed: [...words.querySelectorAll<HTMLButtonElement>('.automata-flag')]
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => b.dataset.language as Language),
    }
  },
  async picker() {
    const shown = dialog()
    if (shown === null) return undefined
    const title = shown.querySelector<HTMLElement>('.automata-picker-title')
    const go = goButton()
    return {
      flags: flagButtons().map((b) => b.dataset.language as Language),
      pressed: flagButtons()
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => b.dataset.language as Language),
      title: title?.textContent ?? '',
      titleVisible: title !== null && getComputedStyle(title).display !== 'none',
      go: (go?.textContent ?? '').trim(),
      goDisabled: go?.getAttribute('aria-disabled') === 'true',
      text: shown.innerText,
      lang: shown.getAttribute('lang') ?? '',
      tops: {
        flags: flagButtons().map((b) => b.getBoundingClientRect().top),
        go: go?.getBoundingClientRect().top ?? Number.NaN,
      },
      flagNames: Object.fromEntries(
        flagButtons().map((b) => [
          b.dataset.language as string,
          { name: b.getAttribute('aria-label') ?? '', lang: b.lang },
        ]),
      ),
    }
  },
  async tapFlag(language) {
    flagOf(language).click()
  },
  async press(how) {
    const go = goButton()
    // A press that has something to do starts the game; one that has not only has to be left to do nothing.
    const live = go?.getAttribute('aria-disabled') === 'false'
    if (how === 'touch') go?.click()
    else if (how === 'enter')
      (document.activeElement ?? dialog())?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      )
    else {
      pads.press('south')
      pickerFrames.advance(FRAME)
      pads.release('south')
      pickerFrames.advance(FRAME)
    }
    if (live) await begun.promise
    else await settle()
  },
  async pressTwice() {
    const go = goButton()
    go?.click()
    go?.click()
    await begun.promise
    return { canvases: canvases(), writes }
  },
  async key(key) {
    ;(document.activeElement ?? dialog())?.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )
  },
  async focusFlag(language) {
    flagOf(language).focus()
  },
  async padPress(name) {
    pads.press(name)
    pickerFrames.advance(FRAME)
    pads.release(name)
    pickerFrames.advance(FRAME)
  },
  async takeOver() {
    if (watcher === undefined) throw new Error('This page is not watching.')
    watcher.stop()
    watcher = undefined
    starting = false
    stopFollowing()
    // The watch had a locale that was never asked: a player taking over is asked, with a locale of their own.
    locale = createLocale({ content, host, settings })
    stopFollowing = followLanguage(locale)
    begun = newBegun()
    await enter()
  },
  async tap(language) {
    // The settings row is drawn once the game is on the screen.
    await begun.promise
    flagOf(language).click()
    // `set` changes the words at once and then keeps the pick: wait for the keeping, not for a guess at how long.
    await picking
  },
  async buttons() {
    const targets: [Language | 'go', HTMLElement][] = flagButtons().map((b) => [
      b.dataset.language as Language,
      b,
    ])
    const go = goButton()
    if (go !== null) targets.push(['go', go])
    return targets.map(([language, button]) => {
      const r = button.getBoundingClientRect()
      const middle = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return {
        language,
        name: button.getAttribute('aria-label') ?? button.textContent ?? '',
        width: r.width,
        height: r.height,
        inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
        reachable: middle !== null && button.contains(middle),
      }
    })
  },
  async drawn() {
    const result: Partial<Record<Language, boolean>> = {}
    for (const button of flagButtons()) {
      const svg = button.querySelector('svg')
      if (svg === null) continue
      const url = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }),
      )
      const image = new Image()
      image.src = url
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = 60
      canvas.height = 40
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (context === null) throw new Error('This browser has no 2D canvas.')
      context.drawImage(image, 0, 0, 60, 40)
      URL.revokeObjectURL(url)
      const colours = new Set<string>()
      const data = context.getImageData(0, 0, 60, 40).data
      for (let i = 0; i < data.length; i += 4)
        colours.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`)
      result[button.dataset.language as Language] = colours.size > 1
    }
    return result
  },
  async run(ticks) {
    for (let i = 0; i < ticks; i++) frames.advance(FRAME)
  },
  async holdRight(ticks) {
    const hero = (): number => {
      const found = game?.sim.query(Player, Transform).find((e) => e.get(Player).number === 1)
      if (found === undefined) throw new Error('The game has no hero.')
      return found.get(Transform).x
    }
    const from = hero()
    heldKey('keydown')
    for (let i = 0; i < ticks; i++) frames.advance(FRAME)
    heldKey('keyup')
    return hero() - from
  },
  async hashOfPlay(ticks, change) {
    const own = document.createElement('div')
    own.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;overflow:hidden;visibility:hidden'
    document.body.append(own)
    const playFrames = manualFrames()
    const before = locale.language() as Language
    const playing = await startGame({
      content,
      plugins: [heroPlugin],
      mount: own,
      controls: fixtureControls,
      host,
      frames: playFrames,
      locale,
      readPicture: readFullGamePicture,
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

// Every call waits for the game to be on the screen when it starts by itself, so a test never meets a half-built page.
for (const name of Object.keys(page) as (keyof LocalePage)[]) {
  const method = page[name] as (...args: unknown[]) => Promise<unknown>
  ;(page as unknown as Record<string, unknown>)[name] = async (...args: unknown[]) => {
    if (starting) await begun.promise
    return method(...args)
  }
}

;(window as unknown as { savesPage: LocalePage }).savesPage = page
// Tells the frame's opener (`open-page.ts`) that the page can be asked things.
parent.postMessage({ savesPage: 'ready' }, '*')
