// The story game: a keeper to talk to, a critter that runs from the hero, and two cutscenes, in a glade for two
// players. Files are imported as text with Vite's `?raw`, so the same game loads in Node and in a browser. Each is
// written exactly as `writeContent` writes it; change the value, write it again, and commit the result.
import automata from './automata.toml?raw'
import behavioursCritter from './content/behaviours/critter.json?raw'
import charactersCritter from './content/characters/critter.json?raw'
import charactersHero from './content/characters/hero.json?raw'
import charactersKeeper from './content/characters/keeper.json?raw'
import conversationsKeeper from './content/conversations/keeper.json?raw'
import cutscenesGladeIntro from './content/cutscenes/glade-intro.json?raw'
import cutscenesGladeTip from './content/cutscenes/glade-tip.json?raw'
import levelsGlade from './content/levels/glade.json?raw'
import messagesEn from './content/messages/en.json?raw'
import messagesEs from './content/messages/es.json?raw'

/** Every file of the story game, by its path from the game's root. */
export const storyFiles: Record<string, string> = {
  'automata.toml': automata,
  'content/levels/glade.json': levelsGlade,
  'content/characters/hero.json': charactersHero,
  'content/characters/keeper.json': charactersKeeper,
  'content/characters/critter.json': charactersCritter,
  'content/behaviours/critter.json': behavioursCritter,
  'content/conversations/keeper.json': conversationsKeeper,
  'content/cutscenes/glade-intro.json': cutscenesGladeIntro,
  'content/cutscenes/glade-tip.json': cutscenesGladeTip,
  'content/messages/en.json': messagesEn,
  'content/messages/es.json': messagesEs,
}

/** A `read` over the story game, as `loadGame` takes it. An override replaces a file; `undefined` makes it missing. */
export function readStory(
  overrides: Readonly<Record<string, string | undefined>> = {},
): (path: string) => Promise<string> {
  const files: Record<string, string | undefined> = { ...storyFiles, ...overrides }
  return async (path) => {
    const text = files[path]
    if (text === undefined) throw new Error(`${path}: no such file`)
    return text
  }
}

/** The story game's words in English and in Spanish, by key. */
export const englishWords: Readonly<Record<string, string>> = JSON.parse(messagesEn).messages
export const spanishWords: Readonly<Record<string, string>> = JSON.parse(messagesEs).messages
