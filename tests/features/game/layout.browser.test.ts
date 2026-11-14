// The whole game on the screens it is played on, end to end in each real browser: the viewport is set to a real phone
// or tablet size, so the page is that size, and the picture and the touch buttons are measured and photographed.
// Sideways was once only seen cut off at 414 pixels, because the test page itself was 414 wide: so each test first says
// the page really has the size it asked for.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { type Game, startGame } from '#src/features/game/game.ts'
import { testHost } from '#src/features/host/host.ts'
import { coopFiles } from '../../fixtures/game/co-op.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { drawnRows } from '../../fixtures/game/pixels.ts'

const FRAME = 1000 / 60

/** A host that is always on screen: these tests drive the frames by hand. */
const visibleHost = testHost()

/** The screens: [name, width, height]. The names are the picture files a person looks at on the `ci-screens` branch. */
const SCREENS = [
  ['phone-390x844', 390, 844],
  ['tablet-820x1180', 820, 1180],
  ['phone-844x390', 844, 390],
  ['tablet-1180x820', 1180, 820],
] as const

let mount: HTMLDivElement
let game: Game | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  game?.stop()
  game = undefined
  mount.remove()
  vi.restoreAllMocks()
})

const frames2 = (): Promise<void> =>
  new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))

for (const [name, w, h] of SCREENS) {
  test(`on ${name} the picture fills the screen and every touch button can be pressed`, async () => {
    await page.viewport(w, h)
    expect([window.innerWidth, window.innerHeight]).toEqual([w, h])

    const frames = manualFrames()
    game = await startGame({
      content: await loadFixtureGame(),
      plugins: [heroPlugin],
      mount,
      controls: fixtureControls,
      host: visibleHost,
      frames,
    })
    // A finger on the screen brings up the buttons, as it does for a player on a phone.
    window.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', bubbles: true }),
    )
    frames.at(0)
    for (let i = 0; i < 30; i++) frames.advance(FRAME)
    // The buttons showing changes the room the picture has; let that settle, then draw once more.
    await frames2()
    frames.advance(FRAME)

    // The canvas is the whole screen, so no white shows beside or below the game.
    const canvas = mount.querySelector('canvas')
    expect(canvas).not.toBeNull()
    const box = (canvas as HTMLCanvasElement).getBoundingClientRect()
    expect([box.left, box.top, box.width, box.height]).toEqual([0, 0, w, h])

    // Every action has a button, whole on the screen, big enough for a thumb, and nothing sits on top of it.
    const rects: { label: string; top: number; left: number; right: number; bottom: number }[] = []
    for (const control of Object.values(fixtureControls)) {
      const button = [...mount.querySelectorAll('button')].find((b) => b.textContent === control.label)
      expect(button, `a "${control.label}" button`).toBeDefined()
      const r = (button as HTMLButtonElement).getBoundingClientRect()
      expect(r.width, `${control.label} width`).toBeGreaterThanOrEqual(48)
      expect(r.height, `${control.label} height`).toBeGreaterThanOrEqual(48)
      expect(r.left, `${control.label} left`).toBeGreaterThanOrEqual(0)
      expect(r.top, `${control.label} top`).toBeGreaterThanOrEqual(0)
      expect(r.right, `${control.label} right`).toBeLessThanOrEqual(w)
      expect(r.bottom, `${control.label} bottom`).toBeLessThanOrEqual(h)
      expect(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)).toBe(button)
      rects.push({ label: control.label, top: r.top, left: r.left, right: r.right, bottom: r.bottom })
    }
    for (const a of rects)
      for (const b of rects) {
        if (a.label >= b.label) continue
        const apart = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top
        expect(apart, `${a.label} and ${b.label} do not overlap`).toBe(true)
      }

    // The play area is clear of the buttons: the game ends above where the buttons begin.
    const drawn = drawnRows(canvas as HTMLCanvasElement)
    expect(drawn, 'the game drew something').toBeDefined()
    expect(drawn?.bottom).toBeLessThanOrEqual(Math.min(...rects.map((r) => r.top)) + 1)

    await page.screenshot({ element: mount, path: `__screenshots__/${name}.png` })
  })
}

// Two people on the screen add a hero, not a row of buttons: the level still ends above where the buttons begin.
for (const [name, w, h] of SCREENS) {
  test(`on ${name} with two players the level still ends above the touch buttons`, async () => {
    await page.viewport(w, h)
    expect([window.innerWidth, window.innerHeight]).toEqual([w, h])
    const frames = manualFrames()
    game = await startGame({
      content: await loadFixtureGame(coopFiles),
      plugins: [heroPlugin],
      mount,
      controls: fixtureControls,
      host: visibleHost,
      frames,
    })
    game.addPlayer('keyboard')
    window.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', bubbles: true }),
    )
    frames.at(0)
    for (let i = 0; i < 30; i++) frames.advance(FRAME)
    await frames2()
    frames.advance(FRAME)

    const canvas = mount.querySelector('canvas') as HTMLCanvasElement
    const tops = [...mount.querySelectorAll('button')].map((b) => b.getBoundingClientRect().top)
    expect(tops.length).toBeGreaterThan(0)
    const drawn = drawnRows(canvas)
    expect(drawn, 'the game drew something').toBeDefined()
    expect(drawn?.bottom).toBeLessThanOrEqual(Math.min(...tops) + 1)
  })
}
