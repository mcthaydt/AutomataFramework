// The sound switch on pause, and "Delete all my saves" in Settings, on the flow's page (plan Q, Task 9): the switch makes
// the speaker hear nothing and is still off after a reload, the delete row is on the main menu's Settings and not in a
// level, and a yes erases every saved game and the best score and nothing else.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { SOUND_SETTINGS_DEFAULT } from '#src/features/audio/audio.ts'
import { defaultSave, type Progress } from '#src/features/flow/flow.ts'
import { openSections } from '#src/features/flow/sections.ts'
import { type TestHost, testHost } from '#src/features/host/host.ts'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { slotKey } from '#src/features/saves/define.ts'
import { createSaves, memoryStore, type Saves } from '#src/features/saves/saves.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'

const es = frameworkWords('es')
const drive = createDrive()
const save = defaultSave(drive.game)

beforeEach(() => drive.start())
afterEach(() => drive.stop())

const placesOn = (host: TestHost): Saves<Progress> => createSaves({ def: save.def, store: host.store })

/** A game in place 0 and one in place 1, and a best of 5. */
async function someProgress(host: TestHost): Promise<void> {
  await drive.returning(host, 'es')
  const saves = placesOn(host)
  await saves.save(0, { level: 'level-1' }, { label: 'Nivel Uno' })
  await saves.save(1, { level: 'level-2' }, { label: 'Nivel Dos' })
  await (await openSections({ game: drive.game, host })).records.set({ best: 5 })
}

const settingsUp = (): Promise<void> =>
  expect.poll(() => drive.mount.querySelector('[data-screen="settings"]')).not.toBeNull()
const sound = (): HTMLElement | undefined =>
  [...drive.mount.querySelectorAll<HTMLElement>('[role="switch"]')].find(
    (one) => one.textContent?.trim() === es('automata.settings.sound'),
  )
const heard = (): { music: number; sound: number } => ({
  music: drive.speaker.levels.music,
  sound: drive.speaker.levels.sound,
})

/** Plays, and pauses with Escape. */
async function pause(more: Parameters<typeof drive.toMenu>[0] = {}): Promise<TestHost> {
  const host = await drive.toMenu(more)
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  drive.key('keydown', 'Escape')
  drive.key('keyup', 'Escape')
  await drive.shown('paused')
  return host
}

test("the pause screen has a Sound switch; off: the speaker hears 0 and 0; on: the sliders' own numbers", async () => {
  await pause()
  expect(sound()?.getAttribute('aria-checked')).toBe('true')
  expect(heard()).toEqual({ music: SOUND_SETTINGS_DEFAULT.music, sound: SOUND_SETTINGS_DEFAULT.sound })
  await userEvent.click(sound() as HTMLElement)
  await expect.poll(heard).toEqual({ music: 0, sound: 0 })
  expect(sound()?.getAttribute('aria-checked')).toBe('false')
  await userEvent.click(sound() as HTMLElement)
  await expect
    .poll(heard)
    .toEqual({ music: SOUND_SETTINGS_DEFAULT.music, sound: SOUND_SETTINGS_DEFAULT.sound })
})

test('Sound off is still off after a reload, and the switch in Settings agrees', async () => {
  const host = await pause()
  await userEvent.click(sound() as HTMLElement)
  await expect.poll(heard).toEqual({ music: 0, sound: 0 })
  drive.leave()
  await drive.start()
  await drive.toMenu({ host })
  expect(heard()).toEqual({ music: 0, sound: 0 })
  // The first visit saved a game, so the menu offers Continue now.
  await drive.press(es('automata.menu.continue'))
  await drive.shown('playing')
  drive.frames.at(0)
  drive.key('keydown', 'Escape')
  drive.key('keyup', 'Escape')
  await drive.shown('paused')
  expect(sound()?.getAttribute('aria-checked')).toBe('false')
  await drive.press(es('automata.menu.settings'))
  await settingsUp()
  expect(sound()?.getAttribute('aria-checked')).toBe('false')
  // The switch in Settings turns it on, and the pause screen under it agrees on its way back.
  await userEvent.click(sound() as HTMLElement)
  await expect
    .poll(heard)
    .toEqual({ music: SOUND_SETTINGS_DEFAULT.music, sound: SOUND_SETTINGS_DEFAULT.sound })
})

