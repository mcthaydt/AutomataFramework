// The whole default flow on a page, driven by clicks, keys and fake pad presses, reading `data-state` and what a person
// sees: warnings, the flags, the splash, the menu, the level, pause, "Well done!" and back.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { testSpeaker } from '#src/features/audio/audio.ts'
import { Player } from '#src/features/commands/commands.ts'
import { loadGame, writeContent } from '#src/features/content/content.ts'
import { type Flow, startFlow } from '#src/features/flow/flow.ts'
import { testHost } from '#src/features/host/host.ts'
import { createLocale, frameworkWords } from '#src/features/locale/locale.ts'
import { Transform } from '#src/features/physics/physics.ts'
import { openSettings } from '#src/features/saves/saves.ts'
import { SPLASH_MS } from '#src/features/screens/screens.ts'
import { definePlugin, defineSystem } from '#src/features/sim/sim.ts'
import { flowFiles, flowRead, flowReplay } from '../../fixtures/flow/game.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'

const GAME = 'flow-test'
const es = frameworkWords('es')

let mount: HTMLDivElement
let flow: Flow | undefined
let frames = manualFrames()

beforeEach(async () => {
  await page.viewport(390, 844)
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;inset:0'
  document.body.append(mount)
  frames = manualFrames()
})
afterEach(() => {
  flow?.stop()
  flow = undefined
  mount.remove()
})

type Host = ReturnType<typeof testHost>

/** The flow on `host` with the fixture's hero. A test never asks for the real page's speaker or reload. */
async function open(
  options: {
    host?: Host
    plugins?: Parameters<typeof startFlow>[0]['plugins']
    read?: (path: string) => Promise<string>
    watch?: Parameters<typeof startFlow>[0]['watch']
    reload?: () => void
    screens?: Parameters<typeof startFlow>[0]['screens']
    speaker?: ReturnType<typeof testSpeaker>
  } = {},
): Promise<Flow> {
  const pads = fakeGamepads()
  flow = await startFlow({
    mount,
    game: GAME,
    read: options.read ?? flowRead(),
    plugins: options.plugins ?? [heroPlugin],
    controls: fixtureControls,
    host: options.host ?? testHost({ deviceLanguages: ['es-MX'] }),
    speaker: options.speaker ?? testSpeaker(),
    frames,
    gamepads: pads.getGamepads,
    reload: options.reload ?? (() => {}),
    ...(options.watch === undefined ? {} : { watch: options.watch }),
    ...(options.screens === undefined ? {} : { screens: options.screens }),
  })
  return flow
}

const step = (): string => flow?.state().step ?? ''
const shown = async (want: string): Promise<void> => {
  await expect.poll(() => mount.dataset.state, { timeout: 10_000 }).toBe(want)
  // The step is `playing` as soon as the level is asked for; the game exists a moment later, and keys before then are lost.
  if (want === 'playing') await expect.poll(() => flow?.game() !== undefined, { timeout: 10_000 }).toBe(true)
}
/** What a person is told a button says: its words, or, for a picture, the name it carries. */
const nameOf = (b: HTMLElement): string =>
  (b.textContent ?? '').trim() || (b.getAttribute('aria-label') ?? '')
const button = (label: string): HTMLButtonElement => {
  const found = [...mount.querySelectorAll('button')].find((b) => nameOf(b) === label)
  if (found === undefined) throw new Error(`No button says "${label}". They say: ${buttonsText()}`)
  return found
}
const buttonsText = (): string => [...mount.querySelectorAll('button')].map(nameOf).join(' | ')
const press = (label: string): Promise<void> => userEvent.click(button(label))
const wait = async (label: string): Promise<void> => {
  await expect.poll(() => buttonsText().split(' | ').includes(label), { timeout: 10_000 }).toBe(true)
}
/** Lets time pass on the page's frames, as far as `ms`. */
const run = (ms: number): void => {
  for (let at = 0; at < ms; at += 100) frames.advance(100)
}
const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true }))
}

