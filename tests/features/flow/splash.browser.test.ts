// The splash's picture through the flow: the game names a figure, the page reads its picture, and a picture that cannot
// be read leaves the game's name in its place.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { createDrive } from '../../fixtures/flow/drive.ts'

const drive = createDrive()

beforeEach(() => drive.start())
afterEach(() => drive.stop())

/** A PNG one pixel big, as the page's reader would hand over. */
const ONE_PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const picture = (): Blob => {
  const bytes = Uint8Array.from(atob(ONE_PIXEL), (one) => one.charCodeAt(0))
  return new Blob([bytes], { type: 'image/png' })
}

test("the splash shows the game's picture, named by the game's name", async () => {
  const asked: string[] = []
  await drive.open({
    game: { noWarning: true, splash: true },
    readPicture: async (path) => {
      asked.push(path)
      return picture()
    },
  })
  await drive.shown('picking')
  await expect.poll(() => drive.mount.querySelector('.automata-picker-go')).not.toBeNull()
  ;(drive.mount.querySelector('.automata-flag') as HTMLElement).click()
  ;(drive.mount.querySelector('.automata-picker-go') as HTMLElement).click()
  await drive.shown('splash')
  const image = drive.mount.querySelector('[data-screen="splash"] img')
  expect(image?.getAttribute('alt')).toBe('Crate Game')
  expect(asked).toEqual(['content/figures/hero.png'])
})

test("a picture that cannot be read leaves the game's name on the splash", async () => {
  await drive.open({
    game: { noWarning: true, splash: true },
    readPicture: () => Promise.reject(new Error('no such picture')),
  })
  await drive.shown('picking')
  await expect.poll(() => drive.mount.querySelector('.automata-picker-go')).not.toBeNull()
  ;(drive.mount.querySelector('.automata-flag') as HTMLElement).click()
  ;(drive.mount.querySelector('.automata-picker-go') as HTMLElement).click()
  await drive.shown('splash')
  expect(drive.mount.querySelector('[data-screen="splash"] img')).toBeNull()
  expect(drive.mount.querySelector('[data-screen="splash"] h1')?.textContent).toBe('Crate Game')
})
