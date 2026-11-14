// The README's new game in real browsers: made from the packed package the way "Start here" says, served by the game's own
// `automata play`, then played in Chromium, WebKit and Firefox at a phone, a tablet and a desktop size, upright and
// sideways. Nothing is waited for with a sleep; each wait is for something a person would see.
// CI gives the tarball it packed in `CREATE_TARBALL`, so the bytes tested are the bytes a release would ship.
import { type ChildProcess, execFileSync, spawn } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, firefox, type Page, webkit } from 'playwright'
import { afterAll, beforeAll, expect, test } from 'vitest'

const shots = fileURLToPath(new URL('./__screenshots__/', import.meta.url))
const ENGINES = { chromium, webkit, firefox }

interface Size {
  readonly width: number
  readonly height: number
  /** A touch screen: the buttons are on from the start, and a person holds one. */
  readonly touch: boolean
}
const SIZES: readonly Size[] = [
  { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true },
  { width: 820, height: 1180, touch: true },
  { width: 1180, height: 820, touch: true },
  { width: 1280, height: 720, touch: false },
]

/** What a page's own `window` offers an agent or a test, as far as this journey reads it. */
interface PageGame {
  readonly sim: {
    readonly tick: number
    describeSnapshot(): {
      readonly entities: readonly { readonly components: Record<string, Record<string, number>> }[]
    }
  }
}
type PageWindow = { automataGame?: PageGame }

let work = ''
let gameFolder = ''
let level = ''
let address = ''
let play: ChildProcess | undefined
const WINDOWS = process.platform === 'win32'
const npx = WINDOWS ? 'npx.cmd' : 'npx'
const npm = WINDOWS ? 'npm.cmd' : 'npm'

const freePort = (): Promise<number> =>
  new Promise((done, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, () => {
      const info = probe.address()
      probe.close(() => {
        if (info === null || typeof info === 'string') reject(new Error('There is no port.'))
        else done(info.port)
      })
    })
  })
const portIsFree = (port: number): Promise<boolean> =>
  new Promise((done) => {
    const probe = createServer()
    probe.once('error', () => done(false))
    probe.listen(port, () => probe.close(() => done(true)))
  })

beforeAll(async () => {
  const given = process.env.CREATE_TARBALL
  if (given === undefined || !existsSync(given))
    throw new Error('CREATE_TARBALL names the packed package and it is missing: run create-pack first.')
  // The tarball, or the folder CI downloaded it into.
  const inside = statSync(given).isDirectory() ? readdirSync(given) : []
  const found = inside.find((name) => name.endsWith('.tgz'))
  const tarball = resolve(found === undefined ? given : join(given, found))
  // A folder with a space in its name, as a person's own often has.
  work = mkdtempSync(join(tmpdir(), 'create journey '))
  const env = { ...process.env, NO_COLOR: '1' }
  const slashes = tarball.replaceAll('\\', '/')
  execFileSync(
    npx,
    ['--yes', '--package', tarball, 'automata', 'create', 'my-game', '--framework', `file:${slashes}`],
    { cwd: work, env, shell: WINDOWS, stdio: 'inherit' },
  )
  gameFolder = join(work, 'my-game')
  level = join(gameFolder, 'content', 'levels', 'level-1.json')
  execFileSync(npm, ['install', '--no-audit', '--no-fund'], {
    cwd: gameFolder,
    env,
    shell: WINDOWS,
    stdio: 'inherit',
  })

  const port = await freePort()
  address = `http://localhost:${port}/`
  play = spawn(npx, ['--no', 'automata', 'play', '--no-open', '--port', String(port)], {
    cwd: gameFolder,
    env,
    shell: WINDOWS,
    detached: !WINDOWS,
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  play.stdout?.on('data', (chunk) => process.stdout.write(`[play] ${chunk}`))
  for (let waited = 0; waited < 60_000; waited += 500) {
    if (play.exitCode !== null)
      throw new Error(`automata play ended with ${play.exitCode} before it served the game.`)
    const answered = await fetch(address).then(
      (response) => response.ok,
      () => false,
    )
    if (answered) break
    await new Promise((done) => setTimeout(done, 500))
  }
  mkdirSync(shots, { recursive: true })
}, 600_000)

afterAll(async () => {
  // Stop `play` with Ctrl+C's own signal, and check the port is free again.
  const child = play
  if (child !== undefined && child.exitCode === null && child.pid !== undefined) {
    const ended = new Promise((done) => child.once('exit', done))
    if (WINDOWS) execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'])
    else process.kill(-child.pid, 'SIGINT')
    await Promise.race([ended, new Promise((done) => setTimeout(done, 5000))])
    expect(child.exitCode !== null || child.signalCode !== null, 'automata play stops on Ctrl+C').toBe(true)
    const port = Number(new URL(address).port)
    expect(await portIsFree(port), 'the port is free again').toBe(true)
  }
  if (work !== '') rmSync(work, { recursive: true, force: true, maxRetries: 5 })
})

/** The hero's x, read from the running game. */
const heroX = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const game = (window as unknown as PageWindow).automataGame
    const hero = game?.sim.describeSnapshot().entities.find((entity) => 'player' in entity.components)
    return hero?.components.transform?.x ?? Number.NaN
  })
