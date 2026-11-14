// A volume the player sets is the volume on the next page: the audio's volumes go into the game's settings and come
// back out of them, in each real browser, through two real pages one after the other.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { SOUND_SETTINGS_DEFAULT } from '#src/features/audio/audio.ts'
import { openAudioPage } from '../../fixtures/audio/open.ts'

const KEY = 'automata.fixture-game.settings'

beforeEach(() => localStorage.removeItem(KEY))
afterEach(() => localStorage.removeItem(KEY))

test('a volume set on one page is the volume on the next', async () => {
  const first = await openAudioPage()
  try {
    await first.page.setVolumes({ format: 1, music: 0.25, sound: 0.5 })
  } finally {
    first.close()
  }
  const second = await openAudioPage()
  try {
    expect(await second.page.volumes()).toEqual({ format: 1, music: 0.25, sound: 0.5 })
  } finally {
    second.close()
  }
  expect(localStorage.getItem(KEY)).toContain('"sound":{"format":1,"music":0.25,"sound":0.5}')
})

test('with nothing stored, a page starts at music 0.7 and sound 1', async () => {
  const { page, close } = await openAudioPage()
  try {
    expect(await page.volumes()).toEqual(SOUND_SETTINGS_DEFAULT)
    expect(await page.volumes()).toEqual({ format: 1, music: 0.7, sound: 1 })
  } finally {
    close()
  }
})

test('a stored sound section that is not ours starts again from the first values', async () => {
  localStorage.setItem(KEY, JSON.stringify({ format: 1, sections: { sound: { music: 'loud' } } }))
  const { page, close } = await openAudioPage()
  try {
    expect(await page.volumes()).toEqual(SOUND_SETTINGS_DEFAULT)
  } finally {
    close()
  }
})
