// A player and the language of a game, end to end in each real browser: the full game on a real page, a device that
// says Korean, a tap on 日本語, and everything the player reads changes with it while the game goes on. The page is
// `tests/fixtures/locale/page.ts`, loaded in a frame of the size under test so the buttons are measured where a thumb
// would meet them.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page as browser } from 'vitest/browser'
import { LANGUAGES } from '#src/features/content/content.ts'
import { LANGUAGE_NAMES } from '#src/features/locale/locale.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import type { LocalePage } from '../../fixtures/locale/page.ts'
import { openPage } from '../../fixtures/saves/open-page.ts'

const PAGE = new URL('../../fixtures/locale/page.ts', import.meta.url).href
const GAME = 'language-journey'
const KEY = `automata.${GAME}.settings`

beforeEach(() => localStorage.removeItem(KEY))
afterEach(() => localStorage.removeItem(KEY))

const open = (size: { width: number; height: number }, query = '') =>
  openPage<LocalePage>(size, `${PAGE}?game=${GAME}${query}`)

test('a first-time player whose device says Korean is greeted in Korean', async () => {
  const { page, close } = await open({ width: 390, height: 844 }, '&device=ko-KR')
  try {
    const shown = await page.shown()
    expect(shown.language).toBe('ko')
    expect(shown.greeting).toBe('안녕하세요!')
    expect(shown.lang).toBe('ko')
  } finally {
    close()
  }
})

test('a player taps 日本語 and everything on the page is Japanese', async () => {
  const { page, close } = await open({ width: 390, height: 844 }, '&device=en-US')
  try {
    const before = await page.shown()
    expect([before.language, before.greeting, before.level]).toEqual(['en', 'Hello there! 👋', 'Level 1'])
    expect(before.refused).toBe('This game is for one player.')
    expect(before.touch.buttons).toEqual(['Left', 'Right', 'Jump'])
    await page.run(30)
    const ticksBefore = (await page.shown()).tick
    expect(ticksBefore).toBeGreaterThan(0)

    await page.tap('ja')
    const shown = await page.shown()
    expect(shown.language).toBe('ja')
    expect(shown.lang).toBe('ja')
    expect(shown.greeting).toBe('こんにちは！')
    expect(shown.level).toBe('レベル1')
    expect(shown.refused).toBe('このゲームは1人用です。')
    expect(shown.touch.overlay).toBe('タッチ操作')
    // Audit J1: the three touch buttons, said again in Japanese.
    expect(shown.touch.buttons).toEqual(['左', '右', 'ジャンプ'])
    expect(shown.pressed).toEqual(['ja'])
    // The game was not restarted: the canvas is the same one and the sim goes on counting from where it was.
    expect(shown.canvas).toBe(true)
    expect(shown.tick).toBe(ticksBefore)
    await page.run(10)
    expect((await page.shown()).tick).toBeGreaterThan(ticksBefore)
  } finally {
    close()
  }
})

for (const [name, width, height] of SCREENS) {
  test(`on ${name} every language's button can be read and pressed`, async () => {
    await browser.viewport(width, height)
    expect([window.innerWidth, window.innerHeight]).toEqual([width, height])
    const { page, close } = await open({ width, height })
    try {
      const boxes = await page.buttons()
      expect(boxes.map((b) => b.language)).toEqual([...LANGUAGES])
      for (const box of boxes) {
        expect(box.name, box.language).toBe(LANGUAGE_NAMES[box.language])
        expect(box.height, `${box.name} height`).toBeGreaterThanOrEqual(48)
        expect(box.width, `${box.name} width`).toBeGreaterThanOrEqual(48)
        expect(box.inside, `${box.name} is whole on the screen`).toBe(true)
        expect(box.reachable, `${box.name} is not covered`).toBe(true)
      }
      // Audit J3: each name is drawn, in the page's font: a picture of it differs from a picture of characters that
      // have no letter, which is all an empty box is.
      expect(await page.drawn()).toEqual(Object.fromEntries(LANGUAGES.map((language) => [language, true])))
    } finally {
      close()
    }
  })
}

test('changing the language moves no hash', async () => {
  const { page, close } = await open({ width: 390, height: 844 })
  try {
    const same = await page.hashOfPlay(120)
    const changed = await page.hashOfPlay(120, { at: 60, to: 'ko' })
    expect(changed).toBe(same)
    // And a second run of the same play is the same again, so the comparison above could have failed.
    expect(await page.hashOfPlay(120)).toBe(same)
    expect(await page.hashOfPlay(119)).not.toBe(same)
  } finally {
    close()
  }
})

test('a picture of the page in each language', async () => {
  await browser.viewport(390, 844)
  for (const language of LANGUAGES) {
    const { page, close } = await open({ width: 390, height: 844 }, '&device=en-US')
    try {
      await page.run(20)
      await page.tap(language)
      await page.run(2)
      await browser.screenshot({ path: `__screenshots__/language-${language}.png` })
    } finally {
      close()
    }
  }
})
