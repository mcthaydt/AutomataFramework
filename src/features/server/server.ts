// The server feature's entry: what runs a room on Node. Only `src/server.ts`, the package's Node entry, may import it.
export { startTickScheduler, type TickClock } from './tick-scheduler.ts'
