// Drives the default flow on a page the way a person does: clicks on buttons named by their words, keys, and frames
// delivered by hand. A test makes one with `createDrive()`, calls `start()` before each test and `stop()` after it.
import { expect } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { testSpeaker } from '#src/features/audio/audio.ts'
import { loadGame } from '#src/features/content/content.ts'
import { type Flow, type FlowOptions, startFlow } from '#src/features/flow/flow.ts'
import { type TestHost, testHost } from '#src/features/host/host.ts'
import { createLocale, frameworkWords } from '#src/features/locale/locale.ts'
import { openSettings } from '#src/features/saves/saves.ts'
import { SPLASH_MS } from '#src/features/screens/screens.ts'
import { fixtureControls } from '../game/controls.ts'
import { type ManualFrames, manualFrames } from '../game/frames.ts'
import { heroPlugin } from '../game/hero.ts'
import { type FakeGamepads, fakeGamepads } from '../input/fake-gamepads.ts'
import { type FlowGameOptions, flowRead } from './game.ts'

/** What a test may change about a visit. */
export interface DriveOptions {
  readonly host?: TestHost
  readonly game?: FlowGameOptions
  readonly read?: (path: string) => Promise<string>
  readonly plugins?: FlowOptions['plugins']
  readonly save?: unknown
  readonly watch?: FlowOptions['watch']
  readonly reload?: () => void
}

export interface Drive {
  readonly mount: HTMLDivElement
  readonly frames: ManualFrames
  readonly pads: FakeGamepads
  readonly game: string
  flow(): Flow | undefined
  /** Opens the flow on the page. */
  open(options?: DriveOptions): Promise<Flow>
  /** A player who chose `language` on an earlier visit to this host. */
  returning(host: TestHost, language: 'es' | 'ko' | 'en'): Promise<void>
  /** A returning player's visit up to the main menu, in Spanish: the splash is over and the menu shows. */
  toMenu(options?: DriveOptions): Promise<TestHost>
  step(): string
  /** Waits for `data-state` to say `want`. */
  shown(want: string): Promise<void>
  press(label: string): Promise<void>
  /** Presses the button called `label` in the question on top, where a place's own button may say the same. */
  answer(label: string): Promise<void>
  /** Waits for a button with this label. */
  wait(label: string): Promise<void>
  buttons(): string[]
  /** Lets time pass on the page's frames, as far as `ms`. */
  run(ms: number): void
  key(type: 'keydown' | 'keyup', code: string): void
  /** The visit ends and the page is gone, as when it is closed. */
  leave(): void
  start(): Promise<void>
  stop(): void
}

/** What a person is told a button says: its words, or, for a picture, the name it carries. */
const nameOf = (b: HTMLElement): string =>
  (b.textContent ?? '').trim() || (b.getAttribute('aria-label') ?? '')

export function createDrive(game = 'flow-test'): Drive {
  let mount = document.createElement('div')
  let frames = manualFrames()
  let pads = fakeGamepads()
  let flow: Flow | undefined

  const buttons = (): string[] => [...mount.querySelectorAll('button')].map(nameOf)
  const button = (label: string): HTMLButtonElement => {
    const found = [...mount.querySelectorAll('button')].find((b) => nameOf(b) === label)
    if (found === undefined) throw new Error(`No button says "${label}". They say: ${buttons().join(' | ')}`)
    return found
  }
  const drive: Drive = {
    get mount() {
      return mount
    },
    get frames() {
      return frames
    },
    get pads() {
      return pads
    },
    game,
    flow: () => flow,
    async open(options = {}) {
      flow = await startFlow({
        mount,
        game,
        read: options.read ?? flowRead(options.game),
        plugins: options.plugins ?? [heroPlugin],
        controls: fixtureControls,
        host: options.host ?? testHost({ deviceLanguages: ['es-MX'] }),
        speaker: testSpeaker(),
        frames,
        gamepads: pads.getGamepads,
        reload: options.reload ?? (() => {}),
        ...(options.save === undefined ? {} : { save: options.save as never }),
        ...(options.watch === undefined ? {} : { watch: options.watch }),
      })
      return flow
    },
    async returning(host, language) {
      const loaded = await loadGame(flowRead())
      if (!loaded.ok) throw new Error('the flow game did not load')
      const settings = await openSettings({ game, store: host.store })
      await createLocale({ content: loaded.value, host, settings }).set(language)
    },
    async toMenu(options = {}) {
      const host = options.host ?? testHost()
      await drive.returning(host, 'es')
      await drive.open({ game: { noWarning: true }, ...options, host })
      await drive.shown('splash')
      frames.at(0)
      drive.run(SPLASH_MS + 200)
      await drive.shown('menu')
      // The menu's first button is Play, or Continue when a game was kept.
      await expect
        .poll(() => mount.querySelector('[data-screen="menu"] button') !== null, { timeout: 10_000 })
        .toBe(true)
      return host
    },
    step: () => flow?.state().step ?? '',
    async shown(want) {
      await expect.poll(() => mount.dataset.state, { timeout: 10_000 }).toBe(want)
      // The step is `playing` as soon as the level is asked for; the game exists a moment later, and keys before then are lost.
      if (want === 'playing')
        await expect.poll(() => flow?.game() !== undefined, { timeout: 10_000 }).toBe(true)
    },
    press: (label) => userEvent.click(button(label)),
    answer(label) {
      const asked = mount.querySelector('[role="alertdialog"]')
      const found = [...(asked?.querySelectorAll('button') ?? [])].find((b) => nameOf(b) === label)
      if (found === undefined) throw new Error(`The question has no button that says "${label}".`)
      return userEvent.click(found)
    },
    async wait(label) {
      await expect.poll(() => buttons().includes(label), { timeout: 10_000 }).toBe(true)
    },
    buttons,
    run(ms) {
      for (let at = 0; at < ms; at += 100) frames.advance(100)
    },
    key(type, code) {
      window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true }))
    },
    leave() {
      flow?.stop()
      flow = undefined
      mount.replaceChildren()
      frames = manualFrames()
      pads = fakeGamepads()
    },
    async start() {
      await page.viewport(390, 844)
      mount = document.createElement('div')
      mount.style.cssText = 'position:fixed;inset:0'
      document.body.append(mount)
      frames = manualFrames()
      pads = fakeGamepads()
    },
    stop() {
      flow?.stop()
      flow = undefined
      mount.remove()
    },
  }
  return drive
}
