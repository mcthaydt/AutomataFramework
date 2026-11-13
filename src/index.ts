// The browser entry: the headless entry plus render, input, host and game.
// Features are re-exported here as they arrive.
import { config } from 'zod'

// A game on itch or Wavedash runs under a CSP with no 'unsafe-eval'. Zod would otherwise try to compile its
// validators with `new Function` and trip a security-policy violation first; this makes it skip the attempt.
// `render/stage.ts` does the same for Pixi, which is the other half of the no-eval promise.
config({ jitless: true })

export * from './features/game/game.ts'
export * from './features/host/host.ts'
export * from './features/input/input.ts'
export * from './features/render/render.ts'
export * from './headless.ts'
