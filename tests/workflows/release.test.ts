import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// Releases are big and few (the Owner, 2026-11-13), so the release starts only by hand, from `main`, and only for a
// commit whose `ci` run on `main` passed. These checks read the workflow's text because the workflow itself can only
// run on GitHub.
const release = readFileSync(new URL('../../.github/workflows/release.yml', import.meta.url), 'utf8')
const triggers = release.slice(release.indexOf('\non:'), release.indexOf('\npermissions:'))

test('the release starts only by hand: never on a push or when ci finishes', () => {
  expect(triggers).toMatch(/^ {2}workflow_dispatch:/m)
  expect(triggers.match(/^ {2}\w+:/gm)).toEqual(['  workflow_dispatch:'])
  expect(release).not.toContain('workflow_run')
})

test('a manual start must be on main', () => {
  expect(release).toContain("if: github.ref == 'refs/heads/main'")
})

test('the job stops unless ci passed for a push of this commit to main, before anything is built', () => {
  const gate = release.indexOf('gh run list --workflow ci --branch main --event push --commit "$GITHUB_SHA"')
  expect(gate).toBeGreaterThan(-1)
  expect(release).toContain('if [ "$conclusion" != "success" ]; then')
  expect(gate).toBeLessThan(release.indexOf('pnpm build'))
  expect(release).toMatch(/^ {2}actions: read$/m)
})
