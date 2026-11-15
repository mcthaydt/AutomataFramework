// The feel runtime in real pages: the feel game built as a page and opened in Chromium, WebKit and Firefox at five
// sizes. Dust at the hero's feet and gone within half a second, a shake that moves the level and nothing the player
// touches, a freeze that holds the tick count and gives it back, dust that never covers a control; and, once for each
// engine, a device that asked for less motion, "Show me" on a paused game, and a watched recording that never buzzes.
// Nothing is waited for with a sleep: the page notes every animation frame, and each wait is for something in that.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { type Browser, type BrowserContext, chromium, firefox, type Page, webkit } from 'playwright'
import { build, type PreviewServer, preview } from 'vite'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { rapierWasm } from '../../vite-rapier-wasm.ts'
import { feelGameFiles } from '../fixtures/feel/game.ts'

const pageDir = fileURLToPath(new URL('../fixtures/feel/page/', import.meta.url))
const shots = fileURLToPath(new URL('./__screenshots__/', import.meta.url))

const ENGINES = { chromium, webkit, firefox }

interface Size {
  readonly name: string
  readonly width: number
  readonly height: number
  readonly touch: boolean
}
const SIZES: readonly Size[] = [
  { name: 'phone-390x844', width: 390, height: 844, touch: true },
  { name: 'phone-844x390', width: 844, height: 390, touch: true },
  { name: 'tablet-820x1180', width: 820, height: 1180, touch: true },
  { name: 'tablet-1180x820', width: 1180, height: 820, touch: true },
  { name: 'desktop-1280x720', width: 1280, height: 720, touch: false },
]

/** What the page notes about one animation frame (see `tests/fixtures/feel/page/main.ts`). */
interface Sample {
  readonly t: number
  readonly tick: number
  readonly freeze: number
  readonly shake: number
  readonly specks: number
  readonly boxes: string
  readonly hero: readonly [number, number] | null
  readonly speck: readonly [number, number] | null
}
interface PageGame {
  readonly sim: { readonly tick: number; hash(): string }
  pause?(): void
  showFeel?(feel: unknown): void
}
type FeelWindow = { trace: Sample[]; automataGame?: PageGame; __vibrations?: number }

let pageServer: PreviewServer | undefined
let pageUrl = ''
let outDir = ''
const browsers: Browser[] = []

beforeAll(async () => {
  outDir = mkdtempSync(`${tmpdir()}/feel-page-`)
  const common = {
    root: pageDir,
    configFile: false as const,
    plugins: [rapierWasm()],
    logLevel: 'warn' as const,
  }
  await build({
    ...common,
    build: { outDir, emptyOutDir: true, target: 'es2023', sourcemap: false, assetsDir: '' },
  })
  // The game's files, beside the page, as the page reads them.
  const files = Object.fromEntries(Object.entries(feelGameFiles()).filter(([, text]) => text !== undefined))
  writeFileSync(`${outDir}/files.json`, JSON.stringify(files))
  pageServer = await preview({
    ...common,
    build: { outDir },
    preview: { host: '127.0.0.1', port: 0, strictPort: false },
  })
  const address = pageServer.httpServer.address()
  if (address === null || typeof address === 'string') throw new Error('The page server has no port.')
  pageUrl = `http://127.0.0.1:${address.port}/`
  mkdirSync(shots, { recursive: true })
})

afterAll(async () => {
  for (const browser of browsers.splice(0)) await browser.close().catch(() => undefined)
  await pageServer?.close()
  if (outDir !== '') rmSync(outDir, { recursive: true, force: true })
})

const POLL = { timeout: 60_000, polling: 'raf' } as const

/** A touch screen as the game's own question sees it: a coarse pointer, so the touch buttons are on from the start. */
const coarse = (): void => {
  const real = window.matchMedia.bind(window)
  const media = (query: string): MediaQueryList =>
    ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList
  window.matchMedia = (query: string) => (query.includes('pointer: coarse') ? media(query) : real(query))
}

/** A page of the feel game at this size, played for a little first so the dust of the hero settling is over. */
async function open(
  browser: Browser,
  size: Size,
  options: { query?: string; reducedMotion?: boolean; vibrate?: boolean } = {},
): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    ...(options.reducedMotion ? { reducedMotion: 'reduce' as const } : {}),
  })
  if (size.touch) await context.addInitScript(coarse)
  if (options.vibrate)
    await context.addInitScript(() => {
      Object.assign(window, { __vibrations: 0 })
      Object.defineProperty(navigator, 'vibrate', {
        configurable: true,
        value: () => {
          const w = window as unknown as FeelWindow
          w.__vibrations = (w.__vibrations ?? 0) + 1
          return true
        },
      })
    })
  const page = await context.newPage()
  const name = `${size.name}`
  page.on('console', (message) => console.log(`[${name}] ${message.type()}: ${message.text()}`))
  page.on('pageerror', (error) => console.log(`[${name}] page error: ${error.message}`))
  await page.goto(`${pageUrl}${options.query ?? ''}`)
  await page.waitForFunction(
    () => (window as unknown as FeelWindow).automataGame !== undefined,
    undefined,
    POLL,
  )
  return { page, context }
}

