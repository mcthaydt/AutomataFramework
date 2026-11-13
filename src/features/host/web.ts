// The web adapter: a page is on screen when the browser says its document is visible.
import type { Host } from './host.ts'

/** The host for a game in a web page. `doc` is only for tests. */
export function webHost(doc: Document = document): Host {
  const visible = (): boolean => doc.visibilityState !== 'hidden'
  return {
    target: 'web',
    visible,
    onVisibility(listener) {
      const onChange = (): void => listener(visible())
      doc.addEventListener('visibilitychange', onChange)
      return () => doc.removeEventListener('visibilitychange', onChange)
    },
  }
}
