// The new game, played the hard ways a stranger plays it: lost and tried again, at five sizes, restarted fifty times,
// hidden and shown, reloaded on every screen, with the address bar sliding, on a slow network, with a file that fails,
// with no sound, with garbage in the browser's storage, and swiped. The made game's own play test and `check --ship`
// close it. The made game is the one `made-game.ts` makes, served by its own `automata play`; nothing is waited for with
// a sleep, each wait is for something a person would see.
import { mkdirSync } from 'node:fs'
import type { Browser, BrowserContext, Page } from 'playwright'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { journeyEngines } from '../fixtures/journey-engines.ts'
import {
  ENGINES,
  heroX,
  intoTheLevel,
  type MadeGame,
  makeGame,
  markCoarse,
  type PageWindow,
  POLL,
  pickLanguage,
  runAutomata,
  runNpm,
  SIZES,
  type Size,
  serveGame,
  shots,
  stopGame,
  tickOf,
} from './made-game.ts'

let game: MadeGame
let address = ''

beforeAll(async () => {
  game = await makeGame('en')
  await serveGame(game)
  address = game.address
  mkdirSync(shots, { recursive: true })
}, 600_000)

afterAll(async () => {
  await stopGame(game)
})

/** Where the level's floor ends: the hero jumps from here to cross the gap, and the door is past it (the template's own). */
const JUMP_FROM_X = 6

const stateOf = (page: Page): Promise<string | undefined> =>
  page.evaluate(() => document.getElementById('game')?.dataset.state)
const attemptOf = async (page: Page): Promise<number> =>
  Number(await page.evaluate(() => document.getElementById('game')?.dataset.attempt))
const inState = (page: Page, state: string): Promise<unknown> =>
  page.locator(`#game[data-state="${state}"]`).waitFor({ timeout: 60_000 })

/** A page of its own at `size`, with a finger when the size is a touch screen. */
async function visit(
  browser: Browser,
  size: Size,
  extra: { readonly init?: () => void } = {},
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    locale: 'en-US',
    hasTouch: size.touch,
  })
  if (size.touch) await markCoarse(context)
  if (extra.init !== undefined) await context.addInitScript(extra.init)
  const page = await context.newPage()
  page.on('pageerror', (error) => console.log(`page error: ${error.message}`))
  return { context, page }
}

const PHONE: Size = { width: 390, height: 844, touch: true }
const DESKTOP: Size = { width: 1280, height: 720, touch: false }

/** The buttons and canvases of the game that are not wholly inside the screen. Safe-area insets are padding inside it. */
const outside = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const inside = (box: DOMRect): boolean =>
      box.left >= -0.5 &&
      box.top >= -0.5 &&
      box.right <= window.innerWidth + 0.5 &&
      box.bottom <= window.innerHeight + 0.5
    /** A button in a list that scrolls is reached by scrolling it, as long as the list itself is on the screen. */
    const inAList = (el: Element): boolean => {
      for (let up = el.parentElement; up !== null && up.id !== 'game'; up = up.parentElement) {
        const overflow = getComputedStyle(up).overflowY
        if ((overflow === 'auto' || overflow === 'scroll') && inside(up.getBoundingClientRect())) return true
      }
      return false
    }
    return [...document.querySelectorAll('#game button, #game canvas')]
      .filter((el) => !inAList(el))
      .map((el) => ({ name: el.textContent?.trim() || el.tagName, box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && !inside(box))
      .map(({ name }) => name)
  })

const finger = (id: number) =>
  ({ pointerType: 'touch', pointerId: id, isPrimary: true, bubbles: true }) as const

async function middleOf(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const box = await page.locator(selector).boundingBox()
  expect(box, `${selector} is on the screen`).not.toBeNull()
  return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 }
}

