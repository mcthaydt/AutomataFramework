// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/version.test.ts
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { FRAMEWORK_VERSION } from '#src/features/sim/version.ts'

// `FRAMEWORK_VERSION` is a constant, not a build-time define, so a replay recorded from source carries the real
// version; a release that changes package.json's version has to change the constant with it, and this says so.
test('FRAMEWORK_VERSION is the version in package.json', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as {
    version: string
  }
  expect(FRAMEWORK_VERSION).toBe(manifest.version)
})
