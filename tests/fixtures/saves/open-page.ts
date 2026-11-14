// Opens a fresh "page" of the fixture game: a new same-origin frame with its own document, its own module copies and
// its own memory. What a reload is to a game, without leaving the test: nothing reaches the next frame but what the
// browser stored. (A second `webHost()` in this same page would prove less, since it would share this page's memory.)
import type { SavesPage } from './page.ts'

/** Where `page.ts` is served from, worked out from this file's own address so the test server's layout never matters. */
const PAGE_URL = new URL('./page.ts', import.meta.url).href

/** Opens a fresh page (frame) of `size`, loads `page.ts` in it, and returns its handle and a `close` that removes it. */
export async function openPage(
  size: { width: number; height: number } = { width: 390, height: 844 },
): Promise<{ page: SavesPage; close(): void }> {
  const frame = document.createElement('iframe')
  frame.style.cssText = `position:fixed;left:0;top:0;border:0;width:${size.width}px;height:${size.height}px`
  frame.srcdoc = '<!doctype html><html><body style="margin:0"></body></html>'
  const loaded = new Promise<void>((resolve) =>
    frame.addEventListener('load', () => resolve(), { once: true }),
  )
  document.body.append(frame)
  const close = (): void => frame.remove()
  try {
    await loaded
    const win = frame.contentWindow
    const doc = frame.contentDocument
    if (win === null || doc === null) throw new Error('The frame has no window.')
    // The page tells this one when it is ready, or why it is not.
    const ready = new Promise<void>((resolve, reject) => {
      const heard = (event: MessageEvent): void => {
        if (event.source !== win) return
        window.removeEventListener('message', heard)
        const data = event.data as { savesPage: 'ready' } | { savesPage: 'error'; error: string }
        if (data.savesPage === 'ready') resolve()
        else reject(new Error(`The page did not load: ${data.error}`))
      }
      window.addEventListener('message', heard)
    })
    const script = doc.createElement('script')
    script.type = 'module'
    // Vitest rewrites every `import()` in the code it serves into a call on `__vitest_browser_runner__`, which only the
    // test's own frame has. This new frame gets the plain version of it (the one Vitest itself uses where it has no
    // runner): load the module, nothing more.
    script.textContent = `globalThis.__vitest_browser_runner__ = { wrapDynamicImport: (load) => load() }
    import(${JSON.stringify(PAGE_URL)}).then(
      () => parent.postMessage({ savesPage: 'ready' }, '*'),
      (error) => parent.postMessage({ savesPage: 'error', error: String((error && error.stack) || error) }, '*'),
    )`
    doc.body.append(script)
    await ready
    const inside = (win as unknown as { savesPage: SavesPage }).savesPage
    // What comes back is copied through JSON: it was made by the frame's own `Array` and `Object`, and a test should
    // compare plain data, not another realm's objects.
    const call = async <T>(method: keyof SavesPage, ...args: unknown[]): Promise<T> => {
      const result = await (inside[method] as (...a: unknown[]) => Promise<unknown>)(...args)
      return (result === undefined ? undefined : JSON.parse(JSON.stringify(result))) as T
    }
    const page: SavesPage = {
      title: () => call('title'),
      play: (ticks, level) => call('play', ticks, level),
      save: (slot, data, options) => call('save', slot, data, options),
      load: (slot) => call('load', slot),
      setMusic: (volume) => call('setMusic', volume),
      music: () => call('music'),
    }
    return { page, close }
  } catch (error) {
    close()
    throw error
  }
}
