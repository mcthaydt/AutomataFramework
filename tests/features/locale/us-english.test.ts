// English is US English everywhere a player or an editor user reads it (the Owner, 2026-11-14): "color", never
// "colour". This holds the two English word files the framework ships, so a British spelling cannot come in unseen.
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

/** The British spellings a writer is likely to type; one pattern, so adding a word is one edit. */
const BRITISH =
  /\b(colour|favour|honour|behaviour|neighbour|flavour|humour|labour|centre|metre|litre|theatre|grey|defence|offence|licence|travell(?:ed|ing|er)|cancell(?:ed|ing)|(?:organ|real|recogn|apolog|custom)is(?:e|ed|es|ing)|analys(?:e|ed|ing)|programme|catalogue|cheque|whilst)/i

const FILES = [
  '../../../src/features/locale/library/en.json',
  '../../../template/content/messages/en.json',
] as const

test('the pattern does fire on a British spelling', () => expect(BRITISH.test('Pick a colour')).toBe(true))

test.each(FILES)('%s has no British spelling', (path) => {
  const file = JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as {
    messages: Record<string, string>
  }
  for (const [key, text] of Object.entries(file.messages)) expect(text, key).not.toMatch(BRITISH)
})
