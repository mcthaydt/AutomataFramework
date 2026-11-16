// The new game, made from the packed package and served by its own `automata play`: the setup the create journeys share.
// CI gives the tarball it packed in `CREATE_TARBALL`, so the bytes tested are the bytes a release would ship.
import { type ChildProcess, execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type BrowserContext, chromium, firefox, type Page, webkit } from 'playwright'
import { expect } from 'vitest'

export const shots = fileURLToPath(new URL('./__screenshots__/', import.meta.url))
export const ENGINES = { chromium, webkit, firefox }

export interface Size {
  readonly width: number
  readonly height: number
  /** A touch screen: the buttons are on from the start, and a person holds one. */
  readonly touch: boolean
}

export const SIZES: readonly Size[] = [
  { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true },
  { width: 820, height: 1180, touch: true },
  { width: 1180, height: 820, touch: true },
  { width: 1280, height: 720, touch: false },
]

/** What a page's own `window` offers an agent or a test, as far as the journeys read it. */
export interface PageGame {
  readonly sim: {
    readonly tick: number
    describeSnapshot(): {
      readonly entities: readonly { readonly components: Record<string, Record<string, number>> }[]
      readonly resources: Record<string, { readonly sparks?: number } | undefined>
    }
  }
}
export type PageWindow = { automataGame?: PageGame }

const WINDOWS = process.platform === 'win32'
const npx = WINDOWS ? 'npx.cmd' : 'npx'
const npm = WINDOWS ? 'npm.cmd' : 'npm'

export const freePort = (): Promise<number> =>
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
export const portIsFree = (port: number): Promise<boolean> =>
  new Promise((done) => {
    const probe = createServer()
    probe.once('error', () => done(false))
    probe.listen(port, () => probe.close(() => done(true)))
  })

/** A game `automata create` made, and the server that plays it. */
export interface MadeGame {
  readonly work: string
  readonly gameFolder: string
  /** The path of the first level's file. */
  readonly level: string
  readonly env: NodeJS.ProcessEnv
  address: string
  play: ChildProcess | undefined
}

/** Makes `my-game` from the packed package, with `source` as its language, and installs it, in a folder with a space in its name. */
export async function makeGame(source: string): Promise<MadeGame> {
  const given = process.env.CREATE_TARBALL
  if (given === undefined || !existsSync(given))
    throw new Error('CREATE_TARBALL names the packed package and it is missing: run create-pack first.')
  // The tarball, or the folder CI downloaded it into.
  const inside = statSync(given).isDirectory() ? readdirSync(given) : []
  const found = inside.find((name) => name.endsWith('.tgz'))
  const tarball = resolve(found === undefined ? given : join(given, found))
  // A folder with a space in its name, as a person's own often has.
  const work = mkdtempSync(join(tmpdir(), 'create journey '))
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
      source,
      '--framework',
      `file:${slashes}`,
    ],
    { cwd: work, env, shell: WINDOWS, stdio: 'inherit' },
  )
  const gameFolder = join(work, 'my-game')
  execFileSync(npm, ['install', '--no-audit', '--no-fund'], {
    cwd: gameFolder,
    env,
    shell: WINDOWS,
    stdio: 'inherit',
  })
  return {
    work,
    gameFolder,
    level: join(gameFolder, 'content', 'levels', 'level-1.json'),
    env,
    address: '',
    play: undefined,
  }
}

/** Runs `npx --no automata <args>` in the game and returns what it printed. */
export const runAutomata = (game: MadeGame, ...args: string[]): string =>
  execFileSync(npx, ['--no', 'automata', ...args], {
    cwd: game.gameFolder,
    env: game.env,
    shell: WINDOWS,
    encoding: 'utf8',
  })

/** Runs an npm command in the game, with its output on the log. */
export const runNpm = (game: MadeGame, ...args: string[]): void => {
  execFileSync(npm, args, { cwd: game.gameFolder, env: game.env, shell: WINDOWS, stdio: 'inherit' })
}

