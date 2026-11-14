// Writes `schemas/<type>.schema.json`, the JSON Schema of each content file, so an agent or an editor can read the
// format without running anything. `--check` writes nothing and fails if a committed file is not what the code makes.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { ReplaySchema } from '../src/features/commands/commands.ts'
import { CONTENT_TYPES, type ContentType, jsonSchemaFor } from '../src/features/content/content.ts'
import { z } from '../src/lib/zod.ts'

const check = process.argv.includes('--check')
const dir = new URL('../schemas/', import.meta.url)
const stale: string[] = []

for (const type of Object.keys(CONTENT_TYPES) as ContentType[]) {
  const file = new URL(`${type}.schema.json`, dir)
  const text = `${JSON.stringify(jsonSchemaFor(type), null, 2)}\n`
  if (!check) writeFileSync(file, text)
  else if (readFileSync(file, 'utf8') !== text) stale.push(`schemas/${type}.schema.json`)
}

// The replay file has a schema of its own, beside the content kinds'.
const replayFile = new URL('replay.schema.json', dir)
const replaySchema = { ...z.toJSONSchema(ReplaySchema, { io: 'input' }), title: 'Replay' }
const replayText = `${JSON.stringify(replaySchema, null, 2)}\n`
if (!check) writeFileSync(replayFile, replayText)
else if (!existsSync(replayFile) || readFileSync(replayFile, 'utf8') !== replayText) {
  stale.push('schemas/replay.schema.json')
  console.error(`TEMPORARY, what schemas/replay.schema.json should hold:\n${replayText}`)
}

if (stale.length > 0) {
  console.error(
    `These schemas do not match the code. Run \`pnpm schemas\` and commit them:\n${stale.join('\n')}`,
  )
  process.exitCode = 1
}
