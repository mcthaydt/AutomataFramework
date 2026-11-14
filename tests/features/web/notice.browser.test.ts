import { afterEach, beforeEach, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { createAudio, testSpeaker } from '#src/features/audio/audio.ts'
import { soundNotice } from '#src/features/web/web.ts'
import { loadFull } from '../../fixtures/audio/content.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'

let mount: HTMLDivElement
let removeNotice: (() => void) | undefined

beforeEach(() => {
  mount = document.createElement('div')
  document.body.append(mount)
})
afterEach(() => {
  removeNotice?.()
  removeNotice = undefined
  mount.remove()
})

/** The button, or null. */
const button = (): HTMLButtonElement | null => mount.querySelector('[data-automata="sound-notice"]')

/** A real audio over a test speaker, with the full game's cues. */
async function setup(state?: 'unavailable') {
  const speaker = testSpeaker(state === undefined ? {} : { state })
  const audio = createAudio({ content: await loadFull(), speaker })
  return { speaker, audio }
}

test('while the sound waits, the button says "Tap to start the sound"', async () => {
  const { audio } = await setup()
  removeNotice = soundNotice({ mount, audio })
  expect(button()?.textContent).toBe('Tap to start the sound')
})

test('other words are shown as given', async () => {
  const { audio } = await setup()
  removeNotice = soundNotice({ mount, audio, words: 'Toca para oír el sonido' })
  expect(button()?.textContent).toBe('Toca para oír el sonido')
})

test('it goes on the tap and comes back when the sound is taken away', async () => {
  const { speaker, audio } = await setup()
  removeNotice = soundNotice({ mount, audio })
  speaker.tap()
  expect(button()).toBeNull()
  speaker.interrupt()
  expect(button()).not.toBeNull()
})

test('a device with no sound gets no button', async () => {
  const { audio } = await setup('unavailable')
  removeNotice = soundNotice({ mount, audio })
  expect(button()).toBeNull()
})

test('a game with no cue gets no button', async () => {
  const audio = createAudio({ content: await loadFixtureGame(), speaker: testSpeaker() })
  removeNotice = soundNotice({ mount, audio })
  expect(button()).toBeNull()
})

test('the function it returns removes the button and stops listening', async () => {
  const { speaker, audio } = await setup()
  const remove = soundNotice({ mount, audio })
  remove()
  expect(button()).toBeNull()
  speaker.tap()
  speaker.interrupt()
  expect(button()).toBeNull()
})

test.each(SCREENS)(
  'on %s it is inside the mount, at least 48 px high, with 18 px words',
  async (name, w, h) => {
    await page.viewport(w, h)
    expect([window.innerWidth, window.innerHeight]).toEqual([w, h])
    // The mount is away from the page's corner, so a button placed against the page and not the mount would be seen.
    mount.style.cssText = 'position:fixed;left:30px;top:40px;right:30px;bottom:40px;background:#6cb4e8'
    const { audio } = await setup()
    removeNotice = soundNotice({ mount, audio })
    const shown = button()
    expect(shown).not.toBeNull()
    const box = (shown as HTMLButtonElement).getBoundingClientRect()
    const room = mount.getBoundingClientRect()
    expect(box.height).toBeGreaterThanOrEqual(48)
    expect(box.left).toBeGreaterThanOrEqual(room.left + 16)
    expect(box.right).toBeLessThanOrEqual(room.right - 16)
    expect(box.top).toBeGreaterThanOrEqual(room.top)
    expect(box.bottom).toBeLessThanOrEqual(room.bottom)
    expect(getComputedStyle(shown as HTMLButtonElement).fontSize).toBe('18px')
    await page.screenshot({ element: mount, path: `__screenshots__/sound-notice-${name}.png` })
  },
)

test('a static mount is made relative while the button is there, and given back', async () => {
  const { speaker, audio } = await setup()
  expect(getComputedStyle(mount).position).toBe('static')
  removeNotice = soundNotice({ mount, audio })
  expect(getComputedStyle(mount).position).toBe('relative')
  speaker.tap()
  expect(getComputedStyle(mount).position).toBe('static')
})

test("a game's CSS properties dress it", async () => {
  const { audio } = await setup()
  mount.style.setProperty('--automata-notice-background', 'rgb(1, 2, 3)')
  removeNotice = soundNotice({ mount, audio })
  expect(getComputedStyle(button() as HTMLButtonElement).backgroundColor).toBe('rgb(1, 2, 3)')
})

test('it does not take the focus', async () => {
  const { audio } = await setup()
  const before = document.activeElement
  removeNotice = soundNotice({ mount, audio })
  expect(document.activeElement).toBe(before)
})