/** Frames noted so far: what a wait or a read starts from. */
const noted = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as FeelWindow).trace.length)

/** The frames noted from `from` on. */
const framesFrom = (page: Page, from: number): Promise<Sample[]> =>
  page.evaluate((at) => (window as unknown as FeelWindow).trace.slice(at), from)

/** Waits until a frame from `from` on says `says`, and leaves the frames from `from` on. */
async function until(page: Page, from: number, says: 'specks' | 'shake' | 'freeze'): Promise<void> {
  await page.waitForFunction(
    ([at, field]) => {
      const frames = (window as unknown as FeelWindow).trace.slice(at as number)
      return frames.some((f) => (f as never)[field as never] > 0)
    },
    [from, says] as const,
    POLL,
  )
}

/** Waits until the game has been played a while: the hero has settled and its first dust is gone. */
async function settled(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const w = window as unknown as FeelWindow
      const last = w.trace.at(-1)
      return last !== undefined && last.tick > 90 && last.specks === 0
    },
    undefined,
    POLL,
  )
}

for (const engine of Object.keys(ENGINES) as (keyof typeof ENGINES)[]) {
  describe(engine, () => {
    let browser: Browser
    beforeAll(async () => {
      browser = await ENGINES[engine].launch()
      browsers.push(browser)
    })

    for (const size of SIZES) {
      const where = `${engine} ${size.name}`

      test(`${size.name}: the hero lands, dust is at its feet, and it is gone within half a second`, async () => {
        const { page, context } = await open(browser, size)
        try {
          await settled(page)
          const from = await noted(page)
          await page.keyboard.down('Space')
          await until(page, from, 'specks')
          await page.keyboard.up('Space')
          // The dust ends: some frame after the first with dust has none.
          await page.waitForFunction(
            (at) => {
              const frames = (window as unknown as FeelWindow).trace.slice(at)
              const first = frames.findIndex((f) => f.specks > 0)
              return first >= 0 && frames.slice(first).some((f) => f.specks === 0)
            },
            from,
            POLL,
          )
          const frames = await framesFrom(page, from)
          const first = frames.findIndex((f) => f.specks > 0)
          const first0 = frames[first]
          const end = frames.findIndex((f, at) => at > first && f.specks === 0)
          expect(first0?.hero, where).not.toBeNull()
          // At its feet: the first speck is at the bottom middle of the hero (a hero is a tile tall).
          const hero = first0?.hero ?? [Number.NaN, Number.NaN]
          const speck = first0?.speck ?? [Number.NaN, Number.NaN]
          expect(Math.abs(speck[0] - hero[0]), where).toBeLessThan(0.7)
          expect(Math.abs(speck[1] - (hero[1] + 0.5)), where).toBeLessThan(0.7)
          expect((frames[end]?.t ?? Number.POSITIVE_INFINITY) - (first0?.t ?? 0), where).toBeLessThan(600)
        } finally {
          await context.close()
        }
      })

      test(`${size.name}: a jump shakes the level; the touch controls and the page do not move`, async () => {
        const { page, context } = await open(browser, size)
        try {
          await settled(page)
          const from = await noted(page)
          await page.keyboard.down('Space')
          await until(page, from, 'shake')
          await page.keyboard.up('Space')
          await page.waitForFunction(
            (at) => {
              const frames = (window as unknown as FeelWindow).trace.slice(at)
              const first = frames.findIndex((f) => f.shake > 0)
              return first >= 0 && frames.slice(first).some((f) => f.shake === 0)
            },
            from,
            POLL,
          )
          const frames = await framesFrom(page, from)
          expect(Math.max(...frames.map((f) => f.shake)), where).toBeGreaterThan(0)
          // Before, during and after, the canvas, the thumbs, the buttons and the mount are where they were.
          expect(new Set(frames.map((f) => f.boxes)).size, where).toBe(1)
        } finally {
          await context.close()
        }
      })

      test(`${size.name}: taking the spark holds the tick count, then the game goes on`, async () => {
        const { page, context } = await open(browser, size)
        try {
          await settled(page)
          const from = await noted(page)
          await page.keyboard.down('ArrowRight')
          await until(page, from, 'freeze')
          // After the hold: a frame with no freeze and a later tick.
          await page.waitForFunction(
            (at) => {
              const frames = (window as unknown as FeelWindow).trace.slice(at)
              const first = frames.findIndex((f) => f.freeze > 0)
              const held = frames[first]
              const after = frames.slice(first)
              return held !== undefined && after.some((f) => f.freeze === 0 && f.tick > held.tick)
            },
            from,
            POLL,
          )
          await page.keyboard.up('ArrowRight')
          const frames = await framesFrom(page, from)
          const first = frames.findIndex((f) => f.freeze > 0)
          const held = frames[first]
          let length = 0
          while (frames[first + length]?.freeze) length++
          // Six ticks of freeze at a frame a tick: the tick count stood still through all of them.
          expect(length, where).toBeGreaterThanOrEqual(3)
          for (const f of frames.slice(first, first + length)) expect(f.tick, where).toBe(held?.tick)
          expect(frames.at(-1)?.tick ?? 0, where).toBeGreaterThan(held?.tick ?? Number.POSITIVE_INFINITY)
        } finally {
          await context.close()
        }
      })

      if (size.touch)
        test(`${size.name}: the dust never covers a touch control`, async () => {
          const { page, context } = await open(browser, size)
          try {
            await settled(page)
            const from = await noted(page)
            await page.keyboard.down('Space')
            await until(page, from, 'specks')
            await page.keyboard.up('Space')
            const covered = await page.evaluate(
              () =>
                [...document.querySelectorAll<HTMLElement>('.automata-touch-button')].filter((button) => {
                  const box = button.getBoundingClientRect()
                  const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
                  return top?.closest('.automata-touch-button') !== button
                }).length,
            )
            expect(covered, where).toBe(0)
            // A picture to look at: a long burst of dust on a paused game, so it is still there when the shot is taken.
            await page.evaluate(() => {
              const game = (window as unknown as FeelWindow).automataGame
              game?.pause?.()
              game?.showFeel?.({
                format: 1,
                id: 'picture',
                on: 'x.y',
                dust: { count: 40, color: '#ffffff', speed: 4, life: 120 },
              })
            })
            const next = await noted(page)
            await until(page, next, 'specks')
            await page.screenshot({ path: `${shots}feel-${engine}-${size.name}.png` })
          } finally {
            await context.close()
          }
        })
    }

    const phone = SIZES[0] as Size

    test('a device that asks for less motion: a first visit draws no shake and still draws dust', async () => {
      const { page, context } = await open(browser, phone, { reducedMotion: true })
      try {
        await settled(page)
        const from = await noted(page)
        await page.keyboard.down('Space')
        await until(page, from, 'specks')
        await page.keyboard.up('Space')
        const frames = await framesFrom(page, from)
        expect(Math.max(...frames.map((f) => f.shake))).toBe(0)
        expect(Math.max(...frames.map((f) => f.specks))).toBeGreaterThan(0)
      } finally {
        await context.close()
      }
    })

    test("showFeel from the page while paused draws the burst at the hero, and the recording's hash is unchanged", async () => {
      const { page, context } = await open(browser, phone)
      try {
        await settled(page)
        const before = await page.evaluate(() => {
          const game = (window as unknown as FeelWindow).automataGame
          game?.pause?.()
          return { tick: game?.sim.tick ?? -1, hash: game?.sim.hash() ?? '' }
        })
        const from = await noted(page)
        await page.evaluate(() =>
          (window as unknown as FeelWindow).automataGame?.showFeel?.({
            format: 1,
            id: 'poof',
            on: 'x.y',
            dust: { count: 8, color: '#ffffff', speed: 2, life: 20 },
          }),
        )
        await until(page, from, 'specks')
        const frames = await framesFrom(page, from)
        const first = frames.find((f) => f.specks > 0)
        const hero = first?.hero ?? [Number.NaN, Number.NaN]
        const speck = first?.speck ?? [Number.NaN, Number.NaN]
        expect(Math.abs(speck[0] - hero[0])).toBeLessThan(0.7)
        const after = await page.evaluate(() => {
          const game = (window as unknown as FeelWindow).automataGame
          return { tick: game?.sim.tick ?? -1, hash: game?.sim.hash() ?? '' }
        })
        expect(after).toEqual(before)
      } finally {
        await context.close()
      }
    })

    test('?watch draws dust and shake, and navigator.vibrate is never called', async () => {
      const { page, context } = await open(browser, phone, { query: '?watch', vibrate: true })
      try {
        const from = await noted(page)
        await until(page, from, 'specks')
        await until(page, from, 'shake')
        expect(await page.evaluate(() => (window as unknown as FeelWindow).__vibrations)).toBe(0)
      } finally {
        await context.close()
      }
    })
  })
}
