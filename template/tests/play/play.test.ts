// The built game, played in Chromium and WebKit the way a player does: on a phone by touch, and on a desktop by keys. It
// reads the game only as a player and an agent can: the page's `data-state` and `data-attempt`, what is on the screen,
// and `window.automataGame`. It holds no hash and no position of the hero, only two numbers about the level, below.
//
// If you redraw level-1, change these two (in tiles, counted from the left edge of the level):
//   JUMP_FROM_X: where the hero jumps over the gap. Put it a tile before the gap's edge, never at the edge: a page that is
//                playing in real time reads the hero's place a few ticks late, so a jump at the edge could come too late.
//   DOOR_X:      where the door is.
import { type Browser, type BrowserType, chromium, type Page, webkit } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { serveBuilt } from './serve.ts'

const JUMP_FROM_X = 6
const DOOR_X = 13.5

const PROFILES = [
  { name: 'phone, by touch', width: 390, height: 844, touch: true },
  { name: 'desktop, by keys', width: 1280, height: 720, touch: false },
] as const
type Profile = (typeof PROFILES)[number]

const ENGINES: readonly (readonly [string, BrowserType])[] = [
  ['chromium', chromium],
  ['webkit', webkit],
]

interface PlayWindow {
  automataGame?: { sim: { describeSnapshot(): { entities: { components: Record<string, { x?: number }> }[] } } }
}

/** The hero's x in tiles, read from the running game; NaN while there is none. */
const heroX = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const game = (window as unknown as PlayWindow).automataGame
    const hero = game?.sim.describeSnapshot().entities.find((entity) => 'player' in entity.components)
    return hero?.components.transform?.x ?? Number.NaN
  })

/** Where the visit is: the page's own `data-state`. */
const stateOf = (page: Page): Promise<string | undefined> =>
  page.evaluate(() => document.getElementById('game')?.dataset.state)

const inState = (page: Page, state: string): Promise<unknown> =>
  page.locator(`#game[data-state="${state}"]`).waitFor({ timeout: 60_000 })

/** A first visit: the language picker, then Go, the splash, and the menu. */
async function toTheMenu(page: Page, address: string): Promise<void> {
  await page.goto(address)
  await inState(page, 'picking')
  await page.locator(".automata-flag[data-language='en']").click()
  await page.locator('.automata-picker-go').click()
  await inState(page, 'menu')
}

/** The menu's first button is Play. The level then waits for the first press. */
async function play(page: Page): Promise<void> {
  await page.locator('#game[data-state="menu"] [data-screen="menu"] button').first().click()
  await inState(page, 'playing')
  await expect.poll(() => heroX(page), { timeout: 30_000 }).not.toBeNaN()
}

/** What a thumb is: a touch pointer, with its own number. */
const finger = (id: number) => ({ pointerType: 'touch', pointerId: id, isPrimary: true, bubbles: true }) as const

/** The middle of an element of the page. */
async function middleOf(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const box = await page.locator(selector).boundingBox()
  expect(box, `${selector} is on the screen`).not.toBeNull()
  return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 }
}

/** Starts walking right: the arrow key, or a thumb slid right on the walking half. Returns how to stop. */
async function walkRight(page: Page, profile: Profile): Promise<() => Promise<void>> {
  if (!profile.touch) {
    await page.keyboard.down('ArrowRight')
    return () => page.keyboard.up('ArrowRight')
  }
  const at = await middleOf(page, "[data-half='walk']")
  const walk = page.locator("[data-half='walk']")
  await walk.dispatchEvent('pointerdown', { ...finger(7), clientX: at.x, clientY: at.y })
  await walk.dispatchEvent('pointermove', { ...finger(7), clientX: at.x + 80, clientY: at.y })
  return () => walk.dispatchEvent('pointerup', { ...finger(7), clientX: at.x + 80, clientY: at.y })
}

