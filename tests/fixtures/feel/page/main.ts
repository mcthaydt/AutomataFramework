// The page the feel journey opens in each browser: the feel game on a real page, played with the real host. It puts the
// game on `window.automataGame` (as the template's page does) and, every animation frame, notes what the picture
// drew in `window.trace`, so a journey reads what happened from frame to frame without racing a dust that lasts a third
// of a second. The game's files come from `files.json`, written beside this page by the journey. The address says how:
// `?watch` plays a recording by itself, and nothing else changes.
import {
  controlsCommand,
  createGameSim,
  createLocale,
  createRecorder,
  type Game,
  loadGame,
  openSettings,
  Player,
  type Replay,
  startGame,
  Transform,
  testHost,
  type Watch,
  watchReplay,
  webHost,
} from '#src/index.ts'

/** One animation frame as the picture drew it. */
interface Sample {
  readonly t: number
  readonly tick: number
  readonly freeze: number
  /** How far the picture is moved, in tiles, as the sum of the two directions. */
  readonly shake: number
  readonly specks: number
  /** Where the page's canvas, thumbs and buttons were, as one string, so a frame is equal to another or it is not. */
  readonly boxes: string
  readonly hero: readonly [number, number] | null
  readonly speck: readonly [number, number] | null
}

const params = new URLSearchParams(location.search)
const mount = document.querySelector<HTMLElement>('#mount') as HTMLElement
const trace: Sample[] = []
Object.assign(window, { trace })

const files = (await (await fetch(new URL('./files.json', location.href))).json()) as Record<string, string>
const loaded = await loadGame(async (path) => {
  const text = files[path]
  if (text === undefined) throw new Error(`${path}: no such file`)
  return text
})
if (!loaded.ok) throw new Error(loaded.diagnostics.map((d) => d.message).join('\n'))
const content = loaded.value

// The player has chosen a language: a page that is asked nothing says English.
const languageHost = testHost()
const locale = createLocale({
  content,
  host: languageHost,
  settings: await openSettings({ game: 'feel-journey', store: languageHost.store }),
})
await locale.set('en')

/** The recording a watched page plays: right from the start (the spark is taken on the way), a jump, and let go. */
async function record(): Promise<Replay> {
  const sim = await createGameSim({ content })
  try {
    const recorder = createRecorder(sim)
    for (let tick = 0; tick < 160; tick++)
      recorder.step(
        tick === 0
          ? [controlsCommand(tick, 1, 0, ['right'])]
          : tick === 90
            ? [controlsCommand(tick, 1, 1, ['right', 'jump'])]
            : tick === 92
              ? [controlsCommand(tick, 1, 2, ['right'])]
              : tick === 150
                ? [controlsCommand(tick, 1, 3, [])]
                : [],
      )
    return recorder.replay()
  } finally {
    sim.dispose()
  }
}

const host = webHost()
const game: Game | Watch = params.has('watch')
  ? await watchReplay({ content, mount, host, replay: await record() })
  : await startGame({ content, locale, mount, host })
Object.assign(window, { automataGame: game })

const watched = 'canvas, .automata-thumb-half, .automata-touch-button'
const boxes = (): string =>
  JSON.stringify([mount, ...mount.querySelectorAll(watched)].map((el) => el.getBoundingClientRect()))

const sample = (): void => {
  const feel = game.feel()
  const hero = game.sim.query(Player, Transform)[0]
  const first = feel.specks[0]
  trace.push({
    t: performance.now(),
    tick: game.sim.tick,
    freeze: feel.freeze,
    shake: Math.abs(feel.shake.x) + Math.abs(feel.shake.y),
    specks: feel.specks.length,
    boxes: boxes(),
    hero: hero === undefined ? null : [hero.get(Transform).x, hero.get(Transform).y],
    speck: first === undefined ? null : [first.x, first.y],
  })
  requestAnimationFrame(sample)
}
sample()
