// The loops and styles the framework brings, and their names in nine languages. A game or an editor picks one up with
// `libraryFiles`, which gives the files to write into a game, so the library is never a hidden dependency: what a game
// uses is content in the game's own folders. Every file is data under `library/`.
import { type ArrangedMusic, LANGUAGES, type LoopFile } from '../content/content.ts'
import bouncyBass from './library/loops/bouncy-bass.json' with { type: 'json' }
import braveTune from './library/loops/brave-tune.json' with { type: 'json' }
import busyDrums from './library/loops/busy-drums.json' with { type: 'json' }
import calmTune from './library/loops/calm-tune.json' with { type: 'json' }
import drumFill from './library/loops/drum-fill.json' with { type: 'json' }
import easyDrums from './library/loops/easy-drums.json' with { type: 'json' }
import echoTune from './library/loops/echo-tune.json' with { type: 'json' }
import fallingTune from './library/loops/falling-tune.json' with { type: 'json' }
import fourOnFloor from './library/loops/four-on-floor.json' with { type: 'json' }
import halfTimeDrums from './library/loops/half-time-drums.json' with { type: 'json' }
import longChords from './library/loops/long-chords.json' with { type: 'json' }
import marchDrums from './library/loops/march-drums.json' with { type: 'json' }
import octaveBass from './library/loops/octave-bass.json' with { type: 'json' }
import offBeatChords from './library/loops/off-beat-chords.json' with { type: 'json' }
import pulseChords from './library/loops/pulse-chords.json' with { type: 'json' }
import risingTune from './library/loops/rising-tune.json' with { type: 'json' }
import shuffleDrums from './library/loops/shuffle-drums.json' with { type: 'json' }
import skipBass from './library/loops/skip-bass.json' with { type: 'json' }
import skippingTune from './library/loops/skipping-tune.json' with { type: 'json' }
import slowBass from './library/loops/slow-bass.json' with { type: 'json' }
import softChords from './library/loops/soft-chords.json' with { type: 'json' }
import stabChords from './library/loops/stab-chords.json' with { type: 'json' }
import steadyBass from './library/loops/steady-bass.json' with { type: 'json' }
import tomFill from './library/loops/tom-fill.json' with { type: 'json' }
import walkingBass from './library/loops/walking-bass.json' with { type: 'json' }
import waltzChords from './library/loops/waltz-chords.json' with { type: 'json' }
import bouncyStyle from './library/styles/bouncy.json' with { type: 'json' }
import braveStyle from './library/styles/brave.json' with { type: 'json' }
import calmStyle from './library/styles/calm.json' with { type: 'json' }
import spookyStyle from './library/styles/spooky.json' with { type: 'json' }
import words from './library/words.json' with { type: 'json' }

/** The languages the library names things in: the six a game ships, then the three the editors add. */
export const LIBRARY_LANGUAGES = [...LANGUAGES, 'fr', 'ru', 'de'] as const
export type LibraryLanguage = (typeof LIBRARY_LANGUAGES)[number]

export interface Library {
  readonly loops: readonly LoopFile[]
  /** Each a four-bar format 2 track made only of the library's loops. */
  readonly styles: readonly ArrangedMusic[]
}

/** The built-in loops and styles, in the order they are listed in the editors. */
export const LIBRARY: Library = {
  loops: [
    easyDrums,
    busyDrums,
    halfTimeDrums,
    marchDrums,
    shuffleDrums,
    fourOnFloor,
    drumFill,
    tomFill,
    bouncyBass,
    walkingBass,
    steadyBass,
    octaveBass,
    slowBass,
    skipBass,
    softChords,
    stabChords,
    pulseChords,
    longChords,
    offBeatChords,
    waltzChords,
    risingTune,
    fallingTune,
    skippingTune,
    echoTune,
    calmTune,
    braveTune,
  ] as unknown as readonly LoopFile[],
  styles: [calmStyle, bouncyStyle, spookyStyle, braveStyle] as unknown as readonly ArrangedMusic[],
}

const names = words as unknown as Readonly<Record<string, Readonly<Record<LibraryLanguage, string>>>>

/** The name of a library loop, style, sound kind, instrument or drum in a language: `libraryName('easy-drums', 'es')`. */
export function libraryName(id: string, language: LibraryLanguage): string {
  const name = names[id]?.[language]
  if (name === undefined) throw new Error(`The library has no name for "${id}" in "${language}".`)
  return name
}

/** One file a library item puts in a game: its kind and what `writeContent` takes. */
export interface LibraryFile {
  readonly type: 'loop' | 'music'
  readonly value: LoopFile | ArrangedMusic
}

/**
 * The files using a loop or a style puts in a game: the thing itself and, for a style, each loop it plays once, as
 * values `writeContent` takes. A style comes first. `as` renames a style's track (not a loop). Throws in plain words for
 * an id the library lacks.
 */
export function libraryFiles(id: string, as?: string): LibraryFile[] {
  const loop = LIBRARY.loops.find((entry) => entry.id === id)
  if (loop !== undefined) return [{ type: 'loop', value: loop }]
  const style = LIBRARY.styles.find((entry) => entry.id === id)
  if (style === undefined) {
    const known = [...LIBRARY.loops.map((entry) => entry.id), ...LIBRARY.styles.map((entry) => entry.id)]
    throw new Error(`The library has nothing called "${id}". It has: ${known.sort().join(', ')}.`)
  }
  const files: LibraryFile[] = [{ type: 'music', value: as === undefined ? style : { ...style, id: as } }]
  const used = new Set<string>()
  for (const lane of style.lanes)
    for (const block of lane.blocks) {
      if (!('loop' in block) || used.has(block.loop)) continue
      used.add(block.loop)
      const part = LIBRARY.loops.find((entry) => entry.id === block.loop)
      if (part !== undefined) files.push({ type: 'loop', value: part })
    }
  return files
}
