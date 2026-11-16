// The README's new game in real browsers: made from the packed package the way "Start here" says, served by the game's own
// `automata play`, then played in Chromium, WebKit and Firefox at a phone, a tablet and a desktop size, upright and
// sideways. Nothing is waited for with a sleep; each wait is for something a person would see.
// The setup is `made-game.ts`, which the checklist journey shares.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Browser, chromium } from 'playwright'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { journeyEngines } from '../fixtures/journey-engines.ts'
import {
  ENGINES,
  heroX,
  heroY,
  intoTheLevel,
  type MadeGame,
  makeGame,
  markCoarse,
  type PageWindow,
  POLL,
  pickLanguage,
  playFromMenu,
  runAutomata,
  SIZES,
  serveGame,
  shots,
  sparksTaken,
  stopGame,
  tickOf,
} from './made-game.ts'

let game: MadeGame
let gameFolder = ''
let level = ''
let address = ''

beforeAll(async () => {
  // Written in Spanish, so the words that nobody has read are in the other five.
  game = await makeGame('es')
  gameFolder = game.gameFolder
  level = game.level
  // The game says what it checks, lists the words nobody has read (against Spanish, the language it is written in)
  // and keeps a language marked read, before the browsers see it.
  const automata = (...args: string[]): string => runAutomata(game, ...args)
  expect((JSON.parse(automata('check', '--json')) as { ok: boolean }).ok, 'a new game is sound').toBe(true)
  const listed = JSON.parse(automata('words', '--json')) as { source: string; unread: { language: string }[] }
  expect(listed.source).toBe('es')
  expect(listed.unread.some((word) => word.language === 'en')).toBe(true)
  automata('words', '--read', 'pt')
  const marked = JSON.parse(automata('words', '--json')) as { unread: { language: string }[] }
  expect(marked.unread.some((word) => word.language === 'pt')).toBe(false)
  const again = JSON.parse(automata('check', '--json')) as { ok: boolean }
  expect(again.ok, 'and sound after marking').toBe(true)
  await serveGame(game)
  address = game.address
  mkdirSync(shots, { recursive: true })
}, 600_000)

afterAll(async () => {
  await stopGame(game)
})