/** Serves the game with its own `automata play` and waits until it answers. */
export async function serveGame(game: MadeGame): Promise<void> {
  const port = await freePort()
  game.address = `http://localhost:${port}/`
  const play = spawn(npx, ['--no', 'automata', 'play', '--no-open', '--port', String(port)], {
    cwd: game.gameFolder,
    env: game.env,
    shell: WINDOWS,
    detached: !WINDOWS,
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  game.play = play
  play.stdout?.on('data', (chunk) => process.stdout.write(`[play] ${chunk}`))
  for (let waited = 0; waited < 60_000; waited += 500) {
    if (play.exitCode !== null)
      throw new Error(`automata play ended with ${play.exitCode} before it served the game.`)
    const answered = await fetch(game.address).then(
      (response) => response.ok,
      () => false,
    )
    if (answered) break
    await new Promise((done) => setTimeout(done, 500))
  }
  mkdirSync(shots, { recursive: true })
}

/** Stops `play` with Ctrl+C's own signal, checks the port is free again, and removes the folder. */
export async function stopGame(game: MadeGame): Promise<void> {
  const child = game.play
  if (child !== undefined && child.exitCode === null && child.pid !== undefined) {
    const ended = new Promise((done) => child.once('exit', done))
    if (WINDOWS) execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'])
    else process.kill(-child.pid, 'SIGINT')
    await Promise.race([ended, new Promise((done) => setTimeout(done, 5000))])
    expect(child.exitCode !== null || child.signalCode !== null, 'automata play stops on Ctrl+C').toBe(true)
    const port = Number(new URL(game.address).port)
    expect(await portIsFree(port), 'the port is free again').toBe(true)
  }
  if (game.work !== '') rmSync(game.work, { recursive: true, force: true, maxRetries: 5 })
}

/** The hero's x, read from the running game. */
export const heroX = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const game = (window as unknown as PageWindow).automataGame
    const hero = game?.sim.describeSnapshot().entities.find((entity) => 'player' in entity.components)
    return hero?.components.transform?.x ?? Number.NaN
  })
/** The hero's y, read from the running game: a jump takes it away from where it stood. */
export const heroY = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const game = (window as unknown as PageWindow).automataGame
    const hero = game?.sim.describeSnapshot().entities.find((entity) => 'player' in entity.components)
    return hero?.components.transform?.y ?? Number.NaN
  })
/** How many sparks the hero has taken: the game's own count, which the spark's touch adds to. */
export const sparksTaken = (page: Page): Promise<number> =>
  page.evaluate(
    () =>
      (window as unknown as PageWindow).automataGame?.sim.describeSnapshot().resources['hero.score']
        ?.sparks ?? Number.NaN,
  )
export const tickOf = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as PageWindow).automataGame?.sim.tick ?? -1)

export const POLL = { timeout: 30_000, intervals: [50, 100, 250] }

/** A touch screen as the game's own question sees it: every page of the context says its pointer is coarse. */
export async function markCoarse(context: BrowserContext): Promise<void> {
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
}

/** A new game asks the player's language first, and plays nothing until Go is pressed: one flag, then Go. */
export async function pickLanguage(page: Page, flag: string): Promise<void> {
  const go = page.locator('.automata-picker-go')
  await go.waitFor({ state: 'visible', timeout: 30_000 })
  expect(await tickOf(page), 'nothing plays before a language is chosen').toBe(-1)
  await page.locator(`.automata-flag[data-language="${flag}"]`).click()
  await go.click()
}

/** The menu's first button is Play, or Continue when a game was kept: one press and the level opens, waiting for a first press. */
export async function playFromMenu(page: Page): Promise<void> {
  const play = page.locator('#game[data-state="menu"] [data-screen="menu"] button').first()
  await play.waitFor({ state: 'visible', timeout: 30_000 })
  await play.click()
  await page.locator('#game[data-state="playing"]').waitFor({ timeout: 30_000 })
  await expect.poll(() => tickOf(page), POLL).toBeGreaterThanOrEqual(0)
}

/** From the picker to the level: a flag, Go, the splash, Play on the menu. */
export async function intoTheLevel(page: Page, flag: string): Promise<void> {
  await pickLanguage(page, flag)
  await playFromMenu(page)
}
