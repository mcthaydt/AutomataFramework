// The settings screen: language, sound, touch and controls in one list, each change made at once and kept, a key changed
// by touch, keyboard or gamepad, and every size it is looked at on.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { SOUND_SETTINGS_DEFAULT, type SoundSettings } from '#src/features/audio/audio.ts'
import { openSections, type Sections } from '#src/features/flow/sections.ts'
import { testHost } from '#src/features/host/host.ts'
import { createInput, type Input } from '#src/features/input/input.ts'
import { createLocale, frameworkWords, type Locale } from '#src/features/locale/locale.ts'
import { settingsKey } from '#src/features/saves/define.ts'
import { memoryStore } from '#src/features/saves/saves.ts'
import { settingsScreen } from '#src/features/screens/settings.ts'
import { flowGame } from '../../fixtures/flow/game.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { type ManualFrames, manualFrames } from '../../fixtures/game/frames.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { type FakeGamepads, fakeGamepads } from '../../fixtures/input/fake-gamepads.ts'

const FRAME = 1000 / 60
const GAME = 'settings-test'
const es = frameworkWords('es')

let mount: HTMLDivElement
let screen: ReturnType<typeof settingsScreen> | undefined
let frames: ManualFrames
let pads: FakeGamepads
let input: Input
let sections: Sections
let locale: Locale
let heard: string[]
let volumes: SoundSettings
let backs: number
let vibration: boolean[]

beforeEach(async () => {
  await page.viewport(390, 844)
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;inset:0'
  document.body.append(mount)
  frames = manualFrames()
  pads = fakeGamepads()
  heard = []
  volumes = SOUND_SETTINGS_DEFAULT
  backs = 0
  vibration = []
})
afterEach(() => {
  screen?.destroy()
  screen = undefined
  input?.destroy()
  mount.remove()
})

/** The screen on a fresh test host (or `host`), the player in Spanish, with the fixture game's three languages. */
async function open(
  options: {
    host?: ReturnType<typeof testHost>
    sound?: boolean
    canBuzz?: boolean
    coarse?: boolean
    sharing?: boolean
    state?: 'on' | 'waiting' | 'unavailable'
    erase?: () => Promise<{ ok: boolean }>
  } = {},
): Promise<void> {
  const host = options.host ?? testHost()
  sections = await openSections({ game: GAME, host })
  locale = createLocale({ content: await flowGame(), host, settings: sections.settings })
  await locale.set('es')
  input = createInput({
    mount: document.createElement('div'),
    controls: fixtureControls,
    frames,
    words: locale.words,
    settings: sections.controls.get(),
    gamepads: pads.getGamepads,
  })
  input.onBindings((changed) => void sections.controls.set(changed))
  screen = settingsScreen({
    mount,
    locale,
    frames,
    gamepads: pads.getGamepads,
    ...(options.sound === false
      ? {}
      : {
          audio: {
            volumes: () => volumes,
            setVolumes: (next) => {
              volumes = next
            },
            sample: (bus) => heard.push(bus),
            state: () => options.state ?? 'on',
            onState: () => () => {},
          },
          sound: sections.sound,
        }),
    input,
    touch: sections.touch,
    onVibration: (on) => vibration.push(on),
    canBuzz: options.canBuzz ?? true,
    coarse: options.coarse ?? false,
    ...(sections.settings.problem === undefined ? {} : { problem: sections.settings.problem }),
    sharing: options.sharing ?? false,
    ...(options.erase === undefined ? {} : { onDeleteSaves: options.erase }),
    onBack: () => {
      backs += 1
    },
  })
  frames.at(0)
}

const buttons = (): HTMLButtonElement[] => [...mount.querySelectorAll('button')]
const named = (label: string): HTMLButtonElement => {
  const found = buttons().find((button) => button.textContent?.trim() === label)
  if (found === undefined) throw new Error(`No button says "${label}".`)
  return found
}
const slider = (label: string): HTMLElement =>
  mount.querySelector(`[role="slider"][aria-label="${label}"]`) as HTMLElement