const tickOf = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as PageWindow).automataGame?.sim.tick ?? -1)

const POLL = { timeout: 30_000, intervals: [50, 100, 250] }

for (const name of Object.keys(ENGINES) as (keyof typeof ENGINES)[]) {
  test(`${name}: a new game plays by key and by touch, and a broken file is put in words`, async () => {
    const browser: Browser = await ENGINES[name].launch()
    try {
      for (const size of SIZES) {
        const context = await browser.newContext({ viewport: { width: size.width, height: size.height } })
        // A touch screen as the game's own question sees it: a coarse pointer.
        if (size.touch)
          await context.addInitScript(() => {
            const real = window.matchMedia.bind(window)
            const coarse = {
              matches: true,
              media: '(pointer: coarse)',
              addEventListener: () => undefined,
              removeEventListener: () => undefined,
            } as unknown as MediaQueryList
            window.matchMedia = (media: string) => (media.includes('pointer: coarse') ? coarse : real(media))
          })
        const page = await context.newPage()
        const where = `${name} ${size.width}x${size.height}`
        page.on('console', (message) => console.log(`[${where}] ${message.type()}: ${message.text()}`))
        page.on('pageerror', (error) => console.log(`[${where}] page error: ${error.message}`))
        await page.goto(address)

        // The game is on screen, and time passes in it.
        await expect.poll(() => tickOf(page), POLL).toBeGreaterThan(0)
        const before = await tickOf(page)
        await expect.poll(() => tickOf(page), POLL).toBeGreaterThan(before)

        // The keys' hint is for a keyboard: shown at the desktop size and gone once the hero has moved, never on touch.
        const hint = page.locator('.hint')
        if (size.touch) expect(await hint.count(), `${where}: the hint on a touch screen`).toBe(0)
        else await expect.poll(() => hint.isVisible(), POLL).toBe(true)

        // Holding right moves the hero right: by the arrow key, or by a finger on the Right button.
        const start = await heroX(page)
        if (size.touch) {
          const finger = { pointerType: 'touch', pointerId: 7, isPrimary: true, bubbles: true } as const
          const right = page.locator("[data-action='right']")
          await right.dispatchEvent('pointerdown', finger)
          await expect.poll(() => heroX(page), POLL).toBeGreaterThan(start + 0.5)
          await right.dispatchEvent('pointerup', finger)
        } else {
          await page.keyboard.down('ArrowRight')
          await expect.poll(() => heroX(page), POLL).toBeGreaterThan(start + 0.5)
          await page.keyboard.up('ArrowRight')
          await expect.poll(() => hint.count(), POLL).toBe(0)
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
            const problem = page.locator('#game[data-state="problem"] .problem')
            await expect.poll(() => problem.count(), POLL).toBe(1)
            const words = (await problem.textContent()) ?? ''
            expect(words, where).toContain('content/levels/level-1.json: things[0].x: This must be a number.')
            expect(words, where).toContain('Fix the file named above')
          } finally {
            writeFileSync(level, original)
          }
          await page.reload()
          await expect.poll(() => tickOf(page), POLL).toBeGreaterThan(0)
        }
        await context.close()
      }
    } finally {
      await browser.close()
    }
  }, 600_000)
}
