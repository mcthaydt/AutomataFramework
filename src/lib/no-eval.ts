// The first thing either entry loads. A game on itch or Wavedash runs under a CSP with no 'unsafe-eval'. Zod would
// otherwise probe whether it may compile its validators with `new Function`, and a strict CSP reports even that caught
// attempt as a security-policy violation (Firefox logs it in the console). The probe runs the first time a schema needs
// it, and the framework's modules build schemas as they load, so this switch has to be set before any of them runs: an
// ES module's imports all run before its own body, so setting it in an entry's body is too late, and it has to be a
// module of its own that the entry imports first. `render/stage.ts` does the same for Pixi, the other half of the
// no-eval promise.
import { config } from 'zod'

config({ jitless: true })
