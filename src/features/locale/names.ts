import type { Language } from '../content/content.ts'

/**
 * Each language's name in that language, for a list a player picks from. A player looking for their own language must
 * be able to read its name whatever the game is showing now, so these never change with the language.
 */
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  en: 'English',
  es: 'Español',
  ko: '한국어',
  ja: '日本語',
  zh: '中文',
  pt: 'Português',
}

/**
 * The tag a page's `lang` takes for each language, so the browser picks the right font, hyphenation and speech:
 * Chinese is the Simplified one and Portuguese the Brazilian one (the author's calls, see the plan).
 */
export const LANGUAGE_TAGS: Readonly<Record<Language, string>> = {
  en: 'en',
  es: 'es',
  ko: 'ko',
  ja: 'ja',
  zh: 'zh-Hans',
  pt: 'pt-BR',
}
