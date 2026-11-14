// What the packed package holds: the command, the template (with its dot files, which packers treat specially), the
// skills and the API report, and nothing the template must not carry. Usage: node tarball.mjs <package>.tgz
import { execFileSync } from 'node:child_process'

const tarball = process.argv[2]
if (tarball === undefined) {
  console.error('Usage: node tarball.mjs <package>.tgz')
  process.exit(2)
}
const names = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
  .split('\n')
  .filter((name) => name !== '')
  .map((name) => name.replace(/^package\//, ''))

const wanted = [
  'dist/cli.js',
  'template/gitignore',
  'template/package.template.json',
  'template/biome.template.json',
  'template/.mcp.json',
  'template/.github/workflows/check.yml',
  'template/replays/level-1.json',
  'skills/automata/SKILL.md',
  'skills/automata-content/SKILL.md',
  'skills/automata-rules/SKILL.md',
  'skills/automata-api/SKILL.md',
  'docs/api/framework.api.md',
]
const unwanted = names.filter(
  (name) => name.startsWith('template/node_modules') || /^template\/.*\.png$/.test(name),
)
const missing = wanted.filter((name) => !names.includes(name))
if (missing.length > 0 || unwanted.length > 0) {
  console.error(
    `The packed package is not right. Missing: ${missing.join(', ') || 'nothing'}. Not wanted: ${unwanted.join(', ') || 'nothing'}.`,
  )
  process.exit(1)
}
console.log(
  `The packed package has all ${wanted.length} files that a new game needs, and nothing it must not.`,
)
