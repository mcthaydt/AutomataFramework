// Makes the packed declarations load anywhere. `tsc` writes `from './x.ts'` into a `.d.ts` as it was written in the
// source, and a program that reads the package with NodeNext resolution (or an older TypeScript) wants `./x.js`. The
// build runs this last, over every `dist/**/*.d.ts`.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Turns a relative specifier that ends `.ts` into one that ends `.js`, in `from '...'`, `import('...')` and
 * `import '...'`, and changes nothing else: not a package name (`pixi.js`), not a `.d.ts` and not a `.json`.
 */
export function fixDts(text: string): string {
  return text.replace(
    /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"\n]*?)(?<!\.d)\.ts\2/g,
    (_all, before: string, quote: string, path: string) => `${before}${quote}${path}.js${quote}`,
  )
}

/** Every `.d.ts` file under `dir`, with its path. */
function declarationsIn(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.d.ts'))
    .map((name) => join(dir, name))
}

// Run only when started from the command line, not when a test imports `fixDts`.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const file of declarationsIn(fileURLToPath(new URL('../dist/', import.meta.url)))) {
    const before = readFileSync(file, 'utf8')
    const after = fixDts(before)
    if (after !== before) writeFileSync(file, after)
  }
}
