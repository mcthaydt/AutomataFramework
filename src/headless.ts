// The headless entry: everything that runs without a page (sim, physics, commands, content, level).
// Safe in Node and in an editor that only validates. Features are re-exported here as they arrive.

export * from './features/commands/commands.ts'
export * from './features/content/content.ts'
export * from './features/level/level.ts'
export * from './features/physics/physics.ts'
export * from './features/sim/sim.ts'
