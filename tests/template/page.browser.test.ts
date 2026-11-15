// The template's page in each real browser: it starts the game, shows a broken file in words, keeps a changed key, tells
// a keyboard player which keys to press, gives a thumb two whole halves at every screen size, and asks a player with no
// language for one, in flags, before it says anything.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { Player } from '#src/features/commands/commands.ts'
import type { Language } from '#src/features/content/content.ts'
import { testHost } from '#src/features/host/host.ts'
import { LANGUAGE_SETTINGS_DEFAULT, LanguageSettingsSchema } from '#src/features/locale/locale.ts'
import { Transform } from '#src/features/physics/physics.ts'
import { openSettings } from '#src/features/saves/saves.ts'
import { type Page, startPage } from '../../template/src/features/page/page.ts'
import style from '../../template/src/style.css?raw'
import { FRAME, key, run } from '../fixtures/game/co-op-game.ts'
import { type ManualFrames, manualFrames } from '../fixtures/game/frames.ts'
import { SCREENS } from '../fixtures/game/screens.ts'
import { readFiles, readPicture, templateFiles } from './game.ts'

let root: HTMLElement
let started: Page | undefined
let sheet: HTMLStyleElement

beforeEach(() => {
  // The page's own stylesheet and element, so it is laid out as it is for a player.
  sheet = document.createElement('style')
  sheet.textContent = style
  document.head.append(sheet)
  root = document.createElement('main')
  root.id = 'game'
  document.body.append(root)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  started?.stop()
  started = undefined
  root.remove()
  sheet.remove()
  vi.restoreAllMocks()
})

type Host = ReturnType<typeof testHost>

/** What the player chose last time, kept before the page starts as the page itself keeps it. */
async function remember(host: Host, language: Language): Promise<void> {
  const settings = await openSettings({ game: 'my-game', store: host.store })
  const section = settings.section({
    name: 'language',
    schema: LanguageSettingsSchema,
    initial: LANGUAGE_SETTINGS_DEFAULT,
  })
  await section.set({ format: 1, language })
}

/**
 * Starts the page on the template's files, with frames driven by hand; the first frame has set the clock. With
 * `language` the player chose it last time, so the page goes straight to the game; without it, a host that does not
 * speak a language the game has is asked.
 */
async function open(
  options: { files?: Record<string, string>; host?: Host; coarse?: boolean; language?: Language } = {},
): Promise<{ frames: ManualFrames; shown: Page }> {
  const frames = manualFrames()
  const host = options.host ?? testHost()
  if (options.language !== undefined) await remember(host, options.language)
  const shown = await startPage(root, {
    read: readFiles(options.files),
    readPicture,
    host,
    frames,
    coarse: options.coarse ?? false,
  })
  started = shown
  frames.at(0)
  return { frames, shown }
}

const heroX = (shown: Page): number => {
  const hero = shown.game?.sim.query(Player, Transform)[0]
  if (hero === undefined) throw new Error('There is no hero.')
  return hero.get(Transform).x
}

test('the page starts the game, and holding right moves the hero', async () => {
  await page.viewport(1280, 720)
  const { frames, shown } = await open({ language: 'en' })
  expect(root.dataset.state).toBe('playing')
  run(frames, 30)
  const before = heroX(shown)
  key('keydown', 'ArrowRight')
  run(frames, 30)
  key('keyup', 'ArrowRight')
  expect(heroX(shown)).toBeGreaterThan(before + 1)
})

test('a broken level is shown in words, in the page', async () => {
  const level = JSON.parse(templateFiles['content/levels/level-1.json'] ?? '') as { things: { x: unknown }[] }
  ;(level.things[0] as { x: unknown }).x = 'far'
  const { shown } = await open({ files: { 'content/levels/level-1.json': JSON.stringify(level) } })
  expect(shown.game).toBeUndefined()
  expect(root.dataset.state).toBe('problem')
  expect(root.textContent).toContain('This game has a problem and cannot start.')
  expect(root.textContent).toContain('content/levels/level-1.json: things[0].x: This must be a number.')
  expect(root.querySelector('canvas')).toBeNull()
})

