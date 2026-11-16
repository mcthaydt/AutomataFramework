// Serves the built game (`dist/`) for the play test, the way a host would: `vite preview` on a free port, stopped when the
// test is done. It serves only what `npm run build` made, so the test plays what players get, not what the dev server makes.
import { createServer } from 'node:net'
import { preview } from 'vite'

/** A port nobody is using now. */
function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const probe = createServer()
    probe.once('error', fail)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      probe.close(() => {
        if (typeof address === 'object' && address !== null) done(address.port)
        else fail(new Error('There is no free port.'))
      })
    })
  })
}

/** Starts the built game and gives its address, and a way to stop it. */
export async function serveBuilt(): Promise<{ readonly address: string; readonly stop: () => Promise<void> }> {
  const port = await freePort()
  const server = await preview({
    logLevel: 'silent',
    preview: { host: '127.0.0.1', port, strictPort: true },
  })
  return { address: `http://127.0.0.1:${port}/`, stop: () => server.close() }
}
