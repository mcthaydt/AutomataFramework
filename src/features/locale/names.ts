import type { Language } from '../content/content.ts'

/**
 * Each language's name in that language, for a list a player picks from. A player looking for their own language must
 * be able to read its name whatever the game is showing now, so these never change with the language.
 */
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  zh: '中文',
  es: 'Español',
  en: 'English',
  pt: 'Português',
  ja: '日本語',
  ko: '한국어',
}

/**
 * The tag a page's `lang` takes for each language, so the browser picks the right font, hyphenation and speech:
 * English is the US one, Chinese the Simplified one and Portuguese the Brazilian one (the Owner's calls).
 */
export const LANGUAGE_TAGS: Readonly<Record<Language, string>> = {
  zh: 'zh-Hans',
  es: 'es',
  en: 'en-US',
  pt: 'pt-BR',
  ja: 'ja',
  ko: 'ko',
}
