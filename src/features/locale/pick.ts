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

/**
 * The language to open in: what the player saved, then what the host says, then the device's own list in its order,
 * then English. A tag the game has no words for is passed over, so the next in line is tried.
 */
export function pickLanguage(options: {
  readonly saved?: string | undefined
  readonly host?: string | undefined
  readonly device: readonly string[]
  readonly shipped: readonly Language[]
}): Language {
  for (const tag of [options.saved, options.host, ...options.device]) {
    if (tag === undefined) continue
    const found = matchLanguage(tag, options.shipped)
    if (found !== undefined) return found
  }
  return 'en'
}
