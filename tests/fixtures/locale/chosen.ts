// A locale on a test host whose player has already chosen a language: what a returning player has, for a test that is
// about something other than choosing. A player who has not chosen has no language, and the framework gives none.
import type { GameContent, Language } from '#src/features/content/content.ts'
import { testHost } from '#src/features/host/host.ts'
import { createLocale, type Locale } from '#src/features/locale/locale.ts'
import { openSettings } from '#src/features/saves/saves.ts'

/** A locale on a test host whose player has already chosen `language`. */
export async function chosenLocale(content: GameContent, language: Language): Promise<Locale> {
  const host = testHost()
  const settings = await openSettings({ game: 'chosen-language', store: host.store })
  const locale = createLocale({ content, host, settings })
  await locale.set(language)
  return locale
}
