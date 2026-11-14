// The first-run screen of a player who has no language, end to end in each real browser: the full game on a real page
// (`tests/fixtures/locale/page.ts`, in a frame of the size under test), a device that says what it says, and a person's
// finger, key or pad. Every journey begins with nothing stored, and the pages that follow one read what it stored.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page as browser } from 'vitest/browser'
import { LANGUAGES, type Language } from '#src/features/content/content.ts'
import { LANGUAGE_NAMES, LANGUAGE_TAGS } from '#src/features/locale/locale.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import type { LocalePage, PressHow } from '../../fixtures/locale/page.ts'
import { openPage } from '../../fixtures/saves/open-page.ts'

const PAGE = new URL('../../fixtures/locale/page.ts', import.meta.url).href
const PREFIX = 'picker-journey'
const SIZE = { width: 390, height: 844 }
/** The flags in the order players of each speak them. */
const ORDER = ['zh', 'es', 'en', 'pt', 'ja', 'ko'] as const

/** Every setting this file's pages kept, so one journey never starts from another's choice. */
function forget(): void {
  for (const key of Object.keys(localStorage))
    if (key.startsWith(`automata.${PREFIX}`)) localStorage.removeItem(key)
}
beforeEach(forget)
afterEach(forget)

type Shown = Awaited<ReturnType<LocalePage['shown']>>
/** What a page says once the game is playing: the words and the language, in an object a failure shows whole. */
const greeted = ({ phase, language, lang, greeting }: Shown) => ({
  phase,
  language,
  lang,
  greeting,
})

const open = (name: string, query = '', size: { width: number; height: number } = SIZE) =>
  openPage<LocalePage>(size, `${PAGE}?game=${PREFIX}-${name}${query}`)

test('a French device is asked, in flags, and the game starts in the language chosen', async () => {
  const first = await open('french', '&device=fr-FR')
  try {
    const picker = await first.page.picker()
    expect(picker?.flags).toEqual([...ORDER])
    expect(picker?.pressed).toEqual([])
    // Nothing to read in a language nobody has picked: no title, no letters, and Go says nothing yet.
    expect(picker?.titleVisible).toBe(false)
    expect(picker?.text).toBe('')
    expect(picker?.goDisabled).toBe(true)
    await first.page.press('touch')
    const waiting = await first.page.shown()
    expect([waiting.phase, waiting.canvases, waiting.language]).toEqual(['picking', 0, undefined])

    await first.page.tapFlag('ko')
    const chosen = await first.page.picker()
    expect(chosen?.pressed).toEqual(['ko'])
    expect(chosen?.titleVisible).toBe(true)
    expect(chosen?.title).toBe('한국어로 플레이')
    expect(chosen?.go).toBe('시작')
    expect(chosen?.lang).toBe('ko')
    await first.page.press('touch')
    expect(greeted(await first.page.shown())).toEqual({
      phase: 'playing',
      language: 'ko',
      lang: 'ko',
      greeting: '안녕하세요!',
    })
    expect(await first.page.picker()).toBeUndefined()
  } finally {
    first.close()
  }
  // A second page on the same storage is not asked again.
  const second = await open('french', '&device=fr-FR')
  try {
    await second.page.started()
    expect(await second.page.picker()).toBeUndefined()
    const shown = await second.page.shown()
    expect([shown.language, shown.greeting]).toEqual(['ko', '안녕하세요!'])
  } finally {
    second.close()
  }
})

for (const how of ['touch', 'enter', 'pad'] as const satisfies readonly PressHow[]) {
  test(`a Japanese device starts in Japanese with one press of Go (${how})`, async () => {
    const { page, close } = await open(`japanese-${how}`, '&device=ja-JP')
    try {
      const picker = await page.picker()
      expect(picker?.flags[0]).toBe('ja')
      expect(picker?.pressed).toEqual(['ja'])
      // Said in the device's language before anything is touched.
      expect(picker?.title).toBe('日本語でプレイ')
      expect(picker?.go).toBe('スタート')
      await page.press(how)
      expect(greeted(await page.shown())).toEqual({
        phase: 'playing',
        language: 'ja',
        lang: 'ja',
        greeting: 'こんにちは！',
      })
    } finally {
      close()
    }
  })
}

test('the settings row lists the language first, and a flag changes every word while the game goes on', async () => {
  const first = await open('settings', '&device=en-US&saved=ko')
  try {
    await first.page.started()
    const row = (await first.page.buttons()).map((b) => b.language)
    expect(row).toEqual(['ko', 'zh', 'es', 'en', 'pt', 'ja'])
    await first.page.run(30)
    const ticks = (await first.page.shown()).tick
    expect(ticks).toBeGreaterThan(0)
    await first.page.tap('es')
    const shown = await first.page.shown()
    expect(greeted(shown).greeting).toBe('¡Hola!')
    expect([shown.language, shown.level]).toEqual(['es', 'Nivel 1'])
    expect(shown.refused).not.toBe('')
    expect(shown.refused).not.toBe('This game is for one player.')
    expect(shown.touch.buttons).toEqual(['Izquierda', 'Derecha', 'Saltar'])
    expect(shown.pressed).toEqual(['es'])
    expect(shown.tick).toBe(ticks)
    await first.page.run(10)
    expect((await first.page.shown()).tick).toBeGreaterThan(ticks)
  } finally {
    first.close()
  }
  const second = await open('settings', '&device=en-US')
  try {
    await second.page.started()
    const shown = await second.page.shown()
    expect([shown.language, shown.greeting]).toEqual(['es', '¡Hola!'])
    expect((await second.page.buttons()).map((b) => b.language)[0]).toBe('es')
  } finally {
    second.close()
  }
})

