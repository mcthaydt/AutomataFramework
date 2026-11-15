// An editor tunes a playing game (plan G, task 4): `game.tune` changes the hero's built-in numbers from the next tick,
// as one `tune` command in the recording. In each real browser, with real key events and hand-driven frames.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  controlsCommand,
  createRecorder,
  Player,
  type Replay,
  verifyReplay,
} from '#src/features/commands/commands.ts'
import { MOVE_NUMBERS, moveNumbersOf } from '#src/features/content/content.ts'
import { type Game, startGame } from '#src/features/game/game.ts'
import { watchReplay } from '#src/features/game/watch.ts'
import { testHost } from '#src/features/host/host.ts'
import { createGameSim, tuneCommand } from '#src/features/level/level.ts'
import { Transform } from '#src/features/physics/physics.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { movesFiles } from '../../fixtures/game/moves-game.ts'
import { chosenLocale } from '../../fixtures/locale/chosen.ts'

const FRAME = 1000 / 60

let mount: HTMLDivElement
let game: Game | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  game?.stop()
  game = undefined
  mount.remove()
  vi.restoreAllMocks()
})

type Frames = ReturnType<typeof manualFrames>

/** The moves fixture game, started with the hero settled on the floor. */
async function start(tunable: boolean): Promise<{ frames: Frames; g: Game }> {
  const content = await loadFixtureGame(movesFiles({}))
  const frames = manualFrames()
  const g = await startGame({
    content,
    locale: await chosenLocale(content, 'ko'),
    mount,
    host: testHost(),
    frames,
    ...(tunable ? { tunable: true } : {}),
  })
  game = g
  run(frames, 30)
  return { frames, g }
}
const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}
const run = (frames: Frames, n: number): void => {
  for (let i = 0; i < n; i++) frames.advance(FRAME)
}
const place = (g: Game): { x: number; y: number } => {
  const at = g.sim.query(Player, Transform)[0]?.get(Transform)
  return { x: at?.x ?? Number.NaN, y: at?.y ?? Number.NaN }
}
/** A held jump: how high the hero got, in tiles, from where it stood to the top. */
function jumpHeight(frames: Frames, g: Game): number {
  const floor = place(g).y
  let top = floor
  key('keydown', 'Space')
  for (let i = 0; i < 30; i++) {
    run(frames, 1)
    top = Math.min(top, place(g).y)
  }
  key('keyup', 'Space')
  run(frames, 90)
  return floor - top
}
const tunes = (g: Game): readonly { payload: unknown }[] =>
  g.replay().commands.filter((c) => c.type === 'tune')

test('tune({ jump-speed: 16 }) makes the next jump higher than the one before it', async () => {
  const { frames, g } = await start(true)
  const before = jumpHeight(frames, g)
  g.tune({ 'jump-speed': 16 })
  const after = jumpHeight(frames, g)
  expect(after).toBeGreaterThan(before + 1)
})

test('tune keeps the hero where it is', async () => {
  const { frames, g } = await start(true)
  const was = place(g)
  g.tune({ 'jump-speed': 16, 'walk-speed': 9 })
  run(frames, 2)
  expect(place(g).x).toBeCloseTo(was.x, 3)
  expect(place(g).y).toBeCloseTo(was.y, 3)
})

test('two tunes before one frame send one command, with the later values', async () => {
  const { frames, g } = await start(true)
  g.tune({ 'jump-speed': 14 })
  g.tune({ 'jump-speed': 18 })
  run(frames, 3)
  const sent = tunes(g)
  expect(sent).toHaveLength(1)
  const values = (sent[0]?.payload as { values: number[] } | undefined)?.values ?? []
  expect(values[MOVE_NUMBERS.findIndex((n) => n.id === 'jump-speed')]).toBe(18)
})

test('a tune made while paused lands after resume', async () => {
  const { frames, g } = await start(true)
  g.pause()
  g.tune({ 'jump-speed': 16 })
  run(frames, 10)
  expect(tunes(g)).toHaveLength(0)
  g.resume()
  run(frames, 4)
  expect(tunes(g)).toHaveLength(1)
})

test('tune on a game not started with tunable throws the sentence; after stop it does nothing', async () => {
  const off = await start(false)
  expect(() => off.g.tune({ 'jump-speed': 16 })).toThrow(
    'This game was not started with "tunable": true, so its numbers cannot change while it plays.',
  )
  off.g.stop()
  game = undefined
  const on = await start(true)
  on.g.stop()
  expect(() => on.g.tune({ 'jump-speed': 16 })).not.toThrow()
})

test('game.replay() of a tuned play verifies, and its meta says tunable', async () => {
  const { frames, g } = await start(true)
  g.tune({ 'jump-speed': 16 })
  jumpHeight(frames, g)
  const replay = g.replay()
  expect(replay.meta.tunable).toBe('true')
  const content = await loadFixtureGame(movesFiles({}))
  const sim = await createGameSim({ content, tunable: true })
  try {
    expect(verifyReplay(sim, replay)).toEqual({ ok: true })
  } finally {
    sim.dispose()
  }
})

test('a game not started with tunable writes no tunable key into its replay', async () => {
  const { frames, g } = await start(false)
  run(frames, 5)
  expect(g.replay().meta.tunable).toBeUndefined()
})

/** A play of a tunable game as the framework records it: a tune at tick 5, then a held jump from tick 10 to tick 40. */
async function recordedTunedPlay(): Promise<Replay> {
  const content = await loadFixtureGame(movesFiles({}))
  const sim = await createGameSim({ content, tunable: true })
  try {
    const recorder = createRecorder(sim, { meta: { level: 'level-1', players: '1', tunable: 'true' } })
    for (let t = 0; t < 120; t++) {
      recorder.step(
        t === 5
          ? [tuneCommand(t, 0, moveNumbersOf({ 'jump-speed': 20 }))]
          : t === 10
            ? [controlsCommand(t, 1, 1, ['jump', 'right'])]
            : t === 40
              ? [controlsCommand(t, 1, 2, [])]
              : [],
      )
    }
    return recorder.replay()
  } finally {
    sim.dispose()
  }
}

test('watchReplay plays a tuned recording to its last hash, because its meta says tunable', async () => {
  const replay = await recordedTunedPlay()
  expect(replay.meta.tunable).toBe('true')
  const frames = manualFrames()
  const watch = await watchReplay({
    content: await loadFixtureGame(movesFiles({})),
    mount,
    host: testHost(),
    frames,
    replay,
    rounds: 1,
  })
  try {
    frames.at(0)
    run(frames, 120)
    expect(watch.sim.tick).toBe(120)
    expect(watch.sim.hash()).toBe(replay.finalHash)
  } finally {
    watch.stop()
  }
})