const switchOf = (label: string): HTMLElement | undefined =>
  [...mount.querySelectorAll<HTMLElement>('[role="switch"]')].find((one) => one.textContent?.trim() === label)
/** The Change button of the keyboard's or gamepad's row of `action`, by its place in the list of rows. */
const changeOf = (group: 'keyboard' | 'gamepad', action: string): HTMLButtonElement => {
  const title = es(group === 'keyboard' ? 'automata.settings.keyboard' : 'automata.settings.gamepad')
  const heading = [...mount.querySelectorAll('h3')].find((one) => one.textContent === title) as HTMLElement
  const rows: HTMLElement[] = []
  for (let next = heading.nextElementSibling; next?.classList.contains('key'); next = next.nextElementSibling)
    rows.push(next as HTMLElement)
  const row = rows.find((one) => one.querySelector('.action')?.textContent === action) as HTMLElement
  return row.querySelector('button') as HTMLButtonElement
}
const rowSays = (group: 'keyboard' | 'gamepad', action: string): string =>
  changeOf(group, action).parentElement?.querySelector('.input')?.textContent ?? ''
const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true }))
}
const tap = (button: Parameters<FakeGamepads['press']>[0]): void => {
  pads.press(button)
  frames.advance(FRAME)
  pads.release(button)
  frames.advance(FRAME)
}

test.each(SCREENS)(
  'at %s every row is at least 44 px, only the list scrolls, and Back is 48 px',
  async (_name, w, h) => {
    await page.viewport(w, h)
    pads.connect(0)
    await open()
    const small = [...mount.querySelectorAll<HTMLElement>('button, [role="slider"], [role="switch"]')].filter(
      (control) => {
        const box = control.getBoundingClientRect()
        return box.width < 44 || box.height < 44
      },
    )
    const names = small.map((control) => control.textContent?.trim() || control.getAttribute('aria-label'))
    expect(names).toEqual([])
    expect(buttons()[0]?.textContent?.trim()).toBe(es('automata.back'))
    expect(buttons()[0]?.getBoundingClientRect().height).toBeGreaterThanOrEqual(48)
    const root = document.scrollingElement as Element
    expect([root.scrollWidth <= window.innerWidth, root.scrollHeight <= window.innerHeight]).toEqual([
      true,
      true,
    ])
    const list = mount.querySelector('[role="region"]') as HTMLElement
    expect(getComputedStyle(list).overflowY).toBe('auto')
    for (const element of mount.querySelectorAll<HTMLElement>('*')) {
      if (element === list) continue
      expect(['auto', 'scroll']).not.toContain(getComputedStyle(element).overflowY)
    }
  },
)

test('the parts are in the order of the device: the keyboard last for a finger, the touch part last for a keyboard', async () => {
  await open({ coarse: true })
  const headings = (): string[] => [...mount.querySelectorAll('h2')].map((one) => one.textContent ?? '')
  expect(headings()).toEqual(
    ['language', 'sound', 'touch', 'controls'].map((part) => es(`automata.settings.${part}`)),
  )
  screen?.destroy()
  await open({ coarse: false })
  expect(headings()).toEqual(
    ['language', 'sound', 'controls', 'touch'].map((part) => es(`automata.settings.${part}`)),
  )
})

test('the music slider changes what the audio is told, and letting go plays one sample', async () => {
  await open()
  const music = slider(es('automata.settings.music'))
  music.focus()
  // One press of the arrow at the focused slider, as a person with a keyboard would.
  await userEvent.keyboard('{ArrowLeft}')
  await expect.poll(() => volumes.music).toBeCloseTo(SOUND_SETTINGS_DEFAULT.music - 0.05, 5)
  expect(volumes.sound).toBe(SOUND_SETTINGS_DEFAULT.sound)
  await expect.poll(() => heard.at(-1)).toBe('music')
})

