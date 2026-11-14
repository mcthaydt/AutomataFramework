// Proof 3 of M2's networking: two real browsers, a real room server. The room server is the built package running as a
// process (`node tests/fixtures/online/server.ts`), the page is the fixture online game built by Vite, and each player
// is a browser Playwright launches: three pairs, so every engine plays against every other kind at least once, on
// phone, tablet and desktop sizes, by keyboard and by touch. Nothing is waited for with a sleep; each wait is for
// something a person would see.
import { type ChildProcess, spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { type Browser, type BrowserContext, chromium, firefox, type Page, webkit } from 'playwright'
import { build, type PreviewServer, preview } from 'vite'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { rapierWasm } from '../../vite-rapier-wasm.ts'

const root = fileURLToPath(new URL('../../', import.meta.url))
const pageDir = fileURLToPath(new URL('../fixtures/online/page/', import.meta.url))
const shots = fileURLToPath(new URL('./__screenshots__/', import.meta.url))

const ENGINES = { chromium, webkit, firefox }
type Engine = keyof typeof ENGINES
interface Spec {
  readonly engine: Engine
  readonly width: number
  readonly height: number
  readonly touch: boolean
}

// [player 1, player 2]
const PAIRS: readonly (readonly [Spec, Spec])[] = [
  [
    { engine: 'chromium', width: 1280, height: 720, touch: false },
    { engine: 'webkit', width: 390, height: 844, touch: true },
  ],
  [
    { engine: 'webkit', width: 1180, height: 820, touch: true },
    { engine: 'firefox', width: 1280, height: 720, touch: false },
  ],
  [
    { engine: 'firefox', width: 844, height: 390, touch: true },
    { engine: 'chromium', width: 820, height: 1180, touch: true },
  ],
]

const processes: ChildProcess[] = []
let roomServer = ''
let coopServer = ''
let pageServer: PreviewServer | undefined
let pageUrl = ''
let outDir = ''
const browsers: Browser[] = []

beforeAll(async () => {
  if (!existsSync(`${root}dist/server.js`))
    throw new Error('dist/server.js is missing: run `pnpm build` first.')
  // The room servers, as processes, and the port each says it listens on: the lobby game and the co-op game.
  const start = async (...args: string[]): Promise<string> => {
    const child = spawn(process.execPath, [`${root}tests/fixtures/online/server.ts`, ...args], {
      stdio: ['ignore', 'pipe', 'inherit'],
    })
    processes.push(child)
    const port = await new Promise<number>((resolve, reject) => {
      child.once('exit', (code) =>
        reject(new Error(`The room server ended with code ${code} before it listened.`)),
      )
      createInterface({ input: child.stdout }).once('line', (line) =>
        resolve((JSON.parse(line) as { port: number }).port),
      )
    })
    return `ws://127.0.0.1:${port}`
  }
  roomServer = await start()
  coopServer = await start('--co-op')

  // The page, built as a game would be and served from files: a dev server would reload the page when it found a
  // dependency late, in the middle of a play.
  outDir = mkdtempSync(`${tmpdir()}/online-page-`)
  const common = {
    root: pageDir,
    configFile: false as const,
    plugins: [rapierWasm()],
    logLevel: 'warn' as const,
  }
  await build({
    ...common,
    // Scripts beside Rapier's binary, which the plugin writes at the top of the output: its address is relative.
    build: {
      outDir,
      emptyOutDir: true,
      target: 'es2023',
      sourcemap: false,
      assetsDir: '',
      // Left to split the page into chunks as a game's bundler may: the page's `data-built-code` of `[]` then proves that
      // Zod's probe stays off whatever order the chunks run in (`src/lib/zod.ts`).
    },
  })
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
  for (const child of processes.splice(0)) {
    if (child.exitCode !== null) continue
    const ended = new Promise((resolve) => child.once('close', resolve))
    child.kill('SIGTERM')
    await ended
  }
  if (outDir !== '') rmSync(outDir, { recursive: true, force: true })
})

interface Seat {
  readonly spec: Spec
  readonly page: Page
  readonly context: BrowserContext
  /** The numbers the page shows. */
  data(name: string): Promise<string | null>
  status(): Promise<string>
  hold(action: 'left' | 'right'): Promise<void>
  release(action: 'left' | 'right'): Promise<void>
  tap(action: 'jump'): Promise<void>
}

const KEYS = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'Space' } as const

