// The headless entry: everything that runs without a page (sim, physics, commands, content, level).
// Safe in Node and in an editor that only validates. Features are re-exported here as they arrive.

// First, before any module below builds a schema: see lib/no-eval.ts.
import './lib/no-eval.ts'

export * from './features/commands/commands.ts'
export * from './features/content/content.ts'
export * from './features/level/level.ts'
export * from './features/physics/physics.ts'
export * from './features/saves/saves.ts'
export * from './features/sim/sim.ts'
