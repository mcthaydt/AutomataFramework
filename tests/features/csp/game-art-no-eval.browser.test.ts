// A game with pictures, drawn for a few frames, builds no code from strings: it is what runs on itch and Wavedash under a
// strict CSP. It has its own file because it must be the first thing to load the game and the renderer.
import { expect, test } from 'vitest'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { readFullGamePicture } from '../../fixtures/full-game/pictures.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { attemptsToBuildCode } from '../../fixtures/strict-csp.ts'

test('starting and drawing a game with pictures builds no code from strings', async () => {
  const mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;overflow:hidden'
  document.body.append(mount)
  const attempts = await attemptsToBuildCode(async () => {
    const { loadGame } = await import('#src/headless.ts')
    const loaded = await loadGame(readFullGame())
    if (!loaded.ok) throw new Error('the full game did not load')
    const { startGame } = await import('#src/features/game/game.ts')
    const { testHost } = await import('#src/features/host/host.ts')
    const frames = manualFrames()
    const game = await startGame({
      content: loaded.value,
      plugins: [heroPlugin],
      mount,
      controls: fixtureControls,
      host: testHost(),
      frames,
      readPicture: readFullGamePicture,
    })
    frames.at(0)
    for (let i = 0; i < 5; i++) frames.advance(1000 / 60)
    game.stop()
  })
  mount.remove()
  expect(attempts).toEqual([])
})
