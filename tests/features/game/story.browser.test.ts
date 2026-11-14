// The story played the way a person plays it, end to end in each real browser at the sizes games are played at: a
// keeper to meet, an answer to pick, a cutscene to watch. Keys are sent as a browser sends them, a finger as a touch
// screen sends one, and a pretend gamepad is plugged in as the browser's. Frames are driven by hand.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { Player, verifyReplay } from '#src/features/commands/commands.ts'
import type { Game } from '#src/features/game/game.ts'
import { type Watch, watchReplay } from '#src/features/game/watch.ts'
import type { Claim } from '#src/features/input/input.ts'
import {
  ChooseCommand,
  createGameSim,
  NextCommand,
  SKIP_AFTER,
  SkipCommand,
  Story,
  storyProgress,
} from '#src/features/level/level.ts'
import { Body } from '#src/features/physics/physics.ts'
import { heroOf, key, run, visibleHost } from '../../fixtures/game/co-op-game.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { loadStory, storyPlugins } from '../../fixtures/story/game.ts'
import {
  buttonsOf,
  choicesOf,
  playUntil,
  said,
  sent,
  showing,
  startStory,
} from '../../fixtures/story/play.ts'
import { englishWords as en } from '../../fixtures/story/read.ts'

/** The screens a game is played on: phones and tablets upright and sideways, and a desktop window. */
const SCREENS = [
  [390, 844],
  [820, 1180],
  [844, 390],
  [1180, 820],
  [1280, 720],
] as const

let mount: HTMLDivElement
let game: Game | undefined
let watch: Watch | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:hidden'
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

const settle = (): Promise<void> =>
  new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))

/** How fast hero `number` is going up (negative) or down, in tiles a second. */
function heroVy(g: Game, number: number): number {
  const hero = g.sim.query(Player, Body).find((e) => e.get(Player).number === number)
  if (hero === undefined) throw new Error(`player ${number} has no hero`)
  return hero.get(Body).vy
}

/** A finger on the screen, as a phone's: it brings up the touch buttons. */
function touchScreen(): void {
  window.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', bubbles: true }))
}

/** A thumb, second finger on the glass: down on a touch button, or up from it. */
const finger = (type: 'pointerdown' | 'pointerup'): PointerEvent =>
  new PointerEvent(type, { pointerId: 2, pointerType: 'touch', bubbles: true, cancelable: true })

const apart = (p: DOMRect, q: DOMRect): boolean =>
  p.right <= q.left || q.right <= p.left || p.bottom <= q.top || q.bottom <= p.top

for (const [w, h] of SCREENS) {
  test(`at ${w} by ${h}, by keyboard: the opening, the keeper, a pick, the tip, the cutscene`, async () => {
    await page.viewport(w, h)
    expect([window.innerWidth, window.innerHeight]).toEqual([w, h])
    const started = await startStory(mount)
    game = started.game
    const { frames } = started
    const content = await loadStory()

    // 1. The keeper welcomes the player. Space, which most games jump with, does not skip; Enter does.
    run(frames, 40)
    expect(said(mount, 'text')).toBe(en['keeper.welcome'])
    expect(said(mount, 'speaker')).toBe(en['keeper.name'])
    key('keydown', 'Space')
    key('keyup', 'Space')
    run(frames, 2)
    expect(showing(mount)).toBe(true)
    expect(sent(game, SkipCommand.id)).toHaveLength(0)
    key('keydown', 'Enter')
    key('keyup', 'Enter')
    run(frames, 3)
    expect(showing(mount)).toBe(false)
    key('keydown', 'ArrowRight')
    const before = heroOf(game, 1).x
    run(frames, 20)
    expect(heroOf(game, 1).x, 'the hero can move again').toBeGreaterThan(before + 1)

    // 2. The hero comes up to the keeper, who asks, and the hero stops.
    expect(playUntil(frames, () => buttonsOf(mount).length === 2)).toBe(true)
    expect(said(mount, 'text')).toBe(en['keeper.hello'])
    expect(buttonsOf(mount)).toEqual([en['hero.ask'], en['hero.bye']])
    run(frames, 2)
    const stopped = heroOf(game, 1).x
    run(frames, 10)
    expect(heroOf(game, 1).x).toBeCloseTo(stopped, 3)
    await page.screenshot({ element: mount, path: `__screenshots__/story-${w}x${h}-hello.png` })

    // 3. Down, up and Enter pick the first answer: the tip, a line at a time, and then the cutscene.
    key('keydown', 'ArrowDown')
    key('keydown', 'ArrowUp')
    key('keydown', 'Enter')
    run(frames, 3)
    expect(said(mount, 'text')).toBe(en['keeper.tip'])
    await page.screenshot({ element: mount, path: `__screenshots__/story-${w}x${h}-tip.png` })
    key('keydown', 'Enter')
    run(frames, 3)
    expect(said(mount, 'text')).toBe(en['keeper.tip-more'])
    key('keydown', 'Enter')
    run(frames, 40)
    expect(said(mount, 'text')).toBe(en['keeper.look'])
    expect(buttonsOf(mount)).toEqual(['Skip'])

    // 4. The cutscene plays out; the key is still down, so the hero runs on.
    run(frames, 60)
    expect(showing(mount)).toBe(false)
    const after = heroOf(game, 1).x
    run(frames, 20)
    expect(heroOf(game, 1).x).toBeGreaterThan(after + 1)
    expect(storyProgress(game.sim, content)).toEqual({
      ended: { keeper: 'tip' },
      seen: ['glade-intro', 'glade-tip'],
    })
    const fresh = await createGameSim({ content, plugins: storyPlugins })
    try {
      expect(verifyReplay(fresh, game.replay())).toEqual({ ok: true })
    } finally {
      fresh.dispose()
    }
  })
}

