// Usage: pnpm api-report [--update]
// The public API as a committed Markdown file, `docs/api/framework.api.md`. Without `--update` it fails if the file
// is not what the source makes, so a change to the API shows up in a pull request's diff and cannot slip through.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { extractApi } from './api-report/extract.ts'
import { renderReport } from './api-report/report.ts'

/**
 * What to change in `before` to make `after`, one line each: `line N: - text` takes old line N out, and
 * `after line N: + text` puts a line in after old line N. It is printed when the report is out of date, so a change to
 * the API can be carried over from the CI log without running anything here.
 */
function edits(before: readonly string[], after: readonly string[]): string[] {
  let start = 0
  while (start < before.length && start < after.length && before[start] === after[start]) start++
  let endBefore = before.length
  let endAfter = after.length
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore--
    endAfter--
  }
  const a = before.slice(start, endBefore)
  const b = after.slice(start, endAfter)
  // `common(i, j)` is how many lines a[i..] and b[j..] have in common, in order.
  const width = b.length + 1
  const table = new Uint16Array((a.length + 1) * width)
  const common = (i: number, j: number): number => table[i * width + j] ?? 0
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * width + j] =
        a[i] === b[j] ? common(i + 1, j + 1) + 1 : Math.max(common(i + 1, j), common(i, j + 1))
    }
  }
  const out: string[] = []
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    const insert = j < b.length && (i === a.length || common(i, j + 1) >= common(i + 1, j))
    if (i < a.length && j < b.length && a[i] === b[j]) {
      i++
      j++
    } else if (insert) {
      out.push(`after line ${start + i}: + ${b[j]}`)
      j++
    } else {
      out.push(`line ${start + i + 1}: - ${a[i]}`)
      i++
    }
  }
  return out
}

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
      { entryPoint: './server', file: `${root}src/server.ts` },
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
  console.error(edits(readFileSync(REPORT, 'utf8').split('\n'), text.split('\n')).join('\n'))
  process.exitCode = 1
}