/** A player who chose `language` on an earlier visit. */
async function returning(host: Host, language: 'es' | 'ko'): Promise<void> {
  const loaded = await loadGame(flowRead())
  if (!loaded.ok) throw new Error('the flow game did not load')
  const settings = await openSettings({ game: GAME, store: host.store })
  await createLocale({ content: loaded.value, host, settings }).set(language)
}

test('a first visit: warnings, the flags, the splash, the menu, play, pause, well done, next level, well done, menu', async () => {
  const host = testHost({ deviceLanguages: ['es-MX'] })
  await open({ host })
  await shown('warnings')
  // The device speaks Spanish and the game has it, so the warning is read at once, in Spanish.
  expect(mount.textContent).toContain('Luces que parpadean.')
  await press('OK')
  await shown('picking')
  await expect.poll(() => mount.querySelector('.automata-picker-go')).not.toBeNull()
  ;(mount.querySelector('.automata-flag') as HTMLElement).click()
  ;(mount.querySelector('.automata-picker-go') as HTMLElement).click()
  await shown('splash')
  frames.at(0)
  run(SPLASH_MS + 200)
  await shown('menu')
  await wait(es('automata.menu.play'))
  await press(es('automata.menu.play'))
  await shown('playing')
  await expect.poll(() => mount.querySelector('canvas')).not.toBeNull()
  // Pause by the corner button, then keep playing.
  frames.at(0)
  await press(es('automata.pause.button'))
  await shown('paused')
  expect(flow?.game()?.paused()).toBe(true)
  await press(es('automata.pause.resume'))
  await shown('playing')
  expect(flow?.game()?.paused()).toBe(false)
  flow?.finishLevel()
  await shown('done')
  await wait(es('automata.done.next'))
  expect(mount.textContent).toContain('Nivel Uno')
  await press(es('automata.done.next'))
  await shown('playing')
  flow?.finishLevel()
  await shown('done')
  expect(mount.textContent).toContain(es('automata.done.game'))
  await press(es('automata.done.menu'))
  await shown('menu')
})

test('a later visit skips the flags: warnings, splash, menu', async () => {
  const host = testHost()
  await returning(host, 'ko')
  await open({ host })
  await shown('warnings')
  expect(mount.textContent).toContain('깜박이는 빛.')
  await press(frameworkWords('ko')('automata.warnings.ok'))
  await shown('splash')
  frames.at(0)
  run(SPLASH_MS + 200)
  await shown('menu')
})

test('a device the game does not speak: the flags come first and the warnings follow in the chosen language', async () => {
  await open({ host: testHost({ deviceLanguages: ['fr-FR'] }) })
  await shown('picking')
  await expect.poll(() => mount.querySelector('.automata-flag')).not.toBeNull()
  ;(mount.querySelector('.automata-flag[data-language="ko"]') as HTMLElement).click()
  ;(mount.querySelector('.automata-picker-go') as HTMLElement).click()
  await shown('warnings')
  expect(mount.textContent).toContain('깜박이는 빛.')
})

test('a game with no warning goes from loading to the flags or the splash', async () => {
  const host = testHost()
  await returning(host, 'es')
  await open({ host, read: flowRead({ noWarning: true }) })
  await shown('splash')
})

test('the door touched twice, and again under the done screen: one done screen, one save', async () => {
  const host = testHost()
  await returning(host, 'es')
  await open({ host, read: flowRead({ noWarning: true }) })
  await shown('splash')
  frames.at(0)
  run(SPLASH_MS + 200)
  await shown('menu')
  await wait(es('automata.menu.play'))
  await press(es('automata.menu.play'))
  await shown('playing')
  flow?.finishLevel()
  flow?.finishLevel()
  await shown('done')
  flow?.finishLevel()
  await wait(es('automata.done.next'))
  expect(mount.querySelectorAll('[data-screen="done"]')).toHaveLength(1)
  expect(flow?.progress()?.level).toBe('level-2')
})

