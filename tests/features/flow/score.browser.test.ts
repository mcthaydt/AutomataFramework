// The score and the best score on the flow's page (plan Q, Task 8): "Score: n" over the game, on Well done and on You
// lost, "Best: n" from the second level-end on, kept across visits, and a store that refuses never stops the count.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { openSections } from '#src/features/flow/sections.ts'
import { testHost } from '#src/features/host/host.ts'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { memoryStore } from '#src/features/saves/saves.ts'
import { createDrive, type DriveOptions } from '../../fixtures/flow/drive.ts'
import { focusedName, ticks, untilOver, walkByKey } from '../../fixtures/flow/page.ts'
import { scorePlugin } from '../../fixtures/flow/score.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'

const es = frameworkWords('es')
const drive = createDrive()

beforeEach(() => drive.start())
afterEach(() => drive.stop())

const score = (n: number): string => es('automata.hud.score', { score: n })
const best = (n: number): string => es('automata.hud.best', { best: n })
const scoreLine = (): string | undefined => drive.mount.querySelector('.score')?.textContent?.trim()
/** What the screen of Well done or You lost says, once it is on the page. */
const screenText = async (name: 'done' | 'lost'): Promise<string> => {
  await expect.poll(() => drive.mount.querySelector(`[data-screen="${name}"]`)).not.toBeNull()
  return drive.mount.querySelector(`[data-screen="${name}"]`)?.textContent ?? ''
}

/** The menu of a game that counts sparks (or names a score wrongly), then Play, and the game on the page. */
async function intoLevel(
  score: 'sparks' | 'missing' | 'words' | undefined,
  more: DriveOptions = {},
  saved = false,
) {
  // The score's plugin reads the spark's event, which only a game that has a spark knows: a game with no score has no plugin.
  await drive.toMenu({
    plugins: score === undefined ? [heroPlugin] : [heroPlugin, scorePlugin],
    ...more,
    game: { noWarning: true, ...(score === undefined ? {} : { score }), ...more.game },
  })
  // A visit that has already saved a game is offered Continue, not Play.
  await drive.press(es(saved ? 'automata.menu.continue' : 'automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
}

test('a game with score shows "Score: 0", and "Score: 1" after the spark is taken', async () => {
  await intoLevel('sparks')
  ticks(drive, 2)
  expect(scoreLine()).toBe(score(0))
  walkByKey(drive)
  await drive.shown('done')
  expect(await screenText('done')).toContain(score(1))
})

test('the score is on the page while the spark is taken, before the level ends', async () => {
  await intoLevel('sparks')
  drive.frames.advance(16)
  drive.key('keydown', 'ArrowRight')
  // The hero reaches the spark (1.5 tiles away) well before the door (3 away).
  for (let tick = 0; tick < 400 && scoreLine() !== score(1) && drive.step() === 'playing'; tick++)
    drive.frames.advance(1000 / 60)
  drive.key('keyup', 'ArrowRight')
  expect(scoreLine()).toBe(score(1))
  expect(drive.step()).toBe('playing')
})

test('a game with no score shows no score line, on the page or on Well done', async () => {
  await intoLevel(undefined)
  ticks(drive, 2)
  expect(drive.mount.querySelector('.score')).toBeNull()
  walkByKey(drive)
  await drive.shown('done')
  expect(drive.mount.textContent).not.toContain(score(0))
  expect(drive.mount.textContent).not.toContain(score(1))
  expect(drive.mount.textContent).not.toContain(best(0))
})

test.each(['missing', 'words'] as const)(
  'a score that names %s shows no line and throws nothing',
  async (wrong) => {
    await intoLevel(wrong)
    ticks(drive, 2)
    expect(drive.mount.querySelector('.score')).toBeNull()
    walkByKey(drive)
    await drive.shown('done')
    expect(drive.mount.textContent).not.toContain(score(0))
    expect(drive.step()).toBe('done')
  },
)

test('Well done and You lost both show the score; the best shows from the second level-end on', async () => {
  const host = testHost()
  await intoLevel('sparks', { host })
  walkByKey(drive)
  await drive.shown('done')
  const first = await screenText('done')
  expect(first).toContain(score(1))
  expect(first).not.toContain(es('automata.hud.best', { best: 1 }))
  // Level two has no spark: the second level-end has a score of 0 and a best of 1.
  await drive.press(es('automata.done.next'))
  await drive.shown('playing')
  drive.frames.at(0)
  walkByKey(drive)
  await drive.shown('done')
  const second = await screenText('done')
  expect(second).toContain(score(0))
  expect(second).toContain(best(1))
})

test('You lost shows the score and the best too', async () => {
  const host = testHost()
  await drive.returning(host, 'es')
  await (await openSections({ game: drive.game, host })).records.set({ best: 5 })
  await intoLevel('sparks', { host, game: { start: 'level-pit' } })
  walkByKey(drive)
  await drive.shown('lost')
  const text = await screenText('lost')
  expect(text).toContain(score(0))
  expect(text).toContain(best(5))
  expect(focusedName()).toBe(es('automata.lost.again'))
})

test('the best is still there after a reload', async () => {
  const host = testHost()
  await intoLevel('sparks', { host })
  walkByKey(drive)
  await drive.shown('done')
  drive.leave()
  // A new visit to the same host: the first level-end of this visit already has the best of the last.
  await drive.start()
  await intoLevel('sparks', { host }, true)
  walkByKey(drive)
  await drive.shown('done')
  expect(await screenText('done')).toContain(best(1))
})

test('storage refuses: the score still counts, and the screen says once that it was not kept', async () => {
  const store = memoryStore()
  const host = testHost({ store })
  await drive.toMenu({ host, plugins: [heroPlugin, scorePlugin], game: { noWarning: true, score: 'sparks' } })
  store.refuse('failed')
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  walkByKey(drive)
  await drive.shown('done')
  await expect
    .poll(() => drive.mount.querySelector('[data-screen="done"]')?.textContent ?? '')
    .toContain(es('automata.done.not-kept'))
  const text = drive.mount.querySelector('[data-screen="done"]')?.textContent ?? ''
  expect(text).toContain(score(1))
  expect(text.split(es('automata.done.not-kept'))).toHaveLength(2)
})

test("at 390x844 the score does not cover the pause button or the heroes' numbers", async () => {
  await intoLevel('sparks', { game: { players: 2 } })
  drive.frames.advance(16)
  ticks(drive, 2)
  const rect = (selector: string): DOMRect => {
    const found = drive.mount.querySelector(selector)
    if (found === null) throw new Error(`nothing on the page matches ${selector}`)
    return found.getBoundingClientRect()
  }
  const apart = (a: DOMRect, b: DOMRect): boolean =>
    a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top
  const line = rect('.score')
  expect(apart(line, rect('.pause button'))).toBe(true)
  const numbers = [...drive.mount.querySelectorAll('.number')]
  expect(numbers.length).toBe(2)
  for (const one of numbers) expect(apart(line, one.getBoundingClientRect())).toBe(true)
  const goal = drive.mount.querySelector('.card')
  if (goal !== null) expect(apart(line, goal.getBoundingClientRect())).toBe(true)
  untilOver(drive)
})