test("a picture that was never painted is said in the player's language, with the command that paints it", async () => {
  const frames = manualFrames()
  const unpainted = async (path: string): Promise<Blob> => {
    if (path === 'content/figures/hero.png') throw new Error(`${path}: no such file`)
    return readPicture(path)
  }
  const host = testHost({ deviceLanguages: ['es-ES'] })
  await remember(host, 'es')
  started = await startPage(root, {
    read: readFiles(),
    readPicture: unpainted,
    host,
    frames,
    coarse: false,
  })
  expect(root.dataset.state).toBe('problem')
  expect(root.textContent).toContain('Este juego tiene un problema y no puede empezar.')
  expect(root.textContent).toContain('content/figures/hero.png')
  expect(root.querySelector('.problem p')?.textContent).toContain('npm run art')
  expect(root.textContent).not.toContain('Fix the file named above')
})

test('a changed key is still there on a fresh page', async () => {
  const host = testHost()
  const first = await open({ host, language: 'en' })
  expect(first.shown.game?.input.rebind('jump', 'keys', 'KeyK').ok).toBe(true)
  // The page saves the change by itself; give the store a moment to take it.
  await new Promise((done) => setTimeout(done, 20))
  first.shown.stop()

  const second = await open({ host })
  expect(second.shown.game?.input.controls().jump?.keys).toEqual(['KeyK'])
})

test('a keyboard player is told the keys, until they move', async () => {
  await page.viewport(1280, 720)
  const { frames } = await open({ language: 'en' })
  const hint = (): string | undefined => root.querySelector('.hint')?.textContent ?? undefined
  expect(hint()).toBe('Arrow keys to move. Space to jump.')
  key('keydown', 'ArrowRight')
  run(frames, 2)
  key('keyup', 'ArrowRight')
  expect(hint()).toBeUndefined()
})

test('a hero with the dash switched on is told its key too', async () => {
  await page.viewport(1280, 720)
  // What the README tells a developer to do: `"dash": true` in the hero's file, and a key for it in the tuning's list.
  const heroFile = JSON.parse(templateFiles['content/characters/hero.json'] as string)
  heroFile.moves.dash = true
  const tuning = JSON.parse(templateFiles['content/tunings/hero-moves.json'] as string)
  tuning.controls.push({ action: 'dash', label: 'Dash', keys: ['ShiftLeft'] })
  await open({
    language: 'en',
    files: {
      'content/characters/hero.json': JSON.stringify(heroFile),
      'content/tunings/hero-moves.json': JSON.stringify(tuning),
    },
  })
  expect(root.querySelector('.hint')?.textContent).toBe('Arrow keys to move. Space to jump. Shift to dash.')
})

/** The flag of a language on the picker, and Go. */
const flag = (language: Language): HTMLButtonElement => {
  const found = root.querySelector<HTMLButtonElement>(`.automata-flag[data-language='${language}']`)
  if (found === null) throw new Error(`The page has no flag for ${language}.`)
  return found
}
const go = (): HTMLButtonElement => {
  const found = root.querySelector<HTMLButtonElement>('.automata-picker-go')
  if (found === null) throw new Error('The page has no Go.')
  return found
}
const playing = (): Promise<void> => vi.waitFor(() => expect(root.dataset.state).toBe('playing'))

test('a player whose device speaks French is asked for a language, in flags, and then plays in it', async () => {
  await page.viewport(1280, 720)
  const host = testHost({ deviceLanguages: ['fr-FR'] })
  const { shown } = await open({ host })
  expect(root.dataset.state).toBe('picking')
  const flags = [...root.querySelectorAll('.automata-flag')]
  expect(flags.map((b) => b.getAttribute('data-language'))).toEqual(['zh', 'es', 'en', 'pt', 'ja', 'ko'])
  expect(flags.filter((b) => b.getAttribute('aria-pressed') === 'true')).toEqual([])
  expect(root.querySelector('canvas')).toBeNull()
  // Go with nothing chosen does nothing.
  go().click()
  await new Promise((done) => setTimeout(done, 50))
  expect(root.dataset.state).toBe('picking')

  flag('ko').click()
  go().click()
  await playing()
  expect(root.querySelector('.hint')?.textContent).toBe('이동: 방향키 점프: 스페이스바')
  expect(document.documentElement.lang).toBe('ko')
  shown.stop()

  // The next page on the same device is not asked again, and speaks Korean at once.
  await open({ host })
  expect(root.dataset.state).toBe('playing')
  expect(root.querySelector('.hint')?.textContent).toBe('이동: 방향키 점프: 스페이스바')
})

