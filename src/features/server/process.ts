// The room server as a process, on Effect (the only file in the framework that imports it): the port from the options
// or the `PORT` variable, one line on stdout when it listens, a clean stop on SIGTERM or SIGINT, a non-zero exit with
// one line on stderr when it cannot start. The server itself is `room-server.ts` and knows nothing of signals.
import { Cause, Deferred, Effect, Exit } from 'effect'
import { createRoomServer, type RoomServerOptions } from './room-server.ts'

const MAX_PORT = 65535

/** The port to listen on: the option, else `PORT`, else 0 (the system picks one). Fails with the line to print. */
const portOf = (option: number | undefined): Effect.Effect<number, Error> => {
  if (option !== undefined) return Effect.succeed(option)
  const text = process.env.PORT
  if (text === undefined) return Effect.succeed(0)
  const port = /^\d+$/.test(text) ? Number(text) : Number.NaN
  return port <= MAX_PORT
    ? Effect.succeed(port)
    : Effect.fail(new Error(`PORT must be a whole number from 0 to ${MAX_PORT}, but it is "${text}".`))
}

/** One line of JSON on stdout: the only thing this process prints there, so a host can read it. */
const say = (event: Record<string, unknown>): Effect.Effect<void> =>
  Effect.sync(() => void process.stdout.write(`${JSON.stringify(event)}\n`))

/** Resolves once SIGTERM or SIGINT arrives; the listeners go when the scope closes. */
const signalled = Effect.acquireRelease(
  Effect.gen(function* () {
    const done = yield* Deferred.make<void>()
    const handler = (): void => void Effect.runSync(Deferred.succeed(done, undefined))
    process.once('SIGTERM', handler)
    process.once('SIGINT', handler)
    return { done, handler }
  }),
  ({ handler }) =>
    Effect.sync(() => {
      process.off('SIGTERM', handler)
      process.off('SIGINT', handler)
    }),
)

const serve = (options: RoomServerOptions): Effect.Effect<void, Error> =>
  Effect.scoped(
    Effect.gen(function* () {
      const port = yield* portOf(options.port)
      // Listening for the signals first: a SIGTERM that arrives right after the line is still a clean stop.
      const { done } = yield* signalled
      const server = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () => createRoomServer({ ...options, port }),
          catch: (error) => (error instanceof Error ? error : new Error(String(error))),
        }),
        (running) => Effect.promise(() => running.close()),
      )
      yield* say({ event: 'listening', port: server.port })
      yield* Deferred.await(done)
    }),
  ).pipe(Effect.zipRight(say({ event: 'stopped' })))

/**
 * Runs a room server as this process, and never returns: it ends the process. Starts listening on `options.port`, else
 * the `PORT` variable, else a port the system picks, and prints `{"event":"listening","port":<n>}` as its one line
 * on stdout. On SIGTERM or SIGINT it closes every room, prints `{"event":"stopped"}` and exits 0. A `PORT` that is not
 * a whole number from 0 to 65535, or a port that cannot be listened on, prints one line on stderr and exits 1.
 */
export async function runRoomServer(options: RoomServerOptions): Promise<never> {
  const exit = await Effect.runPromiseExit(serve(options))
  if (Exit.isSuccess(exit)) process.exit(0)
  const reason = Cause.squash(exit.cause)
  console.error(reason instanceof Error ? reason.message : String(reason))
  process.exit(1)
}
