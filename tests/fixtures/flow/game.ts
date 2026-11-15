// A two-level game for the flow's tests, made in memory from the fixture game: a door that senses touches in each
// level, `done = "door.touched"`, one warning, words in three languages, and a cue for each screen the flow raises.
// `startFlow` is given a `read` over its files, as a page is.
import { createRecorder, type Replay } from '#src/features/commands/commands.ts'
import { type GameContent, type Language, loadGame, writeContent } from '#src/features/content/content.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { readFiles } from '../content/kind.ts'
import { heroPlugin } from '../game/hero.ts'
import { fixtureFiles } from '../game/read.ts'

/** The languages the game has words in. */
export const FLOW_LANGUAGES: readonly Language[] = ['en', 'es', 'ko']

const WORDS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  en: {
    'warning.flashing': 'Flashing lights.',
    'level.level-1.name': 'Level One',
    'level.level-2.name': 'Level Two',
  },
  es: {
    'warning.flashing': 'Luces que parpadean.',
    'level.level-1.name': 'Nivel Uno',
    'level.level-2.name': 'Nivel Dos',
  },
  ko: {
    'warning.flashing': '깜박이는 빛.',
    'level.level-1.name': '레벨 하나',
    'level.level-2.name': '레벨 둘',
  },
}

/** What a test may change about the game. */
export interface FlowGameOptions {
  /** The game has no warning. */
  readonly noWarning?: boolean
  /** A crate sits on the door from the start, so something that is not a hero touches it. */
  readonly crateOnDoor?: boolean
  /** Files to replace, or `undefined` to make one missing. */
  readonly replace?: Readonly<Record<string, string | undefined>>
}

const level = (id: string, things: readonly object[]): string =>
  writeContent('level', {
    format: 1,
    id,
    tiles: [...Array.from({ length: 8 }, () => '.'.repeat(16)), '#'.repeat(16)],
    things,
    starts: [{ player: 1, x: 2.5, y: 7.5 }],
  } as never)

/** The files of the flow's game. */
export function flowFiles(options: FlowGameOptions = {}): Record<string, string | undefined> {
  const door = { id: 'door-1', character: 'door', x: 5.5, y: 7.5 }
  const crate = { id: 'crate-1', character: 'crate', x: 5.5, y: 7.5 }
  const things = options.crateOnDoor === true ? [door, crate] : [door]
  const files: Record<string, string | undefined> = {
    ...fixtureFiles,
    'content/levels/level-1.json': level('level-1', things),
    'content/levels/level-2.json': level('level-2', [door]),
    'content/characters/door.json': writeContent('character', {
      format: 1,
      id: 'door',
      body: 'fixed',
      size: { w: 1, h: 1 },
      color: '#8844aa',
      upright: false,
      kind: 'door',
      touch: 'sense',
    } as never),
  }
  const listed = [
    ['level', 'content/levels/level-2.json'],
    ['character', 'content/characters/door.json'],
    ...FLOW_LANGUAGES.map((language) => ['messages', `content/messages/${language}.json`] as const),
  ]
  for (const language of FLOW_LANGUAGES)
    files[`content/messages/${language}.json`] = writeContent('messages', {
      format: 1,
      id: language,
      messages: WORDS[language],
    } as never)
  const head = [
    'format = 1',
    'name = "Crate Game"',
    'start = "level-1"',
    'hero = "hero"',
    'source = "en"',
    'levels = ["level-1", "level-2"]',
    'done = "door.touched"',
    ...(options.noWarning === true ? [] : ['warnings = ["warning.flashing"]']),
  ].join('\n')
  const own = (fixtureFiles['automata.toml'] ?? '').replace(
    /^format = 1\nname = .*\nstart = .*\nhero = .*\n/,
    '',
  )
  const more = listed.map(([type, path]) => `\n[[content]]\ntype = "${type}"\npath = "${path}"\n`)
  files['automata.toml'] = `${head}\n${own}${more.join('')}`
  return { ...files, ...options.replace }
}

/** A `read` over the flow's game. */
export const flowRead = (options: FlowGameOptions = {}): ((path: string) => Promise<string>) =>
  readFiles(flowFiles(options))

/** The flow's game, loaded. */
export async function flowGame(options: FlowGameOptions = {}): Promise<GameContent> {
  const loaded = await loadGame(flowRead(options))
  if (!loaded.ok) throw new Error(loaded.diagnostics.map((d) => d.message).join('\n'))
  return loaded.value
}

/** A recording of the game standing still: what a page shows before anyone has pressed Play. */
export async function flowReplay(ticks = 30): Promise<Replay> {
  const sim = await createGameSim({ content: await flowGame(), plugins: [heroPlugin] })
  const recorder = createRecorder(sim, { meta: { level: 'level-1', players: '1' } })
  for (let i = 0; i < ticks; i++) recorder.step([])
  const replay = recorder.replay()
  sim.dispose()
  return replay
}