for (const [w, h] of [
  [390, 844],
  [844, 390],
  [820, 1180],
  [1180, 820],
] as const) {
  test(`at ${w} by ${h}, by touch: the Right button, a tap on a choice, taps on Next`, async () => {
    await page.viewport(w, h)
    const started = await startStory(mount)
    game = started.game
    const { frames } = started
    touchScreen()
    run(frames, 40)
    await settle()
    // Skip is a button, tapped.
    ;(mount.querySelector('[data-story="skip"]') as HTMLButtonElement).click()
    run(frames, 3)
    expect(showing(mount)).toBe(false)

    const right = mount.querySelector('[data-action="right"]')
    if (right === null) throw new Error('no Right button')
    right.dispatchEvent(finger('pointerdown'))
    expect(playUntil(frames, () => choicesOf(mount).length === 2)).toBe(true)
    await settle()
    // The box is above the touch buttons: no button of the game is under it.
    const box = (mount.querySelector('.automata-story') as HTMLElement).getBoundingClientRect()
    for (const b of mount.querySelectorAll('.automata-touch-button'))
      expect(apart(box, b.getBoundingClientRect()), 'the box and a touch button do not overlap').toBe(true)
    for (const b of choicesOf(mount)) expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(48)

    choicesOf(mount)[0]?.click()
    run(frames, 3)
    expect(said(mount, 'text')).toBe(en['keeper.tip'])
    ;(mount.querySelector('[data-story="next"]') as HTMLButtonElement).click()
    run(frames, 3)
    expect(said(mount, 'text')).toBe(en['keeper.tip-more'])
    ;(mount.querySelector('[data-story="next"]') as HTMLButtonElement).click()
    run(frames, 3)
    expect(sent(game, ChooseCommand.id).map((c) => c.payload)).toEqual([{ choice: 0 }])
    expect(sent(game, NextCommand.id)).toHaveLength(2)
    right.dispatchEvent(finger('pointerup'))
    await page.screenshot({ element: mount, path: `__screenshots__/story-${w}x${h}-touch.png` })
  })
}

test('turned from 390 by 844 to 844 by 390 while the choices show, the same choice keeps the focus', async () => {
  await page.viewport(390, 844)
  const started = await startStory(mount)
  game = started.game
  const { frames } = started
  run(frames, 40)
  key('keydown', 'Enter')
  key('keyup', 'Enter')
  key('keydown', 'ArrowRight')
  expect(playUntil(frames, () => choicesOf(mount).length === 2)).toBe(true)
  key('keydown', 'ArrowDown')
  expect(document.activeElement).toBe(choicesOf(mount)[1])
  await page.viewport(844, 390)
  await settle()
  run(frames, 3)
  expect(choicesOf(mount)).toHaveLength(2)
  expect(document.activeElement).toBe(choicesOf(mount)[1])
  // And it still picks that one.
  key('keydown', 'Enter')
  run(frames, 3)
  expect(sent(game, ChooseCommand.id).map((c) => c.payload)).toEqual([{ choice: 1 }])
})