for (const name of journeyEngines()) {
  test(`${name}: a new game plays by key and by touch, and a broken file is put in words`, async () => {
    const browser: Browser = await ENGINES[name].launch()
    try {
      for (const size of SIZES) {
        const context = await browser.newContext({ viewport: { width: size.width, height: size.height } })
        // A touch screen as the game's own question sees it: a coarse pointer.
        if (size.touch) await markCoarse(context)
        const page = await context.newPage()
        const where = `${name} ${size.width}x${size.height}`
        page.on('console', (message) => console.log(`[${where}] ${message.type()}: ${message.text()}`))
        page.on('pageerror', (error) => console.log(`[${where}] page error: ${error.message}`))
        // The hero is drawn from its painted picture, which `create` made: the page asks for it, and the server has it.
        const pictures: string[] = []
        page.on('response', (response) => {
          if (response.url().endsWith('/content/figures/hero.png') && response.ok())
            pictures.push(response.url())
        })
        await page.goto(address)
        // The picker is first: six flags, each whole on this screen, and the game has not started.
        const flags = page.locator('.automata-flag')
        await page.locator('.automata-picker-go').waitFor({ state: 'visible', timeout: 30_000 })
        expect(await flags.count(), `${where}: six flags`).toBe(6)
        for (let at = 0; at < 6; at++) {
          const box = await flags.nth(at).boundingBox()
          expect(box, `${where}: flag ${at} is on the screen`).not.toBeNull()
          if (box !== null) {
            expect(box.x, where).toBeGreaterThanOrEqual(0)
            expect(box.y, where).toBeGreaterThanOrEqual(0)
            expect(box.x + box.width, where).toBeLessThanOrEqual(size.width)
            expect(box.y + box.height, where).toBeLessThanOrEqual(size.height)
          }
        }
        await page.screenshot({ path: `${shots}${name}-picker-${size.width}x${size.height}.png` })
        await intoTheLevel(page, 'en')

        // The game is on screen, and it waits: a level does not start until the first press.
        expect(pictures.length, `${where}: the hero's picture was fetched`).toBeGreaterThan(0)
        expect(await tickOf(page), `${where}: the level waits for the first press`).toBe(0)

        // The new game has a spark to take: the level lists it, and the game has put every one of its things on the screen.
        const listed = (JSON.parse(readFileSync(level, 'utf8')) as { things: { character: string }[] }).things
        expect(
          listed.some((thing) => thing.character === 'spark'),
          `${where}: the level has a spark`,
        ).toBe(true)
        const placed = await page.evaluate(
          () =>
            (window as unknown as PageWindow).automataGame?.sim
              .describeSnapshot()
              .entities.filter((entity) => 'thing' in entity.components).length ?? 0,
        )
        expect(placed, `${where}: the level's things are in the game`).toBeGreaterThanOrEqual(listed.length)

        // The way to the spark: holding right moves the hero right (by the arrow key, or by a thumb slid right on the
        // walking half) until the spark is taken and the game's count says so, then a jump lifts the hero off the floor
        // (the space bar, or a thumb on the jump half).
        const start = await heroX(page)
        expect(await sparksTaken(page), `${where}: no spark is taken before the hero moves`).toBe(0)
        const floor = await heroY(page)
        if (size.touch) {
          const walk = { pointerType: 'touch', pointerId: 7, isPrimary: true, bubbles: true } as const
          const half = page.locator("[data-half='walk']")
          const box = await half.boundingBox()
          expect(box, `${where}: the walking half is on the screen`).not.toBeNull()
          const x = (box?.x ?? 0) + (box?.width ?? 0) / 2
          const y = (box?.y ?? 0) + (box?.height ?? 0) / 2
          await half.dispatchEvent('pointerdown', { ...walk, clientX: x, clientY: y })
          await half.dispatchEvent('pointermove', { ...walk, clientX: x + 80, clientY: y })
          await expect.poll(() => heroX(page), POLL).toBeGreaterThan(start + 0.5)
          await expect.poll(() => sparksTaken(page), POLL).toBe(1)
          await half.dispatchEvent('pointerup', { ...walk, clientX: x + 80, clientY: y })
          const jump = { pointerType: 'touch', pointerId: 8, isPrimary: true, bubbles: true } as const
          const upper = page.locator("[data-half='jump']")
          const at = await upper.boundingBox()
          expect(at, `${where}: the jumping half is on the screen`).not.toBeNull()
          const jx = (at?.x ?? 0) + (at?.width ?? 0) / 2
          const jy = (at?.y ?? 0) + (at?.height ?? 0) / 2
          await upper.dispatchEvent('pointerdown', { ...jump, clientX: jx, clientY: jy })
          await expect.poll(async () => Math.abs((await heroY(page)) - floor), POLL).toBeGreaterThan(0.5)
          await upper.dispatchEvent('pointerup', { ...jump, clientX: jx, clientY: jy })
        } else {
          await page.keyboard.down('ArrowRight')
          await expect.poll(() => heroX(page), POLL).toBeGreaterThan(start + 0.5)
          await expect.poll(() => sparksTaken(page), POLL).toBe(1)
          await page.keyboard.up('ArrowRight')
          await page.keyboard.down('Space')
          await expect.poll(async () => Math.abs((await heroY(page)) - floor), POLL).toBeGreaterThan(0.5)
          await page.keyboard.up('Space')
        }
        await page.screenshot({ path: `${shots}${name}-${size.width}x${size.height}.png` })

        // A broken level file is put in words, in the page; put back, the game plays again.
        if (size.width === 1280) {
          const original = readFileSync(level, 'utf8')
          const broken = JSON.parse(original) as { things: { x: unknown }[] }
          const first = broken.things[0]
          if (first === undefined) throw new Error('The level has no crate.')
          first.x = 'far'
          writeFileSync(level, JSON.stringify(broken, null, 2))
          try {
            await page.reload()
            const problem = page.locator('#game[data-state="problem"] [role="alert"]')
            await expect.poll(() => problem.count(), POLL).toBe(1)
            const words = (await problem.textContent()) ?? ''
            expect(words, where).toContain('content/levels/level-1.json: things[0].x: This must be a number.')
            expect(words, where).toContain('Fix the file named above')
          } finally {
            writeFileSync(level, original)
          }
          await page.reload()
          await playFromMenu(page)

          // A player whose device speaks Japanese is spoken to in Japanese, and the page says it is Japanese.
          const japanese = await browser.newContext({
            viewport: { width: size.width, height: size.height },
            locale: 'ja-JP',
          })
          try {
            const other = await japanese.newPage()
            await other.goto(address)
            await pickLanguage(other, 'ja')
            const told = other.locator('[data-screen="menu"] button').first()
            await expect.poll(() => told.textContent(), POLL).toContain('プレイ')
            expect(await other.evaluate(() => document.documentElement.lang), where).toBe('ja')
          } finally {
            await japanese.close()
          }
        }
        await context.close()
      }
    } finally {
      await browser.close()
    }
  }, 600_000)
}

