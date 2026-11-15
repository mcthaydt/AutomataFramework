// A game whose hero has `moves` needs no controls and no game code: its tuning file lists the keys, and the framework
// moves the hero. In each real browser, with real key events and hand-driven frames.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Player } from '#src/features/commands/commands.ts'
import { parseContent, type TuningControl, writeContent } from '#src/features/content/content.ts'
import { type Game, startGame } from '#src/features/game/game.ts'
import { testHost } from '#src/features/host/host.ts'
import { Transform } from '#src/features/physics/physics.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { movesFiles } from '../../fixtures/game/moves-game.ts'
import { chosenLocale } from '../../fixtures/locale/chosen.ts'

const FRAME = 1000 / 60
const TUNING = 'content/tunings/hero-moves.json'

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

/** The moves fixture, its tuning file's `controls` replaced by `list`, or taken out with `undefined`. */
async function content(list?: readonly TuningControl[]) {
  const files = movesFiles({})
  const parsed = parseContent('tuning', files[TUNING] ?? '', TUNING)
  if (!parsed.ok) throw new Error('the fixture tuning did not read')
  const { controls: _listed, ...rest } = parsed.value
  files[TUNING] = writeContent('tuning', (list === undefined ? rest : { ...rest, controls: list }) as never)
  return loadFixtureGame(files)
}

const walk = (code: string): TuningControl[] => [
  { action: 'left', label: 'Left', keys: ['ArrowLeft'], side: 'left' },
  { action: 'right', label: 'Right', keys: [code], side: 'left' },
  { action: 'jump', label: 'Jump', keys: ['Space'], side: 'right' },
]

async function start(
  gameContent: Awaited<ReturnType<typeof content>>,
  controls?: typeof fixtureControls,
): Promise<{ frames: ReturnType<typeof manualFrames>; g: Game }> {
  const frames = manualFrames()
  const g = await startGame({
    content: gameContent,
    locale: await chosenLocale(gameContent, 'ko'),
    mount,
    ...(controls === undefined ? {} : { controls }),
    host: testHost(),
    frames,
  })
  game = g
  return { frames, g }
}
const key = (type: 'keydown' | 'keyup', code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}
const run = (frames: ReturnType<typeof manualFrames>, n: number): void => {
  for (let i = 0; i < n; i++) frames.advance(FRAME)
}
const heroX = (g: Game): number => g.sim.query(Player, Transform)[0]?.get(Transform).x ?? Number.NaN

test('no controls and no plugins: a held key walks the hero the framework moves', async () => {
  const { frames, g } = await start(await content())
  run(frames, 20)
  const from = heroX(g)
  key('keydown', 'ArrowRight')
  run(frames, 30)
  key('keyup', 'ArrowRight')
  expect(heroX(g)).toBeGreaterThan(from + 1)
})

test('neither a hero with moves nor controls: one sentence, and nothing on the page', async () => {
  const plain = await loadFixtureGame()
  await expect(
    startGame({
      content: plain,
      locale: await chosenLocale(plain, 'ko'),
      mount,
      host: testHost(),
      frames: manualFrames(),
    }),
  ).rejects.toThrow(
    'This game has no controls. Give its hero "moves" in its character file, or pass "controls" to startGame.',
  )
  expect(mount.childElementCount).toBe(0)
})

test('controls in the file and in code: the file wins, and the console is told once', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const { frames, g } = await start(await content(walk('KeyL')), fixtureControls)
  run(frames, 20)
  const from = heroX(g)
  key('keydown', 'KeyL')
  run(frames, 30)
  key('keyup', 'KeyL')
  expect(heroX(g)).toBeGreaterThan(from + 1)
  // The code's key for `right` does nothing: the file did not list it. The hero first comes to a stop.
  run(frames, 10)
  const there = heroX(g)
  key('keydown', 'KeyD')
  run(frames, 30)
  key('keyup', 'KeyD')
  expect(heroX(g)).toBeCloseTo(there, 1)
  expect(warn).toHaveBeenCalledTimes(1)
  expect(warn.mock.calls[0]?.[0]).toBe(
    'startGame: the controls come from the tuning file "hero-moves". The "controls" passed in code are not used.',
  )
})

test('a file with no list and controls in code: the code plays, and nothing is said', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const { frames, g } = await start(await content(), {
    ...fixtureControls,
    right: { label: 'Right', keys: ['KeyL'], side: 'left', shared: [['KeyD'], ['ArrowRight']] },
  })
  run(frames, 20)
  const from = heroX(g)
  key('keydown', 'KeyL')
  run(frames, 30)
  key('keyup', 'KeyL')
  expect(heroX(g)).toBeGreaterThan(from + 1)
  expect(warn).not.toHaveBeenCalled()
})
