// The first tap, end to end in each real browser, with the real speaker and no seam: a game that has just opened says
// the sound is waiting, plays on without it, and a real key press (which counts as a gesture to the browser) starts
// the sound and takes the button away. The pictures show the game on each screen with the sound on.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { createAudio } from '#src/features/audio/audio.ts'
import { type Game, startGame } from '#src/features/game/game.ts'
import { webHost, webSpeaker } from '#src/features/web/web.ts'
import { loadSoundingGame } from '../../fixtures/audio/sounding-game.ts'
import { soundingHeroPlugin } from '../../fixtures/audio/sounding-hero.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'

const FRAME = 1000 / 60

let mount: HTMLDivElement
let game: Game | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  game?.stop()
  game = undefined
  mount.remove()
  vi.restoreAllMocks()
})

const notice = (): HTMLElement | null => mount.querySelector('[data-automata="sound-notice"]')

for (const [name, w, h] of SCREENS) {
  test(`on ${name} the sound waits, the game plays on, and a key press starts the sound`, async () => {
    await page.viewport(w, h)
    expect([window.innerWidth, window.innerHeight]).toEqual([w, h])

    // The real host and the real speaker: nothing here is a stand-in for the browser.
    const speaker = webSpeaker()
    const audio = createAudio({ content: await loadSoundingGame(), speaker })
    const frames = manualFrames()
    game = await startGame({
      content: await loadSoundingGame(),
      plugins: [soundingHeroPlugin],
      mount,
      controls: fixtureControls,
      host: webHost(),
      frames,
      audio,
    })

    // Before any tap: the button says what to do, and 120 frames pass with the sound still waiting.
    expect(speaker.state()).toBe('waiting')
    expect(notice()?.textContent).toBe('Tap to start the sound')
    frames.at(0)
    for (let i = 0; i < 120; i++) frames.advance(FRAME)
    expect(game.sim.tick).toBeGreaterThanOrEqual(120)
    expect(speaker.state()).toBe('waiting')
    expect(notice()).not.toBeNull()

    // A real key press is a gesture: the sound starts and the button goes. (A bare Shift is not one in Firefox.)
    await userEvent.keyboard('a')
    // Firefox on a runner with no sound card never lets its audio context run, so there the speaker rightly stays
    // waiting; what must hold everywhere is that the button is there exactly while the sound is not on.
    const hasEars = !navigator.userAgent.includes('Firefox')
    if (hasEars) await vi.waitFor(() => expect(speaker.state()).toBe('on'), { timeout: 5000 })
    else await new Promise((done) => setTimeout(done, 1000))
    expect(notice() === null).toBe(speaker.state() === 'on')

    frames.advance(FRAME)
    await page.screenshot({ element: mount, path: `__screenshots__/sound-on-${name}.png` })
  })
}