// A player whose device speaks a language the framework has no words in is not given one: six flags, none chosen, and
// Go waits until one is. The choice is kept, so the next visit does not ask again.
for (const name of journeyEngines()) {
  test(`${name}: a player whose language is not shipped chooses one, and is not asked again`, async () => {
    const browser: Browser = await ENGINES[name].launch()
    try {
      const french = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'fr-FR' })
      try {
        const page = await french.newPage()
        await page.goto(address)
        const go = page.locator('.automata-picker-go')
        await go.waitFor({ state: 'visible', timeout: 30_000 })
        const flags = page.locator('.automata-flag')
        expect(await flags.count()).toBe(6)
        expect(await page.locator('.automata-flag[aria-pressed="true"]').count(), 'none is chosen').toBe(0)
        expect(((await page.locator('.automata-picker').textContent()) ?? '').trim(), 'no letters').toBe('')
        // Go says it is disabled, so Playwright is told to press it anyway: a person's finger would.
        await go.click({ force: true })
        expect(await go.isVisible(), 'Go does nothing before a flag is chosen').toBe(true)
        expect(await tickOf(page)).toBe(-1)

        await page.locator('.automata-flag[data-language="ko"]').click()
        await expect
          .poll(() => page.locator('.automata-picker-title').textContent(), POLL)
          .toContain('한국어로 플레이')
        await go.click()
        await playFromMenu(page)
        expect(await page.evaluate(() => document.documentElement.lang)).toBe('ko')

        await page.reload()
        await playFromMenu(page)
        expect(await page.locator('.automata-picker').count(), 'a kept language is not asked again').toBe(0)
      } finally {
        await french.close()
      }
    } finally {
      await browser.close()
    }
  }, 300_000)

  test(`${name}: Back pauses a level and Escape pauses it too, and the page is not left`, async () => {
    const browser: Browser = await ENGINES[name].launch()
    try {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'en-US' })
      try {
        const page = await context.newPage()
        await page.goto(address)
        await intoTheLevel(page, 'en')
        await page.goBack()
        await page.locator('#game[data-state="paused"]').waitFor({ timeout: 30_000 })
        expect(page.url(), 'Back did not leave the page').toBe(address)
        expect(await page.locator('[data-screen="pause"] button').count()).toBeGreaterThan(0)
        // The first button of the pause screen is Keep playing.
        await page.locator('[data-screen="pause"] button').first().click()
        await page.locator('#game[data-state="playing"]').waitFor({ timeout: 30_000 })
        await page.keyboard.press('Escape')
        await page.locator('#game[data-state="paused"]').waitFor({ timeout: 30_000 })
      } finally {
        await context.close()
      }
    } finally {
      await browser.close()
    }
  }, 300_000)

  test(`${name}: the new game is played with a gamepad, and has no movement code`, async () => {
    const browser: Browser = await ENGINES[name].launch()
    try {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'ja-JP' })
      try {
        // A pad the test puts in `navigator.getGamepads` before the page loads: the left stick is pushed right.
        await context.addInitScript(() => {
          const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }))
          const axes = [0, 0, 0, 0]
          const pad = { id: 'Test pad', index: 0, connected: true, mapping: 'standard', axes, buttons }
          ;(window as unknown as { __stick: (x: number) => void }).__stick = (x) => {
            axes[0] = x
          }
          // The bottom button of the four, which jumps.
          ;(window as unknown as { __south: (on: boolean) => void }).__south = (on) => {
            const south = buttons[0]
            if (south !== undefined) Object.assign(south, { pressed: on, touched: on, value: on ? 1 : 0 })
          }
          navigator.getGamepads = () => [pad as unknown as Gamepad]
        })
        const page = await context.newPage()
        await page.goto(address)
        await page.locator('.automata-picker-go').waitFor({ state: 'visible', timeout: 30_000 })
        await intoTheLevel(page, 'ja')
        const floor = await heroY(page)
        // The level waits for a first press, and a stick is not one: a tap of the bottom button starts it, and the
        // hero lands again before the walk.
        await page.evaluate(() => (window as unknown as { __south: (on: boolean) => void }).__south(true))
        await page.waitForTimeout(100)
        await page.evaluate(() => (window as unknown as { __south: (on: boolean) => void }).__south(false))
        await expect.poll(async () => Math.abs((await heroY(page)) - floor), POLL).toBeLessThan(0.05)
        const start = await heroX(page)
        await page.evaluate(() => (window as unknown as { __stick: (x: number) => void }).__stick(1))
        await expect.poll(() => heroX(page), POLL).toBeGreaterThan(start + 0.5)
        // On to the spark, and the game's count says it was taken.
        await expect.poll(() => sparksTaken(page), POLL).toBe(1)
        await page.evaluate(() => (window as unknown as { __stick: (x: number) => void }).__stick(0))
        // The bottom button jumps.
        await page.evaluate(() => (window as unknown as { __south: (on: boolean) => void }).__south(true))
        await expect.poll(async () => Math.abs((await heroY(page)) - floor), POLL).toBeGreaterThan(0.5)
        await page.evaluate(() => (window as unknown as { __south: (on: boolean) => void }).__south(false))
      } finally {
        await context.close()
      }
      // The game's own source has no movement code: the framework moves the hero.
      const source = (dir: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
          entry.isDirectory()
            ? source(join(dir, entry.name))
            : entry.name.endsWith('.ts')
              ? [readFileSync(join(dir, entry.name), 'utf8')]
              : [],
        )
      for (const text of source(join(gameFolder, 'src'))) expect(text).not.toMatch(/\b(isHeld|wasPressed)\b/)
    } finally {
      await browser.close()
    }
  }, 300_000)

  test(`${name}: Go is pressed by touch, by Enter and by a gamepad`, async () => {
    const browser: Browser = await ENGINES[name].launch()
    try {
      const ways = ['touch', 'enter', 'pad'] as const
      for (const way of ways) {
        const context = await browser.newContext({
          viewport: { width: 844, height: 390 },
          locale: 'ja-JP',
          hasTouch: way === 'touch',
        })
        try {
          if (way === 'pad')
            await context.addInitScript(() => {
              const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }))
              const pad = {
                id: 'Test pad',
                index: 0,
                connected: true,
                mapping: 'standard',
                axes: [0, 0, 0, 0],
                buttons,
              }
              ;(window as unknown as { __hold: (on: boolean) => void }).__hold = (on) => {
                const south = buttons[0]
                if (south !== undefined) Object.assign(south, { pressed: on, touched: on, value: on ? 1 : 0 })
              }
              navigator.getGamepads = () => [pad as unknown as Gamepad]
            })
          const page = await context.newPage()
          await page.goto(address)
          const go = page.locator('.automata-picker-go')
          await go.waitFor({ state: 'visible', timeout: 30_000 })
          // The device suggests Japanese: that flag is already chosen, and one press starts the game.
          const chosen = page.locator('.automata-flag[aria-pressed="true"]')
          await expect.poll(() => chosen.getAttribute('data-language'), POLL).toBe('ja')
          if (way === 'touch') await go.tap()
          else if (way === 'enter') await page.keyboard.press('Enter')
          else
            await expect
              .poll(async () => {
                // Held for two frames, as a thumb would hold it, then let go.
                await page.evaluate(async () => {
                  const hold = (window as unknown as { __hold: (on: boolean) => void }).__hold
                  const frame = () => new Promise((done) => requestAnimationFrame(done))
                  hold(true)
                  await frame()
                  await frame()
                  hold(false)
                })
                return (await page.locator('.automata-picker').count()) === 0
              }, POLL)
              .toBe(true)
          await page.locator('#game:not([data-state="picking"]):not([data-state="loading"])').waitFor()
          expect(await page.locator('.automata-picker').count(), `${way}: Go started the visit`).toBe(0)
        } finally {
          await context.close()
        }
      }
    } finally {
      await browser.close()
    }
  }, 300_000)
}

