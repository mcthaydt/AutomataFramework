// Which language a player gets: what they saved, then what the host says. With neither, none: the device only suggests
// which flag the picker opens on, and nobody is given a language they did not choose.
import { expect, test } from 'vitest'
import { LANGUAGES, type Language } from '#src/features/content/content.ts'
import {
  LANGUAGE_NAMES,
  LANGUAGE_TAGS,
  matchLanguage,
  pickLanguage,
  playersOrder,
} from '#src/features/locale/locale.ts'

const all: readonly Language[] = LANGUAGES

test('the same tag, whatever its case', () => {
  expect(matchLanguage('KO', all)).toBe('ko')
  expect(matchLanguage('Ko', all)).toBe('ko')
  expect(matchLanguage('en', all)).toBe('en')
})

test('a longer tag finds its language', () => {
  const found = ['pt-BR', 'es-419', 'ES-mx', 'zh-Hant-TW', 'zh-CN', 'ja-JP'].map((tag) =>
    matchLanguage(tag, all),
  )
  expect(found).toEqual(['pt', 'es', 'es', 'zh', 'zh', 'ja'])
})

test('a tag written with _ or ending in .UTF-8 is read as one with -', () => {
  expect(['ko_KR', 'ko_KR.UTF-8', 'pt_BR'].map((tag) => matchLanguage(tag, all))).toEqual(['ko', 'ko', 'pt'])
  expect(matchLanguage('zh_Hans_CN.UTF-8', all)).toBe('zh')
})

test('a tag that is no language of ours finds nothing', () => {
  for (const tag of [
    'fr',
    '',
    '*',
    'k',
    'korean',
    'a'.repeat(300),
    'en-'.repeat(100),
    'ko kr',
    'ko/KR',
    'ko\u0000',
  ])
    expect(matchLanguage(tag, all), JSON.stringify(tag)).toBeUndefined()
})

test('a language the game does not have finds nothing', () =>
  expect(matchLanguage('ko', ['en', 'es'])).toBeUndefined())

test('a first-time player with a French device is not given a language', () => {
  expect(pickLanguage({ device: ['fr-FR', 'fr'], shipped: all })).toEqual({
    language: undefined,
    suggested: undefined,
  })
})

test('the saved choice is the language', () => {
  expect(pickLanguage({ saved: 'ko', device: ['ja-JP'], shipped: all })).toEqual({
    language: 'ko',
    from: 'saved',
  })
})

test("a host that knows the player's language sets it", () => {
  expect(pickLanguage({ host: 'pt_BR.UTF-8', device: ['ja-JP'], shipped: all })).toEqual({
    language: 'pt',
    from: 'host',
  })
})

test('the saved choice comes before the host, and one the game lacks is passed over', () => {
  const device = ['fr-CA', 'pt-BR', 'es']
  expect(pickLanguage({ saved: 'ja', host: 'ko', device, shipped: all })).toEqual({
    language: 'ja',
    from: 'saved',
  })
  expect(pickLanguage({ saved: 'fr', host: 'ko', device, shipped: all })).toEqual({
    language: 'ko',
    from: 'host',
  })
})

test('a saved or host language the game lacks is passed over, and the device only suggests', () => {
  expect(pickLanguage({ saved: 'pt', host: 'pt', device: ['ja-JP'], shipped: ['zh', 'ja'] })).toEqual({
    language: undefined,
    suggested: 'ja',
  })
})

test('the device suggests its first language the game has, and with none there is no suggestion', () => {
  const device = ['fr-CA', 'pt-BR', 'es']
  expect(pickLanguage({ device, shipped: all })).toEqual({ language: undefined, suggested: 'pt' })
  expect(pickLanguage({ device: [], shipped: all })).toEqual({ language: undefined, suggested: undefined })
  expect(pickLanguage({ device, shipped: ['zh', 'ko'] })).toEqual({
    language: undefined,
    suggested: undefined,
  })
})

test.each([
  ['zh-Hant-TW', 'zh'],
  ['pt-PT', 'pt'],
  ['en-GB', 'en'],
  ['es-ES', 'es'],
] as const)('a device that says %s opens the picker on %s', (tag, flag) => {
  expect(pickLanguage({ device: [tag], shipped: all })).toEqual({ language: undefined, suggested: flag })
})

test("a player's list has their own language first and nothing else moved", () => {
  expect(playersOrder('ko', all)).toEqual(['ko', 'zh', 'es', 'en', 'pt', 'ja'])
  expect(playersOrder(undefined, all)).toEqual(all)
  expect(playersOrder('ko', ['zh', 'es'])).toEqual(['zh', 'es'])
})

test('each language is named in its own words, and has a tag for a page', () => {
  expect(LANGUAGES.map((language) => LANGUAGE_NAMES[language])).toEqual([
    '中文',
    'Español',
    'English',
    'Português',
    '日本語',
    '한국어',
  ])
  expect(LANGUAGES.map((language) => LANGUAGE_TAGS[language])).toEqual([
    'zh-Hans',
    'es',
    'en-US',
    'pt-BR',
    'ja',
    'ko',
  ])
})
