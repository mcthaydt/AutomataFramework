// The page says which language it is in: `lang` follows the locale, so a screen reader speaks the words right.
import { afterEach, expect, test } from 'vitest'
import { type GameContent, loadGame } from '#src/features/content/content.ts'
import { testHost } from '#src/features/host/host.ts'
import { createLocale, type Locale } from '#src/features/locale/locale.ts'
import { openSettings } from '#src/features/saves/saves.ts'
import { followLanguage } from '#src/features/web/web.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { chosenLocale } from '../../fixtures/locale/chosen.ts'

const html = document.documentElement
const before = html.getAttribute('lang')
afterEach(() => {
  if (before === null) html.removeAttribute('lang')
  else html.setAttribute('lang', before)
})

async function full(): Promise<GameContent> {
  const loaded = await loadGame(readFullGame())
  if (!loaded.ok) throw new Error('the full game did not load')
  return loaded.value
}

/** A locale whose player has not chosen: a French device, so there is nothing to suggest either. */
async function unaskedLocale(): Promise<Locale> {
  const host = testHost({ deviceLanguages: ['fr-FR'] })
  const settings = await openSettings({ game: 'full-game', store: host.store })
  return createLocale({ content: await full(), host, settings })
}

test('the page says which language it is in, and keeps saying so', async () => {
  const locale = await chosenLocale(await full(), 'ko')
  const element = document.createElement('div')
  const stop = followLanguage(locale, element)
  expect(element.lang).toBe('ko')
  await locale.set('zh')
  expect(element.lang).toBe('zh-Hans')
  await locale.set('pt')
  expect(element.lang).toBe('pt-BR')
  await locale.set('en')
  expect(element.lang).toBe('en-US')
  stop()
  await locale.set('ja')
  // After `stop` the page is left as it was.
  expect(element.lang).toBe('en-US')
})

test("with no element it is the page's own <html>", async () => {
  const locale = await chosenLocale(await full(), 'es')
  const stop = followLanguage(locale)
  expect(html.lang).toBe('es')
  await locale.set('ja')
  expect(html.lang).toBe('ja')
  stop()
})

test('while the player has no language the page says none, and takes the old one off', async () => {
  const locale = await unaskedLocale()
  const element = document.createElement('div')
  element.lang = 'fr'
  const stop = followLanguage(locale, element)
  expect(locale.language()).toBeUndefined()
  expect(element.hasAttribute('lang')).toBe(false)
  await locale.set('ko')
  expect(element.lang).toBe('ko')
  stop()
})
