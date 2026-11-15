// `automata sound new`: a new sound made from a kind (jump, coin, explosion …) and a seed, written into the folder the
// project lists for sounds. The same kind and seed make the same sound everywhere, and the next seed is another take, so
// an agent or a person tries seeds until one sounds right. Running it again with the same name replaces that take.
import { join } from 'node:path'
import { Effect } from 'effect'
import { CliError, Files, type Ports } from './ports.ts'
import { folderOf, missingFolders, nameProblem, readWritable } from './sound-folders.ts'

/** What `automata sound new` made: the file, from the game's folder, and the kind and seed it came from. */
export interface SoundNewReport {
  readonly made: string
  readonly kind: string
  readonly seed: number
}

/** What to make: the game, a kind, a seed (0 when left out) and a name (the kind's own when left out). */
export interface SoundNewOptions {
  readonly folder: string
  readonly kind: string
  readonly seed?: number
  readonly id?: string
}

/** The sentences for a word of the command that is missing. */
export const SOUND_USAGE = {
  verb: 'automata sound needs new and a kind, like automata sound new jump.',
  new: 'automata sound new needs a kind, like automata sound new jump.',
} as const

/** The seed a person typed, or the sentence that says what a seed is. */
export function seedOf(text: string): number | CliError {
  const seed = Number(text)
  return /^\d+$/.test(text) && Number.isSafeInteger(seed)
    ? seed
    : new CliError('--seed needs a whole number from 0, like --seed 3.')
}

/** Makes a sound of a kind and writes it, or says why not. */
export function runSoundNew(options: SoundNewOptions): Effect.Effect<SoundNewReport, CliError, Ports> {
  return Effect.gen(function* () {
    const files = yield* Files
    const game = yield* readWritable(options.folder)
    const kind = game.api.SOUND_KINDS.find((one) => one === options.kind)
    if (kind === undefined)
      return yield* Effect.fail(
        new CliError(
          `There is no kind of sound called "${options.kind}". The kinds are: ${game.api.SOUND_KINDS.join(', ')}.`,
        ),
      )
    const id = options.id ?? kind
    const bad = nameProblem(id)
    if (bad !== undefined) return yield* Effect.fail(new CliError(bad))
    const missing = missingFolders(game, ['sound'])
    if (missing !== undefined) return yield* Effect.fail(missing)

    const seed = options.seed ?? 0
    const path = `${folderOf(game, 'sound') ?? ''}/${id}.json`
    const text = game.api.writeContent('sound', game.api.makeSound(kind, seed, id))
    yield* files.write(join(options.folder, path), text)
    return { made: path, kind, seed }
  })
}

/** What a person reads: the file, where it came from, and how to hear another take. */
export function describeSound(report: SoundNewReport): string[] {
  return [
    `Made ${report.made} (${report.kind}, seed ${report.seed}). Try another with --seed ${report.seed + 1}.`,
  ]
}
