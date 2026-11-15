// Every control the flow ever shows has a name a screen reader can say (plan Q, Task 13): not empty, and not one of the
// words' own keys left showing because a sentence was never written.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { testHost } from '#src/features/host/host.ts'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { SPLASH_MS } from '#src/features/screens/screens.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'
import { ticks, walkByKey } from '../../fixtures/flow/page.ts'

const es = frameworkWords('es')
const drive = createDrive()

beforeEach(() => drive.start())
afterEach(() => drive.stop())

const CONTROLS = 'button, [role="switch"], [role="slider"], a[href], input, select'

/** What a screen reader says for a control: its words, or the name it carries. */
function nameOf(control: Element): string {
  const labelled = control.getAttribute('aria-labelledby')
  const by = labelled === null ? '' : (document.getElementById(labelled)?.textContent ?? '')
  return control.getAttribute('aria-label')?.trim() || by.trim() || (control.textContent ?? '').trim()
}

/** The controls on the page now: how many, and every one that has no name or has a key for one. */
function audit(where: string): number {
  const found = [...drive.mount.querySelectorAll(CONTROLS)]
  for (const control of found) {
    const name = nameOf(control)
    expect(name, `${where}: a ${control.tagName.toLowerCase()} has no name`).not.toBe('')
    expect(name, `${where}: "${name}" is a key, not words`).not.toMatch(/^automata\.[a-z0-9.-]+$/)
    expect(name, `${where}: "${name}" has a hole left in it`).not.toMatch(/[{}]/)
  }
  return found.length
}

test('every button, toggle, slider and link the flow ever shows has an accessible name that is not empty and is not a key', async () => {
  const host = testHost({ deviceLanguages: ['es-MX'] })
  await drive.open({ host })
  await drive.shown('warnings')
  await drive.wait('OK')
  expect(audit('warnings')).toBeGreaterThan(0)
  await drive.press('OK')
  await drive.shown('picking')
  await expect.poll(() => drive.mount.querySelector('.automata-picker-go')).not.toBeNull()
  expect(audit('the language picker')).toBeGreaterThan(1)
  ;(drive.mount.querySelector('.automata-flag') as HTMLElement).click()
  ;(drive.mount.querySelector('.automata-picker-go') as HTMLElement).click()
  await drive.shown('splash')
  drive.frames.at(0)
  drive.run(SPLASH_MS + 200)
  await drive.shown('menu')
  await drive.wait(es('automata.menu.play'))
  expect(audit('the menu')).toBeGreaterThan(2)
  for (const [open, screen] of [
    [es('automata.menu.settings'), 'settings'],
    [es('automata.menu.how'), 'how'],
    [es('automata.menu.saves'), 'saves'],
  ] as const) {
    if (!drive.buttons().includes(open)) continue
    await drive.press(open)
    await expect.poll(() => drive.mount.querySelector(`[data-screen="${screen}"]`)).not.toBeNull()
    expect(audit(screen), `${screen} has controls`).toBeGreaterThan(0)
    await drive.press(es('automata.back'))
    await drive.wait(es('automata.menu.play'))
  }
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  ticks(drive, 5)
  expect(audit('the level')).toBeGreaterThan(0)
  await drive.press(es('automata.pause.button'))
  await drive.shown('paused')
  await drive.wait(es('automata.pause.resume'))
  expect(audit('pause')).toBeGreaterThan(3)
  await drive.press(es('automata.pause.again'))
  await expect.poll(() => drive.mount.querySelector('[role="alertdialog"]')).not.toBeNull()
  expect(audit('the question before starting again')).toBeGreaterThan(2)
  await drive.answer(es('automata.pause.resume'))
  await drive.press(es('automata.menu.settings'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="settings"]')).not.toBeNull()
  expect(audit('settings on pause')).toBeGreaterThan(3)
  await drive.press(es('automata.back'))
  await drive.wait(es('automata.pause.resume'))
  await drive.press(es('automata.pause.resume'))
  await drive.shown('playing')
  drive.flow()?.finishLevel()
  await drive.shown('done')
  await drive.wait(es('automata.done.menu'))
  expect(audit('well done')).toBeGreaterThan(0)
})

test('the lost screen and the problem screen have names too', async () => {
  await drive.toMenu({ game: { noWarning: true, start: 'level-pit' } })
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  walkByKey(drive)
  await drive.shown('lost')
  await drive.wait(es('automata.lost.again'))
  expect(audit('you lost')).toBe(2)
  drive.leave()
  await drive.open({ game: { replace: { 'content/levels/level-2.json': '{ not json' } } })
  await drive.shown('problem')
  expect(audit('the problem screen')).toBeGreaterThan(0)
})
