import type { Language } from '../content/content.ts'

/** The longest language tag there is (BCP 47 sets 35); a longer one is not a tag. */
const MAX_TAG = 35

/**
 * The language a tag asks for, if the game has it: `pt-BR` finds `pt`, `ES-mx` finds `es`, `zh-Hant-TW` finds `zh`.
 * A desktop or a store may write `ko_KR` or `ko_KR.UTF-8`, so what follows a `.` is dropped and `_` is read as `-`.
 * A tag that is empty, too long, or holds anything but letters, digits and `-` finds nothing, and nothing throws.
 */
export function matchLanguage(tag: string, shipped: readonly Language[]): Language | undefined {
  const dot = tag.indexOf('.')
  const plain = (dot === -1 ? tag : tag.slice(0, dot)).replaceAll('_', '-').toLowerCase()
  if (plain.length === 0 || plain.length > MAX_TAG || !/^[a-z0-9-]+$/.test(plain)) return undefined
  const first = plain.split('-', 1)[0]
  return shipped.find((language) => language === first)
}

/** What the player and the host know of their language: one of the game's, or none yet and what to open the picker on. */
export type LanguagePick =
  | { readonly language: Language; readonly from: 'saved' | 'host' }
  | { readonly language: undefined; readonly suggested: Language | undefined }

/** The first of the device's languages, in its order, that the game has words in. */
export function suggestLanguage(
  device: readonly string[],
  shipped: readonly Language[],
): Language | undefined {
  for (const tag of device) {
    const found = matchLanguage(tag, shipped)
    if (found !== undefined) return found
  }
  return undefined
}

/**
 * The player's language: what they saved, then what the host says. A tag the game has no words for is passed over.
 * With neither there is no language: nobody has been asked, and the device's own language is only a suggestion for the
 * picker to open on. A player is never given a language they have not chosen.
 */
export function pickLanguage(options: {
  readonly saved?: string | undefined
  readonly host?: string | undefined
  readonly device: readonly string[]
  readonly shipped: readonly Language[]
}): LanguagePick {
  const from: readonly ['saved' | 'host', string | undefined][] = [
    ['saved', options.saved],
    ['host', options.host],
  ]
  for (const [source, tag] of from) {
    if (tag === undefined) continue
    const found = matchLanguage(tag, options.shipped)
    if (found !== undefined) return { language: found, from: source }
  }
  return { language: undefined, suggested: suggestLanguage(options.device, options.shipped) }
}

/** `shipped` with `own` moved to the front and nothing else moved; `shipped` itself when `own` is not in it. */
export function playersOrder(own: Language | undefined, shipped: readonly Language[]): readonly Language[] {
  if (own === undefined || !shipped.includes(own)) return shipped
  return [own, ...shipped.filter((language) => language !== own)]
}
