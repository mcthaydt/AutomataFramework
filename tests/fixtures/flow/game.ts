// A two-level game for the flow's tests, made in memory from the fixture game: a door that senses touches in each
// level, `done = "door.touched"`, `lost = "hero.fell"`, one warning, words in three languages, and a sound cue for each
// page event the flow raises (`FLOW_EVENTS`), each sound a tone of its own pitch so a test can tell which one was heard.
// A third level, `level-pit`, has a gap in its floor: a hero who runs right falls through it and loses. It is played by
// naming it as the start (`start: 'level-pit'`).
// `startFlow` is given a `read` over its files, as a page is.
import { createRecorder, type Replay } from '#src/features/commands/commands.ts'
import { type GameContent, type Language, loadGame, writeContent } from '#src/features/content/content.ts'
import { FLOW_EVENTS } from '#src/features/flow/flow.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { heroFigure } from '../content/art.ts'
import { readFiles } from '../content/kind.ts'
import { heroPlugin } from '../game/hero.ts'
import { fixtureFiles } from '../game/read.ts'
import { SCORE_NAMES } from './score.ts'

/** The languages the game has words in. */
export const FLOW_LANGUAGES: readonly Language[] = ['en', 'es', 'ko']

const WORDS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  en: {
    'warning.flashing': 'Flashing lights.',
    'level.level-1.name': 'Level One',
    'level.level-2.name': 'Level Two',
    'level.level-pit.name': 'The Pit',
    'level.level-1.goal': 'Reach the door.',
    'level.level-pit.goal': 'Jump the gap and reach the door.',
  },
  es: {
    'warning.flashing': 'Luces que parpadean.',
    'level.level-1.name': 'Nivel Uno',
    'level.level-2.name': 'Nivel Dos',
    'level.level-pit.name': 'El Pozo',
    'level.level-1.goal': 'Llega a la puerta.',
    'level.level-pit.goal': 'Salta el hueco y llega a la puerta.',
  },
  ko: {
    'warning.flashing': '깜박이는 빛.',
    'level.level-1.name': '레벨 하나',
    'level.level-2.name': '레벨 둘',
    'level.level-pit.name': '구덩이',
    'level.level-1.goal': '문까지 가세요.',
    'level.level-pit.goal': '구덩이를 뛰어넘어 문까지 가세요.',
  },
}

/** One of the page events the flow raises. */
type PageEvent = (typeof FLOW_EVENTS)[number]

/** The sound each flow event cues, and the pitch of its tone: the three screens and the three kinds of press. */
export const FLOW_SOUNDS: Readonly<Record<PageEvent, { sound: string; pitch: number }>> = {
  'screen.menu': { sound: 'menu', pitch: 330 },
  'screen.pause': { sound: 'pause', pitch: 440 },
  'screen.done': { sound: 'done', pitch: 550 },
  'screen.lost': { sound: 'lost', pitch: 770 },
  'ui.move': { sound: 'tick', pitch: 660 },
  'ui.press': { sound: 'tick', pitch: 660 },
  'ui.back': { sound: 'tick', pitch: 660 },
}

/** One 0.1 s sine tone at `pitch`, as a sound file. */
const tone = (id: string, pitch: number): string =>
  writeContent('sound', {
    format: 1,
    id,
    volume: 1,
    voices: [{ kind: 'tone', wave: 'sine', from: pitch, to: pitch, at: 0, length: 0.1, volume: 1 }],
  } as never)

/** What a test may change about the game. */
export interface FlowGameOptions {
  /** The game has no warning. */
  readonly noWarning?: boolean
  /** A crate sits on the door from the start, so something that is not a hero touches it. */
  readonly crateOnDoor?: boolean
  /** The splash shows the hero's figure instead of the game's name. */
  readonly splash?: boolean
  /** How many can play at once (2 to 4); a game for one, when left out. Each level has a start for each. */
  readonly players?: number
  /** The event that loses a level. Default `hero.fell`; `null` writes no `lost` line. */
  readonly lost?: string | null
  /** The level a new game opens: `level-1` (default), `level-2` or `level-pit`, which has a gap to fall into. */
  readonly start?: 'level-1' | 'level-2' | 'level-pit'
  /**
   * The game counts the sparks the hero takes (`score = ...`; see `./score.ts`): `sparks` names that number, `missing` a
   * resource the game lacks, `words` a field that is not a number. A spark lies on the way to the door in `level-1`.
   * Pass `scorePlugin` as the visit's plugin beside the hero.
   */
  readonly score?: keyof typeof SCORE_NAMES
  /** Files to replace, or `undefined` to make one missing. */
  readonly replace?: Readonly<Record<string, string | undefined>>
}