/** Starts walking right, by key or by a thumb slid right on the walking half. Returns how to stop. */
async function walkRight(page: Page, touch: boolean): Promise<() => Promise<void>> {
  if (!touch) {
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
async function jump(page: Page, touch: boolean): Promise<void> {
  if (!touch) {
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

/** Walks into the gap, and says when the level is lost. */
async function loseTheLevel(page: Page, touch: boolean): Promise<void> {
  const release = await walkRight(page, touch)
  await inState(page, 'lost')
  await release()
}

/** Walks to the gap, jumps it and reaches the door. */
async function winTheLevel(page: Page, touch: boolean): Promise<void> {
  const release = await walkRight(page, touch)
  await page.waitForFunction(
    (from) => {
      const current = (window as unknown as PageWindow).automataGame
      const hero = current?.sim.describeSnapshot().entities.find((e) => 'player' in e.components)
      return (hero?.components.transform?.x ?? 0) >= from
    },
    JUMP_FROM_X,
    { polling: 'raf', timeout: 30_000 },
  )
  await jump(page, touch)
  await inState(page, 'done')
  await release()
}

/** After a reload the visit goes on from what was kept: no language question, and the menu. */
async function backAtTheMenu(page: Page, where: string): Promise<void> {
  await inState(page, 'menu')
  expect(await page.locator('.automata-picker').count(), `${where}: the language is kept`).toBe(0)
  expect(
    await page.evaluate(() => document.documentElement.lang),
    `${where}: and the page says it`,
  ).toMatch(/^en/)
}

/** Counts the sound devices the page makes, without changing what they do. */
const countAudio = (): void => {
  const counted = window as unknown as { __audio: number }
  counted.__audio = 0
  for (const name of ['AudioContext', 'webkitAudioContext'] as const) {
    const Real = (window as unknown as Record<string, typeof AudioContext | undefined>)[name]
    if (Real === undefined) continue
    ;(window as unknown as Record<string, unknown>)[name] = new Proxy(Real, {
      construct(target, args, newTarget) {
        counted.__audio++
        return Reflect.construct(target, args, newTarget)
      },
    })
  }
}

for (const name of journeyEngines()) {
  const launch = (): Promise<Browser> => ENGINES[name].launch()

  test(`${name}: lose and try again, by touch and by keys`, async () => {
    const browser = await launch()
    try {
      for (const size of [PHONE, DESKTOP]) {
        const { context, page } = await visit(browser, size)
        try {
          await page.goto(address)
          await intoTheLevel(page, 'en')
          await page.evaluate(() => {
            ;(window as unknown as { visit: number }).visit = 1
          })
          const first = await attemptOf(page)
          await loseTheLevel(page, size.touch)
          expect(await page.locator('#game').innerText(), `${name} ${size.width}: it says so`).toContain(
            'You lost',
          )
          const again = page.locator('#game[data-state="lost"] [data-screen="lost"] button').first()
          const box = await again.boundingBox()
          expect(box?.height ?? 0, 'Try again is a primary target').toBeGreaterThanOrEqual(48)
          // By touch it is tapped; by keys it is the button that has the focus, so Enter presses it.
          if (size.touch) await again.tap()
          else await page.keyboard.press('Enter')
          await inState(page, 'playing')
          expect(await attemptOf(page), `${name} ${size.width}: a new attempt`).toBe(first + 1)
          expect(
            await page.evaluate(() => (window as unknown as { visit?: number }).visit),
            'the page was not loaded again',
          ).toBe(1)
          // And it plays again: the hero walks.
          await expect.poll(() => heroX(page), POLL).not.toBeNaN()
          const start = await heroX(page)
          const release = await walkRight(page, size.touch)
          await expect.poll(() => heroX(page), POLL).toBeGreaterThan(start + 0.5)
          await release()
        } finally {
          await context.close()
        }
      }
    } finally {
      await browser.close()
    }
  }, 300_000)

  test(`${name}: at each of five sizes every button and the canvas are inside the screen`, async () => {
    const browser = await launch()
    try {
      for (const size of SIZES) {
        const { context, page } = await visit(browser, size)
        const where = `${name} ${size.width}x${size.height}`
        try {
          await page.goto(address)
          await pickLanguage(page, 'en')
          await inState(page, 'menu')
          expect(await outside(page), `${where}: the menu`).toEqual([])
          await page.locator('#game[data-state="menu"] [data-screen="menu"] button').first().click()
          await inState(page, 'playing')
          await expect.poll(() => tickOf(page), POLL).toBeGreaterThanOrEqual(0)
          // The level waits for a first press, and says what to do: the start card.
          expect(await outside(page), `${where}: the level and its buttons`).toEqual([])
          await page.screenshot({ path: `${shots}${name}-start-${size.width}x${size.height}.png` })

          await page.keyboard.press('Escape')
          await inState(page, 'paused')
          expect(await outside(page), `${where}: the pause screen`).toEqual([])
          // How to play is a button of the pause screen.
          await page
            .locator('[data-screen="pause"]')
            .getByRole('button', { name: /how to play/i })
            .click()
          await page
            .locator('#game[data-over], #game [data-screen="how"]')
            .first()
            .waitFor({ timeout: 30_000 })
          expect(await outside(page), `${where}: how to play`).toEqual([])
          await page.screenshot({ path: `${shots}${name}-how-${size.width}x${size.height}.png` })
          await page.keyboard.press('Escape')
          await page.keyboard.press('Escape')
          await page.locator('#game[data-state="playing"]').waitFor({ timeout: 30_000 })

          await loseTheLevel(page, false)
          expect(await outside(page), `${where}: the lost screen`).toEqual([])
          await page.screenshot({ path: `${shots}${name}-lost-${size.width}x${size.height}.png` })
        } finally {
          await context.close()
        }
      }
    } finally {
      await browser.close()
    }
  }, 600_000)

  test(`${name}: fifty restarts, no reload, one canvas, as many things as the first start`, async () => {
    const browser = await launch()
    try {
      const { context, page } = await visit(browser, DESKTOP)
      try {
        await page.goto(address)
        await intoTheLevel(page, 'en')
        const things = (): Promise<number> =>
          page.evaluate(
            () =>
              (window as unknown as PageWindow).automataGame?.sim.describeSnapshot().entities.length ?? -1,
          )
        await page.evaluate(() => {
          ;(window as unknown as { visit: number }).visit = 1
        })
        const first = await things()
        expect(first, 'there are things in the level').toBeGreaterThan(0)
        // One canvas, or none where the browser has no graphics to give: the same number every time.
        const canvases = await page.locator('#game canvas').count()
        expect(canvases, 'at most one canvas').toBeLessThanOrEqual(1)
        let attempt = await attemptOf(page)
        for (let n = 1; n <= 50; n++) {
          await page.keyboard.press('Escape')
          await inState(page, 'paused')
          await page
            .locator('[data-screen="pause"]')
            .getByRole('button', { name: /start again/i })
            .click()
          await page.locator('[role="alertdialog"] button').first().click()
          await inState(page, 'playing')
          expect(await attemptOf(page), `restart ${n}`).toBe(attempt + 1)
          attempt += 1
          expect(await page.locator('#game canvas').count(), `restart ${n}: the same canvas`).toBe(canvases)
          expect(await things(), `restart ${n}: the same things`).toBe(first)
        }
        expect(
          await page.evaluate(() => (window as unknown as { visit?: number }).visit),
          'the page was not loaded again',
        ).toBe(1)
      } finally {
        await context.close()
      }
    } finally {
      await browser.close()
    }
  }, 600_000)

  test(`${name}: the page is hidden and shown in the middle of a level, and play goes on`, async () => {
    const browser = await launch()
    try {
      const { context, page } = await visit(browser, DESKTOP)
      try {
        await page.goto(address)
        await intoTheLevel(page, 'en')
        const release = await walkRight(page, false)
        await expect.poll(() => tickOf(page), POLL).toBeGreaterThan(5)
        const set = (hidden: boolean): Promise<void> =>
          page.evaluate((now) => {
            Object.defineProperty(document, 'visibilityState', {
              get: () => (now ? 'hidden' : 'visible'),
              configurable: true,
            })
            document.dispatchEvent(new Event('visibilitychange'))
          }, hidden)
        await set(true)
        // Nothing runs while the page is hidden: the count does not move.
        const held = await tickOf(page)
        await page.waitForTimeout(500)
        expect(await tickOf(page), 'no tick while hidden').toBe(held)
        await set(false)
        // A game that paused itself is let go with Keep playing; either way it plays on.
        if ((await stateOf(page)) === 'paused')
          await page.locator('[data-screen="pause"] button').first().click()
        await expect.poll(() => tickOf(page), POLL).toBeGreaterThan(held)
        await release()
      } finally {
        await context.close()
      }
    } finally {
      await browser.close()
    }
  }, 300_000)

  test(`${name}: a reload on every screen goes on from the saved settings and games`, async () => {
    const browser = await launch()
    try {
      const { context, page } = await visit(browser, DESKTOP)
      try {
        await page.goto(address)
        // The picker: nothing is kept yet, so it is asked again.
        await page.locator('.automata-picker-go').waitFor({ state: 'visible', timeout: 30_000 })
        await page.reload()
        await page.locator('.automata-picker-go').waitFor({ state: 'visible', timeout: 30_000 })
        // Straight after Go, on the splash, or before it is over.
        await pickLanguage(page, 'en')
        await page.reload()
        await backAtTheMenu(page, 'after Go')
        // The menu.
        await page.reload()
        await backAtTheMenu(page, 'menu')
        // Playing.
        await page.locator('#game[data-state="menu"] [data-screen="menu"] button').first().click()
        await inState(page, 'playing')
        await page.reload()
        await backAtTheMenu(page, 'playing')
        // Paused, then settings from the pause screen.
        await page.locator('#game[data-state="menu"] [data-screen="menu"] button').first().click()
        await inState(page, 'playing')
        await page.keyboard.press('Escape')
        await inState(page, 'paused')
        await page.reload()
        await backAtTheMenu(page, 'paused')
        await page.locator('#game[data-state="menu"] [data-screen="menu"] button').first().click()
        await inState(page, 'playing')
        await page.keyboard.press('Escape')
        await inState(page, 'paused')
        await page
          .locator('[data-screen="pause"]')
          .getByRole('button', { name: /settings/i })
          .click()
        await page.locator('#game[data-over="settings"]').waitFor({ timeout: 30_000 })
        await page.reload()
        await backAtTheMenu(page, 'settings')
        // Lost.
        await page.locator('#game[data-state="menu"] [data-screen="menu"] button').first().click()
        await inState(page, 'playing')
        await loseTheLevel(page, false)
        await page.reload()
        await backAtTheMenu(page, 'lost')
        // Done.
        await page.locator('#game[data-state="menu"] [data-screen="menu"] button').first().click()
        await inState(page, 'playing')
        await winTheLevel(page, false)
        await page.reload()
        await backAtTheMenu(page, 'done')
        expect(await stateOf(page)).toBe('menu')
      } finally {
        await context.close()
      }
    } finally {
      await browser.close()
    }
  }, 600_000)

  test(`${name}: the address bar slides by 80 pixels and everything still fits`, async () => {
    const browser = await launch()
    try {
      const { context, page } = await visit(browser, PHONE)
      try {
        await page.goto(address)
        await intoTheLevel(page, 'en')
        for (const height of [PHONE.height - 80, PHONE.height, PHONE.height - 80]) {
          await page.setViewportSize({ width: PHONE.width, height })
          await page.waitForFunction((h) => window.innerHeight === h, height)
          // A frame after the resize, so the page has laid itself out again.
          await page.evaluate(
            () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
          )
          expect(await outside(page), `height ${height}: playing`).toEqual([])
          await page.keyboard.press('Escape')
          await inState(page, 'paused')
          expect(await outside(page), `height ${height}: paused`).toEqual([])
          await page.locator('[data-screen="pause"] button').first().click()
          await inState(page, 'playing')
        }
      } finally {
        await context.close()
      }
    } finally {
      await browser.close()
    }
  }, 300_000)

  test(`${name}: on a slow network the bar shows, then the slow line, then the game`, async () => {
    const browser = await launch()
    try {
      const { context, page } = await visit(browser, PHONE)
      try {
        // The first file is held back for longer than the game waits before it says so.
        await page.route('**/automata.toml', async (route) => {
          await new Promise((done) => setTimeout(done, 12_000))
          await route.continue()
        })
        await page.goto(address, { waitUntil: 'commit' })
        await page.locator('#game [role="progressbar"]').waitFor({ state: 'attached', timeout: 30_000 })
        await expect
          .poll(
            async () => ((await page.locator('#game [role="status"]').first().textContent()) ?? '').trim(),
            POLL,
          )
          .not.toBe('')
        await page.locator('.automata-picker-go').waitFor({ state: 'visible', timeout: 60_000 })
        expect(
          await page.locator('#game [role="progressbar"]').count(),
          'the bar is gone when the game is there',
        ).toBe(0)
      } finally {
        await context.close()
      }
    } finally {
      await browser.close()
    }
  }, 300_000)

  test(`${name}: a content file that fails once is tried again; one that always fails says so, with a button`, async () => {
    const browser = await launch()
    try {
      const once = await visit(browser, DESKTOP)
      try {
        let seen = 0
        await once.page.route('**/content/levels/level-1.json', async (route) => {
          seen++
          if (seen === 1) await route.abort()
          else await route.continue()
        })
        await once.page.goto(address)
        await intoTheLevel(once.page, 'en')
        expect(seen, 'the file was asked for again').toBeGreaterThan(1)
      } finally {
        await once.context.close()
      }
      const always = await visit(browser, DESKTOP)
      try {
        await always.page.route('**/content/levels/level-1.json', (route) => route.abort())
        await always.page.goto(address)
        const button = always.page.locator(
          '#game[data-state="problem"] [role="alert"] button, #game[data-state="problem"] button',
        )
        await button.first().waitFor({ state: 'visible', timeout: 60_000 })
        const box = await button.first().boundingBox()
        expect(box?.height ?? 0, 'the button is a target').toBeGreaterThanOrEqual(44)
      } finally {
        await always.context.close()
      }
    } finally {
      await browser.close()
    }
  }, 300_000)

  test(`${name}: no sound before the first tap, and the level is won with the sound off`, async () => {
    const browser = await launch()
    try {
      const quiet = await visit(browser, DESKTOP, { init: countAudio })
      try {
        await quiet.page.goto(address)
        await quiet.page.locator('.automata-picker-go').waitFor({ state: 'visible', timeout: 30_000 })
        expect(
          await quiet.page.evaluate(() => (window as unknown as { __audio: number }).__audio),
          'no sound was made before a tap',
        ).toBe(0)
        await pickLanguage(quiet.page, 'en')
        await inState(quiet.page, 'menu')
        await quiet.page.locator('[data-screen="menu"] button').first().click()
        await inState(quiet.page, 'playing')
        // Sound off, from the pause screen, when the game has the switch.
        await quiet.page.keyboard.press('Escape')
        await inState(quiet.page, 'paused')
        const sound = quiet.page.locator('[data-screen="pause"] [role="switch"]')
        if ((await sound.count()) > 0) {
          if ((await sound.first().getAttribute('aria-checked')) === 'true') await sound.first().click()
          expect(await sound.first().getAttribute('aria-checked'), 'the switch is off').toBe('false')
        }
        await quiet.page.locator('[data-screen="pause"] button').first().click()
        await inState(quiet.page, 'playing')
        await winTheLevel(quiet.page, false)
      } finally {
        await quiet.context.close()
      }
    } finally {
      await browser.close()
    }
  }, 300_000)

  test(`${name}: garbage under the game's keys in storage, and the game opens and plays`, async () => {
    const browser = await launch()
    try {
      const { context, page } = await visit(browser, DESKTOP)
      try {
        await page.goto(address)
        await intoTheLevel(page, 'en')
        const garbled = await page.evaluate(() => {
          const junk = ['{"broken":', 'null', '[1,2', '"text"', '99999999999999999999', '', '{}', '[]']
          let count = 0
          for (let at = 0; at < localStorage.length; at++) {
            const key = localStorage.key(at)
            if (key === null) continue
            localStorage.setItem(key, junk[at % junk.length] ?? '')
            count++
          }
          return count
        })
        expect(garbled, 'the game keeps something in storage').toBeGreaterThan(0)
        await page.reload()
        // The language may be asked again; either way the level opens.
        await page
          .locator('.automata-picker-go, #game[data-state="menu"]')
          .first()
          .waitFor({ timeout: 60_000 })
        if ((await page.locator('.automata-picker-go').count()) > 0) await pickLanguage(page, 'en')
        await page.locator('#game[data-state="menu"] [data-screen="menu"] button').first().click()
        await inState(page, 'playing')
        await expect.poll(() => heroX(page), POLL).not.toBeNaN()
        const start = await heroX(page)
        const release = await walkRight(page, false)
        await expect.poll(() => heroX(page), POLL).toBeGreaterThan(start + 0.5)
        await release()
      } finally {
        await context.close()
      }
    } finally {
      await browser.close()
    }
  }, 300_000)

  test(`${name}: a swipe on the game at phone size does not move the page`, async () => {
    const browser = await launch()
    try {
      const { context, page } = await visit(browser, PHONE)
      try {
        await page.goto(address)
        await intoTheLevel(page, 'en')
        const room = await page.evaluate(() => ({
          scrolls: document.documentElement.scrollHeight - document.documentElement.clientHeight,
          wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }))
        expect(room.scrolls, 'the page is no taller than the screen').toBeLessThanOrEqual(1)
        expect(room.wide, 'and no wider').toBeLessThanOrEqual(1)
        await page.evaluate(() => window.scrollTo(0, 500))
        await page.mouse.wheel(0, 400)
        await page.keyboard.press('PageDown')
        expect(await page.evaluate(() => window.scrollY), 'the page did not scroll').toBe(0)
        if (name === 'chromium') {
          // A real finger's swipe, through the browser's own touch input.
          const session = await context.newCDPSession(page)
          const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', y: number): Promise<unknown> =>
            session.send('Input.dispatchTouchEvent', {
              type,
              touchPoints: type === 'touchEnd' ? [] : [{ x: PHONE.width / 2, y, id: 1 }],
            })
          await send('touchStart', 600)
          for (let y = 560; y >= 200; y -= 40) await send('touchMove', y)
          await send('touchEnd', 200)
          expect(await page.evaluate(() => window.scrollY), 'a swipe did not move the page').toBe(0)
          expect(await outside(page), 'and everything is still on the screen').toEqual([])
        }
      } finally {
        await context.close()
      }
    } finally {
      await browser.close()
    }
  }, 300_000)
}

test("the game's own play test passes: npm run build, then npm run play-test", () => {
  runNpm(game, 'run', 'build')
  runNpm(game, 'run', 'play-test')
}, 900_000)

test('automata check --ship on the untouched game passes, and prints the list to try by hand', () => {
  // Exit code 0, or this throws with what it printed.
  const printed = runAutomata(game, 'check', '--ship')
  expect(printed).toContain('In five seconds, is it clear what to do?')
  expect(printed, 'a new game wins and loses').not.toMatch(/neither won nor lost/i)
  expect(printed, 'and says its goal').not.toMatch(/goal line/i)
  const report = JSON.parse(runAutomata(game, 'check', '--ship', '--json')) as {
    ok: boolean
    byHand?: readonly string[]
  }
  expect(report.ok).toBe(true)
  expect(report.byHand?.length ?? 0, 'the list is in the report').toBeGreaterThan(0)
}, 300_000)
