// A game's words as Paraglide's generated functions, answering in the player's language. The generated `runtime.js`
// asks for the locale with `getLocale` and changes it with `setLocale`; both are replaced outright, so Paraglide's own
// strategies (cookie, local storage, the address, a page reload) never run: the language is the `Locale`'s, which
// already knows the saved pick, the host and the device, and a change never reloads the page.
//
// The framework never imports Paraglide here. A game passes its own generated `runtime.js`, which has this shape, so
// loading the framework loads no inlang code (`automata`'s `compileWords` is the only file that names the package).
import type { Locale } from './create.ts'

/** The parts of a Paraglide-generated `runtime.js` this file uses. Method syntax, so a narrower locale union fits. */
export interface ParaglideRuntime {
  readonly locales: readonly string[]
  readonly baseLocale: string
  overwriteGetLocale(fn: () => string): void
  overwriteSetLocale(fn: (locale: string) => void): void
}

/**
 * Makes the generated messages answer in `locale`'s language, now and after every change, and makes Paraglide's own
 * `setLocale` pick a language for the player the way `locale.set` does. A language the game has no words in is ignored:
 * the generated runtime only knows the game's own languages, so one would be a mistake in the game's code.
 */
export function bindParaglide(runtime: ParaglideRuntime, locale: Locale): void {
  runtime.overwriteGetLocale(() => locale.language())
  runtime.overwriteSetLocale((next) => {
    const language = locale.languages.find((known) => known === next)
    // `setLocale` answers nothing and cannot wait: the words change at once, and the pick is kept in its own time.
    if (language !== undefined) void locale.set(language)
  })
}
