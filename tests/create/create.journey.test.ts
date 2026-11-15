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
      readonly resources: Record<string, { readonly sparks?: number } | undefined>
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
    [
      '--yes',
      '--package',
      tarball,
      'automata',
      'create',
      'my-game',
      '--source',
      'es',
      '--framework',
      `file:${slashes}`,
    ],
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

  // The game says what it checks, lists the words nobody has read (against Spanish, the language it is written in)
  // and keeps a language marked read, before the browsers see it.
  const automata = (...args: string[]): string =>
    execFileSync(npx, ['--no', 'automata', ...args], {
      cwd: gameFolder,
      env,
      shell: WINDOWS,
      encoding: 'utf8',
    })
  expect((JSON.parse(automata('check', '--json')) as { ok: boolean }).ok, 'a new game is sound').toBe(true)
  const listed = JSON.parse(automata('words', '--json')) as { source: string; unread: { language: string }[] }
  expect(listed.source).toBe('es')
  expect(listed.unread.some((word) => word.language === 'en')).toBe(true)
  automata('words', '--read', 'pt')
  const marked = JSON.parse(automata('words', '--json')) as { unread: { language: string }[] }
  expect(marked.unread.some((word) => word.language === 'pt')).toBe(false)
  const again = JSON.parse(automata('check', '--json')) as { ok: boolean }
  expect(again.ok, 'and sound after marking').toBe(true)

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
/** The hero's y, read from the running game: a jump takes it away from where it stood. */
const heroY = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const game = (window as unknown as PageWindow).automataGame
    const hero = game?.sim.describeSnapshot().entities.find((entity) => 'player' in entity.components)
    return hero?.components.transform?.y ?? Number.NaN
  })
/** How many sparks the hero has taken: the game's own count, which the spark's touch adds to. */
const sparksTaken = (page: Page): Promise<number> =>
  page.evaluate(
    () =>
      (window as unknown as PageWindow).automataGame?.sim.describeSnapshot().resources['hero.score']?.sparks ??
      Number.NaN,
  )
const tickOf = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as PageWindow).automataGame?.sim.tick ?? -1)

const POLL = { timeout: 30_000, intervals: [50, 100, 250] }

/** A new game asks the player's language first, and plays nothing until Go is pressed: one flag, then Go. */
async function pickLanguage(page: Page, flag: string): Promise<void> {
  const go = page.locator('.automata-picker-go')
  await go.waitFor({ state: 'visible', timeout: 30_000 })
  expect(await tickOf(page), 'nothing plays before a language is chosen').toBe(-1)
  await page.locator(`.automata-flag[data-language="${flag}"]`).click()
  await go.click()
}

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
        await pickLanguage(page, 'en')

        // The game is on screen, and time passes in it.
        await expect.poll(() => tickOf(page), POLL).toBeGreaterThan(0)
        expect(pictures.length, `${where}: the hero's picture was fetched`).toBeGreaterThan(0)
        const before = await tickOf(page)
        await expect.poll(() => tickOf(page), POLL).toBeGreaterThan(before)

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

        // The keys' hint is for a keyboard: shown at the desktop size and gone once the hero has moved, never on touch.
        const hint = page.locator('.hint')
        if (size.touch) expect(await hint.count(), `${where}: the hint on a touch screen`).toBe(0)
        else await expect.poll(() => hint.isVisible(), POLL).toBe(true)

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
          await expect.poll(() => hint.count(), POLL).toBe(0)
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

          // A player whose device speaks Japanese is told the keys in Japanese, and the page says it is Japanese.
          const japanese = await browser.newContext({
            viewport: { width: size.width, height: size.height },
            locale: 'ja-JP',
          })
          try {
            const other = await japanese.newPage()
            await other.goto(address)
            await pickLanguage(other, 'ja')
            const told = other.locator('.hint')
            await expect.poll(() => told.textContent(), POLL).toContain('矢印キー')
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
for (const name of Object.keys(ENGINES) as (keyof typeof ENGINES)[]) {
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
        await expect.poll(() => page.locator('.hint').textContent(), POLL).toContain('방향키')
        expect(await page.evaluate(() => document.documentElement.lang)).toBe('ko')

        await page.reload()
        await expect.poll(() => tickOf(page), POLL).toBeGreaterThan(0)
        expect(await page.locator('.automata-picker').count(), 'a kept language is not asked again').toBe(0)
      } finally {
        await french.close()
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
        await pickLanguage(page, 'ja')
        await expect.poll(() => tickOf(page), POLL).toBeGreaterThan(0)
        const start = await heroX(page)
        const floor = await heroY(page)
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
          await expect.poll(() => tickOf(page), POLL).toBeGreaterThan(0)
        } finally {
          await context.close()
        }
      }
    } finally {
      await browser.close()
    }
  }, 300_000)
}
