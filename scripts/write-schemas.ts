// Writes `schemas/<type>.schema.json`, the JSON Schema of each content file, so an agent or an editor can read the
// format without running anything. `--check` writes nothing and fails if a committed file is not what the code makes.
import { readFileSync, writeFileSync } from 'node:fs'
import { CONTENT_TYPES, type ContentType, jsonSchemaFor } from '../src/features/content/content.ts'

const check = process.argv.includes('--check')
const dir = new URL('../schemas/', import.meta.url)
const stale: { name: string; text: string }[] = []

for (const type of Object.keys(CONTENT_TYPES) as ContentType[]) {
  const file = new URL(`${type}.schema.json`, dir)
  const text = `${JSON.stringify(jsonSchemaFor(type), null, 2)}\n`
  if (!check) writeFileSync(file, text)
  else if (readFileSync(file, 'utf8') !== text) stale.push({ name: `schemas/${type}.schema.json`, text })
}

if (stale.length > 0) {
  console.error(
    `These schemas do not match the code. Run \`pnpm schemas\` and commit them:\n${stale.map((s) => s.name).join('\n')}`,
  )
  // A run in CI is the only place some people can see the fix, so the check says it in full.
  for (const { name, text } of stale)
    console.error(`\n----- ${name}, as the code makes it -----\n${text}----- end of ${name} -----`)
  process.exitCode = 1
}
