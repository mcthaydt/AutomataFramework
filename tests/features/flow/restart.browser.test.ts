// Starting a level again, over and over, on the flow's page (plan Q, Task 6): a double press starts one game, fifty falls
// and tries leave one canvas and one reload-free page, and a game with no `lost` never reaches the lost step.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { Transform } from '#src/features/physics/physics.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'
import { ticks, walkByKey } from '../../fixtures/flow/page.ts'

const es = frameworkWords('es')
const drive = createDrive()

beforeEach(() => drive.start())
afterEach(() => drive.stop())

async function intoPit(game: NonNullable<Parameters<typeof drive.toMenu>[0]>['game'] = {}): Promise<void> {
  await drive.toMenu({ game: { noWarning: true, start: 'level-pit', ...game } })
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
}

const entities = (): number => {
  return drive.flow()?.game()?.sim.query(Transform).length ?? -1
}

test('Try again pressed twice in one frame starts one game', async () => {
  await intoPit()
  walkByKey(drive)
  await drive.shown('lost')
  const again = [...drive.mount.querySelectorAll('button')].find(
    (one) => one.textContent?.trim() === es('automata.lost.again'),
  ) as HTMLButtonElement
  again.click()
  again.click()
  await drive.shown('playing')
  await expect.poll(() => drive.flow()?.game()?.sim.tick).toBe(0)
  expect(drive.mount.dataset.attempt).toBe('2')
  expect(drive.mount.querySelectorAll('canvas')).toHaveLength(1)
})

test("50 times: fall and try again; one canvas, the first start's entities, and the page never reloaded", async () => {
  let reloads = 0
  await drive.toMenu({
    game: { noWarning: true, start: 'level-pit' },
    reload: () => {
      reloads += 1
    },
  })
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  const first = entities()
  expect(first).toBeGreaterThan(0)
  for (let round = 0; round < 50; round++) {
    walkByKey(drive)
    await drive.shown('lost')
    await drive.press(es('automata.lost.again'))
    await drive.shown('playing')
    await expect.poll(() => drive.flow()?.game()?.sim.tick).toBe(0)
  }
  expect(drive.mount.querySelectorAll('canvas')).toHaveLength(1)
  expect(entities()).toBe(first)
  expect(drive.mount.dataset.attempt).toBe('51')
  expect(reloads).toBe(0)
})

test('a game with no lost can never reach the lost step: the hero falls and the level just goes on', async () => {
  await intoPit({ lost: null })
  walkByKey(drive)
  ticks(drive, 200)
  expect(drive.step()).toBe('playing')
  expect(drive.mount.querySelector('[data-screen="lost"]')).toBeNull()
})

/** The button called `label` inside the question on top. */
const inQuestion = (label: string): HTMLElement =>
  [...(drive.mount.querySelector('[role="alertdialog"]')?.querySelectorAll('button') ?? [])].find(
    (button) => button.textContent?.trim() === label,
  ) as HTMLElement

test('pause, Start again, No: still paused; Start again, yes: playing afresh, one more attempt', async () => {
  await drive.toMenu({ game: { noWarning: true } })
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  expect(drive.mount.dataset.attempt).toBe('1')
  drive.frames.at(0)
  ticks(drive, 20)
  drive.key('keydown', 'Escape')
  await drive.shown('paused')
  await drive.press(es('automata.pause.again'))
  await expect.poll(() => drive.mount.querySelector('[role="alertdialog"]')).not.toBeNull()
  // No is "Keep playing" on the question: the pause screen is still there and nothing started again.
  inQuestion(es('automata.pause.resume')).click()
  expect(drive.step()).toBe('paused')
  expect(drive.mount.dataset.attempt).toBe('1')
  await drive.press(es('automata.pause.again'))
  await expect.poll(() => drive.mount.querySelector('[role="alertdialog"]')).not.toBeNull()
  inQuestion(es('automata.pause.again')).click()
  await drive.shown('playing')
  expect(drive.mount.dataset.attempt).toBe('2')
  await expect.poll(() => drive.flow()?.game()?.sim.tick).toBe(0)
})
