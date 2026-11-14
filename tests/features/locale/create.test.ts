// The player's language for one game: picked from what the player and the device say, changed at once, and kept with
// the settings so the next page starts in it.
import { describe, expect, test } from 'vitest'
import { type GameContent, type Language, loadGame } from '#src/features/content/content.ts'
import { type TestHostOptions, testHost } from '#src/features/host/host.ts'
import {
  createLocale,
  LANGUAGE_SETTINGS_DEFAULT,
  LanguageSettingsSchema,
} from '#src/features/locale/locale.ts'
import { memoryStore, openSettings } from '#src/features/saves/saves.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
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
async function open(content: GameContent, options: TestHostOptions & { watching?: boolean } = {}) {
  const { watching, ...hostOptions } = options
  const host = testHost(hostOptions)
  const settings = await openSettings({ game: GAME, store: host.store })
  const locale = createLocale({ content, host, settings, ...(watching === undefined ? {} : { watching }) })
  return { host, settings, locale }
}

const heldBy = (store: ReturnType<typeof memoryStore>): unknown => JSON.parse(store.entries()[KEY] ?? 'null')

test('a first visit with a French device has no language, and the words are keys', async () => {
  const { locale } = await open(await full(), { deviceLanguages: ['fr-FR', 'fr'] })
  expect(locale.language()).toBeUndefined()
  expect(locale.asked()).toBe(false)
  expect(locale.suggested()).toBeUndefined()
  expect(locale.listed()).toEqual(locale.languages)
  expect(locale.words(hello)).toBe(hello)
})

test('a first visit with a Japanese device has no language yet, and the picker opens on Japanese', async () => {
  const { locale } = await open(await full(), { deviceLanguages: ['ja-JP'] })
  expect(locale.language()).toBeUndefined()
  expect(locale.asked()).toBe(false)
  expect(locale.suggested()).toBe('ja')
  expect(locale.listed()[0]).toBe('ja')
  expect(locale.listed().slice(1)).toEqual(locale.languages.filter((language) => language !== 'ja'))
})

test("the host's language comes before the device's, and a saved choice before both", async () => {
  const content = await full()
  const hosted = (await open(content, { language: 'ko', deviceLanguages: ['pt'] })).locale
  expect([hosted.language(), hosted.asked()]).toEqual(['ko', true])
  const store = memoryStore({ [KEY]: stored('ja') })
  const saved = (await open(content, { store, language: 'ko', deviceLanguages: ['pt'] })).locale
  expect([saved.language(), saved.asked()]).toEqual(['ja', true])
})

test('a pick changes the words at once, tells listeners once, and is kept', async () => {
  const store = memoryStore()
  const { locale } = await open(await full(), { store })
  const told: Language[] = []
  locale.onChange((language) => told.push(language))
  expect(locale.words(hello)).toBe(hello)
  const answer = await locale.set('ko')
  expect(answer.ok).toBe(true)
  expect(locale.language()).toBe('ko')
  expect(locale.asked()).toBe(true)
  expect(locale.words(hello)).toBe('안녕하세요!')
  expect(told).toEqual(['ko'])
  expect(heldBy(store)).toEqual({ format: 1, sections: { language: { format: 1, language: 'ko' } } })
})

test('a second game opened on the same store starts in the picked language', async () => {
  const store = memoryStore()
  const content = await full()
  await (await open(content, { store })).locale.set('zh')
  const next = (await open(content, { store, deviceLanguages: ['es'] })).locale
  expect([next.language(), next.asked()]).toEqual(['zh', true])
})

