// The story on a page: the box follows the sim, and what the player presses goes into the replay. The story game on a
// page, frames by hand, keys sent as a browser sends them, a pretend gamepad.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { verifyReplay } from '#src/features/commands/commands.ts'
import type { Game } from '#src/features/game/game.ts'
import { type Watch, watchReplay } from '#src/features/game/watch.ts'
import type { Claim } from '#src/features/input/input.ts'
import {
  ChooseCommand,
  createGameSim,
  NextCommand,
  SkipCommand,
  Story,
  storyOfReplay,
} from '#src/features/level/level.ts'
import { wordsOf } from '#src/features/story/words.ts'
import { canonicalJson } from '#src/lib/canonical.ts'
import { key, run, type Started, startCoop, visibleHost } from '../../fixtures/game/co-op-game.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { loadStory, storyPlugins } from '../../fixtures/story/game.ts'
import { boxOf, buttonsOf, playUntil, said, showing, startStory } from '../../fixtures/story/play.ts'
import { englishWords as en, spanishWords as es } from '../../fixtures/story/read.ts'

let mount: HTMLDivElement
let game: Game | undefined
let watch: Watch | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  game?.stop()
  game = undefined
  watch?.stop()
  watch = undefined
  mount.remove()
  vi.restoreAllMocks()
})

/** The play's commands of one type. */
const sent = (g: Game, type: string) => g.replay().commands.filter((c) => c.type === type)

test('the box follows the sim: the opening, then nothing, then the keeper', async () => {
  const started = await startStory(mount)
  game = started.game
  const { frames } = started
  run(frames, 40)
  expect(said(mount, 'text')).toBe(en['keeper.welcome'])
  expect(said(mount, 'speaker')).toBe(en['keeper.name'])
  // Skip is not there for the first 30 ticks and is after them.
  expect(buttonsOf(mount)).toEqual(['Skip'])
  run(frames, 85)
  expect(showing(mount)).toBe(false)
  key('keydown', 'ArrowRight')
  expect(playUntil(frames, () => said(mount, 'text') === en['keeper.hello'])).toBe(true)
  expect(buttonsOf(mount)).toEqual([en['hero.ask'], en['hero.bye']])
  expect(said(mount, 'speaker')).toBe(en['keeper.name'])
})

test('Skip is not there for the first moments, so a tap meant for Next cannot skip', async () => {
  const started = await startStory(mount)
  game = started.game
  run(started.frames, 20)
  expect(buttonsOf(mount)).toEqual([])
})

test('Skip skips: one command, from player 1, in the replay', async () => {
  const started = await startStory(mount)
  game = started.game
  run(started.frames, 40)
  expect(buttonsOf(mount)).toEqual(['Skip'])
  key('keydown', 'Enter')
  key('keydown', 'Enter')
  run(started.frames, 3)
  const skips = sent(game, SkipCommand.id)
  expect(skips).toHaveLength(1)
  expect(skips[0]?.source).toBe(1)
  expect(showing(mount)).toBe(false)
  expect(game.sim.resource(Story).scene).toBeNull()
})

/** Plays to the keeper's question: skips the opening, holds right, waits for the two answers. */
async function toTheQuestion(): Promise<Started> {
  const made = await startStory(mount)
  game = made.game
  run(made.frames, 40)
  key('keydown', 'Enter')
  key('keyup', 'Enter')
  key('keydown', 'ArrowRight')
  expect(playUntil(made.frames, () => buttonsOf(mount).length === 2)).toBe(true)
  return made
}

test('after a restore the box shows the line the sim is on', async () => {
  const { frames } = await toTheQuestion()
  const asked = (game as Game).sim.snapshot()
  key('keydown', 'Enter')
  run(frames, 3)
  expect(said(mount, 'text')).toBe(en['keeper.tip'])
  ;(game as Game).sim.restore(asked)
  run(frames, 1)
  expect(buttonsOf(mount)).toEqual([en['hero.ask'], en['hero.bye']])
  expect(said(mount, 'text')).toBe(en['keeper.hello'])
})

test('paused, the buttons do nothing; resumed, they work', async () => {
  const { frames } = await toTheQuestion()
  const g = game as Game
  key('keydown', 'Enter')
  run(frames, 3)
  expect(said(mount, 'text')).toBe(en['keeper.tip'])
  g.pause()
  key('keydown', 'Enter')
  run(frames, 3)
  expect(sent(g, NextCommand.id)).toHaveLength(0)
  g.resume()
  key('keydown', 'Enter')
  run(frames, 3)
  expect(sent(g, NextCommand.id)).toHaveLength(1)
  expect(said(mount, 'text')).toBe(en['keeper.tip-more'])
})

