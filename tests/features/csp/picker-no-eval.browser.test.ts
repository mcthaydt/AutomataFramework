// The language picker, loaded and shown, builds no code from strings: it is what runs on itch and Wavedash under a strict
// CSP, and the first thing a player there sees. It has its own file because it must be the first thing to load `web`.
import { expect, test } from 'vitest'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { attemptsToBuildCode } from '../../fixtures/strict-csp.ts'

test('showing the language picker builds no code from strings', async () => {
  const mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;overflow:hidden'
  document.body.append(mount)
  const attempts = await attemptsToBuildCode(async () => {
    const { languagePicker } = await import('#src/features/web/web.ts')
    const { createLocale } = await import('#src/features/locale/locale.ts')
    const { openSettings } = await import('#src/features/saves/saves.ts')
    const { testHost } = await import('#src/features/host/host.ts')
    const host = testHost()
    const settings = await openSettings({ game: 'picker-no-eval', store: host.store })
    const locale = createLocale({ content: await loadFixtureGame(), host, settings })
    const frames = manualFrames()
    const shown = languagePicker({ mount, locale, frames })
    frames.at(0)
    for (const flag of mount.querySelectorAll<HTMLElement>('.automata-flag')) flag.click()
    frames.advance(1000 / 60)
    shown.destroy()
  })
  mount.remove()
  expect(attempts).toEqual([])
})
