// The two-thumb scheme on every screen a game is played on, in each real browser: the moves game is started with no
// controls and no plugins, a thumb is put on the glass with real pointer events, and the hero is watched through the
// sim. Each size says where the halves are, what a thumb does, that nothing the thumbs draw covers the hero, and
// photographs the hints for a person to look at.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { Player } from '#src/features/commands/commands.ts'
import { type Game, startGame } from '#src/features/game/game.ts'
import { type TestHost, testHost } from '#src/features/host/host.ts'
import { Body, Transform } from '#src/features/physics/physics.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { chosenLocale } from '../../fixtures/locale/chosen.ts'
import { DASH_BUZZ, movesScreenContent, paintedPictures } from '../../fixtures/moves/screen.ts'

const FRAME = 1000 / 60
const THUMBS_OVER_PX = 120

let mount: HTMLDivElement
let game: Game | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:hidden'
  document.body.append(mount)
  // A phone: the thumbs are on the page from the start.
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
})
afterEach(() => {
  game?.stop()
  game = undefined
  mount.remove()
  vi.restoreAllMocks()
})

interface Started {
  readonly g: Game
  readonly frames: ManualFrames
  readonly host: TestHost
}

/** The moves game on a screen of this size, with or without a camera, frames in hand and the page settled. */
async function begin(w: number, h: number, camera: boolean): Promise<Started> {
  await page.viewport(w, h)
  expect([window.innerWidth, window.innerHeight]).toEqual([w, h])
  const content = await movesScreenContent(camera ? { view: { w: 16, h: 9 } } : {})
  const frames = manualFrames()
  const host = testHost()
  const g = await startGame({
    content,
    locale: await chosenLocale(content, 'ko'),
    mount,
    host,
    frames,
    readPicture: paintedPictures(content),
  })
  game = g
  frames.at(0)
  run(frames, 60)
  return { g, frames, host }
}

const run = (frames: ManualFrames, n: number): void => {
  for (let i = 0; i < n; i++) frames.advance(FRAME)
}
const half = (name: 'walk' | 'jump'): HTMLElement => {
  const found = mount.querySelector<HTMLElement>(`.automata-thumb-half[data-half="${name}"]`)
  if (found === null) throw new Error(`no ${name} half`)
  return found
}
const finger = (el: Element, type: string, id: number, x: number, y: number): void => {
  el.dispatchEvent(
    new PointerEvent(type, {
      pointerId: id,
      pointerType: 'touch',
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
    }),
  )
}
/** The middle of a half, where a thumb would be. */
const middle = (el: HTMLElement): { x: number; y: number } => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
const hero = (g: Game): { x: number; y: number; vy: number } => {
  const found = g.sim.query(Player, Transform, Body)[0]
  if (found === undefined) throw new Error('no hero')
  return { x: found.get(Transform).x, y: found.get(Transform).y, vy: found.get(Body).vy }
}
/** The lowest point the hero reaches on screen over `n` frames, as the smallest y (y points down). */
const apexOver = (g: Game, frames: ManualFrames, n: number): number => {
  let top = hero(g).y
  for (let i = 0; i < n; i++) {
    frames.advance(FRAME)
    top = Math.min(top, hero(g).y)
  }
  return top
}

