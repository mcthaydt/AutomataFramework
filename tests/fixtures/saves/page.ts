// What one page of the fixture game does, loaded inside a frame by `open-page.ts`. It builds everything from the real
// `webHost()` with no seams, as a game's own page would, and puts a `SavesPage` on the frame's `window` for the test
// that opened the frame. Every method runs in this frame: its own module copies and its own memory, with nothing in
// common with the next page but what the browser stored.

import { z } from 'zod'
import { startGame } from '#src/features/game/game.ts'
import {
  createSaves,
  latestSlot,
  openSettings,
  type SaveResult,
  type SettingsSection,
  type SlotState,
} from '#src/features/saves/saves.ts'
import { webHost } from '#src/features/web/web.ts'
import { fixtureControls } from '../game/controls.ts'
import { manualFrames } from '../game/frames.ts'
import { loadFixtureGame } from '../game/game.ts'
import { heroPlugin } from '../game/hero.ts'
import { type Progress, progress } from './progress.ts'

/** What the test can ask of one page of the fixture game. Every method runs inside that page. */
export interface SavesPage {
  /** What the title screen would know: can it save, the slot list, the slot "Continue" opens. */
  title(): Promise<{ canSave: boolean; slots: readonly SlotState[]; latest: number | undefined }>
  /** Starts the game at `level` (default the project's start), runs `ticks` ticks, and returns the sim's hash. */
  play(ticks: number, level?: string): Promise<string>
  /** Saves `data` to `slot`. With `wait: false` it returns as soon as `save` has been called, not when it answers. */
  save(slot: number, data: Progress, options?: { wait?: boolean }): Promise<SaveResult | undefined>
  load(slot: number): Promise<Progress | null>
  setMusic(volume: number): Promise<void>
  music(): Promise<number>
}

const FRAME = 1000 / 60

/** The one setting the fixture game has. */
const sound: SettingsSection<{ music: number }> = {
  name: 'sound',
  schema: z.strictObject({ music: z.number().min(0).max(1) }),
  initial: { music: 0.8 },
}

const host = webHost()
const saves = createSaves({ def: progress, store: host.store })
/** Opened when the page loads, as a game does, so it reads what the browser holds now. */
const settings = openSettings({ game: progress.game, store: host.store })

const page: SavesPage = {
  async title() {
    const check = await saves.check()
    const listed = await saves.list()
    const slots = listed.ok ? listed.value : []
    return { canSave: check.ok, slots, latest: latestSlot(slots) }
  },
  async play(ticks, level) {
    const mount = document.createElement('div')
    mount.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;overflow:hidden'
    document.body.append(mount)
    const frames = manualFrames()
    const game = await startGame({
      content: await loadFixtureGame(),
      plugins: [heroPlugin],
      mount,
      controls: fixtureControls,
      host,
      frames,
      ...(level === undefined ? {} : { level }),
    })
    try {
      // The first frame only sets the clock; each one after it is one tick.
      frames.at(0)
      for (let i = 0; i < ticks; i++) frames.advance(FRAME)
      return game.sim.hash()
    } finally {
      game.stop()
      mount.remove()
    }
  },
  async save(slot, data, options = {}) {
    const saving = saves.save(slot, data)
    if (options.wait === false) return undefined
    return await saving
  },
  async load(slot) {
    const loaded = await saves.load(slot)
    return loaded.ok ? loaded.data : null
  },
  async setMusic(volume) {
    await (await settings).section(sound).set({ music: volume })
  },
  async music() {
    return (await settings).section(sound).get().music
  },
}

;(window as unknown as { savesPage: SavesPage }).savesPage = page
// Tells the frame's opener (`open-page.ts`) that the page can be asked things.
parent.postMessage({ savesPage: 'ready' }, '*')
