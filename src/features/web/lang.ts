// Keeps the page's `lang` the language of the words on it, so a screen reader speaks them right and the browser picks
// the right font and hyphenation. A page that follows the locale never has to remember to do it.
import { LANGUAGE_TAGS, type Locale } from '../locale/locale.ts'

/**
 * Sets `lang` on `element` (default: the page's own `<html>`) to the locale's language now and each time it changes
 * (`ko`, `zh-Hans`, `pt-BR`). Returns a function that stops following; the last `lang` stays.
 */
export function followLanguage(locale: Locale, element: HTMLElement = document.documentElement): () => void {
  const apply = (): void => element.setAttribute('lang', LANGUAGE_TAGS[locale.language()])
  apply()
  return locale.onChange(apply)
}