for (const [name, w, h] of SCREENS) {
  const upright = h > w && w < 600

  test(`${name}: both halves are inside the mount, and the band or the whole screen is theirs`, async () => {
    const { g } = await begin(w, h, true)
    const box = mount.getBoundingClientRect()
    const walk = half('walk').getBoundingClientRect()
    const jump = half('jump').getBoundingClientRect()
    for (const r of [walk, jump]) {
      expect(r.left).toBeGreaterThanOrEqual(box.left - 0.5)
      expect(r.right).toBeLessThanOrEqual(box.right + 0.5)
      expect(r.top).toBeGreaterThanOrEqual(box.top - 0.5)
      expect(r.bottom).toBeLessThanOrEqual(box.bottom + 0.5)
      expect(r.width).toBeGreaterThanOrEqual(box.width / 2 - 1)
    }
    expect(walk.left).toBeLessThan(jump.left)
    if (upright) {
      // The band under the level: a third of the screen, and the level above it.
      expect(g.input.inset()).toBeGreaterThan(h * 0.25)
      expect(walk.top).toBeGreaterThan(h * 0.6)
      const heroBox = g.heroes()[0]
      expect(heroBox).toBeDefined()
      expect((heroBox?.y ?? 0) + (heroBox?.h ?? 0)).toBeLessThanOrEqual(h - g.input.inset() + 1)
    } else {
      expect(g.input.inset()).toBe(0)
      expect(walk.height).toBeGreaterThanOrEqual(box.height - 1)
    }
  })

  test(`${name}: a thumb slid right walks the hero right, and lifted, it stops`, async () => {
    const { g, frames } = await begin(w, h, true)
    const at = middle(half('walk'))
    const from = hero(g).x
    finger(half('walk'), 'pointerdown', 1, at.x, at.y)
    finger(half('walk'), 'pointermove', 1, at.x + 40, at.y)
    run(frames, 40)
    const walked = hero(g).x
    expect(walked).toBeGreaterThan(from + 2)
    finger(half('walk'), 'pointerup', 1, at.x + 40, at.y)
    run(frames, 10)
    const stopped = hero(g).x
    run(frames, 30)
    expect(hero(g).x - stopped).toBeLessThan(0.1)
  })

  test(`${name}: a held thumb jumps higher than a tap`, async () => {
    const { g, frames } = await begin(w, h, true)
    const at = middle(half('jump'))
    const ground = hero(g).y
    finger(half('jump'), 'pointerdown', 2, at.x, at.y)
    frames.advance(FRAME)
    finger(half('jump'), 'pointerup', 2, at.x, at.y)
    const tapped = apexOver(g, frames, 70)
    run(frames, 40)
    finger(half('jump'), 'pointerdown', 3, at.x, at.y)
    const held = apexOver(g, frames, 70)
    finger(half('jump'), 'pointerup', 3, at.x, at.y)
    expect(tapped).toBeLessThan(ground - 0.5)
    expect(held).toBeLessThan(tapped - 0.5)
  })

  test(`${name}: the jump begins on the first tick after the thumb lands`, async () => {
    const { g, frames } = await begin(w, h, true)
    const at = middle(half('jump'))
    expect(hero(g).vy).toBeCloseTo(0, 1)
    finger(half('jump'), 'pointerdown', 4, at.x, at.y)
    frames.advance(FRAME)
    expect(hero(g).vy).toBeLessThan(-5)
    finger(half('jump'), 'pointerup', 4, at.x, at.y)
  })

  test(`${name}: a flick dashes, and the host is asked to buzz with the feel file's strength`, async () => {
    const { g, frames, host } = await begin(w, h, true)
    const at = middle(half('walk'))
    finger(half('walk'), 'pointerdown', 5, at.x, at.y)
    finger(half('walk'), 'pointermove', 5, at.x + 90, at.y)
    run(frames, 4)
    finger(half('walk'), 'pointerup', 5, at.x + 90, at.y)
    run(frames, 10)
    expect(g.sim.tick).toBeGreaterThan(60)
    // Three ticks at 60 a second is 50 milliseconds.
    expect(host.buzzes).toContainEqual({ strength: DASH_BUZZ.strength, ms: 50 })
  })

  test(`${name}: the dash button is 64 px, inside the mount and clear of the jump hint`, async () => {
    await begin(w, h, true)
    const box = mount.getBoundingClientRect()
    const buttons = [...mount.querySelectorAll<HTMLElement>('.automata-touch-button')]
    expect(buttons.length).toBeGreaterThan(0)
    const hinted = mount.querySelector<HTMLElement>('.automata-thumb-hint[data-hint="jump"]')
    const hint = hinted?.getBoundingClientRect()
    for (const b of buttons) {
      const r = b.getBoundingClientRect()
      expect(r.width).toBeGreaterThanOrEqual(64)
      expect(r.height).toBeGreaterThanOrEqual(64)
      expect(r.left).toBeGreaterThanOrEqual(box.left)
      expect(r.right).toBeLessThanOrEqual(box.right)
      expect(r.top).toBeGreaterThanOrEqual(box.top)
      expect(r.bottom).toBeLessThanOrEqual(box.bottom)
      if (hint !== undefined) {
        const sideways = r.right <= hint.left || r.left >= hint.right
        const stacked = r.bottom <= hint.top || r.top >= hint.bottom
        expect(sideways || stacked).toBe(true)
      }
    }
  })

  test(`${name}: the hero's box is clear of the bottom of the screen, and of the band`, async () => {
    const { g, frames } = await begin(w, h, true)
    const at = middle(half('walk'))
    finger(half('walk'), 'pointerdown', 6, at.x, at.y)
    finger(half('walk'), 'pointermove', 6, at.x + 40, at.y)
    for (let i = 0; i < 90; i++) {
      frames.advance(FRAME)
      const box = g.heroes()[0]
      if (box === undefined) continue
      const clear = upright ? g.input.inset() : THUMBS_OVER_PX
      expect(box.y + box.h, `frame ${i}`).toBeLessThanOrEqual(h - clear + 1)
    }
    finger(half('walk'), 'pointerup', 6, at.x + 40, at.y)
  })

  // Audit I4: a level with no camera is the whole level in one picture, so it is fitted above the thumbs.
  test(`${name}: the same level with no camera is fitted above the thumbs`, async () => {
    const { g, frames } = await begin(w, h, false)
    run(frames, 5)
    const box = g.heroes()[0]
    expect(box).toBeDefined()
    const clear = upright ? g.input.inset() : THUMBS_OVER_PX
    expect((box?.y ?? 0) + (box?.h ?? 0)).toBeLessThanOrEqual(h - clear + 1)
  })

  test(`${name}: a picture is saved, with the hints showing`, async () => {
    const { frames } = await begin(w, h, true)
    run(frames, 5)
    await page.screenshot({ element: mount, path: `__screenshots__/thumbs-${name}.png` })
    expect(mount.querySelector('.automata-thumb-hint')).not.toBeNull()
  })
}
