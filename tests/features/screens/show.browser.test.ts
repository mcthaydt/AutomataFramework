// `show` puts any screen over a mount: a box that fills it, the screen's language in `lang`, the kit's keys, and the
// screen made again, with the focus where it was, when the language changes.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { show } from '#src/features/screens/show.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { type FakeGamepads, fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'
import { testLocale } from '../../fixtures/screens/locale.ts'
import { Sheet } from '../../fixtures/ui/sheet.ts'

const FRAME = 1000 / 60

let mount: HTMLDivElement
let screen: ReturnType<typeof show> | undefined
let frames: ManualFrames
let fake: FakeGamepads

beforeEach(async () => {
  await page.viewport(390, 844)
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px'
  document.body.append(mount)
  frames = manualFrames()
  fake = fakeGamepads()
  fake.connect(0)
})
afterEach(() => {
  screen?.destroy()
  screen = undefined
  mount.remove()
})

test('the screen fills the mount, is named, and says its language', () => {
  const { locale } = testLocale('ko')
  screen = show(Sheet, { mount, locale, name: 'sheet', frames, gamepads: fake.getGamepads }, () => ({
    log: () => {},
  }))
  const box = mount.querySelector('.automata-screen') as HTMLElement
  expect(box.dataset.screen).toBe('sheet')
  expect(box.lang).toBe('ko')
  const [outer, inner] = [mount.getBoundingClientRect(), box.getBoundingClientRect()]
  expect([inner.left, inner.top, inner.width, inner.height]).toEqual([
    outer.left,
    outer.top,
    outer.width,
    outer.height,
  ])
  // With no language there is no `lang`, rather than a wrong one.
  screen.destroy()
  const none = testLocale(null)
  screen = show(Sheet, { mount, locale: none.locale, name: 'sheet' }, () => ({ log: () => {} }))
  expect(mount.querySelector('.automata-screen')?.hasAttribute('lang')).toBe(false)
})

test('a mount that is not positioned is made so while the screen is there, and as it was after', () => {
  mount.style.position = ''
  expect(getComputedStyle(mount).position).toBe('static')
  const { locale } = testLocale('es')
  screen = show(Sheet, { mount, locale, name: 'sheet' }, () => ({ log: () => {} }))
  expect(getComputedStyle(mount).position).toBe('relative')
  screen.destroy()
  expect(getComputedStyle(mount).position).toBe('static')
})

test('destroy takes the screen off, stops its keys, and is safe to call twice', () => {
  const log: string[] = []
  const { locale } = testLocale('es')
  screen = show(Sheet, { mount, locale, name: 'sheet', frames, gamepads: fake.getGamepads }, () => ({
    log: (what) => log.push(what),
  }))
  frames.at(0)
  screen.destroy()
  screen.destroy()
  expect(mount.querySelector('.automata-screen')).toBeNull()
  fake.press('south')
  frames.advance(FRAME)
  expect(log).toEqual([])
})

test('show() says a screen again in the new language and keeps the focus where it was', () => {
  const seen: string[] = []
  const language = testLocale('es')
  screen = show(
    Sheet,
    { mount, locale: language.locale, name: 'sheet', frames, gamepads: fake.getGamepads },
    (words) => {
      seen.push(words('automata.warnings.title'))
      return { log: () => {}, long: false }
    },
  )
  expect(seen).toEqual(['Antes de jugar'])
  const box = mount.querySelector('.automata-screen') as HTMLElement
  // The focus is on the switch, the third of the screen's controls.
  const toggle = box.querySelector<HTMLElement>('[role="switch"]') as HTMLElement
  toggle.focus()
  language.set('ja')
  expect(seen).toEqual(['Antes de jugar', 'プレイする前に'])
  expect(box.lang).toBe('ja')
  const now = document.activeElement as HTMLElement
  expect(now.getAttribute('role')).toBe('switch')
  expect(now).not.toBe(toggle)
  expect(now.isConnected).toBe(true)
})

test('update() makes the props again where the screen stands', () => {
  let times = 0
  const { locale } = testLocale('es')
  screen = show(Sheet, { mount, locale, name: 'sheet' }, () => {
    times += 1
    return { log: () => {} }
  })
  expect(times).toBe(1)
  screen.update()
  expect(times).toBe(2)
  expect(mount.querySelectorAll('.automata-screen')).toHaveLength(1)
})

test('the screen tells its sounds: a press, a move and a back, named ui.*', async () => {
  const sounds: string[] = []
  let backs = 0
  const { locale } = testLocale('es')
  screen = show(
    Sheet,
    {
      mount,
      locale,
      name: 'sheet',
      frames,
      gamepads: fake.getGamepads,
      onSound: (event) => sounds.push(event),
      onBack: () => {
        backs += 1
      },
    },
    () => ({ log: () => {} }),
  )
  frames.at(0)
  // "Play" has the focus: the bottom button presses it, down moves to the next, and the right button goes back.
  for (const button of ['south', 'dpad-down', 'east'] as const) {
    fake.press(button)
    frames.advance(FRAME)
    fake.release(button)
    frames.advance(FRAME)
  }
  expect(sounds).toEqual(['ui.press', 'ui.move', 'ui.back'])
  expect(backs).toBe(1)
  await userEvent.keyboard('{Escape}')
  expect(backs).toBe(2)
})
