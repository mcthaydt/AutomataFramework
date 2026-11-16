import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// The workflow only runs on GitHub, so these checks read its text. The rules themselves are tested in
// tests/scripts/check-commit-authors.test.ts.
const workflow = readFileSync(new URL('../../.github/workflows/commit-authors.yml', import.meta.url), 'utf8')

test('it runs on every pull request, and again when the title or description changes', () => {
  expect(workflow).toMatch(/^on:\n {2}pull_request:\n {4}types: \[opened, reopened, synchronize, edited\]$/m)
})

test('it can only read, and its one job has the name the branch rules ask for', () => {
  expect(workflow).toMatch(/^permissions:\n {2}contents: read\n {2}pull-requests: read$/m)
  expect(workflow).not.toMatch(/: write/)
  expect(workflow).toMatch(/^jobs:\n {2}commit-authors:$/m)
})

test('every action is pinned to a commit', () => {
  const uses = workflow.split('\n').filter((line) => line.includes('uses:'))
  expect(uses.length).toBeGreaterThan(0)
  for (const line of uses) expect(line, line).toMatch(/uses: \S+@[0-9a-f]{40}(\s|$)/)
})

test('it runs the script with the pull request number and the workflow token, and nothing from the pull request', () => {
  expect(workflow).toContain('- run: node scripts/check-commit-authors.ts')
  expect(workflow).toMatch(/PR_NUMBER: \$\{\{ github\.event\.pull_request\.number \}\}/)
  expect(workflow).toMatch(/GH_TOKEN: \$\{\{ github\.token \}\}/)
  expect(workflow).not.toMatch(/github\.event\.pull_request\.(title|body|head\.ref)/)
})
