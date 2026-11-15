// Saved games on the flow's page: Continue after a visit, three places and the questions before a loss, a place that is
// damaged, a host that keeps nothing, and a game that keeps data of its own beside the level.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Id } from '#src/features/content/content.ts'
import { defaultSave, type FlowSave, type Progress } from '#src/features/flow/flow.ts'
import { testHost } from '#src/features/host/host.ts'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { slotKey } from '#src/features/saves/define.ts'
import { createSaves, defineSave, memoryStore, type Saves } from '#src/features/saves/saves.ts'
import { SPLASH_MS } from '#src/features/screens/screens.ts'
import { z } from '#src/lib/zod.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'
import { flowReplay } from '../../fixtures/flow/game.ts'

const es = frameworkWords('es')
const drive = createDrive()
const save = defaultSave(drive.game)

beforeEach(() => drive.start())
afterEach(() => drive.stop())

/** The places of the game on `host`, as a later visit reads them. */
const placesOn = (host: ReturnType<typeof testHost>): Saves<Progress> =>
  createSaves({ def: save.def, store: host.store })

/** Three games saved: level one, level two and level one again, the second the newest. */
async function threeGames(host: ReturnType<typeof testHost>): Promise<void> {
  const saves = placesOn(host)
  await saves.save(0, { level: 'level-1' }, { label: 'Nivel Uno' })
  await saves.save(1, { level: 'level-2' }, { label: 'Nivel Dos' })
  await saves.save(2, { level: 'level-1' }, { label: 'Nivel Uno' })
}

const place = (number: number): HTMLElement =>
  drive.mount.querySelector(`section[aria-label="${es('automata.saves.place', { number })}"]`) as HTMLElement
const inPlace = (number: number, label: string): HTMLButtonElement => {
  const found = [...place(number).querySelectorAll('button')].find((one) => one.textContent?.trim() === label)
  if (found === undefined) throw new Error(`Game ${number} has no "${label}" button.`)
  return found
}

test('New game, finish level one, load a fresh page: the menu offers Continue and it opens level two', async () => {
  const host = await drive.toMenu()
  // A first visit offers no Continue.
  expect(drive.buttons()).not.toContain(es('automata.menu.continue'))
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.flow()?.finishLevel()
  await drive.shown('done')
  await drive.wait(es('automata.done.next'))
  drive.leave()
  // The next visit, on the same store: Continue is first, and opens the level reached.
  await drive.open({ host, game: { noWarning: true } })
  await drive.shown('splash')
  drive.frames.at(0)
  drive.run(SPLASH_MS + 200)
  await drive.shown('menu')
  await drive.wait(es('automata.menu.continue'))
  expect(drive.buttons()[0]).toBe(es('automata.menu.continue'))
  await drive.press(es('automata.menu.continue'))
  await drive.shown('playing')
  expect(drive.flow()?.state().level).toBe('level-2')
})

