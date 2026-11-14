import type { Diagnostic } from './diagnostics.ts'
import type { GameContent } from './load.ts'
import { LANGUAGES, languageName, type MessagesFile, placeholdersOf } from './messages.ts'
import { PROJECT_FILE } from './project.ts'

/** A level's name is shown on a save, so it is short. */
const MAX_LEVEL_NAME = 40
/** A touch button's words fit on the button. */
const MAX_BUTTON_WORDS = 12
/** How much of the game's own text a sentence quotes. */
const QUOTED = 60

const LEVEL_NAME_KEY = /^level\.(.+)\.name$/
const BUTTON_KEY = /^controls\./

/** The length of a text in characters people see, not in UTF-16 units: an emoji is one. */
const length = (text: string): number => [...text].length

/** The first 60 characters of a text, then `...` when there was more. */
function quote(text: string): string {
  const characters = [...text]
  return characters.length <= QUOTED ? text : `${characters.slice(0, QUOTED).join('')}...`
}

/** Where each messages file is, from the project's list: `content/messages/ko.json` by language. */
function pathsOf(content: GameContent): ReadonlyMap<string, string> {
  const paths = new Map<string, string>()
  for (const entry of content.project.content) {
    if (entry.type !== 'messages') continue
    paths.set(entry.path.slice(entry.path.lastIndexOf('/') + 1, -'.json'.length), entry.path)
  }
  return paths
}

/**
 * What is not translated, in plain sentences that name the file, the key and what to write; none for a game with no
 * words at all. Never throws. This is a check of its own and not part of `loadGame`: a game with a word missing in
 * Korean still loads and plays, with the game's own language (`source`) standing in for that word, so a missing
 * translation never stops a player or locks a team out of an editor. CI and `automata check` call this and fail.
 *
 * Every language is checked against the game's own: the file of the `source` says what each word is for, and is
 * never checked against itself. The order is the missing files in `LANGUAGES` order, then each listed language in
 * that order with its keys sorted.
 */
export function translationProblems(content: GameContent): readonly Diagnostic[] {
  const files = content.messages
  const source = content.project.source
  if (files === undefined || source === undefined || !Object.hasOwn(files, source)) return []
  const own = files[source] as MessagesFile
  const sourceName = languageName(source)
  const paths = pathsOf(content)
  const sourcePath = paths.get(source) ?? `content/messages/${source}.json`
  const folder = sourcePath.slice(0, sourcePath.length - `${source}.json`.length)
  const found: Diagnostic[] = []

  for (const language of LANGUAGES) {
    if (Object.hasOwn(files, language)) continue
    const path = `${folder}${language}.json`
    found.push({
      file: PROJECT_FILE,
      path: 'content',
      message: `This game has no words in ${languageName(language)}. Add ${path} with every word ${sourceName} has, and list it here.`,
    })
  }

  for (const language of LANGUAGES) {
    const file = Object.hasOwn(files, language) ? files[language] : undefined
    if (file === undefined) continue
    const name = paths.get(language) ?? `content/messages/${language}.json`
    const say = (path: string, message: string): number => found.push({ file: name, path, message })
    const keys = new Set(Object.keys(file.messages))
    if (language !== source) for (const key of Object.keys(own.messages)) keys.add(key)
    for (const key of [...keys].sort()) {
      const text = Object.hasOwn(file.messages, key) ? file.messages[key] : undefined
      const theirs = Object.hasOwn(own.messages, key) ? own.messages[key] : undefined
      if (text === undefined) {
        if (theirs !== undefined)
          say(
            'messages',
            `This file has no "${key}". The ${sourceName} file says "${quote(theirs)}". Write it in ${languageName(language)}.`,
          )
        continue
      }
      if (language !== source && theirs !== undefined) wrongValues(sourceName, key, theirs, text, say)
      tooLong(content, key, text, say)
    }
  }
  return found
}

/** The values the game's own text asks for that a text lacks, and the values a text asks for that it lacks. */
function wrongValues(
  sourceName: string,
  key: string,
  original: string,
  text: string,
  say: (path: string, message: string) => number,
): void {
  const wanted = placeholdersOf(original)
  const given = placeholdersOf(text)
  for (const name of wanted)
    if (!given.includes(name))
      say(
        `messages.${key}`,
        `${sourceName} has {${name}} in this text and this one does not. Put {${name}} where the number or name belongs.`,
      )
  for (const name of given)
    if (!wanted.includes(name))
      say(
        `messages.${key}`,
        `This text has {${name}}, which ${sourceName} does not. Take it out, or fix its spelling.`,
      )
}

/** A level's name and a button's words have room for so many characters; a level's name is for a level there is. */
function tooLong(
  content: GameContent,
  key: string,
  text: string,
  say: (path: string, message: string) => number,
): void {
  const level = LEVEL_NAME_KEY.exec(key)?.[1]
  if (level !== undefined) {
    if (!Object.hasOwn(content.levels, level))
      say(
        `messages.${key}`,
        `This game has no level called "${level}". Take this line out, or fix the level's name in the key.`,
      )
    else if (length(text) > MAX_LEVEL_NAME)
      say(
        `messages.${key}`,
        `A level's name is at most ${MAX_LEVEL_NAME} characters, so it fits on a save. This one has ${length(text)}.`,
      )
  } else if (BUTTON_KEY.test(key) && length(text) > MAX_BUTTON_WORDS)
    say(
      `messages.${key}`,
      `A button's words are at most ${MAX_BUTTON_WORDS} characters, so they fit on the button. This one has ${length(text)}.`,
    )
}