test('picking the language already shown tells nobody again, and is kept', async () => {
  const store = memoryStore()
  const { locale } = await open(await full(), { store, deviceLanguages: ['ko'] })
  const told: Language[] = []
  locale.onChange((language) => told.push(language))
  await locale.set('ko')
  expect(told).toEqual(['ko'])
  await locale.set('ko')
  expect(told).toEqual(['ko'])
  expect(heldBy(store)).toEqual({ format: 1, sections: { language: { format: 1, language: 'ko' } } })
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
  const small = (): Promise<GameContent> =>
    wordsGame({ en: { [hello]: 'Hello' }, es: { [hello]: 'Hola' } }, 'en')

  test('a saved language it does not have is as good as none: the picker asks, and it is left stored', async () => {
    for (const language of ['fr', 'ko', null, 7]) {
      const seeded = stored(language)
      const store = memoryStore({ [KEY]: seeded })
      const { locale } = await open(await small(), { store, deviceLanguages: ['es'] })
      expect([locale.language(), locale.asked(), locale.suggested()], String(language)).toEqual([
        undefined,
        false,
        'es',
      ])
      expect(store.entries()[KEY]).toBe(seeded)
    }
  })

  test('a language it does not have cannot be picked', async () => {
    const store = memoryStore()
    const { locale } = await open(await small(), { store })
    const told: Language[] = []
    locale.onChange((language) => told.push(language))
    await expect(locale.set('ko')).rejects.toThrow(RangeError)
    expect(locale.language()).toBeUndefined()
    expect(told).toEqual([])
    expect(store.entries()[KEY]).toBeUndefined()
  })

  test("a saved language the game lacks is not the player's: pt is stored, the game has zh and ja", async () => {
    const store = memoryStore({ [KEY]: stored('pt') })
    const content = await wordsGame({ zh: { [hello]: '你好' }, ja: { [hello]: 'やあ' } }, 'ja')
    const { locale } = await open(content, { store })
    expect(locale.asked()).toBe(false)
    expect(locale.language()).toBeUndefined()
    expect(heldBy(store)).toEqual({ format: 1, sections: { language: { format: 1, language: 'pt' } } })
  })

  test('it offers the languages it has, in order', async () => {
    const { locale } = await open(await small())
    expect(locale.languages).toEqual(['es', 'en'])
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
  expect(locale.say(message)).toBe(
    'Faltan 3 jugadores. Comparte este código para que tus amigos se unan: AB12',
  )
})

describe('watching: nobody is there to ask', () => {
  test('the device suggests the language, and nothing is asked or kept', async () => {
    const store = memoryStore()
    const { locale } = await open(await full(), { store, deviceLanguages: ['ja-JP'], watching: true })
    expect([locale.language(), locale.asked()]).toEqual(['ja', false])
    expect(store.entries()[KEY]).toBeUndefined()
  })

  test("a device with none the game has gets the game's own language", async () => {
    const korean = await wordsGame({ ko: { [hello]: '안녕' }, es: { [hello]: 'Hola' } }, 'ko')
    const { locale } = await open(korean, { deviceLanguages: ['fr-FR'], watching: true })
    expect([locale.language(), locale.asked()]).toEqual(['ko', false])
  })

  test('a game with no words and a device with none has no language', async () => {
    const { locale } = await open(await loadFixtureGame(), { deviceLanguages: ['fr-FR'], watching: true })
    expect(locale.language()).toBeUndefined()
  })

  test('a choice made while watching is a choice', async () => {
    const { locale } = await open(await full(), { deviceLanguages: ['fr-FR'], watching: true })
    await locale.set('pt')
    expect([locale.language(), locale.asked()]).toEqual(['pt', true])
  })
})

test('a second locale on the same host is in the language the first was given, from the start', async () => {
  const content = await full()
  const first = await open(content)
  await first.locale.set('ko')
  const second = createLocale({ content, host: first.host, settings: first.settings })
  expect([second.language(), second.asked(), second.words('automata.touch.label')]).toEqual([
    'ko',
    true,
    '터치 조작',
  ])
})

// Plan L's implementation audit, M2: the locale asks the host for two things only, as the plan's contract says, so a
// tool in Node (an editor's preview, an agent's script) gives it those two and no page, store or quit button.
test("a host of only its language and the device's languages is enough", async () => {
  const content = await full()
  const settings = await openSettings({ game: GAME, store: memoryStore() })
  const locale = createLocale({
    content,
    host: { language: () => undefined, deviceLanguages: () => ['ja-JP'] },
    settings,
  })
  expect(locale.language()).toBeUndefined()
  expect(locale.suggested()).toBe('ja')
})