test('a game whose own words are Korean says its missing Spanish word in Korean, and the rest in Spanish', async () => {
  const { page, close } = await open('korean-source', '&source=ko&drop=es:keeper.hello&saved=es')
  try {
    await page.started()
    const shown = await page.shown()
    expect(shown.language).toBe('es')
    expect(shown.greeting).toBe('안녕하세요!')
    expect(shown.level).toBe('Nivel 1')
  } finally {
    close()
  }
})

test('a page that is watching shows the level in the device language, and a tap asks for a language first', async () => {
  const { page, close } = await open('watch', '&watch&device=ja-JP')
  try {
    const watching = await page.shown()
    expect([watching.phase, watching.level, watching.canvas]).toEqual(['watching', 'レベル1', true])
    expect(await page.picker()).toBeUndefined()
    await page.takeOver()
    const picker = await page.picker()
    expect(picker?.pressed).toEqual(['ja'])
    await page.press('touch')
    expect((await page.shown()).phase).toBe('playing')
    expect(await page.holdRight(30)).toBeGreaterThan(0)
  } finally {
    close()
  }
})

test('with the storage refused the game still starts, and the next page asks again', async () => {
  const query = '&storage=refused&device=fr-FR'
  const first = await open('refused', query)
  try {
    await first.page.tapFlag('ko')
    await first.page.press('touch')
    expect(greeted(await first.page.shown())).toEqual({
      phase: 'playing',
      language: 'ko',
      lang: 'ko',
      greeting: '안녕하세요!',
    })
  } finally {
    first.close()
  }
  const second = await open('refused', query)
  try {
    const picker = await second.page.picker()
    expect(picker?.pressed).toEqual([])
    expect((await second.page.shown()).phase).toBe('picking')
  } finally {
    second.close()
  }
})

test('two presses of Go in one task start one game and keep the choice once', async () => {
  const { page, close } = await open('twice', '&device=fr-FR')
  try {
    await page.tapFlag('pt')
    const answer = await page.pressTwice()
    expect(answer).toEqual({ canvases: 1, writes: 1 })
  } finally {
    close()
  }
})

test("each flag's name is its own language's, and its drawing is read in that language", async () => {
  const { page, close } = await open('names', '&device=fr-FR')
  try {
    const names = (await page.picker())?.flagNames ?? {}
    expect(Object.keys(names).sort()).toEqual([...LANGUAGES].sort())
    for (const language of LANGUAGES)
      expect(names[language], language).toEqual({
        name: LANGUAGE_NAMES[language],
        lang: LANGUAGE_TAGS[language],
      })
  } finally {
    close()
  }
})

test('the arrow keys walk the flags and stop at the ends, and Tab onto a flag chooses it', async () => {
  const { page, close } = await open('keys', '&device=fr-FR')
  try {
    const pressed = async (): Promise<readonly Language[]> => (await page.picker())?.pressed ?? []
    await page.key('ArrowRight')
    expect(await pressed()).toEqual(['zh'])
    await page.key('ArrowRight')
    expect(await pressed()).toEqual(['es'])
    await page.key('ArrowLeft')
    expect(await pressed()).toEqual(['zh'])
    await page.key('ArrowLeft')
    expect(await pressed()).toEqual(['zh'])
    await page.focusFlag('en')
    expect(await pressed()).toEqual(['en'])
  } finally {
    close()
  }
})

test('the pad walks the flags too, and south starts the game', async () => {
  const { page, close } = await open('pad', '&device=fr-FR')
  try {
    await page.padPress('dpad-right')
    await page.padPress('dpad-right')
    expect((await page.picker())?.pressed).toEqual(['es'])
    await page.padPress('dpad-left')
    expect((await page.picker())?.pressed).toEqual(['zh'])
    await page.press('pad')
    expect((await page.shown()).language).toBe('zh')
  } finally {
    close()
  }
})

for (const [name, width, height] of SCREENS) {
  test(`on ${name} every flag and Go can be seen and pressed, and each flag is drawn`, async () => {
    await browser.viewport(width, height)
    expect([window.innerWidth, window.innerHeight]).toEqual([width, height])
    const { page, close } = await open(`screen-${name}`, '&device=fr-FR', { width, height })
    try {
      const boxes = await page.buttons()
      expect(boxes.map((b) => b.language)).toEqual([...ORDER, 'go'])
      for (const box of boxes) {
        expect(box.height, `${box.language} height`).toBeGreaterThanOrEqual(48)
        expect(box.width, `${box.language} width`).toBeGreaterThanOrEqual(48)
        expect(box.inside, `${box.language} is whole on the screen`).toBe(true)
        expect(box.reachable, `${box.language} is not covered`).toBe(true)
      }
      expect(await page.drawn()).toEqual(Object.fromEntries(LANGUAGES.map((language) => [language, true])))
      await browser.screenshot({ path: `__screenshots__/picker-${name}.png` })
      await page.tapFlag('ko')
      expect((await page.picker())?.pressed).toEqual(['ko'])
      // With a flag chosen the title shows too, and every button is still whole.
      for (const box of await page.buttons()) {
        expect(box.inside, `${box.language} is whole once Korea is chosen`).toBe(true)
        expect(box.reachable, `${box.language} is not covered once Korea is chosen`).toBe(true)
      }
      await browser.screenshot({ path: `__screenshots__/picker-chosen-${name}.png` })
    } finally {
      close()
    }
  })
}
