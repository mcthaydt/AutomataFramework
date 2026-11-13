import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// The release must start only from a `main` commit whose `ci` run passed; a push trigger would run beside `ci`, so a
// version could reach npm from a commit whose checks then fail. These checks read the workflow's text because the
// workflow itself can only run on GitHub.
const release = readFileSync(new URL('../../.github/workflows/release.yml', import.meta.url), 'utf8')

test('the release starts when the ci run on main finishes, not on a push', () => {
  expect(release).not.toMatch(/^ {2}push:/m)
  expect(release).toMatch(/^ {2}workflow_run:/m)
  expect(release).toMatch(/workflows: \[ci\]/)
  expect(release).toMatch(/types: \[completed\]/)
})

test('the release can be started by hand once the token exists', () => {
  expect(release).toMatch(/^ {2}workflow_dispatch:/m)
})

test('the job runs only after a green ci run of a push to main, and builds that run\'s commit', () => {
  expect(release).toContain("github.event.workflow_run.conclusion == 'success'")
  expect(release).toContain("github.event.workflow_run.event == 'push'")
  expect(release).toContain("github.event.workflow_run.head_branch == 'main'")
  expect(release).toContain('ref: ${{ github.event.workflow_run.head_sha }}')
})
