// The file a play session's Worker runs (`dist/session-worker.js` once built). The Worker has modules of its own, so it
// loads the game's rules as they are when the session starts, and a later change to them is seen by the next session, not
// this one. All it does is answer messages from the thread that started it, one after the other.
import { parentPort, workerData } from 'node:worker_threads'
import { Effect } from 'effect'
import { readGame } from './game-folder.ts'
import { liveLayer } from './live.ts'
import type { SessionMessage } from './ports.ts'
import { sessionHost } from './session.ts'

const port = parentPort
if (port !== null) {
  const { folder } = workerData as { folder: string }
  const host = sessionHost(() => Effect.runPromise(Effect.provide(readGame(folder), liveLayer)))
  // One message at a time, in the order they came: a step must be over before the state is read.
  let queue: Promise<void> = Promise.resolve()
  port.on('message', (request: { id: number; message: SessionMessage }) => {
    queue = queue.then(async () => {
      port.postMessage({ id: request.id, reply: await host.call(request.message) })
    })
  })
}