test('Settings on the menu ends with Delete all my saves; during a level it is not there', async () => {
  await drive.toMenu()
  await drive.press(es('automata.menu.settings'))
  await settingsUp()
  const row = (): string | undefined => {
    const all = [...drive.mount.querySelectorAll('[data-screen="settings"] button')]
    return all.at(-1)?.textContent?.trim()
  }
  expect(row()).toBe(es('automata.settings.delete'))
  drive.leave()
  await drive.start()
  await pause()
  await drive.press(es('automata.menu.settings'))
  await settingsUp()
  expect(drive.buttons()).not.toContain(es('automata.settings.delete'))
})

test('Delete, Keep them: nothing changes, and Escape is Keep them', async () => {
  const host = testHost()
  await someProgress(host)
  await drive.toMenu({ host })
  await drive.press(es('automata.menu.settings'))
  await settingsUp()
  await drive.press(es('automata.settings.delete'))
  await expect.poll(() => drive.mount.querySelector('[role="alertdialog"]')).not.toBeNull()
  expect(document.activeElement?.textContent?.trim()).toBe(es('automata.settings.delete-no'))
  await userEvent.keyboard('{Escape}')
  expect(drive.mount.querySelector('[role="alertdialog"]')).toBeNull()
  await drive.press(es('automata.settings.delete'))
  await drive.answer(es('automata.settings.delete-no'))
  expect(drive.mount.querySelector('[role="alertdialog"]')).toBeNull()
  expect(((await placesOn(host).load(0)) as { data: unknown }).data).not.toBeNull()
  expect((await openSections({ game: drive.game, host })).records.get()).toEqual({ best: 5 })
})

test('Delete, Delete them: no saved game, no best score, the menu says Play; the language, a key and the volumes stay', async () => {
  const host = testHost()
  await someProgress(host)
  const sections = await openSections({ game: drive.game, host })
  await sections.sound.set({ ...SOUND_SETTINGS_DEFAULT, music: 0.3, muted: true })
  await drive.toMenu({ host })
  expect(drive.buttons()).toContain(es('automata.menu.continue'))
  await drive.press(es('automata.menu.settings'))
  await settingsUp()
  await drive.press(es('automata.settings.delete'))
  await drive.answer(es('automata.settings.delete-yes'))
  await expect.poll(async () => ((await placesOn(host).load(0)) as { data: unknown }).data).toBeNull()
  expect(((await placesOn(host).load(1)) as { data: unknown }).data).toBeNull()
  const after = await openSections({ game: drive.game, host })
  expect(after.records.get()).toEqual({})
  expect(after.sound.get()).toMatchObject({ music: 0.3, muted: true })
  // Back on the menu, drawn again with no Continue.
  await drive.press(es('automata.back'))
  await drive.shown('menu')
  await drive.wait(es('automata.menu.play'))
  expect(drive.buttons()).not.toContain(es('automata.menu.continue'))
  expect(document.documentElement.lang).toBe('es')
})

test('storage refuses the erase: nothing throws, and the player is told once', async () => {
  const store = memoryStore()
  const host = testHost({ store })
  await someProgress(host)
  await drive.toMenu({ host })
  await drive.press(es('automata.menu.settings'))
  await settingsUp()
  store.refuse('failed')
  await drive.press(es('automata.settings.delete'))
  await drive.answer(es('automata.settings.delete-yes'))
  await expect.poll(() => drive.mount.textContent).toContain(es('automata.settings.not-kept'))
  expect(drive.mount.textContent?.split(es('automata.settings.not-kept'))).toHaveLength(2)
  expect(drive.step()).toBe('menu')
})

test('a saved game that is garbage in storage: the game still opens, and Delete all my saves clears it', async () => {
  const host = testHost()
  await drive.returning(host, 'es')
  await host.store.set(slotKey(save.def, 0), '{ not a save')
  await drive.toMenu({ host })
  await drive.press(es('automata.menu.play'))
  await drive.shown('playing')
  drive.flow()?.stop()
  drive.leave()
  await drive.start()
  await drive.toMenu({ host })
  await drive.press(es('automata.menu.settings'))
  await settingsUp()
  await drive.press(es('automata.settings.delete'))
  await drive.answer(es('automata.settings.delete-yes'))
  await expect.poll(async () => host.store.get(slotKey(save.def, 0))).not.toBe('{ not a save')
})