test('a crate on the door does not end the level; the hero walking in does', async () => {
  const host = testHost()
  await returning(host, 'es')
  await open({ host, read: flowRead({ noWarning: true, crateOnDoor: true }) })
  await shown('splash')
  frames.at(0)
  run(SPLASH_MS + 200)
  await shown('menu')
  await wait(es('automata.menu.play'))
  await press(es('automata.menu.play'))
  await shown('playing')
  frames.at(0)
  run(600)
  // The crate has been touching the door since the first tick, and the level goes on.
  expect(step()).toBe('playing')
  key('keydown', 'ArrowRight')
  for (let tick = 0; tick < 240 && step() === 'playing'; tick++) frames.advance(1000 / 60)
  key('keyup', 'ArrowRight')
  expect(step()).toBe('done')
})

test('leaving from pause asks first, then shows the menu, and Play starts the level from its beginning', async () => {
  const host = testHost()
  await returning(host, 'es')
  await open({ host, read: flowRead({ noWarning: true }) })
  await shown('splash')
  frames.at(0)
  run(SPLASH_MS + 200)
  await shown('menu')
  await wait(es('automata.menu.play'))
  await press(es('automata.menu.play'))
  await shown('playing')
  frames.at(0)
  run(300)
  key('keydown', 'Escape')
  await shown('paused')
  await press(es('automata.pause.leave'))
  expect(step()).toBe('paused')
  await expect.poll(() => mount.querySelector('[role="alertdialog"]')).not.toBeNull()
  await press(es('automata.pause.leave-yes'))
  await shown('menu')
  expect(flow?.game()).toBeUndefined()
  // A level started again begins at its first tick.
  await wait(es('automata.menu.continue'))
  await press(es('automata.menu.continue'))
  await shown('playing')
  await expect.poll(() => flow?.game()?.sim.tick).toBe(0)
})

test('Settings opens from the menu and from pause, and Back returns to where it came from', async () => {
  const host = testHost()
  await returning(host, 'es')
  await open({ host, read: flowRead({ noWarning: true }) })
  await shown('splash')
  frames.at(0)
  run(SPLASH_MS + 200)
  await shown('menu')
  await wait(es('automata.menu.settings'))
  await press(es('automata.menu.settings'))
  await expect.poll(() => mount.querySelector('[data-screen="settings"]')).not.toBeNull()
  expect(mount.dataset.over).toBe('settings')
  expect(mount.querySelector('[data-screen="menu"]')).toBeNull()
  await press(es('automata.back'))
  await shown('menu')
  await wait(es('automata.menu.play'))
  expect(mount.dataset.over).toBeUndefined()
  expect(mount.querySelector('[data-screen="settings"]')).toBeNull()
  // From pause, the game stays held under it.
  await press(es('automata.menu.play'))
  await shown('playing')
  frames.at(0)
  run(200)
  key('keydown', 'Escape')
  await shown('paused')
  await press(es('automata.menu.settings'))
  await expect.poll(() => mount.querySelector('[data-screen="settings"]')).not.toBeNull()
  expect(flow?.game()?.paused()).toBe(true)
  await press(es('automata.back'))
  await wait(es('automata.pause.resume'))
  expect(step()).toBe('paused')
  expect(flow?.game()?.paused()).toBe(true)
})

test('a language chosen in Settings is the language of the menu when Back is pressed', async () => {
  const host = testHost()
  await returning(host, 'es')
  await open({ host, read: flowRead({ noWarning: true }) })
  await shown('splash')
  frames.at(0)
  run(SPLASH_MS + 200)
  await shown('menu')
  await wait(es('automata.menu.settings'))
  await press(es('automata.menu.settings'))
  await expect.poll(() => mount.querySelector('button[aria-label="한국어"]')).not.toBeNull()
  await userEvent.click(mount.querySelector('button[aria-label="한국어"]') as HTMLElement)
  const ko = frameworkWords('ko')
  await wait(ko('automata.back'))
  await press(ko('automata.back'))
  await wait(ko('automata.menu.play'))
  expect(flow?.locale()?.language()).toBe('ko')
})