async function seatOf(spec: Spec, query: string, server = roomServer): Promise<Seat> {
  const browser = await ENGINES[spec.engine].launch()
  browsers.push(browser)
  const context = await browser.newContext({
    viewport: { width: spec.width, height: spec.height },
  })
  // A touch screen as the game's own question sees it: a coarse pointer, so the buttons are on from the start.
  if (spec.touch)
    await context.addInitScript(() => {
      const real = window.matchMedia.bind(window)
      const coarse = (media: string): MediaQueryList =>
        ({
          matches: true,
          media,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false,
        }) as MediaQueryList
      window.matchMedia = (media: string) => (media.includes('pointer: coarse') ? coarse(media) : real(media))
    })
  const page = await context.newPage()
  // What the page says to its console is the first thing to read when a journey stops: it goes to the CI log.
  const name = `${spec.engine}-${spec.width}`
  page.on('console', (message) => console.log(`[${name}] ${message.type()}: ${message.text()}`))
  page.on('pageerror', (error) => console.log(`[${name}] page error: ${error.message}`))
  await page.goto(`${pageUrl}?server=${encodeURIComponent(server)}${query}`)
  const button = (action: string) => page.locator(`[data-action='${action}']`)
  const finger = { pointerType: 'touch', pointerId: 7, isPrimary: true, bubbles: true } as const
  return {
    spec,
    page,
    context,
    data: (name) => page.locator('#game').getAttribute(`data-${name}`),
    status: async () => (await page.locator('#status').textContent()) ?? '',
    async hold(action) {
      if (spec.touch) await button(action).dispatchEvent('pointerdown', finger)
      else await page.keyboard.down(KEYS[action])
    },
    async release(action) {
      if (spec.touch) await button(action).dispatchEvent('pointerup', finger)
      else await page.keyboard.up(KEYS[action])
    },
    async tap(action) {
      if (spec.touch) {
        await button(action).dispatchEvent('pointerdown', finger)
        await button(action).dispatchEvent('pointerup', finger)
      } else {
        await page.keyboard.down(KEYS[action])
        await page.keyboard.up(KEYS[action])
      }
    },
  }
}

/** Waits for the page to have tried to join; if it could not, the failure is the page's own words. */
async function opened(seat: Seat): Promise<void> {
  await seat.page.waitForFunction(
    () => document.querySelector('#game')?.getAttribute('data-state') !== 'starting',
    undefined,
    { timeout: 60_000 },
  )
  const state = await seat.data('state')
  if (state === 'failed') throw new Error(`The page could not start: ${await seat.status()}`)
}

const POLL = { timeout: 60_000, intervals: [50, 100, 250] }
const num = (value: string | null): number => (value === null || value === '' ? Number.NaN : Number(value))

/** Check ticks that matched on the page, with the hash. */
async function checks(seat: Seat): Promise<Map<number, string>> {
  const names = await seat.page.locator('#game').evaluate((el) =>
    el
      .getAttributeNames()
      .filter((n) => n.startsWith('data-check-'))
      .map((n) => [n, el.getAttribute(n)]),
  )
  return new Map(names.map(([n, h]) => [Number((n as string).slice('data-check-'.length)), h as string]))
}