test('by gamepad: the stick walks, down and south pick the second choice, south ends the talk', async () => {
  await page.viewport(844, 390)
  const started = await startStory(mount)
  game = started.game
  const { frames, pads } = started
  pads.connect(0)
  run(frames, 40)
  // East is "back": it skips the cutscene. South, which most games jump with, would not.
  pads.press('south', 0)
  run(frames, 3)
  pads.release('south', 0)
  expect(sent(game, SkipCommand.id)).toHaveLength(0)
  pads.press('east', 0)
  run(frames, 3)
  pads.release('east', 0)
  expect(sent(game, SkipCommand.id)).toHaveLength(1)

  pads.press('left-stick-right', 0)
  expect(playUntil(frames, () => choicesOf(mount).length === 2)).toBe(true)
  pads.release('left-stick-right', 0)
  run(frames, 2)
  pads.press('dpad-down', 0)
  run(frames, 2)
  pads.release('dpad-down', 0)
  run(frames, 2)
  pads.press('south', 0)
  run(frames, 3)
  pads.release('south', 0)
  expect(sent(game, ChooseCommand.id).map((c) => c.payload)).toEqual([{ choice: 1 }])
  expect(said(mount, 'text')).toBe(en['keeper.bye'])
  run(frames, 2)
  pads.press('south', 0)
  run(frames, 3)
  pads.release('south', 0)
  expect(game.sim.resource(Story).ended).toEqual({ keeper: 'bye' })
  expect(showing(mount)).toBe(false)
})

test('two players: player 2 walks about while player 1 talks, and both stand still in the cutscene', async () => {
  await page.viewport(844, 390)
  const started = await startStory(mount)
  game = started.game
  const { frames, pads } = started
  pads.connect(1)
  game.input.invite((pad) => game?.addPlayer(`pad-${pad}` as Claim))
  pads.press('south', 1)
  run(frames, 2)
  pads.release('south', 1)
  expect(game.players()).toEqual([1, 2])
  // In the opening both heroes stand still, whatever is held.
  pads.press('dpad-right', 1)
  key('keydown', 'ArrowRight')
  const at = [heroOf(game, 1).x, heroOf(game, 2).x]
  run(frames, 20)
  expect(heroOf(game, 1).x).toBeCloseTo(at[0] ?? 0, 1)
  expect(heroOf(game, 2).x).toBeCloseTo(at[1] ?? 0, 1)
  pads.release('dpad-right', 1)
  key('keyup', 'ArrowRight')
  run(frames, 100)
  expect(showing(mount)).toBe(false)

  // Player 1 walks up to the keeper and the talk opens; player 2, on pad 1, walks about while it is open.
  key('keydown', 'ArrowRight')
  expect(playUntil(frames, () => choicesOf(mount).length === 2)).toBe(true)
  const second = heroOf(game, 2).x
  pads.press('dpad-left', 1)
  run(frames, 30)
  expect(heroOf(game, 2).x, 'player 2 is not held by the talk').toBeLessThan(second - 0.5)
  pads.release('dpad-left', 1)
  expect(choicesOf(mount)).toHaveLength(2)
})

test('the press that ends the conversation does not jump: Space on the last Next, and a pad’s south', async () => {
  await page.viewport(844, 390)
  const started = await startStory(mount)
  game = started.game
  const { frames, pads } = started
  pads.connect(0)
  run(frames, 40)
  key('keydown', 'Enter')
  key('keyup', 'Enter')
  key('keydown', 'ArrowRight')
  expect(playUntil(frames, () => choicesOf(mount).length === 2)).toBe(true)
  // The second answer ends the talk after one line; Space on its Next ends it.
  key('keydown', 'Digit2')
  run(frames, 3)
  expect(said(mount, 'text')).toBe(en['keeper.bye'])
  key('keydown', 'Space')
  let lowest = 0
  for (let i = 0; i < 30; i++) {
    run(frames, 1)
    lowest = Math.min(lowest, heroVy(game, 1))
  }
  key('keyup', 'Space')
  expect(game.sim.resource(Story).ended).toEqual({ keeper: 'bye' })
  expect(lowest, 'the hero did not jump').toBeGreaterThanOrEqual(-0.5)
})