test('watch mode: the recording plays with its line of words, and a tap on a first visit asks for the language', async () => {
  const host = testHost({ deviceLanguages: ['fr-FR'] })
  await open({ host, watch: await flowReplay(), read: flowRead({ noWarning: true }) })
  await shown('watching')
  expect(mount.querySelector('canvas')).not.toBeNull()
  await expect.poll(() => mount.textContent).toContain('Tap it to play')
  const heard: string[] = [step()]
  flow?.onState((state) => heard.push(state.step))
  await userEvent.click(mount.querySelector('.take') as HTMLElement)
  await shown('picking')
  expect(mount.querySelector('canvas')).toBeNull()
  // A flag and Go, and the level is played at once: the splash and the menu are skipped, this once.
  await expect.poll(() => mount.querySelector('.automata-picker-go')).not.toBeNull()
  ;(mount.querySelector('.automata-flag') as HTMLElement).click()
  ;(mount.querySelector('.automata-picker-go') as HTMLElement).click()
  await shown('playing')
  expect(heard).toEqual(['watching', 'picking', 'playing'])
  expect(flow?.state().level).toBe('level-1')
  // Leaving from pause is the ordinary visit again: the menu.
  frames.at(0)
  run(200)
  key('keydown', 'Escape')
  await shown('paused')
  await press(es('automata.pause.leave'))
  await expect.poll(() => mount.querySelector('[role="alertdialog"]')).not.toBeNull()
  await press(es('automata.pause.leave-yes'))
  await shown('menu')
})

test('a recording that cannot be read is skipped: the visit goes on as an ordinary one', async () => {
  const host = testHost()
  await returning(host, 'es')
  await open({
    host,
    watch: () => Promise.reject(new Error('no such recording')),
    read: flowRead({ noWarning: true }),
  })
  await shown('splash')
})

test('a page hidden while the hero runs pauses the game, and nothing is held when it comes back', async () => {
  const host = testHost()
  await returning(host, 'es')
  await open({ host, read: flowRead({ noWarning: true }) })
  await shown('splash')
  frames.at(0)
  run(SPLASH_MS + 200)
  await shown('menu')
  await wait(es('automata.menu.play'))
  await press(es('automata.menu.play'))
  await shown('playing')
  frames.at(0)
  const heroX = (): number => {
    const found = flow
      ?.game()
      ?.sim.query(Player, Transform)
      .find((one) => one.get(Player).number === 1)
    if (found === undefined) throw new Error('The game has no hero.')
    return found.get(Transform).x
  }
  run(200)
  key('keydown', 'ArrowRight')
  run(200)
  const hidden = heroX()
  expect(hidden).toBeGreaterThan(0)
  host.hide()
  await shown('paused')
  expect(flow?.game()?.paused()).toBe(true)
  // The page comes back and the game is still held: the player says when to go on.
  host.show()
  expect(step()).toBe('paused')
  expect(flow?.game()?.paused()).toBe(true)
  await press(es('automata.pause.resume'))
  await shown('playing')
  run(500)
  // The key that was down when the page left is not down now, so the hero stays where it stopped.
  expect(heroX()).toBe(hidden)
  key('keyup', 'ArrowRight')
})

// A rule that throws on the third tick, as a game's own code might.
const boom = defineSystem({
  name: 'boom.system',
  phase: 'gameplay',
  run(ctx) {
    if (ctx.tick === 3) throw new Error('the rules broke')
  },
})
const boomPlugin = definePlugin({ name: 'boom', systems: [boom] })