// The thumbs answer to made-up pointer events everywhere else. Here Chromium's own touch input (the DevTools protocol's
// touch events, which the browser turns into real touch pointers) walks the hero to the spark and jumps it, so
// `touch-action`, the capture a finger keeps and a browser that takes a touch for a scroll are proved, not assumed.
// Playwright has only a tap for a touch, so a drag goes through a protocol session; WebKit and Firefox have none.
test('chromium: a real finger walks the hero to the spark and jumps it', async () => {
  const browser: Browser = await chromium.launch()
  try {
    const context = await browser.newContext({
      viewport: { width: 844, height: 390 },
      hasTouch: true,
      locale: 'en-US',
    })
    try {
      await markCoarse(context)
      const page = await context.newPage()
      const session = await context.newCDPSession(page)
      const finger = (
        type: 'touchStart' | 'touchMove' | 'touchEnd',
        points: readonly { x: number; y: number; id: number }[],
      ): Promise<unknown> => session.send('Input.dispatchTouchEvent', { type, touchPoints: [...points] })
      await page.goto(address)
      await intoTheLevel(page, 'en')
      const middleOf = async (half: string): Promise<{ x: number; y: number }> => {
        const box = await page.locator(`[data-half='${half}']`).boundingBox()
        expect(box, `the ${half} half is on the screen`).not.toBeNull()
        return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 }
      }
      const floor = await heroY(page)
      const start = await heroX(page)
      const walk = await middleOf('walk')
      await finger('touchStart', [{ ...walk, id: 1 }])
      await finger('touchMove', [{ x: walk.x + 80, y: walk.y, id: 1 }])
      await expect.poll(() => heroX(page), POLL).toBeGreaterThan(start + 0.5)
      await expect.poll(() => sparksTaken(page), POLL).toBe(1)
      await finger('touchEnd', [])
      const jump = await middleOf('jump')
      await finger('touchStart', [{ ...jump, id: 2 }])
      await expect.poll(async () => Math.abs((await heroY(page)) - floor), POLL).toBeGreaterThan(0.5)
      await finger('touchEnd', [])
    } finally {
      await context.close()
    }
  } finally {
    await browser.close()
  }
}, 300_000)