test('Enter tapped fast through the tip does not skip the cutscene after it', async () => {
  await page.viewport(844, 390)
  const started = await startStory(mount)
  game = started.game
  const { frames } = started
  run(frames, 40)
  key('keydown', 'Enter')
  key('keyup', 'Enter')
  const skipped = sent(game, SkipCommand.id).length
  key('keydown', 'ArrowRight')
  expect(playUntil(frames, () => choicesOf(mount).length === 2)).toBe(true)
  key('keydown', 'Enter')
  run(frames, 4)
  // The tip's first line, then its second, then the cutscene: Enter every four frames all the way.
  for (let i = 0; i < 2; i++) {
    key('keydown', 'Enter')
    run(frames, 4)
  }
  const scene = game.sim.resource(Story).scene
  expect(scene?.cutscene).toBe('glade-tip')
  const since = scene?.since ?? 0
  while (game.sim.tick - since < SKIP_AFTER - 2) {
    key('keydown', 'Enter')
    run(frames, 4)
  }
  expect(sent(game, SkipCommand.id), 'no Enter before Skip showed skipped it').toHaveLength(skipped)
  expect(game.sim.resource(Story).scene).not.toBeNull()
  // From SKIP_AFTER on, Enter does skip.
  run(frames, 4)
  key('keydown', 'Enter')
  run(frames, 3)
  expect(sent(game, SkipCommand.id)).toHaveLength(skipped + 1)
  expect(game.sim.resource(Story).scene).toBeNull()
})

test('sharing the keyboard: player 2’s arrows walk player 2 while player 1 picks with the digits', async () => {
  await page.viewport(1280, 720)
  const started = await startStory(mount)
  game = started.game
  const { frames } = started
  expect(game.addPlayer('keyboard')).toMatchObject({ ok: true })
  run(frames, 2)
  expect(game.players()).toEqual([1, 2])
  run(frames, 40)
  key('keydown', 'Enter')
  key('keyup', 'Enter')
  run(frames, 100)
  // Player 1 walks with D; the talk opens with them.
  key('keydown', 'KeyD')
  expect(playUntil(frames, () => choicesOf(mount).length === 2)).toBe(true)
  const second = heroOf(game, 2).x
  key('keydown', 'ArrowRight')
  run(frames, 20)
  expect(heroOf(game, 2).x, 'player 2 walks').toBeGreaterThan(second + 1)
  // Player 2's arrow keys are theirs: the box leaves them alone, and the focus has not moved.
  key('keydown', 'ArrowUp')
  expect(document.activeElement).toBe(choicesOf(mount)[0])
  key('keydown', 'Digit2')
  run(frames, 3)
  expect(sent(game, ChooseCommand.id).map((c) => [c.source, c.payload])).toEqual([[1, { choice: 1 }]])
  expect(said(mount, 'text')).toBe(en['keeper.bye'])
})

test('a watched replay of the journey shows every line and ends on the same hash', async () => {
  await page.viewport(844, 390)
  const started = await startStory(mount)
  game = started.game
  const { frames } = started
  run(frames, 40)
  key('keydown', 'Enter')
  key('keyup', 'Enter')
  key('keydown', 'ArrowRight')
  expect(playUntil(frames, () => choicesOf(mount).length === 2)).toBe(true)
  key('keydown', 'Enter')
  run(frames, 3)
  key('keydown', 'Enter')
  run(frames, 3)
  key('keydown', 'Enter')
  run(frames, 100)
  const replay = game.replay()
  game.stop()
  game = undefined
  mount.replaceChildren()

  const watching = manualFrames()
  watch = await watchReplay({
    content: await loadStory(),
    plugins: storyPlugins,
    mount,
    host: visibleHost,
    replay,
    frames: watching,
    rounds: 1,
  })
  watching.at(0)
  const lines = new Set<string>()
  for (let tick = 0; tick < replay.ticks; tick++) {
    run(watching, 1)
    const text = said(mount, 'text')
    if (showing(mount) && text !== '') lines.add(text)
    expect(buttonsOf(mount), 'a watched box has no buttons').toEqual([])
  }
  for (const id of ['keeper.welcome', 'keeper.hello', 'keeper.tip', 'keeper.tip-more', 'keeper.look'])
    expect(lines.has(en[id] ?? ''), id).toBe(true)
  run(watching, 3)
  expect(watch.sim.hash()).toBe(replay.finalHash)
})
