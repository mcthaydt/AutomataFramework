// The headless entry: everything that runs without a page (sim, physics, commands, net, content, level, saves, host).
// Safe in Node and in an editor that only validates. Features are re-exported here as they arrive.

// First, before any module below builds a schema: see lib/zod.ts.
import './lib/zod.ts'

export * from './features/commands/commands.ts'
export * from './features/content/content.ts'
export * from './features/host/host.ts'
export * from './features/level/level.ts'
export * from './features/net/net.ts'
export * from './features/physics/physics.ts'
export * from './features/saves/saves.ts'
export * from './features/sim/sim.ts'
// The framework's own Zod: a game writes its save's, commands' and settings' schemas with it, so it needs no Zod of its
// own, and there is one copy of the library to check them all (AutomataFrameworkExamples may import only the framework).
export { z } from './lib/zod.ts'
