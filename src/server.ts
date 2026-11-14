// The Node entry: `@automataframework/framework/server`. A game's own server file imports `createRoomServer` from
// here; it needs Node, so neither `index.ts` nor `headless.ts` may reach it.
import './lib/zod.ts'

export * from './features/server/server.ts'
