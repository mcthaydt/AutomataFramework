import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// Until Release 1 a game gets this package as a git dependency pinned to a commit on `main`, not from npm. `dist/` is
// not committed, so the package manager has to build it on install, and it only does that for a package with a
// `prepare` script. Without the script the install succeeds and both entry points point at files that are not there.
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  scripts: Record<string, string>
  files: string[]
  exports: Record<string, { import?: string } | string>
}

test('a git install builds the package: prepare runs the build', () => {
  expect(manifest.scripts.prepare).toBe('pnpm build')
})

test('what the build writes is what the package ships and points at', () => {
  expect(manifest.files).toContain('dist')
  expect(manifest.exports['.']).toMatchObject({ import: './dist/index.js' })
  expect(manifest.exports['./headless']).toMatchObject({ import: './dist/headless.js' })
})
