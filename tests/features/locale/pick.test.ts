// Which language a player gets: what they picked, then what the host says, then the device in its order, then English.
import { expect, test } from 'vitest'
import { LANGUAGES, type Language } from '#src/features/content/content.ts'
import { LANGUAGE_NAMES, LANGUAGE_TAGS, matchLanguage, pickLanguage } from '#src/features/locale/locale.ts'

const all: readonly Language[] = LANGUAGES

test('the same tag, whatever its case', () => {
  expect(matchLanguage('KO', all)).toBe('ko')
  expect(matchLanguage('Ko', all)).toBe('ko')
  expect(matchLanguage('en', all)).toBe('en')
})

test('a longer tag finds its language', () => {
  const found = ['pt-BR', 'es-419', 'ES-mx', 'zh-Hant-TW', 'zh-CN', 'ja-JP'].map((tag) => matchLanguage(tag, all))
  expect(found).toEqual(['pt', 'es', 'es', 'zh', 'zh', 'ja'])
})

test('a tag written with _ or ending in .UTF-8 is read as one with -', () => {
  expect(['ko_KR', 'ko_KR.UTF-8', 'pt_BR'].map((tag) => matchLanguage(tag, all))).toEqual(['ko', 'ko', 'pt'])
  expect(matchLanguage('zh_Hans_CN.UTF-8', all)).toBe('zh')
})

test('a tag that is no language of ours finds nothing', () => {
  for (const tag of ['fr', '', '*', 'k', 'korean', 'a'.repeat(300), 'en-'.repeat(100), 'ko kr', 'ko/KR', 'ko\u0000'])
    expect(matchLanguage(tag, all), JSON.stringify(tag)).toBeUndefined()
})

test('a language the game does not have finds nothing', () =>
  expect(matchLanguage('ko', ['en', 'es'])).toBeUndefined())

test('saved first, then the host, then the device in its order, then English', () => {
  const device = ['fr-CA', 'pt-BR', 'es']
  expect(pickLanguage({ saved: 'ja', host: 'ko', device, shipped: all })).toBe('ja')
  expect(pickLanguage({ saved: 'fr', host: 'ko', device, shipped: all })).toBe('ko')
  expect(pickLanguage({ host: undefined, device, shipped: all })).toBe('pt')
  expect(pickLanguage({ device: [], shipped: all })).toBe('en')
  expect(pickLanguage({ saved: 'ko', host: 'ko', device: ['ko'], shipped: ['en'] })).toBe('en')
  expect(pickLanguage({ saved: 'ko', device: ['pt'], shipped: ['en', 'pt'] })).toBe('pt')
})

test('each language is named in its own words, and has a tag for a page', () => {
  expect(LANGUAGES.map((language) => LANGUAGE_NAMES[language])).toEqual([
    'English',
    'Español',
    '한국어',
    '日本語',
    '中文',
    'Português',
  ])
  expect(LANGUAGES.map((language) => LANGUAGE_TAGS[language])).toEqual(['en', 'es', 'ko', 'ja', 'zh-Hans', 'pt-BR'])
})
