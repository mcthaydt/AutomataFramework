// The headless entry: everything that runs without a page (sim, physics, commands, net, content, level, audio, saves,
// host). Audio is here because a game's sound is a plain object over a `Speaker`: a test or a Node script can build one
// with `testSpeaker`; the browser's speaker and the button are the page's (`web`).
// Safe in Node and in an editor that only validates. Features are re-exported here as they arrive.

// First, before any module below builds a schema: see lib/zod.ts.
import './lib/zod.ts'

export * from './features/audio/audio.ts'
export * from './features/commands/commands.ts'
export * from './features/content/content.ts'
export * from './features/host/host.ts'
export * from './features/level/level.ts'
export * from './features/net/net.ts'
export * from './features/physics/physics.ts'
export * from './features/saves/saves.ts'
export * from './features/sim/sim.ts'
// The PNG writer: a figure or a backdrop is painted into one, and a game or an editor may write a picture of its own.
export { encodePng, type IndexedPicture } from './lib/png.ts'
// The framework's own Zod: a game writes its save's, commands' and settings' schemas with it, so it needs no Zod of its
// own, and there is one copy of the library to check them all (AutomataFrameworkExamples may import only the framework).
export { z } from './lib/zod.ts'
