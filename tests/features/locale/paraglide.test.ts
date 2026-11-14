// Paraglide's generated runtime answers in the player's language: `getLocale` is the locale's, and `setLocale` picks the
// language the way `locale.set` does. The runtime here is a stand-in of the same shape: the real one is made by
// `compileWords` (tests/features/cli/words.test.ts) and never imported by the framework.
import { expect, test } from 'vitest'
import { type GameContent, loadGame } from '#src/features/content/content.ts'
import { testHost } from '#src/features/host/host.ts'
import { createLocale, type Locale } from '#src/features/locale/locale.ts'
import { bindParaglide, type ParaglideRuntime } from '#src/features/locale/paraglide.ts'
import { openSettings } from '#src/features/saves/saves.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { chosenLocale } from '../../fixtures/locale/chosen.ts'

/** A runtime as Paraglide generates it: `getLocale` and `setLocale` that `overwrite…` replaces. */
function runtime(): ParaglideRuntime & { getLocale(): string; setLocale(locale: string): void } {
  let get: () => string = () => 'en'
  let set: (locale: string) => void = () => undefined
  return {
    locales: ['en', 'es', 'ko', 'ja', 'zh', 'pt'],
    baseLocale: 'en',
    overwriteGetLocale: (fn) => {
      get = fn
    },
    overwriteSetLocale: (fn) => {
      set = fn
    },
    getLocale: () => get(),
    setLocale: (locale) => set(locale),
  }
}

async function full(): Promise<GameContent> {
  const loaded = await loadGame(readFullGame())
  if (!loaded.ok) throw new Error('the full game did not load')
  return loaded.value
}

/** A locale whose player has not chosen: a French device, so the picker has nothing to suggest either. */
async function unaskedLocale(): Promise<Locale> {
  const host = testHost({ deviceLanguages: ['fr-FR'] })
  const settings = await openSettings({ game: 'full-game', store: host.store })
  return createLocale({ content: await full(), host, settings })
}

test("the runtime's getLocale is the player's language, now and after it changes", async () => {
  const locale = await chosenLocale(await full(), 'ko')
  const bound = runtime()
  bindParaglide(bound, locale)
  expect(bound.getLocale()).toBe('ko')
  await locale.set('pt')
  expect(bound.getLocale()).toBe('pt')
})

test("the runtime's setLocale picks the language, and keeps the pick", async () => {
  const locale = await unaskedLocale()
  const bound = runtime()
  bindParaglide(bound, locale)
  bound.setLocale('ja')
  // The language changes at once; the pick is kept in its own time.
  expect(locale.language()).toBe('ja')
  expect(bound.getLocale()).toBe('ja')
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(locale.asked()).toBe(true)
})

test('a language the game has no words in is ignored, and nothing is thrown', async () => {
  const locale = await chosenLocale(await full(), 'es')
  const bound = runtime()
  bindParaglide(bound, locale)
  expect(() => bound.setLocale('fr')).not.toThrow()
  expect(() => bound.setLocale('')).not.toThrow()
  expect(locale.language()).toBe('es')
  expect(bound.getLocale()).toBe('es')
})

test('with no language yet, getLocale answers the runtime\'s base language, not a language the player never chose', async () => {
  const locale = await unaskedLocale()
  expect(locale.language()).toBeUndefined()
  const bound = runtime()
  bindParaglide(bound, locale)
  expect(bound.getLocale()).toBe(bound.baseLocale)
})