test('a player whose device speaks Spanish finds Mexico first and pressed, and one press of Go plays in Spanish', async () => {
  await page.viewport(1280, 720)
  await open({ host: testHost({ deviceLanguages: ['es-ES'] }) })
  expect(root.dataset.state).toBe('picking')
  const first = root.querySelector('.automata-flag')
  expect([first?.getAttribute('data-language'), first?.getAttribute('aria-pressed')]).toEqual(['es', 'true'])
  go().click()
  await playing()
  expect(root.querySelector('.hint')?.textContent).toBe('Las flechas para moverte. Espacio para saltar.')
  expect(document.documentElement.lang).toBe('es')
})

test('while the files load the page has no letters, only a mark that says it is busy', async () => {
  const frames = manualFrames()
  const gate: { open: () => void } = { open: () => undefined }
  const held = new Promise<void>((resolve) => {
    gate.open = resolve
  })
  const reading = readFiles()
  const loading = startPage(root, {
    read: async (path) => {
      await held
      return reading(path)
    },
    readPicture,
    host: testHost({ deviceLanguages: ['fr-FR'] }),
    frames,
    coarse: false,
  })
  expect(root.dataset.state).toBe('loading')
  expect(root.textContent).toBe('')
  const mark = root.querySelector('.loading')
  expect([mark?.getAttribute('role'), mark?.getAttribute('aria-busy')]).toEqual(['status', 'true'])
  gate.open()
  started = await loading
  expect(root.dataset.state).toBe('picking')
})

test('stopping the page while it asks for a language empties it, and no game starts', async () => {
  const { shown } = await open({ host: testHost({ deviceLanguages: ['fr-FR'] }) })
  expect(root.dataset.state).toBe('picking')
  flag('ja').click()
  shown.stop()
  expect(root.childElementCount).toBe(0)
  // Nothing is left to start a game later.
  await new Promise((done) => setTimeout(done, 50))
  expect(root.childElementCount).toBe(0)
  expect(shown.game).toBeUndefined()
})

test('the touch halves say their words in the language of the device', async () => {
  await page.viewport(390, 844)
  await open({ language: 'pt', coarse: true })
  window.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', bubbles: true }))
  const label = (half: string): string =>
    root.querySelector(`[data-half='${half}']`)?.getAttribute('aria-label') ?? ''
  expect([label('walk'), label('jump')]).toEqual(['Andar', 'Pular'])
})

test('a player with a finger on the screen is not told about keys', async () => {
  await page.viewport(390, 844)
  await open({ language: 'en', coarse: true })
  expect(root.querySelector('.hint')).toBeNull()
})

const frames2 = (): Promise<void> =>
  new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))

for (const [name, w, h] of SCREENS) {
  test(`on ${name} the two thumb halves are whole, inside the screen and side by side`, async () => {
    await page.viewport(w, h)
    expect([window.innerWidth, window.innerHeight]).toEqual([w, h])
    const { frames } = await open({ language: 'en', coarse: true })
    // A finger on the screen brings up the thumbs, as it does for a player on a phone.
    window.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', bubbles: true }),
    )
    for (let i = 0; i < 30; i++) frames.advance(FRAME)
    await frames2()
    frames.advance(FRAME)

    const rect = (half: string): DOMRect => {
      const found = root.querySelector(`[data-half='${half}']`)
      expect(found, `the ${half} half`).not.toBeNull()
      return (found as HTMLElement).getBoundingClientRect()
    }
    const walk = rect('walk')
    const jump = rect('jump')
    for (const [label, r] of [
      ['walk', walk],
      ['jump', jump],
    ] as const) {
      expect(r.width, `${label} width`).toBeGreaterThanOrEqual(w * 0.4)
      expect(r.height, `${label} height`).toBeGreaterThanOrEqual(120)
      expect(r.left, `${label} left`).toBeGreaterThanOrEqual(0)
      expect(r.top, `${label} top`).toBeGreaterThanOrEqual(0)
      expect(r.right, `${label} right`).toBeLessThanOrEqual(w)
      expect(r.bottom, `${label} bottom`).toBeLessThanOrEqual(h)
    }
    expect(walk.right, 'the walking half is left of the jumping one').toBeLessThanOrEqual(jump.left + 1)
    await page.screenshot({ element: root, path: `__screenshots__/template-${name}.png` })
  })
}
