// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/version.test.ts
import { expect, test } from 'vitest'
import { FRAMEWORK_VERSION } from '#src/features/sim/version.ts'

// Until the release task sets package.json to 0.1.0 the version is pinned literally; then this compares the two.
test('FRAMEWORK_VERSION is 0.1.0', () => {
  expect(FRAMEWORK_VERSION).toBe('0.1.0')
})