test('a pick is a choose command from player 1, and the sim moves on', async () => {
  const { frames } = await toTheQuestion()
  const g = game as Game
  key('keydown', 'ArrowDown')
  key('keydown', 'Enter')
  run(frames, 3)
  expect(sent(g, ChooseCommand.id).map((c) => [c.source, c.payload])).toEqual([[1, { choice: 1 }]])
  expect(said(mount, 'text')).toBe(en['keeper.bye'])
})

test('a second player’s gamepad cannot press the talker’s button, but can skip', async () => {
  const started = await startStory(mount)
  game = started.game
  const { frames, pads } = started
  pads.connect(1)
  game.input.invite((pad) => game?.addPlayer(`pad-${pad}` as Claim))
  pads.press('south', 1)
  run(frames, 2)
  pads.release('south', 1)
  expect(game.players()).toEqual([1, 2])
  run(frames, 40)
  expect(buttonsOf(mount)).toEqual(['Skip'])
  pads.press('east', 1)
  run(frames, 3)
  expect(sent(game, SkipCommand.id)).toHaveLength(1)
  pads.release('east', 1)

  // The talker is player 1, on the keyboard: pad 1 is player 2's.
  key('keydown', 'ArrowRight')
  expect(playUntil(frames, () => buttonsOf(mount).length === 2)).toBe(true)
  pads.press('south', 1)
  run(frames, 3)
  pads.release('south', 1)
  expect(sent(game, ChooseCommand.id)).toHaveLength(0)
  expect(buttonsOf(mount)).toHaveLength(2)
})

test('handed Spanish words, the box speaks Spanish', async () => {
  const content = await loadStory()
  const started = await startStory(mount, { content, words: wordsOf(content, 'es') })
  game = started.game
  run(started.frames, 40)
  expect(said(mount, 'text')).toBe(es['keeper.welcome'])
  expect(said(mount, 'speaker')).toBe(es['keeper.name'])
})

test('the box takes its two button words from the game', async () => {
  const started = await startStory(mount, { boxWords: { next: 'Weiter', skip: 'Überspringen' } })
  game = started.game
  run(started.frames, 40)
  expect(buttonsOf(mount)).toEqual(['Überspringen'])
})

test('the M1 game has no box', async () => {
  const started = await startCoop(mount, { content: await loadFixtureGame() })
  game = started.game
  run(started.frames, 10)
  expect(boxOf(mount)).toBeNull()
})

test('a continued game records where it started, and its replay plays from there', async () => {
  const progress = { ended: {}, seen: ['glade-intro'] }
  const started = await startStory(mount, { story: progress })
  game = started.game
  run(started.frames, 40)
  expect(showing(mount), 'the opening does not play again').toBe(false)
  const replay = game.replay()
  expect(replay.meta.story).toBe(canonicalJson(progress))
  expect(storyOfReplay(replay)).toEqual(progress)
  const fresh = await createGameSim({
    content: await loadStory(),
    plugins: storyPlugins,
    story: storyOfReplay(replay) ?? { ended: {}, seen: [] },
  })
  try {
    expect(verifyReplay(fresh, replay)).toEqual({ ok: true })
  } finally {
    fresh.dispose()
  }
  game.stop()
  game = undefined
  watch = await watchReplay({
    content: await loadStory(),
    plugins: storyPlugins,
    mount,
    host: visibleHost,
    replay,
    frames: manualFrames(),
    rounds: 1,
  })
  expect(watch.sim.resource(Story).seen).toEqual(['glade-intro'])
  expect(watch.sim.resource(Story).scene).toBeNull()
})

test('watching, the box shows the lines and has no buttons', async () => {
  const played = await startStory(mount)
  run(played.frames, 60)
  const replay = played.game.replay()
  played.game.stop()
  mount.replaceChildren()
  const frames = manualFrames()
  watch = await watchReplay({
    content: await loadStory(),
    plugins: storyPlugins,
    mount,
    host: visibleHost,
    replay,
    frames,
    rounds: 1,
  })
  frames.at(0)
  run(frames, 40)
  expect(said(mount, 'text')).toBe(en['keeper.welcome'])
  expect(buttonsOf(mount)).toEqual([])
  key('keydown', 'Enter')
  run(frames, 2)
  expect(watch.sim.resource(Story).scene).not.toBeNull()
})
