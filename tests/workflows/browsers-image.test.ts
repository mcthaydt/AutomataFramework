import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// A job that drives a browser and runs in a container runs in Playwright's own image for the lockfile's version, pinned
// by digest, which already holds the browsers and the system libraries they need, so it installs none of them from the
// runner's package mirror (whose slow days hung `install-deps` until the job's timeout). These read the workflow's text,
// since the jobs only run on GitHub.
const ci = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8')
const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  devDependencies: Record<string, string>
}
const jobs = ci.slice(ci.indexOf('\njobs:'))
/** One job's text, from its name to the next job's. */
function job(name: string): string {
  const start = jobs.indexOf(`\n  ${name}:`)
  expect(start, `${name} is a job`).toBeGreaterThan(-1)
  const next = jobs.slice(start + 1).search(/\n {2}[a-z-]+:\n/)
  return next === -1 ? jobs.slice(start) : jobs.slice(start, start + 1 + next)
}
const playwright = manifest.devDependencies.playwright
const image = new RegExp(
  `\\n {4}container:\\n {6}image: mcr\\.microsoft\\.com/playwright:v${playwright?.replaceAll('.', '\\.')}-noble@sha256:[0-9a-f]{64}\\n {6}options: --user 1001\\n`,
)

test('the lockfile pins one exact Playwright, which the image tag names', () => {
  expect(playwright).toMatch(/^\d+\.\d+\.\d+$/)
})

test.each(['browsers', 'online', 'create-play'])(
  '%s, when it runs in a container, runs in the Playwright image pinned by digest and installs no browser',
  (name) => {
    const text = job(name)
    if (!/\n {4}container:/.test(text)) return
    expect(text).toMatch(image)
    // A plain failure if the lockfile's Playwright and the image's ever part.
    expect(text).toContain(`test "$(pnpm exec playwright --version)" = "Version ${playwright}"`)
    const commands = text.split('\n').filter((line) => !line.trim().startsWith('#'))
    expect(commands.filter((line) => /playwright install|install-deps/.test(line))).toEqual([])
  },
)
