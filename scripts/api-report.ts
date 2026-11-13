// Usage: pnpm api-report [--update]
// The public API as a committed Markdown file, `docs/api/framework.api.md`. Without `--update` it fails if the file
// is not what the source makes, so a change to the API shows up in a pull request's diff and cannot slip through.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { extractApi } from './api-report/extract.ts'
import { renderReport } from './api-report/report.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const REPORT = `${root}docs/api/framework.api.md`
const manifest = JSON.parse(readFileSync(`${root}package.json`, 'utf8')) as { name: string }

// Each `exports` key and the source file that builds it.
const text = renderReport(
  extractApi({
    name: manifest.name,
    dir: root.replace(/\/$/, ''),
    entries: [
      { entryPoint: '.', file: `${root}src/index.ts` },
      { entryPoint: './headless', file: `${root}src/headless.ts` },
    ],
  }),
)

if (process.argv.includes('--update')) {
  writeFileSync(REPORT, text)
  console.log('wrote docs/api/framework.api.md')
} else if (readFileSync(REPORT, 'utf8') !== text) {
  console.error(
    'docs/api/framework.api.md does not match the source. Run `pnpm api-report --update` and review the diff.',
  )
  process.exitCode = 1
}
