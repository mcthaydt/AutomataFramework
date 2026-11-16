// The template's page in each real browser: one call to the flow. A first visit walks the picker, the splash and the menu
// and plays; a broken file is the framework's problem screen; `?watch` plays the recording and a tap takes over; stopping
// empties the page; and a thumb has two whole halves at every screen size.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { Player } from '#src/features/commands/commands.ts'
import type { Flow } from '#src/features/flow/flow.ts'
import { testHost } from '#src/features/host/host.ts'
import { Transform } from '#src/features/physics/physics.ts'
import { SPLASH_MS } from '#src/features/screens/screens.ts'
import { startPage } from '../../template/src/features/page/page.ts'
import style from '../../template/src/style.css?raw'
import { FRAME, key, run } from '../fixtures/game/co-op-game.ts'
import { type ManualFrames, manualFrames } from '../fixtures/game/frames.ts'
import { SCREENS } from '../fixtures/game/screens.ts'
import { readFiles, readPicture, templateFiles } from './game.ts'

let root: HTMLElement
let started: Flow | undefined
let sheet: HTMLStyleElement
let coarse = false

beforeEach(() => {
  // The page's own stylesheet and element, so it is laid out as it is for a player.
  sheet = document.createElement('style')
  sheet.textContent = style
  document.head.append(sheet)
  root = document.createElement('main')
  root.id = 'game'
  document.body.append(root)
  coarse = false
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) => ({ matches: coarse && query.includes('coarse'), media: query }) as MediaQueryList,
  )
})
afterEach(() => {
  started?.stop()
  started = undefined
  root.remove()
  sheet.remove()
  vi.restoreAllMocks()
})

/** Starts the page on the template's files, with frames driven by hand; a first visit by a French speaker. */
async function open(
  options: { files?: Record<string, string>; watch?: boolean } = {},
): Promise<{ frames: ManualFrames; flow: Flow }> {
  const frames = manualFrames()
  const flow = await startPage(root, {
    read: readFiles(options.files),
    readPicture,
    host: testHost({ deviceLanguages: ['fr-FR'] }),
    frames,
    watch: options.watch ?? false,
  })
  started = flow
  return { frames, flow }
}

const shown = (want: string): Promise<void> =>
  vi.waitFor(() => expect(root.dataset.state).toBe(want), { timeout: 10_000 })

/** The picker's English flag and Go, as a first-time player presses them. */
async function chooseEnglish(): Promise<void> {
  await shown('picking')
  root.querySelector<HTMLButtonElement>(".automata-flag[data-language='en']")?.click()
  root.querySelector<HTMLButtonElement>('.automata-picker-go')?.click()
}

/** From the picker to the level: English, the splash, the menu's first button (Play). */
async function intoTheLevel(frames: ManualFrames): Promise<void> {
  await chooseEnglish()
  await shown('splash')
  frames.at(0)
  run(frames, Math.ceil(SPLASH_MS / FRAME) + 20)
  await shown('menu')
  await vi.waitFor(() => expect(root.querySelector('[data-screen="menu"] button')).not.toBeNull())
  root.querySelector<HTMLButtonElement>('[data-screen="menu"] button')?.click()
  await shown('playing')
  await vi.waitFor(() => expect(started?.game()).toBeDefined())
}

const heroX = (flow: Flow): number => {
  const hero = flow.game()?.sim.query(Player, Transform)[0]
  if (hero === undefined) throw new Error('There is no hero.')
  return hero.get(Transform).x
}

test('a first visit walks the picker, the splash and the menu, and Play starts a level the hero walks in', async () => {
  await page.viewport(1280, 720)
  const { frames, flow } = await open()
  await shown('picking')
  await intoTheLevel(frames)
  run(frames, 30)
  const before = heroX(flow)
  key('keydown', 'ArrowRight')
  run(frames, 30)
  key('keyup', 'ArrowRight')
  expect(heroX(flow)).toBeGreaterThan(before + 1)
})

test("a broken level is the framework's problem screen, in words", async () => {
  const level = JSON.parse(templateFiles['content/levels/level-1.json'] ?? '') as { things: { x: unknown }[] }
  ;(level.things[0] as { x: unknown }).x = 'far'
  const { flow } = await open({ files: { 'content/levels/level-1.json': JSON.stringify(level) } })
  await shown('problem')
  expect(flow.game()).toBeUndefined()
  expect(root.querySelector('canvas')).toBeNull()
  expect(root.querySelector('[role="alert"]')?.textContent).toBeTruthy()
})

test('?watch plays the recording, and a tap takes over', async () => {
  await page.viewport(1280, 720)
  const { flow } = await open({ watch: true })
  await shown('watching')
  expect(root.querySelector('canvas')).not.toBeNull()
  flow.takeOver()
  await shown('picking')
  expect(root.querySelector('canvas')).toBeNull()
})

test('stopping the page empties it, and no game starts later', async () => {
  const { flow } = await open()
  await shown('picking')
  flow.stop()
  expect(root.childElementCount).toBe(0)
  await new Promise((done) => setTimeout(done, 50))
  expect(root.childElementCount).toBe(0)
  expect(flow.game()).toBeUndefined()
})

for (const [name, w, h] of SCREENS) {
  test(`on ${name} the two thumb halves are whole, inside the screen and side by side`, async () => {
    coarse = true
    await page.viewport(w, h)
    expect([window.innerWidth, window.innerHeight]).toEqual([w, h])
    const { frames } = await open()
    await intoTheLevel(frames)
    // A finger on the screen brings up the thumbs, as it does for a player on a phone.
    window.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', bubbles: true }),
    )
    for (let i = 0; i < 30; i++) frames.advance(FRAME)

    const rect = (half: string): DOMRect => {
      const found = root.querySelector(`[data-half='${half}']`)
      expect(found, `the ${half} half`).not.toBeNull()
      return (found as HTMLElement).getBoundingClientRect()
    }
    const walk = rect('walk')
    const jump = rect('jump')
    for (const [label, r] of [
      ['walk', walk],
      ['jump', jump],
    ] as const) {
      expect(r.width, `${label} width`).toBeGreaterThanOrEqual(w * 0.4)
      expect(r.height, `${label} height`).toBeGreaterThanOrEqual(120)
      expect(r.left, `${label} left`).toBeGreaterThanOrEqual(0)
      expect(r.top, `${label} top`).toBeGreaterThanOrEqual(0)
      expect(r.right, `${label} right`).toBeLessThanOrEqual(w)
      expect(r.bottom, `${label} bottom`).toBeLessThanOrEqual(h)
    }
    expect(walk.right, 'the walking half is left of the jumping one').toBeLessThanOrEqual(jump.left + 1)
    await page.screenshot({ element: root, path: `__screenshots__/template-${name}.png` })
  })
}
