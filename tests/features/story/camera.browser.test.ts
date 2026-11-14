// A cutscene's camera, on a page: the story view tells the renderer where the cutscene's camera is after every step and
// lets go once when it has ended; on a real page, with a level that has a view, the hero is out of the picture at the
// start of the opening and in it at the end.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createSequence } from '#src/features/commands/commands.ts'
import type { Game } from '#src/features/game/game.ts'
import { cameraAt, createGameSim, type SceneCamera, sceneOf } from '#src/features/level/level.ts'
import { createStoryView } from '#src/features/story/story.ts'
import { run } from '../../fixtures/game/co-op-game.ts'
import { loadStory, storyPlugins } from '../../fixtures/story/game.ts'
import { startStory } from '../../fixtures/story/play.ts'
import { storyFiles } from '../../fixtures/story/read.ts'

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

test('the camera goes where the keys say and comes back to the heroes', async () => {
  const content = await loadStory()
  const sim = await createGameSim({ content, plugins: storyPlugins })
  const calls: (SceneCamera | undefined)[] = []
  const view = createStoryView({
    mount,
    sim,
    content,
    sequence: createSequence(),
    look: (camera) => calls.push(camera),
  })
  try {
    const intro = content.cutscenes?.['glade-intro']
    if (intro === undefined) throw new Error('the story game has no glade-intro')
    // While the opening plays, the last call at every tick is where its keys put the camera at that tick.
    for (let t = 1; t <= intro.length; t++) {
      sim.step([])
      view.update()
      const scene = sceneOf(sim, content)
      if (scene === undefined) break
      expect(calls.at(-1), `camera at ${t}`).toEqual(cameraAt(intro, scene.t))
    }
    expect(calls.length).toBeGreaterThan(100)
    // When it has ended the camera is let go, once, and nothing more is said while nothing plays.
    for (let i = 0; i < 3; i++) {
      sim.step([])
      view.update()
    }
    expect(calls.filter((c) => c === undefined)).toHaveLength(1)
    expect(calls.at(-1)).toBeUndefined()
  } finally {
    view.destroy()
    sim.dispose()
  }
})

test('on the page the hero is out of the picture at the start of the opening and in it at the end', async () => {
  // A level with a view gives the page a camera; in the story game's own level there is none.
  const glade = JSON.parse(storyFiles['content/levels/glade.json'] ?? '') as Record<string, unknown>
  const content = await loadStory({
    'content/levels/glade.json': JSON.stringify({ ...glade, view: { w: 8, h: 9 } }),
  })
  const started = await startStory(mount, { content })
  game = started.game
  run(started.frames, 2)
  const first = game.heroes()[0]
  expect(first, 'a hero is on the page').toBeDefined()
  // The camera starts on the keeper's side, far from the hero.
  expect((first?.x ?? 0) + (first?.w ?? 0)).toBeLessThanOrEqual(0)
  run(started.frames, 118)
  const last = game.heroes()[0]
  expect(last?.x ?? -1).toBeGreaterThanOrEqual(0)
  expect((last?.x ?? 1e9) + (last?.w ?? 0)).toBeLessThanOrEqual(390)
  // After the opening the camera follows the hero again.
  run(started.frames, 60)
  const after = game.heroes()[0]
  expect(after?.x ?? -1).toBeGreaterThanOrEqual(0)
  expect((after?.x ?? 1e9) + (after?.w ?? 0)).toBeLessThanOrEqual(390)
})
