// The page says which language it is in: `lang` follows the locale, so a screen reader speaks the words right.
import { afterEach, expect, test } from 'vitest'
import { loadGame } from '#src/features/content/content.ts'
import { testHost } from '#src/features/host/host.ts'
import { createLocale, type Locale } from '#src/features/locale/locale.ts'
import { openSettings } from '#src/features/saves/saves.ts'
import { followLanguage } from '#src/features/web/web.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'

const html = document.documentElement
const before = html.getAttribute('lang')
afterEach(() => {
  if (before === null) html.removeAttribute('lang')
  else html.setAttribute('lang', before)
})

async function localeFor(device: readonly string[]): Promise<Locale> {
  const loaded = await loadGame(readFullGame())
  if (!loaded.ok) throw new Error('the full game did not load')
  const host = testHost({ deviceLanguages: device })
  const settings = await openSettings({ game: 'full-game', store: host.store })
  return createLocale({ content: loaded.value, host, settings })
}

test('the page says which language it is in, and keeps saying so', async () => {
  const locale = await localeFor(['ko-KR'])
  const element = document.createElement('div')
  const stop = followLanguage(locale, element)
  expect(element.lang).toBe('ko')
  await locale.set('zh')
  expect(element.lang).toBe('zh-Hans')
  await locale.set('pt')
  expect(element.lang).toBe('pt-BR')
  await locale.set('en')
  expect(element.lang).toBe('en')
  stop()
  await locale.set('ja')
  // After `stop` the page is left as it was.
  expect(element.lang).toBe('en')
})

test("with no element it is the page's own <html>", async () => {
  const locale = await localeFor(['es-MX'])
  const stop = followLanguage(locale)
  expect(html.lang).toBe('es')
  await locale.set('ja')
  expect(html.lang).toBe('ja')
  stop()
})
