// The journey for saves, in real Chromium, WebKit and Firefox: a save outlives the page that made it. A "page" is a new
// same-origin frame (see `open-page.ts`), so nothing carries from one page to the next except what the browser stored,
// which is what a reload is to a game. The real `webHost()` and the browser's real `localStorage` are used throughout.
// (The reload of the built demo in a real tab is plan D's journey; this one proves the framework's part.)
import { afterEach, beforeEach, expect, test } from 'vitest'
import { writeEnvelope } from '#src/features/saves/envelope.ts'
import { openPage } from '../../fixtures/saves/open-page.ts'

const PREFIX = 'automata.fixture-game.'
const clear = (): void => {
  for (const key of Object.keys(localStorage)) if (key.startsWith(PREFIX)) localStorage.removeItem(key)
}
beforeEach(clear)
afterEach(clear)

const level1 = { level: 'level-1', doors: 1 }

/** One task later, the way a player closing a tab is a later task than the tap that saved. */
function nextTask(): Promise<void> {
  return new Promise((resolve) => {
    const { port1, port2 } = new MessageChannel()
    port1.onmessage = () => {
      port1.close()
      resolve()
    }
    port2.postMessage(0)
  })
}

test('a first-time player has three empty slots, can save, and has nothing to continue', async () => {
  const { page, close } = await openPage()
  try {
    expect(await page.title()).toEqual({
      canSave: true,
      slots: [
        { slot: 0, kind: 'empty' },
        { slot: 1, kind: 'empty' },
        { slot: 2, kind: 'empty' },
      ],
    })
  } finally {
    close()
  }
})

test('play, save, close the page: a new page continues from the save', async () => {
  const first = await openPage()
  let hash: string
  try {
    hash = await first.page.play(120)
    await first.page.save(0, level1)
  } finally {
    first.close()
  }
  const second = await openPage()
  try {
    const title = await second.page.title()
    expect(title.canSave).toBe(true)
    expect(title.slots[0]).toMatchObject({ slot: 0, kind: 'ready' })
    expect(title.latest).toBe(0)
    expect(await second.page.load(0)).toEqual(level1)
    // The save changed nothing in the sim: the same level plays the same hash.
    expect(await second.page.play(120, 'level-1')).toBe(hash)
  } finally {
    second.close()
  }
})

test('a save made as the page closes is kept', async () => {
  const first = await openPage()
  // Not waited for: the page has only called `save` when the player closes it, one task later.
  await first.page.save(1, level1, { wait: false })
  await nextTask()
  first.close()
  const second = await openPage()
  try {
    expect(await second.page.load(1)).toEqual(level1)
  } finally {
    second.close()
  }
})

test('the music volume set on one page is the volume on the next', async () => {
  const first = await openPage()
  try {
    expect(await first.page.music()).toBe(0.8)
    await first.page.setMusic(0.25)
  } finally {
    first.close()
  }
  const second = await openPage()
  try {
    expect(await second.page.music()).toBe(0.25)
  } finally {
    second.close()
  }
})

test("a save from the game's last version is upgraded on the next page", async () => {
  // Written here, the way the previous build of the game would have left it.
  localStorage.setItem(
    `${PREFIX}save.0`,
    writeEnvelope({ format: 1, version: 1, savedAt: 5, data: { level: 'level-1' } }),
  )
  const { page, close } = await openPage()
  try {
    expect((await page.title()).slots[0]).toMatchObject({ slot: 0, kind: 'ready', savedAt: 5 })
    expect(await page.load(0)).toEqual({ level: 'level-1', doors: 0 })
  } finally {
    close()
  }
})

test('a save broken by hand lists as damaged, the game is told no when it saves over it, and the text is untouched', async () => {
  localStorage.setItem(`${PREFIX}save.2`, '{"oops')
  const { page, close } = await openPage()
  try {
    const title = await page.title()
    expect(title.slots[2]).toMatchObject({ slot: 2, kind: 'damaged' })
    expect(title.latest).toBeUndefined()
    expect(await page.save(2, level1)).toMatchObject({ ok: false, problem: { kind: 'damaged' } })
  } finally {
    close()
  }
  expect(localStorage.getItem(`${PREFIX}save.2`)).toBe('{"oops')
})

test("two pages open at once see each other's saves", async () => {
  const a = await openPage()
  const b = await openPage()
  try {
    expect((await b.page.title()).slots[0]).toMatchObject({ kind: 'empty' })
    await a.page.save(0, level1)
    expect((await b.page.title()).slots[0]).toMatchObject({ kind: 'ready' })
  } finally {
    a.close()
    b.close()
  }
})

// Phone, tablet and desktop, upright and sideways. The plan draws nothing, so a size cannot change what it does, but a
// size that broke the page would be seen here.
test.each([
  [390, 844],
  [844, 390],
  [820, 1180],
  [1180, 820],
  [1280, 720],
])('at %i by %i the game plays and saves', async (width, height) => {
  const { page, close } = await openPage({ width, height })
  try {
    expect(typeof (await page.play(60))).toBe('string')
    await page.save(0, level1)
    expect(await page.load(0)).toEqual(level1)
  } finally {
    close()
  }
})