const level = (id: string, things: readonly object[], players = 1): string =>
  writeContent('level', {
    format: 1,
    id,
    tiles: [...Array.from({ length: 8 }, () => '.'.repeat(16)), '#'.repeat(16)],
    things,
    starts: Array.from({ length: players }, (_, i) => ({ player: i + 1, x: 2.5 + i, y: 7.5 })),
  } as never)

/**
 * A level with a gap in its floor, columns 5 to 10 of 16, and the door past it: the way to lose is to run right. The gap
 * is wide so that a hero pushing right while it falls is past the floor's row before it reaches the far side.
 */
const pit = (players = 1): string =>
  writeContent('level', {
    format: 1,
    id: 'level-pit',
    tiles: [
      ...Array.from({ length: 8 }, () => '.'.repeat(16)),
      Array.from({ length: 16 }, (_, col) => (col >= 5 && col <= 10 ? '.' : '#')).join(''),
    ],
    things: [{ id: 'door-1', character: 'door', x: 13.5, y: 7.5 }],
    starts: Array.from({ length: players }, (_, i) => ({ player: i + 1, x: 2.5 + i, y: 7.5 })),
  } as never)

/** The files of the flow's game. */
export function flowFiles(options: FlowGameOptions = {}): Record<string, string | undefined> {
  const door = { id: 'door-1', character: 'door', x: 5.5, y: 7.5 }
  const crate = { id: 'crate-1', character: 'crate', x: 5.5, y: 7.5 }
  const spark = { id: 'spark-1', character: 'spark', x: 4, y: 7.5 }
  const things = [
    ...(options.crateOnDoor === true ? [door, crate] : [door]),
    ...(options.score === undefined ? [] : [spark]),
  ]
  const files: Record<string, string | undefined> = {
    ...fixtureFiles,
    'content/levels/level-1.json': level('level-1', things, options.players),
    'content/levels/level-2.json': level('level-2', [door], options.players),
    'content/levels/level-pit.json': pit(options.players),
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
  if (options.score !== undefined)
    files['content/characters/spark.json'] = writeContent('character', {
      format: 1,
      id: 'spark',
      body: 'fixed',
      size: { w: 0.6, h: 0.6 },
      color: '#f5d547',
      upright: false,
      kind: 'spark',
      touch: 'take',
    } as never)
  if (options.splash === true)
    files['content/figures/hero.json'] = writeContent('figure', heroFigure() as never)
  const sounds = new Map(Object.values(FLOW_SOUNDS).map((one) => [one.sound, one.pitch]))
  for (const [id, pitch] of sounds) files[`content/sounds/${id}.json`] = tone(id, pitch)
  files['content/cues/cues.json'] = writeContent('cues', {
    format: 1,
    id: 'cues',
    cues: FLOW_EVENTS.map((on) => ({ on, do: 'sound', sound: FLOW_SOUNDS[on].sound })),
  } as never)
  const listed = [
    ['level', 'content/levels/level-2.json'],
    ['level', 'content/levels/level-pit.json'],
    ...[...sounds.keys()].map((id) => ['sound', `content/sounds/${id}.json`] as const),
    ['cues', 'content/cues/cues.json'],
    ['character', 'content/characters/door.json'],
    ...(options.score === undefined ? [] : [['character', 'content/characters/spark.json'] as const]),
    ...(options.splash === true ? [['figure', 'content/figures/hero.json'] as const] : []),
    ...FLOW_LANGUAGES.map((language) => ['messages', `content/messages/${language}.json`] as const),
  ]
  for (const language of FLOW_LANGUAGES)
    files[`content/messages/${language}.json`] = writeContent('messages', {
      format: 1,
      id: language,
      messages: WORDS[language],
    } as never)
  const start = options.start ?? 'level-1'
  const lost = options.lost === undefined ? 'hero.fell' : options.lost
  // The order of play: the start level, then level two, so "Next level" after a pit is level two.
  const order =
    start === 'level-1' ? ['level-1', 'level-2'] : start === 'level-2' ? ['level-2'] : [start, 'level-2']
  const head = [
    'format = 1',
    'name = "Crate Game"',
    `start = "${start}"`,
    'hero = "hero"',
    'source = "en"',
    `levels = [${order.map((id) => `"${id}"`).join(', ')}]`,
    'done = "door.touched"',
    ...(lost === null ? [] : [`lost = "${lost}"`]),
    ...(options.score === undefined ? [] : [`score = "${SCORE_NAMES[options.score]}"`]),
    ...(options.splash === true ? ['splash = "hero"'] : []),
    ...(options.players === undefined ? [] : [`players = ${options.players}`]),
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