test('three games saved: New game opens Saved games, and "New game here" asks before it writes over one', async () => {
  const host = testHost()
  await threeGames(host)
  await drive.toMenu({ host })
  await drive.press(es('automata.menu.new'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="saves"]')).not.toBeNull()
  expect(drive.mount.dataset.over).toBe('saves')
  expect(drive.step()).toBe('menu')
  // The first game that can be opened is the one to press.
  expect(place(1).querySelector('button[data-kind="primary"]')?.textContent?.trim()).toBe(
    es('automata.saves.continue'),
  )
  await drive.press(es('automata.back'))
  await drive.wait(es('automata.menu.new'))
  await drive.press(es('automata.menu.new'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="saves"]')).not.toBeNull()
  // No: nothing is written over.
  inPlace(2, es('automata.saves.new')).click()
  await expect.poll(() => drive.mount.querySelector('[role="alertdialog"]')).not.toBeNull()
  await drive.press(es('automata.keep'))
  await expect.poll(() => drive.mount.querySelector('[role="alertdialog"]')).toBeNull()
  expect(((await placesOn(host).load(1)) as { data: { level: string } }).data.level).toBe('level-2')
  // Yes: the second place starts again from level one, and the level plays.
  inPlace(2, es('automata.saves.new')).click()
  await drive.press(es('automata.saves.replace-yes'))
  await drive.shown('playing')
  expect(drive.flow()?.state().level).toBe('level-1')
  expect(((await placesOn(host).load(1)) as { data: { level: string } }).data.level).toBe('level-1')
})

test('Delete asks first; "Keep it" keeps it; "Delete it" empties the place and the list says so', async () => {
  const host = testHost()
  await threeGames(host)
  await drive.toMenu({ host })
  await drive.press(es('automata.menu.saves'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="saves"]')).not.toBeNull()
  inPlace(1, es('automata.saves.erase')).click()
  await expect.poll(() => drive.mount.querySelector('[role="alertdialog"]')).not.toBeNull()
  await drive.press(es('automata.keep'))
  expect(((await placesOn(host).load(0)) as { data: unknown }).data).not.toBeNull()
  expect(place(1).textContent).toContain('Nivel Uno')
  inPlace(1, es('automata.saves.erase')).click()
  await drive.answer(es('automata.saves.erase-yes'))
  await expect.poll(() => place(1).textContent).toContain(es('automata.saves.empty'))
  const loaded = await placesOn(host).load(0)
  expect(loaded).toMatchObject({ ok: true, data: null })
})

test('a damaged saved game says so in words and can only be deleted', async () => {
  const host = testHost()
  await threeGames(host)
  await host.store.set(slotKey(save.def, 0), '{ not a save')
  await drive.toMenu({ host })
  await drive.press(es('automata.menu.saves'))
  await expect.poll(() => drive.mount.querySelector('[data-screen="saves"]')).not.toBeNull()
  expect(place(1).textContent).toContain(es('automata.saves.damaged'))
  expect([...place(1).querySelectorAll('button')].map((one) => one.textContent?.trim())).toEqual([
    es('automata.saves.erase'),
  ])
})

test('storage refuses: Play still plays, the done screen says progress was not kept, and Continue never shows', async () => {
  const store = memoryStore()
  const host = await drive.toMenu({ host: testHost({ store }) })
  store.refuse('failed')
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.flow()?.finishLevel()
  await drive.shown('done')
  await expect
    .poll(() => drive.mount.querySelector('[role="status"]')?.textContent)
    .toBe(es('automata.done.not-kept'))
  await drive.wait(es('automata.done.menu'))
  await drive.press(es('automata.done.menu'))
  await drive.shown('menu')
  await drive.wait(es('automata.menu.play'))
  expect(drive.buttons()).not.toContain(es('automata.menu.continue'))
  expect(host.store).toBe(store)
})

test('a game with a save of its own shape keeps its own data beside the level', async () => {
  const own = defineSave({
    game: drive.game,
    version: 1,
    schema: z.strictObject({ level: Id, coins: z.number() }),
    slots: 3,
  })
  const coins: FlowSave<{ level: string; coins: number }> = {
    def: own,
    fresh: (level) => ({ level, coins: 0 }),
  }
  const host = await drive.toMenu({ save: coins })
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  const kept = await drive.flow()?.keep({ level: 'level-1', coins: 7 } as never)
  expect(kept).toMatchObject({ ok: true })
  drive.flow()?.finishLevel()
  await drive.shown('done')
  await drive.wait(es('automata.done.next'))
  // Reaching level two keeps the coins beside it.
  const loaded = await createSaves({ def: own, store: host.store }).load(0)
  expect(loaded).toMatchObject({ ok: true, data: { level: 'level-2', coins: 7 } })
})

test('a tap on a watching game plays the newest saved game, and writes no new one', async () => {
  const host = testHost()
  await drive.returning(host, 'es')
  const saves = placesOn(host)
  await saves.save(0, { level: 'level-1' }, { label: 'Nivel Uno' })
  // The later save is the newest.
  await new Promise((resolve) => setTimeout(resolve, 20))
  await saves.save(1, { level: 'level-2' }, { label: 'Nivel Dos' })
  await drive.open({ host, watch: await flowReplay(), game: { noWarning: true } })
  await drive.shown('watching')
  const heard: string[] = [drive.step()]
  drive.flow()?.onState((state) => heard.push(state.step))
  await userEvent.click(drive.mount.querySelector('.take') as HTMLElement)
  await drive.shown('playing')
  // Not the flags, the splash or the menu: the language is known, so the level itself, the one the game was left at.
  expect(heard).toEqual(['watching', 'playing'])
  expect(drive.flow()?.state().level).toBe('level-2')
  const listed = await saves.list()
  const kept = listed.ok ? listed.value.filter((one) => one.kind === 'ready').length : -1
  expect(kept).toBe(2)
})