/** One jump: the space bar, or a thumb on the jumping half, held for a moment. */
async function jump(page: Page, profile: Profile): Promise<void> {
  if (!profile.touch) {
    await page.keyboard.down('Space')
    await page.waitForTimeout(400)
    await page.keyboard.up('Space')
    return
  }
  const at = await middleOf(page, "[data-half='jump']")
  const half = page.locator("[data-half='jump']")
  await half.dispatchEvent('pointerdown', { ...finger(8), clientX: at.x, clientY: at.y })
  await page.waitForTimeout(400)
  await half.dispatchEvent('pointerup', { ...finger(8), clientX: at.x, clientY: at.y })
}

for (const [engine, type] of ENGINES) {
  describe(engine, () => {
    let browser: Browser | undefined
    let address = ''
    let stop: () => Promise<void> = () => Promise.resolve()
    beforeAll(async () => {
      const served = await serveBuilt()
      address = served.address
      stop = served.stop
      browser = await type.launch()
    })
    afterAll(async () => {
      await browser?.close()
      await stop()
    })

    /** A new visit: a page of its own, at the profile's size, with a finger or without. */
    async function visit(profile: Profile): Promise<{ page: Page; close: () => Promise<void> }> {
      if (browser === undefined) throw new Error('The browser did not start.')
      const context = await browser.newContext({
        viewport: { width: profile.width, height: profile.height },
        locale: 'en-US',
        hasTouch: profile.touch,
        isMobile: profile.touch,
      })
      return { page: await context.newPage(), close: () => context.close() }
    }

    for (const profile of PROFILES) {
      describe(profile.name, () => {
        test('the game opens: a first visit reaches the menu, and nothing is outside the screen', async () => {
          const { page, close } = await visit(profile)
          try {
            await toTheMenu(page, address)
            const outside = await page.evaluate(() =>
              [...document.querySelectorAll('#game button, #game canvas')]
                .map((el) => ({ name: el.textContent?.trim() || el.tagName, box: el.getBoundingClientRect() }))
                .filter(
                  ({ box }) =>
                    box.width > 0 &&
                    (box.left < -0.5 ||
                      box.top < -0.5 ||
                      box.right > window.innerWidth + 0.5 ||
                      box.bottom > window.innerHeight + 0.5),
                )
                .map(({ name }) => name),
            )
            expect(outside, 'what is outside the screen').toEqual([])
            await page.locator('#game[data-state="menu"] [data-screen="menu"] button').first().waitFor()
          } finally {
            await close()
          }
        })

        test('Play: the hero reaches the door and the game says Well done', async () => {
          const { page, close } = await visit(profile)
          try {
            await toTheMenu(page, address)
            await play(page)
            const release = await walkRight(page, profile)
            await page.waitForFunction(
              (from) => {
                const game = (window as unknown as PlayWindow).automataGame
                const hero = game?.sim.describeSnapshot().entities.find((e) => 'player' in e.components)
                return (hero?.components.transform?.x ?? 0) >= from
              },
              JUMP_FROM_X,
              { polling: 'raf', timeout: 30_000 },
            )
            await jump(page, profile)
            await inState(page, 'done')
            await release()
            expect(await stateOf(page)).toBe('done')
            expect(await page.locator('#game').innerText()).toContain('Well done')
            expect(DOOR_X, 'the door is in the level').toBeGreaterThan(JUMP_FROM_X)
          } finally {
            await close()
          }
        })

        test('walk into the gap: You lost; Try again plays again without the page loading again', async () => {
          const { page, close } = await visit(profile)
          try {
            await toTheMenu(page, address)
            await play(page)
            await page.evaluate(() => {
              ;(window as unknown as { visit: number }).visit = 1
            })
            const first = await page.evaluate(() => document.getElementById('game')?.dataset.attempt)
            const release = await walkRight(page, profile)
            await inState(page, 'lost')
            await release()
            expect(await page.locator('#game').innerText()).toContain('You lost')
            await page.locator('#game[data-state="lost"] [data-screen="lost"] button').first().click()
            await inState(page, 'playing')
            const second = await page.evaluate(() => document.getElementById('game')?.dataset.attempt)
            expect(Number(second)).toBe(Number(first) + 1)
            expect(
              await page.evaluate(() => (window as unknown as { visit?: number }).visit),
              'the page was not loaded again',
            ).toBe(1)
          } finally {
            await close()
          }
        })
      })
    }
  })
}
