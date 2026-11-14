// A first visit end to end, in Node: a player whose device speaks no language the game has is asked, chooses Korea and
// goes on; the next visit, on the same host's store, starts in Korean and asks nothing.
import { expect, test } from 'vitest'
import { loadGame } from '#src/features/content/content.ts'
import { testHost } from '#src/features/host/host.ts'
import { createLocale, createPicker } from '#src/features/locale/locale.ts'
import { openSettings } from '#src/features/saves/saves.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'

test('a French device chooses Korea once, and the next visit is Korean from the start', async () => {
  const loaded = await loadGame(readFullGame())
  if (!loaded.ok) throw new Error('the full game did not load')
  const content = loaded.value
  const host = testHost({ deviceLanguages: ['fr-FR'] })

  const first = createLocale({
    content,
    host,
    settings: await openSettings({ game: 'full-game', store: host.store }),
  })
  expect(first.asked()).toBe(false)
  const picker = createPicker(first)
  picker.choose('ko')
  expect((await picker.go())?.ok).toBe(true)

  const second = createLocale({
    content,
    host,
    settings: await openSettings({ game: 'full-game', store: host.store }),
  })
  expect(second.language()).toBe('ko')
  expect(second.asked()).toBe(true)
  expect(second.words('automata.touch.label')).toBe('터치 조작')
})
