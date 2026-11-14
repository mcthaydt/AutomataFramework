// Opens a fresh "page" of the fixture game: a new same-origin frame with its own document, its own module copies and
// its own memory. What a reload is to a game, without leaving the test: nothing reaches the next frame but what the
// browser stored. (A second `webHost()` in this same page would prove less, since it would share this page's memory.)
import type { SavesPage } from './page.ts'

/** How long a page may take to load before the test says so, well inside the test's own limit. */
const LOAD_LIMIT_MS = 20_000

/** Where `page.ts` is served from, worked out from this file's own address so the test server's layout never matters. */
const PAGE_URL = new URL('./page.ts', import.meta.url).href

/** Opens a fresh page (frame) of `size`, loads `page.ts` in it, and returns its handle and a `close` that removes it. */
export async function openPage(
  size: { width: number; height: number } = { width: 390, height: 844 },
): Promise<{ page: SavesPage; close(): void }> {
  const frame = document.createElement('iframe')
  frame.style.cssText = `position:fixed;left:0;top:0;border:0;width:${size.width}px;height:${size.height}px`
  const close = (): void => frame.remove()
  try {
    // The page tells this one when it is ready, or why it is not. Listening starts before the frame exists.
    const ready = new Promise<Window>((resolve, reject) => {
      let started = false
      // A page that never answers is named, not left to the test's own timeout, which says nothing.
      const gaveUp = setTimeout(() => {
        window.removeEventListener('message', heard)
        reject(
          new Error(
            `The page did not answer in ${LOAD_LIMIT_MS} ms (its script ${started ? 'started' : 'never started'}).`,
          ),
        )
      }, LOAD_LIMIT_MS)
      function heard(event: MessageEvent): void {
        if (frame.contentWindow === null || event.source !== frame.contentWindow) return
        const data = event.data as { savesPage: 'started' | 'ready' } | { savesPage: 'error'; error: string }
        if (data.savesPage === 'started') {
          started = true
          return
        }
        clearTimeout(gaveUp)
        window.removeEventListener('message', heard)
        if (data.savesPage === 'ready') resolve(frame.contentWindow)
        else reject(new Error(`The page did not load: ${data.error}`))
      }
      window.addEventListener('message', heard)
    })
    // The script is part of the frame's own document, so no browser can replace the document between "loaded" and
    // "running it" (WebKit and Firefox both swap a frame's first, empty document). Vitest rewrites every `import()` in
    // the code it serves into a call on `__vitest_browser_runner__`, which only the test's own frame has; this frame
    // gets the plain version of it (the one Vitest itself uses where it has no runner): load the module, nothing more.
    frame.srcdoc = `<!doctype html><html><body style="margin:0"><script type="module">
globalThis.__vitest_browser_runner__ = { wrapDynamicImport: (load) => load() }
parent.postMessage({ savesPage: 'started' }, '*')
addEventListener('error', (event) => parent.postMessage({ savesPage: 'error', error: 'script error: ' + event.message }, '*'))
import(${JSON.stringify(PAGE_URL)}).then(
  () => parent.postMessage({ savesPage: 'ready' }, '*'),
  (error) => parent.postMessage({ savesPage: 'error', error: String((error && error.stack) || error) }, '*'),
)
</script></body></html>`
    document.body.append(frame)
    const win = await ready
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
