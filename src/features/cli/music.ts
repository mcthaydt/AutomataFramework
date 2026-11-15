// `automata music`: a MIDI file brought in as a song and its loops, or a song, a loop or a motif taken out as a MIDI file.
// The game's own framework does the reading and writing (so the bytes are the ones its editors write too), and every file
// goes into the folder the project lists for its kind. Nothing is written when anything is wrong, so a refusal leaves the
// game as it was.
import { join } from 'node:path'
import { Effect } from 'effect'
import type { MidiSource } from '../audio/audio.ts'
import { CliError, Files, type Ports } from './ports.ts'
import { folderOf, missingFolders, nameOfFile, nameProblem, readWritable } from './sound-folders.ts'

/** What `automata music import` made: the files it wrote from the game's folder, and what the file had that a song cannot hold. */
export interface MusicImportReport {
  /** The song first, then each loop. */
  readonly made: readonly string[]
  readonly dropped: readonly string[]
}

/** What `automata music export` made: the file it wrote. */
export interface MusicExportReport {
  readonly wrote: string
}

/** What to import: the game, a MIDI file, and what to call the song (the file's name made into a name when left out). */
export interface MusicImportOptions {
  readonly folder: string
  readonly file: string
  readonly id?: string
}

/** What to export: the game, the name of a track, a loop or a motif, and the MIDI file to write. */
export interface MusicExportOptions {
  readonly folder: string
  readonly id: string
  readonly file: string
}

/** The sentences for a word of the command that is missing. */
export const MUSIC_USAGE = {
  verb: 'automata music needs import or export, like automata music import song.mid.',
  import: 'automata music import needs a MIDI file, like automata music import song.mid.',
  export: 'automata music export needs a name and a file, like automata music export meadow meadow.mid.',
} as const

/** "1 loop", "6 loops". */
const loops = (count: number): string => `${count} loop${count === 1 ? '' : 's'}`

/** A file of the game to write: what it is called, which kind it is and where it goes, from the game's root. */
interface Piece {
  readonly type: 'loop' | 'music'
  readonly name: string
  readonly path: string
}

/** Reads a MIDI file into a song and its loops and writes them, or says why not. */
export function runMusicImport(
  options: MusicImportOptions,
): Effect.Effect<MusicImportReport, CliError, Ports> {
  return Effect.gen(function* () {
    const files = yield* Files
    const game = yield* readWritable(options.folder)
    const id = options.id ?? nameOfFile(options.file)
    const bad = nameProblem(id)
    if (bad !== undefined) return yield* Effect.fail(new CliError(bad))
    const missing = missingFolders(game, ['music', 'loop'])
    if (missing !== undefined) return yield* Effect.fail(missing)
    const bytes = yield* files.readBytes(options.file)
    if (bytes === undefined)
      return yield* Effect.fail(
        new CliError(`There is no file at ${options.file}. Check its name and try again.`),
      )
    const read = game.api.midiToMusic(bytes, id)
    if (!read.ok) return yield* Effect.fail(new CliError(read.message))
    const { music, loops: made, dropped } = read.value

    const musicFolder = folderOf(game, 'music') ?? ''
    const loopFolder = folderOf(game, 'loop') ?? ''
    const pieces: Piece[] = [
      { type: 'music', name: music.id, path: `${musicFolder}/${music.id}.json` },
      ...made.map((loop): Piece => ({ type: 'loop', name: loop.id, path: `${loopFolder}/${loop.id}.json` })),
    ]
    // Nothing is overwritten: a name the game already has, or a file already at the place, is a refusal.
    for (const piece of pieces) {
      const known = piece.type === 'music' ? game.content.music : game.content.loops
      const taken =
        known?.[piece.name] !== undefined ||
        (yield* files.readText(join(options.folder, piece.path))) !== undefined
      if (!taken) continue
      return yield* Effect.fail(
        new CliError(
          piece.type === 'music'
            ? `There is already a music track called "${piece.name}". Pick another name with --id.`
            : `There is already a loop called "${piece.name}". Pick another name for the song with --id.`,
        ),
      )
    }

    // The loops first: a song is never on disk without the loops it plays.
    for (const loop of made) {
      const path = join(options.folder, `${loopFolder}/${loop.id}.json`)
      yield* files.write(path, game.api.writeContent('loop', loop))
    }
    const songPath = join(options.folder, `${musicFolder}/${music.id}.json`)
    yield* files.write(songPath, game.api.writeContent('music', music))
    return { made: pieces.map((piece) => piece.path), dropped: dropped.map((one) => one.sentence) }
  })
}

/** What a person reads after an import: what was made, then each thing the song could not keep. */
export function describeImport(report: MusicImportReport): string[] {
  const [song = '', ...more] = report.made
  const made = more.length === 0 ? `Made ${song}.` : `Made ${song} and ${loops(more.length)}.`
  return [made, ...report.dropped]
}

/** Writes a track, a loop or a motif of the game as a MIDI file where asked, or says why not. */
export function runMusicExport(
  options: MusicExportOptions,
): Effect.Effect<MusicExportReport, CliError, Ports> {
  return Effect.gen(function* () {
    const files = yield* Files
    const game = yield* readWritable(options.folder)
    const { music, loops: loopFiles, motifs } = game.content
    const track = music?.[options.id]
    const loop = loopFiles?.[options.id]
    const motif = motifs?.[options.id]
    const source: MidiSource | undefined =
      track !== undefined
        ? { type: 'music', value: track }
        : loop !== undefined
          ? { type: 'loop', value: loop }
          : motif !== undefined
            ? { type: 'motif', value: motif }
            : undefined
    if (source === undefined) {
      const names = [
        ...Object.keys(music ?? {}),
        ...Object.keys(loopFiles ?? {}),
        ...Object.keys(motifs ?? {}),
      ]
      const has = names.length === 0 ? 'This game has none yet.' : `This game has: ${names.join(', ')}.`
      return yield* Effect.fail(
        new CliError(`There is no track, loop or motif called "${options.id}". ${has}`),
      )
    }
    yield* files.write(options.file, game.api.musicToMidi(source, game.content))
    return { wrote: options.file }
  })
}
