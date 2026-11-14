// The one way into Zod. A game on itch or Wavedash runs under a CSP with no 'unsafe-eval'. Zod would otherwise probe
// whether it may compile its validators with `new Function`, and a strict CSP reports even that caught attempt as a
// security-policy violation (Firefox logs it in the console). The probe runs the first time a schema is built, and the
// framework's modules build schemas as they load, so the switch has to be set before any of them runs.
//
// Every file that names Zod imports it from here (a rule in tests/architecture/rules.ts holds them to it). An ES
// module's imports all run before its own body, so this module has run before the first schema of any file that
// imports it, in whatever chunk a bundler puts them: an entry's own first import is not enough, because a bundler that
// splits our source may run a chunk with the schemas ahead of the entry's. `render/stage.ts` does the same for Pixi, the
// other half of the no-eval promise.
import { config, z } from 'zod'

config({ jitless: true })

export { z }
