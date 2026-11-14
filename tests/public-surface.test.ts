// What a game or an editor can rely on finding in the package. Imports the source entries; the packed package is
// checked by tests/install/smoke.mjs in CI.
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { CONTENT_TYPES, type ContentType, jsonSchemaFor } from '#src/headless.ts'

test('headless exports what a game sim and an editor need', async () => {
  const api = await import('#src/headless.ts')
  for (const name of [
    'createSim',
    'definePlugin',
    'defineSystem',
    'defineComponent',
    'defineCommand',
    'physics',
    'Transform',
    'Body',
    'Collider',
    'BodyKind',
    'Player',
    'isHeld',
    'wasPressed',
    'controlsCommand',
    'createRecorder',
    'playReplay',
    'verifyReplay',
    'parseReplay',
    'writeReplay',
    'CONTENT_TYPES',
    'parseContent',
    'writeContent',
    'parseProject',
    'loadGame',
    'formatDiagnostic',
    'jsonSchemaFor',
    'PROJECT_FILE',
    'spawnLevel',
    'createGameSim',
    'levelSize',
    'Look',
    'Thing',
    'joinCommand',
    'leaveCommand',
    'JoinCommand',
    'LeaveCommand',
    'joinPlugin',
    'playersIn',
    'createSequence',
    'PAD_BUTTONS',
    'PAD_STICKS',
    'RESERVED_KEYS',
    'RESERVED_PAD',
    'FRAMEWORK_VERSION',
  ])
    expect(api, name).toHaveProperty(name)
})

test('the committed JSON Schemas are what the code produces', () => {
  for (const type of Object.keys(CONTENT_TYPES) as ContentType[]) {
    const committed = JSON.parse(
      readFileSync(new URL(`../schemas/${type}.schema.json`, import.meta.url), 'utf8'),
    )
    expect(committed, type).toEqual(jsonSchemaFor(type))
  }
})
