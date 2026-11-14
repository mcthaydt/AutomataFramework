// The full game: one file of every kind of content M2 has, each written exactly as writeContent writes it. Files are
// imported as text with Vite's `?raw`, so it loads in Node and in a browser. Do not edit them by hand: change the value,
// write it again with writeContent, and commit the result.
import automata from './automata.toml?raw'
import marks from './automata.translations.toml?raw'
import backdropsValley from './content/backdrops/valley.json?raw'
import behavioursCritter from './content/behaviours/critter.json?raw'
import charactersCrate from './content/characters/crate.json?raw'
import charactersCritter from './content/characters/critter.json?raw'
import charactersHero from './content/characters/hero.json?raw'
import charactersKeeper from './content/characters/keeper.json?raw'
import conversationsKeeper from './content/conversations/keeper.json?raw'
import cuesCues from './content/cues/cues.json?raw'
import cutscenesLevel1Intro from './content/cutscenes/level-1-intro.json?raw'
import feelsCrateShake from './content/feels/crate-shake.json?raw'
import feelsLandDust from './content/feels/land-dust.json?raw'
import feelsSparkFreeze from './content/feels/spark-freeze.json?raw'
import figuresHero from './content/figures/hero.json?raw'
import figuresKeeper from './content/figures/keeper.json?raw'
import figuresMeadow from './content/figures/meadow.json?raw'
import figuresTree from './content/figures/tree.json?raw'
import levelsLevel1 from './content/levels/level-1.json?raw'
import messagesEn from './content/messages/en.json?raw'
import messagesEs from './content/messages/es.json?raw'
import messagesJa from './content/messages/ja.json?raw'
import messagesKo from './content/messages/ko.json?raw'
import messagesPt from './content/messages/pt.json?raw'
import messagesZh from './content/messages/zh.json?raw'
import musicMeadow from './content/music/meadow.json?raw'
import soundsJump from './content/sounds/jump.json?raw'
import soundsLand from './content/sounds/land.json?raw'
import tilesetsMeadow from './content/tilesets/meadow.json?raw'
import tuningsHero from './content/tunings/hero.json?raw'

/** Every file of the full game, by its path from the game's root. */
export const fullGameFiles: Record<string, string> = {
  'automata.toml': automata,
  'content/levels/level-1.json': levelsLevel1,
  'content/tilesets/meadow.json': tilesetsMeadow,
  'content/characters/hero.json': charactersHero,
  'content/characters/crate.json': charactersCrate,
  'content/characters/keeper.json': charactersKeeper,
  'content/characters/critter.json': charactersCritter,
  'content/figures/hero.json': figuresHero,
  'content/figures/keeper.json': figuresKeeper,
  'content/figures/meadow.json': figuresMeadow,
  'content/figures/tree.json': figuresTree,
  'content/backdrops/valley.json': backdropsValley,
  'content/behaviours/critter.json': behavioursCritter,
  'content/tunings/hero.json': tuningsHero,
  'content/feels/land-dust.json': feelsLandDust,
  'content/feels/crate-shake.json': feelsCrateShake,
  'content/feels/spark-freeze.json': feelsSparkFreeze,
  'content/sounds/jump.json': soundsJump,
  'content/sounds/land.json': soundsLand,
  'content/music/meadow.json': musicMeadow,
  'content/cues/cues.json': cuesCues,
  'content/conversations/keeper.json': conversationsKeeper,
  'content/cutscenes/level-1-intro.json': cutscenesLevel1Intro,
  'content/messages/en.json': messagesEn,
  'content/messages/es.json': messagesEs,
  'content/messages/ko.json': messagesKo,
  'content/messages/ja.json': messagesJa,
  'content/messages/zh.json': messagesZh,
  'content/messages/pt.json': messagesPt,
}

/** The full game's marks file: not content, so `loadGame` never asks for it and it is not in `fullGameFiles`. */
export const fullGameMarks: string = marks

/** A `read` over the full game, as `loadGame` takes it. An override replaces a file; `undefined` makes it missing. */
export function readFullGame(
  overrides: Readonly<Record<string, string | undefined>> = {},
): (path: string) => Promise<string> {
  const files: Record<string, string | undefined> = { ...fullGameFiles, ...overrides }
  return async (path) => {
    const text = files[path]
    if (text === undefined) throw new Error(`${path}: no such file`)
    return text
  }
}