for (const [first, second] of PAIRS) {
  test(`${first.engine} (${first.width}x${first.height}) and ${second.engine} (${second.width}x${second.height}) play one room`, async () => {
    const one = await seatOf(first, '')
    await opened(one)
    // 1. A new room waits, and says how to bring a friend.
    await expect.poll(() => one.data('code'), POLL).toMatch(/\S/)
    const code = (await one.data('code')) as string
    await expect
      .poll(() => one.status(), POLL)
      .toBe(`Waiting for 1 more player. Share this code so a friend can join: ${code}`)

    // 2. The friend joins by the code; both are playing, in seats 1 and 2, with nothing to read.
    const two = await seatOf(second, `&room=${encodeURIComponent(code)}`)
    for (const seat of [one, two]) await expect.poll(() => seat.data('state'), POLL).toBe('playing')
    for (const seat of [one, two]) await expect.poll(() => seat.status(), POLL).toBe('')
    await expect.poll(() => one.data('seat'), POLL).toBe('1')
    await expect.poll(() => two.data('seat'), POLL).toBe('2')

    // 3 and 4. One runs right, the other left; each sees the other move.
    await one.hold('right')
    await two.hold('left')
    await expect.poll(async () => num(await one.data('p2-x')), POLL).toBeLessThan(12.5)
    await expect.poll(async () => num(await two.data('p1-x')), POLL).toBeGreaterThan(3.5)
    // From here the friend's line is slow: their keys reach the room a quarter of a second late (the page's
    // `slowLine`). It starts only now, so who reaches the crate first above is the same race it always was.
    await two.page.evaluate(() => (window as unknown as { slowLine(ms: number): void }).slowLine(250))
    await one.release('right')
    await two.release('left')
    await two.tap('jump')
    expect(num(await one.data('p2-x'))).toBeLessThan(13.5)
    expect(num(await two.data('p1-x'))).toBeGreaterThan(2.5)
    for (const [n, seat] of [one, two].entries())
      await seat.page.screenshot({ path: `${shots}online-${first.engine}-${second.engine}-p${n + 1}.png` })

    // 5. Both reach the check for tick 599 and agree; the pair had to put a picture right at least once; and nothing
    // in either page tried to build code from a string.
    for (const seat of [one, two])
      await expect.poll(async () => (await checks(seat)).has(599), POLL).toBe(true)
    expect((await checks(one)).get(599)).toBe((await checks(two)).get(599))
    // The friend's keys reach the room a quarter of a second late, so the room puts each on a later tick than the one
    // their page guessed, and their page puts its picture right. Without the slow line this depended on how fast each
    // browser drew its frames, and once failed (job 132443000203).
    expect(num(await two.data('rollbacks')), "rollbacks on the slow friend's page").toBeGreaterThan(0)
    for (const seat of [one, two]) {
      expect(
        await seat.data('built-code'),
        `built from a string, at: ${await seat.data('built-stack')}`,
      ).toBe('[]')
    }

    // 6. A dropped connection gets back into its place, and the room ends on one picture again.
    const droppedAt = Math.max(...(await checks(one)).keys())
    await two.page.evaluate(() => (window as unknown as { dropConnection(): void }).dropConnection())
    await expect.poll(() => two.status(), POLL).toBe('Connection lost. Trying to get you back in.')
    await expect.poll(() => one.status(), POLL).toBe('Player 2 lost their connection. The game goes on.')
    for (const seat of [one, two]) await expect.poll(() => seat.status(), POLL).toBe('')
    await expect
      .poll(async () => {
        const [a, b] = [await checks(one), await checks(two)]
        return [...a].some(([tick, hash]) => tick > droppedAt && b.get(tick) === hash)
      }, POLL)
      .toBe(true)

    // 7 and 8. A third player is told the room is full, and a made-up code is told there is no such room.
    const third = await seatOf(first, `&room=${encodeURIComponent(code)}`)
    await expect
      .poll(() => third.status(), POLL)
      .toBe('That room is full. Start a new room, or ask for another code.')
    const nowhere = await seatOf(first, '&room=NOPE')
    await expect
      .poll(() => nowhere.status(), POLL)
      .toBe('No room has that code. Check the code and try again.')
  })
}

// Audit J2: the words of the room's status are the player's own, in a real browser against a real room.
test('a player whose page is in Spanish is told in Spanish who the room waits for', async () => {
  const one = await seatOf(PAIRS[0]?.[0] as Spec, '&lang=es')
  await opened(one)
  await expect.poll(() => one.data('code'), POLL).toMatch(/\S/)
  const code = (await one.data('code')) as string
  await expect
    .poll(() => one.status(), POLL)
    .toBe(`Falta 1 jugador. Comparte este código para que un amigo se una: ${code}`)
})

test('co-op: a second player joins a game that is going, and when they go their hero goes', async () => {
  const one = await seatOf(
    { engine: 'chromium', width: 1280, height: 720, touch: false },
    '&game=co-op',
    coopServer,
  )
  await opened(one)
  // Nobody to wait for: it is playing at once, with nothing to read.
  await expect.poll(() => one.data('state'), POLL).toBe('playing')
  expect(await one.status()).toBe('')
  await expect.poll(() => one.data('players'), POLL).toBe('1')
  const code = (await one.data('code')) as string
  // A few seconds of play on its own, then a friend comes by the code.
  await expect.poll(async () => (await checks(one)).has(179), POLL).toBe(true)
  const two = await seatOf(
    { engine: 'webkit', width: 390, height: 844, touch: true },
    `&game=co-op&room=${encodeURIComponent(code)}`,
    coopServer,
  )
  await expect.poll(() => two.data('state'), POLL).toBe('playing')
  await expect.poll(() => two.data('seat'), POLL).toBe('2')
  for (const seat of [one, two]) await expect.poll(() => seat.data('players'), POLL).toBe('2')

  // Each sees the other's hero move.
  await one.hold('left')
  await two.hold('right')
  await expect.poll(async () => num(await two.data('p1-x')), POLL).toBeLessThan(1.9)
  await expect.poll(async () => num(await one.data('p2-x')), POLL).toBeGreaterThan(6)
  await one.release('left')
  await two.release('right')
  const movedAt = Math.max(...(await checks(one)).keys())
  await expect
    .poll(async () => {
      const [a, b] = [await checks(one), await checks(two)]
      return [...a].some(([tick, hash]) => tick > movedAt && b.get(tick) === hash)
    }, POLL)
    .toBe(true)

  // The second player closes the page: after the grace the room takes their hero out, and nobody is told of a loss.
  await two.page.close()
  await expect.poll(() => one.data('players'), POLL).toBe('1')
  await expect.poll(() => one.status(), POLL).toBe('')
})
