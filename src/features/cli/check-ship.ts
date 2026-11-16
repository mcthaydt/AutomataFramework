// The `ship` step of `automata check --ship`: what is fine to play with and wrong to hand to a stranger. It carries every
// earlier step's `ship` findings as problems, adds three of its own (a heavy picture, words too small for a phone, a save
// whose shape changed without its version), and says the list only a game's makers can judge.
import { join } from 'node:path'
import { Effect } from 'effect'
import type * as Headless from '../../headless.ts'
import { canonicalJson } from '../../lib/canonical.ts'
import { hex64, xxhash64 } from '../../lib/xxhash64.ts'
import type { Diagnostic } from '../content/content.ts'
import type { SaveDef } from '../saves/saves.ts'
import type { GameFolder } from './game-folder.ts'
import { Files, type FilesService } from './ports.ts'
import type { ShipFinding, StepReport } from './report.ts'

/** The list a maker tries by hand: what no program can judge. */
export const BY_HAND: readonly string[] = [
  'In five seconds, is it clear what to do?',
  'Can someone who has never seen it work out how to play, with nobody explaining?',
  'Is there enough to do: a few minutes of play, or a reason to play again?',
  'Does it get harder bit by bit?',
  'Did you make the art, the music and the characters, or are you allowed to use them?',
  'Are there any stand-in pictures, half-made menus, or spots that do something when tapped that nobody would guess?',
  'Do the pictures and words look cared for, the same style on every screen?',
  'Is color ever the only clue? Is sound ever the only clue?',
  'Can luck make a level impossible? Does anything appear right on top of the player?',
  'Play it for ten minutes on a real phone.',
  'Play it with one hand, on bad Wi-Fi, after locking and unlocking the phone, and after many restarts.',
  'Hand it to someone and say nothing. Is it still fun after 30 seconds?',
]

const MAX_PICTURE = 512 * 1024
const MIN_TEXT = 14
const PICTURE = /\.(?:png|jpe?g|gif|webp|avif)$/i
const STYLED = /\.(?:css|svelte)$/

/**
 * `"<version>:<hash>"` of a save: the hash is of the schema's JSON Schema (`io: 'input'`, as the sim describes its own
 * schemas), made with the game's own copy of the framework, so one schema gives one mark in every engine and run.
 */
export function saveMark(framework: typeof Headless, save: SaveDef<unknown>): string {
  const schema = framework.z.toJSONSchema(save.schema, { io: 'input', unrepresentable: 'any' })
  return `${save.version}:${hex64(xxhash64(new TextEncoder().encode(canonicalJson(schema))))}`
}

const lineOf = (text: string, index: number): number => text.slice(0, index).split('\n').length

/** Pictures under `content/` that are too heavy to open fast. */
function sizeFindings(game: GameFolder, files: FilesService): Effect.Effect<ShipFinding[]> {
  return Effect.gen(function* () {
    const found: ShipFinding[] = []
    for (const name of yield* files.list(join(game.folder, 'content'))) {
      if (!PICTURE.test(name)) continue
      const bytes = yield* files.readBytes(join(game.folder, 'content', name))
      if (bytes === undefined || bytes.length <= MAX_PICTURE) continue
      const file = `content/${name}`
      found.push({
        rule: 'size',
        file,
        path: '',
        message: `${file} is ${Math.round(bytes.length / 1024)} KB. A picture over 512 KB makes the game slow to open. Make it smaller.`,
      })
    }
    return found
  })
}

/** A `font-size` under 14 pixels in a style or a screen of the game. */
function smallWords(game: GameFolder, files: FilesService): Effect.Effect<ShipFinding[]> {
  return Effect.gen(function* () {
    const found: ShipFinding[] = []
    for (const name of yield* files.list(join(game.folder, 'src'))) {
      if (!STYLED.test(name)) continue
      const text = yield* files.readText(join(game.folder, 'src', name))
      if (text === undefined) continue
      for (const m of text.matchAll(/font-size\s*:\s*(\d*\.?\d+)px/gi)) {
        const size = Number(m[1])
        if (size >= MIN_TEXT) continue
        const file = `src/${name}`
        found.push({
          rule: 'small-words',
          file,
          path: `line ${lineOf(text, m.index)}`,
          message: `${file} has words ${size} pixels tall. Under 14 a phone cannot read them.`,
        })
      }
    }
    return found
  })
}

/**
 * The save's shape changed and its version did not. The newest recording is the last, by name, that carries a
 * `meta.save`, which `automata replay --accept` writes.
 */
function saveFindings(game: GameFolder, files: FilesService): Effect.Effect<ShipFinding[]> {
  return Effect.gen(function* () {
    const { code } = game
    if (code === undefined || !('plugins' in code.rules) || code.rules.save === undefined) return []
    let recorded: string | undefined
    for (const recording of game.recordings) {
      const text = yield* files.readText(join(game.folder, recording))
      try {
        const save = (JSON.parse(text ?? '') as { meta?: { save?: unknown } }).meta?.save
        if (typeof save === 'string') recorded = save
      } catch {
        // A recording that is not JSON is for the replays step to say.
      }
    }
    if (recorded === undefined) return []
    const [version, hash] = recorded.split(':')
    const [nowVersion, nowHash] = saveMark(code.framework, code.rules.save).split(':')
    if (version !== nowVersion || hash === nowHash) return []
    return [
      {
        rule: 'save',
        file: 'src/headless.ts',
        path: '',
        message:
          "The saved game's shape changed and its version did not, so players would lose their saves. Raise version in defineSave and add the step that upgrades the old one.",
      },
    ]
  })
}

/** A level that has no goal line in the game's own language: a note, since a game may say its goal in its own way. */
function goalNotes(game: GameFolder): string[] {
  if (!game.loaded.ok) return []
  const content = game.loaded.value
  const { source } = content.project
  const words = source === undefined ? undefined : content.messages?.[source]?.messages
  return (content.project.levels ?? [content.project.start])
    .filter((level) => words?.[`level.${level}.goal`] === undefined)
    .map(
      (level) =>
        `${level} has no goal line. Add "level.${level}.goal" to your messages, so a new player is told what to do.`,
    )
}

/** The ship step: every earlier step's `ship` findings as problems, plus its own. */
export function shipStep(
  game: GameFolder,
  earlier: readonly StepReport[],
): Effect.Effect<StepReport, never, FilesService> {
  return Effect.gen(function* () {
    const files = yield* Files
    const own = [
      ...(yield* sizeFindings(game, files)),
      ...(yield* smallWords(game, files)),
      ...(yield* saveFindings(game, files)),
    ]
    const problems: Diagnostic[] = [...earlier.flatMap((step) => step.ship ?? []), ...own].map(
      ({ file, path, message }) => ({ file, path, message }),
    )
    return {
      step: 'ship',
      state: problems.length > 0 ? 'failed' : 'passed',
      problems,
      notes: goalNotes(game),
    } satisfies StepReport
  })
}
