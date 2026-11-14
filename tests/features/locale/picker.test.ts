// The picker's rules: the flags in the order a player sees them, which one is chosen, its words in that flag's language
// and the choice kept once.
import { expect, test } from 'vitest'
import { type GameContent, LANGUAGES, loadGame } from '#src/features/content/content.ts'
import { type TestHostOptions, testHost } from '#src/features/host/host.ts'
import { createLocale, createPicker } from '#src/features/locale/locale.ts'
import { memoryStore, openSettings } from '#src/features/saves/saves.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'

const GAME = 'full-game'
const KEY = `automata.${GAME}.settings`

async function full(): Promise<GameContent> {
  const loaded = await loadGame(readFullGame())
  if (!loaded.ok) throw new Error('the full game did not load')
  return loaded.value
}

/** A picker over a fresh locale, with the store a test can look into. */
async function open(options: TestHostOptions = {}) {
  const store = memoryStore()
  const host = testHost({ store, ...options })
  const settings = await openSettings({ game: GAME, store: host.store })
  const locale = createLocale({ content: await full(), host, settings })
  return { locale, store, picker: createPicker(locale) }
}

test('a French device: the flags are in the fixed order, none is chosen, and going on does nothing', async () => {
  const { picker, store } = await open({ deviceLanguages: ['fr-FR'] })
  expect(picker.flags).toEqual([...LANGUAGES])
  expect(picker.chosen()).toBeUndefined()
  expect(picker.words()).toBeUndefined()
  expect(await picker.go()).toBeUndefined()
  expect(store.entries()[KEY]).toBeUndefined()
})

test('moving on chooses the first flag, and stops at each end', async () => {
  const { picker } = await open({ deviceLanguages: ['fr-FR'] })
  picker.move(-1)
  expect(picker.chosen()).toBe('zh')
  picker.move(1)
  expect(picker.chosen()).toBe('es')
  picker.move(-1)
  picker.move(-1)
  expect(picker.chosen()).toBe('zh')
  for (let i = 0; i < 10; i++) picker.move(1)
  expect(picker.chosen()).toBe('ko')
})

test('moving on from none chooses the first flag', async () => {
  const { picker } = await open({ deviceLanguages: ['fr-FR'] })
  picker.move(1)
  expect(picker.chosen()).toBe('zh')
})

test("a chosen flag says the picker's words in its own language", async () => {
  const { picker } = await open({ deviceLanguages: ['fr-FR'] })
  picker.choose('ko')
  expect(picker.words()).toEqual({ title: '한국어로 플레이', go: '시작' })
  picker.choose('es')
  expect(picker.words()).toEqual({ title: 'Jugar en español', go: 'Vamos' })
})

test('a flag the picker does not show cannot be chosen', async () => {
  const { picker } = await open()
  // @ts-expect-error not one of the six
  expect(() => picker.choose('fr')).toThrow(RangeError)
  expect(picker.chosen()).toBeUndefined()
})

test('going on keeps the choice once: a second go answers nothing and writes nothing', async () => {
  const { picker, locale, store } = await open({ deviceLanguages: ['fr-FR'] })
  picker.choose('ko')
  const answer = await picker.go()
  expect(answer?.ok).toBe(true)
  expect([locale.language(), locale.asked()]).toEqual(['ko', true])
  const written = store.entries()[KEY]
  expect(written).toContain('"ko"')
  expect(await picker.go()).toBeUndefined()
  expect(store.entries()[KEY]).toBe(written)
})

test('a Japanese device: Japanese is first and is already chosen, so one press starts in it', async () => {
  const { picker, locale } = await open({ deviceLanguages: ['ja-JP'] })
  expect(picker.flags[0]).toBe('ja')
  expect(picker.flags).toEqual(['ja', 'zh', 'es', 'en', 'pt', 'ko'])
  expect(picker.chosen()).toBe('ja')
  await picker.go()
  expect(locale.language()).toBe('ja')
})

test('a listener hears a change of flag, and not one that changes nothing', async () => {
  const { picker } = await open({ deviceLanguages: ['fr-FR'] })
  let heard = 0
  const stop = picker.onChange(() => {
    heard++
  })
  picker.choose('pt')
  picker.choose('pt')
  expect(heard).toBe(1)
  picker.move(1)
  expect(heard).toBe(2)
  stop()
  picker.move(1)
  expect(heard).toBe(2)
})
