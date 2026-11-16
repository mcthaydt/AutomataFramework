// What the page shows while the game's files load (plan Q, call 13): a bar with no letters that fills as files arrive and
// never goes back, a line after ten seconds of nothing in the device's language (and none in a language that is not one
// of the six), one more try for a file that fails, and a mount that is never empty.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { RETRY_MS, SLOW_MS } from '#src/features/flow/loading.ts'
import { testHost } from '#src/features/host/host.ts'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'
import { flowRead } from '../../fixtures/flow/game.ts'

const es = frameworkWords('es')
const drive = createDrive()

beforeEach(() => drive.start())
afterEach(() => drive.stop())

/** A `read` whose files arrive when the test lets them: `allow(path)` for one, `allow()` for every one. */
function gated(options: { fail?: (path: string, call: number) => boolean } = {}) {
  const files = flowRead({ noWarning: true })
  const gates = new Map<string, { promise: Promise<void>; open: () => void }>()
  const gate = (path: string): { promise: Promise<void>; open: () => void } => {
    let found = gates.get(path)
    if (found === undefined) {
      let open = (): void => {}
      const promise = new Promise<void>((resolve) => {
        open = resolve
      })
      found = { promise, open }
      gates.set(path, found)
    }
    return found
  }
  let everything = false
  const calls = new Map<string, number>()
  return {
    read: async (path: string): Promise<string> => {
      const call = (calls.get(path) ?? 0) + 1
      calls.set(path, call)
      if (!everything) await gate(path).promise
      if (options.fail?.(path, call) === true) throw new Error(`could not fetch ${path}`)
      return files(path)
    },
    allow(path?: string): void {
      if (path === undefined) {
        everything = true
        for (const one of gates.values()) one.open()
      } else gate(path).open()
    },
    calls,
  }
}

const bar = (): HTMLElement | null => drive.mount.querySelector('[role="progressbar"]')
const valueNow = (): number => Number(bar()?.getAttribute('aria-valuenow'))

async function spanish(): Promise<ReturnType<typeof testHost>> {
  const host = testHost({ deviceLanguages: ['es-MX'] })
  await drive.returning(host, 'es')
  return host
}

test('the bar is there at once, with no letters, and fills as files arrive', async () => {
  const held = gated()
  await drive.open({ read: held.read, host: await spanish() })
  expect(drive.mount.dataset.state).toBe('loading')
  expect(bar()).not.toBeNull()
  expect(valueNow()).toBe(0)
  expect(drive.mount.textContent?.trim()).toBe('')
  held.allow('automata.toml')
  await expect.poll(valueNow).toBeGreaterThan(0)
  expect(valueNow()).toBeLessThan(100)
  held.allow()
  await expect.poll(() => drive.mount.dataset.state).not.toBe('loading')
  expect(bar()).toBeNull()
})

test("10 seconds with nothing: the slow line, in the device's language; a file arrives: it is gone", async () => {
  const held = gated()
  await drive.open({ read: held.read, host: await spanish() })
  drive.frames.at(1000)
  drive.frames.at(1000 + SLOW_MS - 500)
  expect(drive.mount.textContent).not.toContain(es('automata.loading.slow'))
  drive.frames.at(1000 + SLOW_MS + 500)
  expect(drive.mount.textContent).toContain(es('automata.loading.slow'))
  held.allow('automata.toml')
  await expect.poll(() => drive.mount.textContent).not.toContain(es('automata.loading.slow'))
})

test('a device whose language is not one of the six never sees a line', async () => {
  const held = gated()
  await drive.open({ read: held.read, host: testHost({ deviceLanguages: ['xx-YY'] }) })
  drive.frames.at(1000)
  drive.frames.at(1000 + SLOW_MS * 3)
  expect(drive.mount.textContent?.trim()).toBe('')
  expect(bar()).not.toBeNull()
})

test('a file that arrives after the slow line showed: the bar goes on from where it was, never back', async () => {
  const held = gated()
  await drive.open({ read: held.read, host: await spanish() })
  held.allow('automata.toml')
  await expect.poll(valueNow).toBeGreaterThan(0)
  const first = valueNow()
  drive.frames.at(1000)
  drive.frames.at(1000 + SLOW_MS + 500)
  expect(drive.mount.textContent).toContain(es('automata.loading.slow'))
  expect(valueNow()).toBe(first)
  const seen = [first]
  for (const path of ['content/levels/level-2.json', 'content/levels/level-pit.json']) {
    held.allow(path)
    await Promise.resolve()
    seen.push(valueNow())
  }
  held.allow()
  await expect.poll(() => drive.mount.dataset.state).not.toBe('loading')
  expect(seen).toEqual([...seen].sort((a, b) => a - b))
})

test('one file fails once: the game starts', async () => {
  const held = gated({ fail: (path, call) => path === 'content/levels/level-2.json' && call === 1 })
  held.allow()
  await drive.open({ read: held.read, host: await spanish() })
  await expect
    .poll(() => {
      drive.run(RETRY_MS / 2)
      return drive.mount.dataset.state
    })
    .toBe('splash')
  expect(held.calls.get('content/levels/level-2.json')).toBe(2)
})

test('one file fails twice: the problem screen, with its button; never an empty mount', async () => {
  const held = gated({ fail: (path) => path === 'content/levels/level-2.json' })
  held.allow()
  await drive.open({ read: held.read, host: await spanish() })
  await expect
    .poll(() => {
      drive.run(RETRY_MS / 2)
      return drive.mount.dataset.state
    })
    .toBe('problem')
  expect(drive.mount.childElementCount).toBeGreaterThan(0)
  expect(drive.mount.querySelector('[role="alert"]')).not.toBeNull()
  // The file failed before there was a language to speak in, so the button is a picture with a name.
  expect(drive.buttons()).toContain('Load the page again')
})

test('every file fails: the problem screen', async () => {
  const held = gated({ fail: () => true })
  held.allow()
  await drive.open({ read: held.read, host: await spanish() })
  await expect
    .poll(() => {
      drive.run(RETRY_MS / 2)
      return drive.mount.dataset.state
    })
    .toBe('problem')
  expect(drive.mount.querySelector('[role="alert"]')).not.toBeNull()
})

test('the mount is never without a child from the first frame to the menu', async () => {
  const empty: string[] = []
  const check = (): void => {
    if (drive.mount.childElementCount === 0) empty.push(drive.mount.dataset.state ?? '')
  }
  const watcher = new MutationObserver(check)
  watcher.observe(drive.mount, { childList: true })
  await drive.toMenu()
  check()
  watcher.disconnect()
  expect(empty).toEqual([])
})
