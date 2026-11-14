// The language a player picks is the language of the next page: it is kept with the game's settings in the browser's
// own storage, and read again by a second, real page. Where the storage says no, the pick still shows, and is not kept.
import { afterEach, beforeEach, expect, test } from 'vitest'
import type { LocalePage } from '../../fixtures/locale/page.ts'
import { openPage } from '../../fixtures/saves/open-page.ts'

const PAGE = `${new URL('../../fixtures/locale/page.ts', import.meta.url).href}?game=language-kept`
const KEY = 'automata.language-kept.settings'
const SIZE = { width: 390, height: 844 }

beforeEach(() => localStorage.removeItem(KEY))
afterEach(() => localStorage.removeItem(KEY))

test('a language picked on one page is the language of the next', async () => {
  const first = await openPage<LocalePage>(SIZE, `${PAGE}&device=en-US`)
  try {
    await first.page.tap('pt')
    expect((await first.page.shown()).language).toBe('pt')
  } finally {
    first.close()
  }
  expect(localStorage.getItem(KEY)).toContain('"language":"pt"')
  // The next page's device still says English; the pick wins, before any tap.
  const second = await openPage<LocalePage>(SIZE, `${PAGE}&device=en-US`)
  try {
    const shown = await second.page.shown()
    expect(shown.language).toBe('pt')
    expect(shown.lang).toBe('pt-BR')
    expect(shown.greeting).toBe('Olá!')
  } finally {
    second.close()
  }
})

test("with storage refused the pick still shows, and the next page is the device's language again", async () => {
  const first = await openPage<LocalePage>(SIZE, `${PAGE}&device=es-MX&storage=refused`)
  try {
    expect(await first.page.stored()).toBe(false)
    expect((await first.page.shown()).language).toBe('es')
    await first.page.tap('zh')
    const shown = await first.page.shown()
    expect(shown.language).toBe('zh')
    expect(shown.lang).toBe('zh-Hans')
  } finally {
    first.close()
  }
  expect(localStorage.getItem(KEY)).toBeNull()
  const second = await openPage<LocalePage>(SIZE, `${PAGE}&device=es-MX&storage=refused`)
  try {
    expect((await second.page.shown()).language).toBe('es')
  } finally {
    second.close()
  }
})