test('a game whose rules throw shows "The game stopped." and "Load the page again" calls reload', async () => {
  const host = testHost()
  await returning(host, 'es')
  let reloads = 0
  await open({
    host,
    plugins: [heroPlugin, boomPlugin],
    read: flowRead({ noWarning: true }),
    reload: () => {
      reloads += 1
    },
  })
  await shown('splash')
  frames.at(0)
  run(SPLASH_MS + 200)
  await shown('menu')
  await wait(es('automata.menu.play'))
  await press(es('automata.menu.play'))
  await shown('playing')
  frames.at(0)
  // The error still goes on to the page's handler; the flow has shown its screen by then.
  expect(() => run(500)).toThrow('the rules broke')
  await shown('problem')
  // The player is told in words; the rule's own message is for the console, which has it.
  expect(mount.querySelector('[role="alert"]')?.textContent).not.toContain('the rules broke')
  expect(mount.querySelector('[role="alert"]')?.textContent).toContain(es('automata.problem.title'))
  expect(mount.querySelector('canvas')).toBeNull()
  await press(es('automata.problem.reload'))
  expect(reloads).toBe(1)
})

test("a bad content file shows the check's sentences and no canvas", async () => {
  await open({ read: flowRead({ replace: { 'content/levels/level-2.json': '{ not json' } }) })
  await shown('problem')
  expect(mount.querySelector('[role="alert"]')?.textContent).toContain('level-2')
  expect(mount.querySelector('canvas')).toBeNull()
  // There is no language to speak in, so the button is a picture with a name.
  expect(mount.querySelector('button')?.getAttribute('aria-label')).toBe('Load the page again')
})

test('a game that is missing its first file shows the problem screen too', async () => {
  await open({ read: flowRead({ replace: { 'automata.toml': undefined } }) })
  await shown('problem')
})

test("a game's own screen in screens.menu is shown in place of the framework's", async () => {
  const host = testHost()
  await returning(host, 'es')
  let own = 0
  await open({
    host,
    read: flowRead({ noWarning: true }),
    screens: {
      menu: (options) => {
        own += 1
        const div = document.createElement('div')
        div.id = 'own-menu'
        options.mount.append(div)
        return { destroy: () => div.remove() }
      },
    },
  })
  await shown('splash')
  frames.at(0)
  run(SPLASH_MS + 200)
  await shown('menu')
  await expect.poll(() => mount.querySelector('#own-menu')).not.toBeNull()
  expect(own).toBe(1)
  expect(mount.querySelector('[data-screen="menu"]')).toBeNull()
})

test("a game's own word for automata.menu.play wins over the framework's", async () => {
  const host = testHost()
  await returning(host, 'es')
  // A word is said in every language the game has, as the check of its words asks.
  const own = { en: 'Go', es: 'Vamos', ko: '시작' }
  const replace: Record<string, string> = {}
  for (const [language, word] of Object.entries(own)) {
    const file = `content/messages/${language}.json`
    const messages = JSON.parse(flowFiles({ noWarning: true })[file] ?? '{}') as {
      messages: Record<string, string>
    }
    messages.messages['automata.menu.play'] = word
    replace[file] = writeContent('messages', messages as never)
  }
  await open({ host, read: flowRead({ noWarning: true, replace }) })
  await shown('splash')
  frames.at(0)
  run(SPLASH_MS + 200)
  await shown('menu')
  await wait('Vamos')
})

test('stop() while the files load, while the flags show and while a level starts leaves the mount empty', async () => {
  // While the files load.
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const read = flowRead()
  const slow = async (path: string): Promise<string> => {
    await gate
    return read(path)
  }
  await open({ host: testHost({ deviceLanguages: ['fr-FR'] }), read: slow })
  expect(mount.dataset.state).toBe('loading')
  flow?.stop()
  release()
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(mount.childElementCount).toBe(0)
  // While the flags show.
  mount.replaceChildren()
  await open({ host: testHost({ deviceLanguages: ['fr-FR'] }), read: flowRead({ noWarning: true }) })
  await shown('picking')
  flow?.stop()
  expect(mount.childElementCount).toBe(0)
  // While a level starts.
  const host = testHost()
  await returning(host, 'es')
  await open({ host, read: flowRead({ noWarning: true }) })
  await shown('splash')
  frames.at(0)
  run(SPLASH_MS + 200)
  await shown('menu')
  await wait(es('automata.menu.play'))
  await press(es('automata.menu.play'))
  flow?.stop()
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(mount.childElementCount).toBe(0)
})
