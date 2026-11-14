// The template's page in each real browser: it starts the game, shows a broken file in words, keeps a changed key, tells
// a keyboard player which keys to press, and gives a thumb whole buttons at every screen size.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { Player } from '#src/features/commands/commands.ts'
import { testHost } from '#src/features/host/host.ts'
import { Transform } from '#src/features/physics/physics.ts'
import { type Page, startPage } from '../../template/src/features/page/page.ts'
import style from '../../template/src/style.css?raw'
import { FRAME, key, run } from '../fixtures/game/co-op-game.ts'
import { type ManualFrames, manualFrames } from '../fixtures/game/frames.ts'
import { SCREENS } from '../fixtures/game/screens.ts'
import { readFiles, templateFiles } from './game.ts'

let root: HTMLElement
let started: Page | undefined
let sheet: HTMLStyleElement

beforeEach(() => {
  // The page's own stylesheet and element, so it is laid out as it is for a player.
  sheet = document.createElement('style')
  sheet.textContent = style
  document.head.append(sheet)
  root = document.createElement('main')
  root.id = 'game'
  document.body.append(root)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  started?.stop()
  started = undefined
  root.remove()
  sheet.remove()
  vi.restoreAllMocks()
})

/** Starts the page on the template's files, with frames driven by hand; the first frame has set the clock. */
async function open(
  options: { files?: Record<string, string>; host?: ReturnType<typeof testHost>; coarse?: boolean } = {},
): Promise<{ frames: ManualFrames; shown: Page }> {
  const frames = manualFrames()
  const shown = await startPage(root, {
    read: readFiles(options.files),
    host: options.host ?? testHost(),
    frames,
    coarse: options.coarse ?? false,
  })
  started = shown
  frames.at(0)
  return { frames, shown }
}

const heroX = (shown: Page): number => {
  const hero = shown.game?.sim.query(Player, Transform)[0]
  if (hero === undefined) throw new Error('There is no hero.')
  return hero.get(Transform).x
}

test('the page starts the game, and holding right moves the hero', async () => {
  await page.viewport(1280, 720)
  const { frames, shown } = await open()
  expect(root.dataset.state).toBe('playing')
  run(frames, 30)
  const before = heroX(shown)
  key('keydown', 'ArrowRight')
  run(frames, 30)
  key('keyup', 'ArrowRight')
  expect(heroX(shown)).toBeGreaterThan(before + 1)
})

test('a broken level is shown in words, in the page', async () => {
  const level = JSON.parse(templateFiles['content/levels/level-1.json'] ?? '') as { things: { x: unknown }[] }
  ;(level.things[0] as { x: unknown }).x = 'far'
  const { shown } = await open({ files: { 'content/levels/level-1.json': JSON.stringify(level) } })
  expect(shown.game).toBeUndefined()
  expect(root.dataset.state).toBe('problem')
  expect(root.textContent).toContain('This game has a problem and cannot start.')
  expect(root.textContent).toContain('content/levels/level-1.json: things[0].x: This must be a number.')
  expect(root.querySelector('canvas')).toBeNull()
})

test('a changed key is still there on a fresh page', async () => {
  const host = testHost()
  const first = await open({ host })
  expect(first.shown.game?.input.rebind('jump', 'keys', 'KeyK').ok).toBe(true)
  // The page saves the change by itself; give the store a moment to take it.
  await new Promise((done) => setTimeout(done, 20))
  first.shown.stop()

  const second = await open({ host })
  expect(second.shown.game?.input.controls().jump?.keys).toEqual(['KeyK'])
})

test('a keyboard player is told the keys, until they move', async () => {
  await page.viewport(1280, 720)
  const { frames } = await open()
  const hint = (): string | undefined => root.querySelector('.hint')?.textContent ?? undefined
  expect(hint()).toBe('Arrow keys to move. Space to jump.')
  key('keydown', 'ArrowRight')
  run(frames, 2)
  key('keyup', 'ArrowRight')
  expect(hint()).toBeUndefined()
})

test('a player with a finger on the screen is not told about keys', async () => {
  await page.viewport(390, 844)
  await open({ coarse: true })
  expect(root.querySelector('.hint')).toBeNull()
})

const frames2 = (): Promise<void> =>
  new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))

for (const [name, w, h] of SCREENS) {
  test(`on ${name} the touch buttons are whole and at least 48 pixels`, async () => {
    await page.viewport(w, h)
    expect([window.innerWidth, window.innerHeight]).toEqual([w, h])
    const { frames } = await open({ coarse: true })
    // A finger on the screen brings up the buttons, as it does for a player on a phone.
    window.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', bubbles: true }),
    )
    for (let i = 0; i < 30; i++) frames.advance(FRAME)
    await frames2()
    frames.advance(FRAME)

    for (const label of ['Left', 'Right', 'Jump']) {
      const button = [...root.querySelectorAll('button')].find((b) => b.textContent === label)
      expect(button, `a "${label}" button`).toBeDefined()
      const r = (button as HTMLButtonElement).getBoundingClientRect()
      expect(r.width, `${label} width`).toBeGreaterThanOrEqual(48)
      expect(r.height, `${label} height`).toBeGreaterThanOrEqual(48)
      expect(r.left, `${label} left`).toBeGreaterThanOrEqual(0)
      expect(r.top, `${label} top`).toBeGreaterThanOrEqual(0)
      expect(r.right, `${label} right`).toBeLessThanOrEqual(w)
      expect(r.bottom, `${label} bottom`).toBeLessThanOrEqual(h)
    }
    await page.screenshot({ element: root, path: `__screenshots__/template-${name}.png` })
  })
}
