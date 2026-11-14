// The player's language for one game: picked from what the player and the device say, changed at once, and kept with
// the settings so the next page starts in it.
import { describe, expect, test } from 'vitest'
import { type GameContent, type Language, loadGame } from '#src/features/content/content.ts'
import { type TestHostOptions, testHost } from '#src/features/host/host.ts'
import { createLocale, LANGUAGE_SETTINGS_DEFAULT, LanguageSettingsSchema } from '#src/features/locale/locale.ts'
import { memoryStore, openSettings } from '#src/features/saves/saves.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { wordsGame } from '../../fixtures/locale/content.ts'

const GAME = 'full-game'
const KEY = `automata.${GAME}.settings`
const hello = 'keeper.hello'

async function full(): Promise<GameContent> {
  const loaded = await loadGame(readFullGame())
  if (!loaded.ok) throw new Error('the full game did not load')
  return loaded.value
}

/** What the settings store holds, once a language is saved: the section the way the settings write it. */
const stored = (language: unknown): string =>
  JSON.stringify({ format: 1, sections: { language: { format: 1, language } } })

/** A locale over a host: the settings are read first, as a game does it. */
async function open(content: GameContent, options: TestHostOptions = {}) {
  const host = testHost(options)
  const settings = await openSettings({ game: GAME, store: host.store })
  return { host, settings, locale: createLocale({ content, host, settings }) }
}

const heldBy = (store: ReturnType<typeof memoryStore>): unknown => JSON.parse(store.entries()[KEY] ?? 'null')

test("a first visit takes the device's language; with none, English", async () => {
  const content = await full()
  const pt = (await open(content, { deviceLanguages: ['pt-BR', 'en'] })).locale
  expect([pt.language(), pt.choice()]).toEqual(['pt', 'auto'])
  expect((await open(content)).locale.language()).toBe('en')
})

test("the host's language comes before the device's, and a saved choice before both", async () => {
  const content = await full()
  expect((await open(content, { language: 'ko', deviceLanguages: ['pt'] })).locale.language()).toBe('ko')
  const store = memoryStore({ [KEY]: stored('ja') })
  const saved = (await open(content, { store, language: 'ko', deviceLanguages: ['pt'] })).locale
  expect([saved.language(), saved.choice()]).toEqual(['ja', 'ja'])
})

test('a pick changes the words at once, tells listeners once, and is kept', async () => {
  const store = memoryStore()
  const { locale } = await open(await full(), { store })
  const told: Language[] = []
  locale.onChange((language) => told.push(language))
  expect(locale.words(hello)).toBe('Hello there! 👋')
  const answer = await locale.set('ko')
  expect(answer.ok).toBe(true)
  expect(locale.language()).toBe('ko')
  expect(locale.words(hello)).toBe('안녕하세요!')
  expect(told).toEqual(['ko'])
  expect(heldBy(store)).toEqual({ format: 1, sections: { language: { format: 1, language: 'ko' } } })
})

test('a second game opened on the same store starts in the picked language', async () => {
  const store = memoryStore()
  const content = await full()
  await (await open(content, { store })).locale.set('zh')
  const next = (await open(content, { store, deviceLanguages: ['es'] })).locale
  expect([next.language(), next.choice()]).toEqual(['zh', 'zh'])
})

test('back to auto follows the device again, and is kept as auto', async () => {
  const store = memoryStore()
  const { locale } = await open(await full(), { store, deviceLanguages: ['ja-JP'] })
  await locale.set('ko')
  await locale.set('auto')
  expect([locale.language(), locale.choice()]).toEqual(['ja', 'auto'])
  expect(heldBy(store)).toEqual({ format: 1, sections: { language: { format: 1, language: null } } })
})

test('picking the language already shown tells nobody', async () => {
  const { locale } = await open(await full(), { deviceLanguages: ['ko'] })
  const told: Language[] = []
  locale.onChange((language) => told.push(language))
  await locale.set('ko')
  expect(told).toEqual([])
  // The pick is still kept: from now on it no longer follows the device.
  expect(locale.choice()).toBe('ko')
})

test('a host that will not keep the choice: the game still changes, and the answer says no', async () => {
  const store = memoryStore()
  const { locale } = await open(await full(), { store })
  store.refuse('unavailable')
  const answer = await locale.set('ja')
  expect(answer).toMatchObject({ ok: false, refusal: 'unavailable' })
  expect(locale.language()).toBe('ja')
  expect(locale.words(hello)).toBe('こんにちは！')
})

describe('a game with words in English and Spanish only', () => {
  const small = (): Promise<GameContent> => wordsGame({ en: { [hello]: 'Hello' }, es: { [hello]: 'Hola' } })

  test('a saved language it does not have is as good as none, and is left stored', async () => {
    for (const language of ['fr', 'ko', null, 7]) {
      const seeded = stored(language)
      const store = memoryStore({ [KEY]: seeded })
      const { locale } = await open(await small(), { store, deviceLanguages: ['es'] })
      expect([locale.language(), locale.choice()], String(language)).toEqual(['es', 'auto'])
      expect(store.entries()[KEY]).toBe(seeded)
    }
  })

  test('a language it does not have cannot be picked', async () => {
    const store = memoryStore()
    const { locale } = await open(await small(), { store })
    const told: Language[] = []
    locale.onChange((language) => told.push(language))
    await expect(locale.set('ko')).rejects.toThrow(RangeError)
    expect(locale.language()).toBe('en')
    expect(told).toEqual([])
    expect(store.entries()[KEY]).toBeUndefined()
  })

  test("it offers the languages it has, in order", async () => {
    const { locale } = await open(await small())
    expect(locale.languages).toEqual(['en', 'es'])
  })
})

test('a listener that throws does not stop the choice being kept or the others being told', async () => {
  const store = memoryStore()
  const { locale } = await open(await full(), { store })
  const told: Language[] = []
  locale.onChange(() => {
    throw new Error('boom')
  })
  locale.onChange((language) => told.push(language))
  await expect(locale.set('ko')).rejects.toThrow('boom')
  expect(told).toEqual(['ko'])
  expect(locale.language()).toBe('ko')
  expect(heldBy(store)).toEqual({ format: 1, sections: { language: { format: 1, language: 'ko' } } })
})

test('a pick made through the same settings handle is followed too', async () => {
  const { locale, settings } = await open(await full())
  const told: Language[] = []
  locale.onChange((language) => told.push(language))
  const section = settings.section({
    name: 'language',
    schema: LanguageSettingsSchema,
    initial: LANGUAGE_SETTINGS_DEFAULT,
  })
  await section.set({ format: 1, language: 'ja' })
  expect([locale.language(), told]).toEqual(['ja', ['ja']])
})

test('a listener that is taken away is not told again', async () => {
  const { locale } = await open(await full())
  const told: Language[] = []
  const stop = locale.onChange((language) => told.push(language))
  await locale.set('ko')
  stop()
  await locale.set('ja')
  expect(told).toEqual(['ko'])
})

test('say fills a message as words does', async () => {
  const { locale } = await open(await full())
  const message = { key: 'automata.online.waiting.many', values: { count: 3, code: 'AB12' } }
  expect(locale.say(message)).toBe(locale.words(message.key, message.values))
  await locale.set('es')
  expect(locale.say(message)).toBe('Faltan 3 jugadores. Comparte este código para que tus amigos se unan: AB12')
})