test('the volume is kept: a fresh page opens with the slider where it was left', async () => {
  const host = testHost()
  await open({ host })
  slider(es('automata.settings.music')).focus()
  await userEvent.keyboard('{End}')
  await expect.poll(() => sections.sound.get().music).toBe(1)
  // A page that is opened afresh reads what the store holds.
  const again = await openSections({ game: GAME, host })
  expect(again.sound.get().music).toBe(1)
  screen?.destroy()
  input.destroy()
  await open({ host })
  expect(slider(es('automata.settings.music')).getAttribute('aria-valuenow')).toBe('100')
})

test('choosing a flag says every word on the screen in that language at once, and a fresh page keeps it', async () => {
  const host = testHost()
  await open({ host })
  expect(buttons()[0]?.textContent?.trim()).toBe(es('automata.back'))
  await userEvent.click(mount.querySelector('button[aria-label="한국어"]') as HTMLElement)
  const ko = frameworkWords('ko')
  await expect.poll(() => buttons()[0]?.textContent?.trim()).toBe(ko('automata.back'))
  expect(mount.querySelector('h1')?.textContent).toBe(ko('automata.settings.title'))
  expect(mount.querySelector('.automata-screen')?.getAttribute('lang')).toBe('ko')
  // The flag the player chose says it is the one.
  expect(mount.querySelector('button[aria-label="한국어"]')?.getAttribute('aria-pressed')).toBe('true')
  const again = createLocale({
    content: await flowGame(),
    host,
    settings: (await openSections({ game: GAME, host })).settings,
  })
  expect(again.language()).toBe('ko')
})

test('a key is changed by touch then keyboard: Change, press K, the row says K', async () => {
  await open()
  expect(rowSays('keyboard', 'Jump')).toBe(es('automata.key.space'))
  await userEvent.click(changeOf('keyboard', 'Jump'))
  await expect.poll(() => mount.textContent).toContain(es('automata.settings.press-key', { action: 'Jump' }))
  // The button on the row is now the way out.
  expect(changeOf('keyboard', 'Jump').textContent?.trim()).toBe(es('automata.settings.cancel'))
  key('keydown', 'KeyK')
  key('keyup', 'KeyK')
  await expect.poll(() => rowSays('keyboard', 'Jump')).toBe('K')
  expect(input.controls().jump?.keys[0]).toBe('KeyK')
  // The change is kept for the next visit.
  await expect.poll(() => sections.controls.get().bindings.jump?.keys?.[0]).toBe('KeyK')
})

test('Cancel leaves the row as it was', async () => {
  await open()
  await userEvent.click(changeOf('keyboard', 'Jump'))
  await userEvent.click(named(es('automata.settings.cancel')))
  await expect.poll(() => rowSays('keyboard', 'Jump')).toBe(es('automata.key.space'))
  expect(mount.textContent).not.toContain(es('automata.settings.press-key', { action: 'Jump' }))
})

test('a reserved key is refused in words under the row and nothing changes', async () => {
  await open()
  await userEvent.click(changeOf('keyboard', 'Jump'))
  key('keydown', 'Tab')
  key('keyup', 'Tab')
  await expect.poll(() => mount.querySelector('[role="alert"]')).not.toBeNull()
  expect(mount.querySelector('[role="alert"]')?.textContent).toContain('Tab')
  expect(rowSays('keyboard', 'Jump')).toBe(es('automata.key.space'))
  expect(input.controls().jump?.keys[0]).toBe('Space')
})

test('a gamepad button is changed with the gamepad alone', async () => {
  pads.connect(0)
  await open()
  frames.advance(FRAME)
  expect(rowSays('gamepad', 'Jump')).toBe(es('automata.pad.south'))
  changeOf('gamepad', 'Jump').focus()
  tap('south')
  const press = es('automata.settings.press-button', { action: 'Jump' })
  await expect.poll(() => mount.textContent).toContain(press)
  tap('west')
  await expect.poll(() => rowSays('gamepad', 'Jump')).toBe(es('automata.pad.west'))
  expect(input.controls().jump?.pad?.[0]).toBe('west')
})

