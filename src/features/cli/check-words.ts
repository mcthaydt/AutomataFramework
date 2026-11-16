// The words a game still has to finish: a message that is empty, is only its own key, or still says "TODO". Every day
// it is a note; under `automata check --ship` it is a problem, since a player would read it.
import { type GameContent, LANGUAGES, languageName } from '../content/content.ts'
import type { ShipFinding } from './report.ts'

/** The stand-in words a team writes while it is working, as whole words in any capitals. */
const UNFINISHED = /(?<![\p{L}\p{N}_])(?:todo|fixme|lorem|ipsum|xxx|placeholder|test)(?![\p{L}\p{N}_])/iu

/** Where each messages file is, from the project's list, by language. */
function messagePaths(content: GameContent): ReadonlyMap<string, string> {
  const paths = new Map<string, string>()
  for (const entry of content.project.content) {
    if (entry.type !== 'messages') continue
    paths.set(entry.path.slice(entry.path.lastIndexOf('/') + 1, -'.json'.length), entry.path)
  }
  return paths
}

/** Messages that are not finished, in every language the game has: the languages in their own order, then keys sorted. */
export function unfinishedWords(content: GameContent): ShipFinding[] {
  const found: ShipFinding[] = []
  const paths = messagePaths(content)
  for (const language of LANGUAGES) {
    const file = content.messages?.[language]
    if (file === undefined) continue
    const path = paths.get(language) ?? `content/messages/${language}.json`
    for (const key of Object.keys(file.messages).sort()) {
      const value = file.messages[key] ?? ''
      if (value.trim() !== '' && value !== key && !UNFINISHED.test(value)) continue
      found.push({
        rule: 'words',
        file: path,
        path: `messages.${key}`,
        message: `"${key}" in ${languageName(file.id)} still says "${value}". Write what the player should read.`,
      })
    }
  }
  return found
}