test('"Put the controls back" asks first; yes puts every row back; no changes nothing', async () => {
  await open()
  await userEvent.click(changeOf('keyboard', 'Jump'))
  key('keydown', 'KeyK')
  key('keyup', 'KeyK')
  await expect.poll(() => rowSays('keyboard', 'Jump')).toBe('K')
  await userEvent.click(named(es('automata.settings.reset')))
  await expect.poll(() => mount.querySelector('[role="alertdialog"]')).not.toBeNull()
  // No: the question closes and the row still says K.
  await userEvent.click(named(es('automata.keep')))
  await expect.poll(() => mount.querySelector('[role="alertdialog"]')).toBeNull()
  expect(rowSays('keyboard', 'Jump')).toBe('K')
  // Yes: the game's own key is back.
  await userEvent.click(named(es('automata.settings.reset')))
  await userEvent.click(named(es('automata.settings.reset-yes')))
  await expect.poll(() => rowSays('keyboard', 'Jump')).toBe(es('automata.key.space'))
  expect(input.controls().jump?.keys[0]).toBe('Space')
})

test('the phone is turned while a slider has the focus: it still has it, and nothing is cut off', async () => {
  await open()
  const music = slider(es('automata.settings.music'))
  music.focus()
  await page.viewport(844, 390)
  frames.advance(FRAME)
  expect(document.activeElement).toBe(slider(es('automata.settings.music')))
  const box = (document.activeElement as HTMLElement).getBoundingClientRect()
  expect(box.right).toBeLessThanOrEqual(window.innerWidth)
  const root = document.scrollingElement as Element
  expect(root.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
})

test('Swap sides moves the pause button and the thumbs, and a fresh page keeps it', async () => {
  const host = testHost()
  await open({ host })
  expect(input.swapSides()).toBe(false)
  await userEvent.click(switchOf(es('automata.settings.swap')) as HTMLElement)
  await expect.poll(() => input.swapSides()).toBe(true)
  await expect.poll(() => sections.touch.get().swapSides).toBe(true)
  expect(switchOf(es('automata.settings.swap'))?.getAttribute('aria-checked')).toBe('true')
  expect((await openSections({ game: GAME, host })).touch.get().swapSides).toBe(true)
})

test('Vibration is shown only where the host can buzz, and tells the running game', async () => {
  await open({ canBuzz: false })
  expect(switchOf(es('automata.settings.vibration'))).toBeUndefined()
  screen?.destroy()
  input.destroy()
  await open({ canBuzz: true })
  await userEvent.click(switchOf(es('automata.settings.vibration')) as HTMLElement)
  await expect.poll(() => vibration).toEqual([false])
  await expect.poll(() => sections.touch.get().vibration).toBe(false)
})

test('a game with no sound has no Sound part, and a browser that is waiting says so', async () => {
  await open({ sound: false })
  expect(mount.querySelector('[role="slider"]')).toBeNull()
  screen?.destroy()
  input.destroy()
  await open({ state: 'waiting' })
  expect(mount.textContent).toContain(es('automata.settings.sound-waiting'))
  screen?.destroy()
  input.destroy()
  await open({ state: 'unavailable' })
  expect(mount.textContent).toContain(es('automata.settings.sound-none'))
})

test('settings that could not be read say so once, at the top', async () => {
  const store = memoryStore({ [settingsKey(GAME)]: '{ not json' })
  await open({ host: testHost({ store }) })
  const notices = [...mount.querySelectorAll('[role="status"]')].map((one) => one.textContent)
  expect(notices).toEqual([es('automata.settings.lost')])
})

test('a store that refuses: the change works for the visit and says it was not kept', async () => {
  const store = memoryStore()
  await open({ host: testHost({ store }) })
  store.refuse('failed')
  await userEvent.click(switchOf(es('automata.settings.swap')) as HTMLElement)
  await expect.poll(() => input.swapSides()).toBe(true)
  await expect.poll(() => mount.textContent).toContain(es('automata.settings.not-kept'))
  expect(mount.querySelectorAll('[role="status"]')).toHaveLength(1)
})

test("Back, Escape and the pad's right button each go back", async () => {
  pads.connect(0)
  await open()
  await userEvent.click(named(es('automata.back')))
  expect(backs).toBe(1)
  key('keydown', 'Escape')
  key('keyup', 'Escape')
  expect(backs).toBe(2)
  tap('east')
  expect(backs).toBe(3)
})

test('Sound is a switch above the sliders: off, the speaker is given 0 and 0 and the sliders keep their numbers', async () => {
  await open()
  const on = switchOf(es('automata.settings.sound'))
  expect(on?.getAttribute('aria-checked')).toBe('true')
  // The switch comes before the first slider.
  const order = [...mount.querySelectorAll('[role="switch"], [role="slider"]')]
  expect(order[0]).toBe(on)
  await userEvent.click(on as HTMLElement)
  await expect.poll(() => volumes).toMatchObject({ music: 0, sound: 0 })
  expect(sections.sound.get().muted).toBe(true)
  expect(slider(es('automata.settings.music')).getAttribute('aria-valuenow')).toBe(
    String(SOUND_SETTINGS_DEFAULT.music),
  )
  await userEvent.click(switchOf(es('automata.settings.sound')) as HTMLElement)
  await expect
    .poll(() => volumes)
    .toMatchObject({ music: SOUND_SETTINGS_DEFAULT.music, sound: SOUND_SETTINGS_DEFAULT.sound })
  expect(sections.sound.get().muted).toBe(false)
})

test('a slider moved while the sound is off changes nothing the player hears', async () => {
  await open()
  await userEvent.click(switchOf(es('automata.settings.sound')) as HTMLElement)
  slider(es('automata.settings.music')).focus()
  await userEvent.keyboard('{ArrowLeft}')
  await expect.poll(() => sections.sound.get().music).toBeLessThan(SOUND_SETTINGS_DEFAULT.music)
  expect(volumes).toMatchObject({ music: 0, sound: 0 })
})

test('with no way to erase, Settings has no "Delete all my saves"', async () => {
  await open()
  expect(buttons().map((one) => one.textContent?.trim())).not.toContain(es('automata.settings.delete'))
})

test('"Delete all my saves" is the last row, asks first with "Keep them" focused, and Escape keeps them', async () => {
  let erased = 0
  await open({
    erase: () => {
      erased += 1
      return Promise.resolve({ ok: true })
    },
  })
  const all = buttons()
  expect(all.at(-1)?.textContent?.trim()).toBe(es('automata.settings.delete'))
  await userEvent.click(named(es('automata.settings.delete')))
  const dialog = mount.querySelector('[role="alertdialog"]') as HTMLElement
  expect(dialog.textContent).toContain(es('automata.settings.delete-ask'))
  expect(document.activeElement?.textContent?.trim()).toBe(es('automata.settings.delete-no'))
  await userEvent.keyboard('{Escape}')
  expect(mount.querySelector('[role="alertdialog"]')).toBeNull()
  expect(erased).toBe(0)
  await userEvent.click(named(es('automata.settings.delete')))
  await userEvent.click(named(es('automata.settings.delete-yes')))
  expect(erased).toBe(1)
  expect(mount.querySelector('[role="alertdialog"]')).toBeNull()
})

test('an erase that could not be finished says once that it was not kept', async () => {
  await open({ erase: () => Promise.resolve({ ok: false }) })
  await userEvent.click(named(es('automata.settings.delete')))
  await userEvent.click(named(es('automata.settings.delete-yes')))
  await expect.poll(() => mount.textContent).toContain(es('automata.settings.not-kept'))
  expect(mount.querySelectorAll('[role="status"]')).toHaveLength(1)
})
