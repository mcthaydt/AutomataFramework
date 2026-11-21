// Tries every route a session can open, ready, reopen or merge a pull request through, and checks the rule
// hooks judge each one. Run: node --test .claude/hooks/rules.test.mjs. It builds a throwaway repo with this
// folder's rules.mjs and rules.json, and a stand-in `gh` that answers from a table and logs every call.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const sh = (cmd, cwd) => {
  const r = spawnSync('sh', ['-c', cmd], { cwd, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  return r.stdout.trim()
}

// A parent folder holding two repos (as a cloud session sees them), each with the hooks.
const top = mkdtempSync(join(tmpdir(), 'rules-test-'))
const makeRepo = (dir, slug) => {
  mkdirSync(join(dir, '.claude', 'hooks'), { recursive: true })
  cpSync(join(here, 'rules.mjs'), join(dir, '.claude', 'hooks', 'rules.mjs'))
  const config = JSON.parse(readFileSync(join(here, 'rules.json'), 'utf8'))
  config.repo = slug
  writeFileSync(join(dir, '.claude', 'hooks', 'rules.json'), JSON.stringify(config))
  writeFileSync(
    join(dir, 'CLAUDE.md'),
    '- **Identity.** Every commit is authored by T <t@example.com> (author and committer). Pull requests end with "Requested by **T**".\n',
  )
  sh(
    [
      'git init -q -b main',
      'git config user.name T',
      'git config user.email t@example.com',
      'git add -A',
      'git commit -qm start',
      `git remote add origin https://github.com/${slug}.git`,
      'git update-ref refs/remotes/origin/main HEAD',
      'git checkout -qb feature',
      'mkdir -p src',
      'echo x > src/a.ts',
      'git add -A',
      'git commit -qm code',
    ].join(' && '),
    dir,
  )
}
const repo = join(top, 'one')
const other = join(top, 'two')
mkdirSync(repo)
mkdirSync(other)
makeRepo(repo, 'mcthaydt/One')
makeRepo(other, 'mcthaydt/Two')

// The stand-in gh: GH_TABLE maps a path to JSON (or to "fail"); every call is logged to GH_LOG.
const bin = join(top, 'bin')
mkdirSync(bin)
writeFileSync(
  join(bin, 'gh'),
  `#!/usr/bin/env node
const fs = require('fs')
const args = process.argv.slice(2)
fs.appendFileSync(process.env.GH_LOG, JSON.stringify(args) + '\\n')
const table = JSON.parse(fs.readFileSync(process.env.GH_TABLE, 'utf8'))
const path = args.find((a, i) => i > 0 && !a.startsWith('-') && args[i - 1] !== '--jq' && args[i - 1] !== '-f' && args[i - 1] !== '-X') ?? ''
const key = Object.keys(table).find((k) => path === k || path.split('?')[0] === k)
if (!key || table[key] === 'fail') { process.stderr.write('HTTP 404: Not Found'); process.exit(1) }
let out = table[key]
const jq = args[args.indexOf('--jq') + 1]
if (args.includes('--jq') && jq === '.[].filename') out = out.map((f) => f.filename).join('\\n')
else if (args.includes('--jq')) out = out.map((o) => JSON.stringify({ number: o.number })).join('\\n')
else out = JSON.stringify(out)
process.stdout.write(out + '\\n')
`,
)
chmodSync(join(bin, 'gh'), 0o755)

const body = (extra = '') =>
  `## Lane\n\nLane 1.\n\n## Acceptance criteria\n\n- it works\n${extra}\nRequested by **T**`
const open = (n) => Array.from({ length: n }, (_, i) => ({ number: 100 + i }))
const baseTable = (openCount) => ({
  'repos/mcthaydt/One/pulls': open(openCount),
  'repos/mcthaydt/Two/pulls': open(openCount),
  'repos/mcthaydt/One': { private: false },
  'repos/mcthaydt/One/pulls/7': { number: 7, state: 'closed', head: { ref: 'feature', sha: 'abc1234' } },
})

function hook(event, input, { cwd = repo, project = repo, table = baseTable(0), env = {} } = {}) {
  const tablePath = join(top, `table-${Math.random()}.json`)
  writeFileSync(tablePath, JSON.stringify(table))
  const log = join(top, `log-${Math.random()}.txt`)
  writeFileSync(log, '')
  const script =
    project === repo
      ? join(repo, '.claude', 'hooks', 'rules.mjs')
      : join(repo, '.claude', 'hooks', 'rules.mjs')
  const args = project === repo ? [script] : [script, '--find-repo']
  const r = spawnSync('node', args, {
    input: JSON.stringify({ hook_event_name: event, session_id: 't', cwd, ...input }),
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
      PATH: `${bin}:${process.env.PATH}`,
      GH_TABLE: tablePath,
      GH_LOG: log,
      CLAUDE_PROJECT_DIR: project,
    },
  })
  const out = r.stdout.trim() ? JSON.parse(r.stdout.trim().split('\n').at(-1)) : null
  const calls = readFileSync(log, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l))
  return {
    out,
    calls,
    denied: out?.hookSpecificOutput?.permissionDecision === 'deny',
    reason: out?.hookSpecificOutput?.permissionDecisionReason ?? '',
  }
}
const bash = (command, opts) => hook('PreToolUse', { tool_name: 'Bash', tool_input: { command } }, opts)
const mcp = (name, input, opts) => hook('PreToolUse', { tool_name: name, tool_input: input }, opts)
const writeJson = (name, value) => {
  const path = join(repo, name)
  writeFileSync(path, JSON.stringify(value))
  return name
}

test('gh api POST .../pulls is judged like gh pr create: lane, draft and the open limit', () => {
  const noLane = writeJson('b1.json', {
    title: 't',
    head: 'feature',
    base: 'main',
    draft: true,
    body: 'Hi\n\nRequested by **T**',
  })
  assert.match(
    bash(`gh api -X POST repos/mcthaydt/One/pulls --input ${noLane}`).reason,
    /names no lane|Requested by/,
  )
  const good = writeJson('b2.json', { title: 't', head: 'feature', base: 'main', draft: true, body: body() })
  assert.equal(bash(`gh api -X POST repos/mcthaydt/One/pulls --input ${good}`).denied, false)
  assert.match(
    bash(`gh api -X POST repos/mcthaydt/One/pulls --input ${good}`, { table: baseTable(3) }).reason,
    /3 at most/,
  )
  const ready = writeJson('b3.json', { title: 't', head: 'feature', base: 'main', body: body() })
  assert.match(bash(`gh api -X POST repos/mcthaydt/One/pulls --input ${ready}`).reason, /opened ready/)
  assert.match(
    bash(`gh api repos/mcthaydt/One/pulls -f title=t -f head=feature -f base=main -F draft=true -f body=Hi`)
      .reason,
    /names no lane|Requested by/,
  )
})

test('the open limit fails closed when the open list cannot be read', () => {
  const good = writeJson('b4.json', { title: 't', head: 'feature', base: 'main', draft: true, body: body() })
  const table = { ...baseTable(0), 'repos/mcthaydt/One/pulls': 'fail' }
  assert.match(
    bash(`gh api -X POST repos/mcthaydt/One/pulls --input ${good}`, { table }).reason,
    /could not be read/,
  )
})

test('a body the hook cannot read before the call is refused, not waved through', () => {
  assert.match(bash('gh pr create --draft --title t --body "$(make-body)"').reason, /cannot be read/)
  assert.match(bash('gh pr create --draft --title t --body-file missing.md').reason, /cannot be read/)
  assert.match(
    bash('make-json | gh api -X POST repos/mcthaydt/One/pulls --input -').reason,
    /could not be read as JSON|cannot be read/,
  )
  const quoted = bash(
    `gh api -X POST repos/mcthaydt/One/pulls --input - <<'EOF'\n${JSON.stringify({ title: 't', head: 'feature', base: 'main', draft: true, body: body('Uses `code` and $HOME.') })}\nEOF`,
  )
  assert.equal(quoted.denied, false, quoted.reason)
})

test('reopening counts against the open limit on every route', () => {
  const table = baseTable(3)
  assert.match(bash('gh pr reopen 7', { table }).reason, /3 at most/)
  assert.match(
    bash('gh api -X PATCH repos/mcthaydt/One/pulls/7 -f state=open', { table }).reason,
    /3 at most/,
  )
  assert.match(
    mcp(
      'mcp__github__update_pull_request',
      { owner: 'mcthaydt', repo: 'One', pullNumber: 7, state: 'open' },
      { table },
    ).reason,
    /3 at most/,
  )
  assert.equal(bash('gh pr reopen 7', { table: baseTable(1) }).denied, false)
})

test('the GitHub MCP create tool is held to the same limit', () => {
  const input = {
    owner: 'mcthaydt',
    repo: 'One',
    title: 't',
    head: 'feature',
    base: 'main',
    draft: true,
    body: body(),
  }
  assert.equal(mcp('mcp__github__create_pull_request', input).denied, false)
  assert.match(mcp('mcp__github__create_pull_request', input, { table: baseTable(3) }).reason, /3 at most/)
})

test('a call that names another repo is judged by that repo, even from a folder that is no repo', () => {
  const good = writeJson('b5.json', { title: 't', head: 'feature', base: 'main', draft: true, body: body() })
  const fromTop = bash(`gh api -X POST repos/mcthaydt/Two/pulls --input ${join(repo, good)}`, {
    cwd: top,
    project: top,
    table: baseTable(3),
  })
  assert.match(fromTop.reason, /3 at most/)
  const ghR = bash(`gh pr create -R mcthaydt/Two --draft --title t --body-file ${join(repo, 'missing.md')}`, {
    cwd: top,
    project: top,
  })
  assert.match(ghR.reason, /cannot be read/)
  const noClone = bash(`gh api -X POST repos/mcthaydt/Three/pulls --input ${join(repo, good)}`, { cwd: repo })
  assert.match(noClone.reason, /no checkout here/)
  assert.match(
    mcp('mcp__github__merge_pull_request', {
      owner: 'mcthaydt',
      repo: 'Three',
      pullNumber: 1,
      merge_method: 'merge',
    }).reason,
    /no checkout here/,
  )
})

test('routes the hooks cannot read are refused: raw HTTP, scripts, aliases, extensions, GraphQL', () => {
  assert.match(
    bash('curl -X POST https://api.github.com/repos/mcthaydt/One/pulls -d @b.json').reason,
    /curl writes/,
  )
  assert.match(
    bash('curl https://api.github.com/repos/mcthaydt/One/pulls --json \'{"a":1}\'').reason,
    /curl writes/,
  )
  assert.match(
    bash('wget --post-data=x https://api.github.com/repos/mcthaydt/One/pulls').reason,
    /wget writes/,
  )
  assert.match(
    bash(`node -e "fetch('https://api.github.com/repos/mcthaydt/One/pulls', { method: 'POST' })"`).reason,
    /writes to the GitHub API/,
  )
  assert.match(
    bash(`python3 -c "import requests; requests.post('https://api.github.com/repos/x/y/pulls')"`).reason,
    /writes to the GitHub API|POST/,
  )
  writeFileSync(
    join(repo, 'open.mjs'),
    "import { execFileSync } from 'node:child_process'\nexecFileSync('gh', ['pr', 'create', '--fill'])\n",
  )
  assert.match(bash('node open.mjs').reason, /calls gh/)
  assert.match(bash('gh alias set pc "pr create"').reason, /gh alias/)
  assert.match(bash('gh pc --draft').reason, /alias or extension/)
  assert.match(bash('gh extension install someone/gh-thing').reason, /gh extension/)
  assert.match(bash('git -c alias.p=push p origin feature').reason, /alias/)
  assert.match(bash("git config alias.p '!gh api -X POST repos/o/r/pulls'").reason, /alias/)
  assert.match(
    bash(`gh api graphql -f query='mutation { mergePullRequest(input: {}) { clientMutationId } }'`).reason,
    /GraphQL mutation/,
  )
})

test('a shell script file is read, so a call inside it is judged', () => {
  writeFileSync(
    join(repo, 'open.sh'),
    'gh api -X POST repos/mcthaydt/One/pulls -F draft=true -f body=Hi -f head=feature\n',
  )
  assert.match(bash('bash open.sh').reason, /names no lane|Requested by/)
  assert.match(bash('sh ./open.sh').reason, /names no lane|Requested by/)
})

test('reads stay allowed', () => {
  for (const c of [
    'gh api repos/mcthaydt/One/pulls',
    'curl -s https://api.github.com/repos/mcthaydt/One/pulls',
    'gh pr list',
    'gh alias list',
    'node --check .claude/hooks/rules.mjs',
    'node .claude/hooks/rules.mjs --check',
    'git config --get alias.p',
  ])
    assert.equal(bash(c).denied, false, `${c}: ${bash(c).reason}`)
})

test('a broken rules.json or a crash fails closed for GitHub writes only', () => {
  const broken = join(top, 'broken')
  mkdirSync(join(broken, '.claude', 'hooks'), { recursive: true })
  cpSync(join(here, 'rules.mjs'), join(broken, '.claude', 'hooks', 'rules.mjs'))
  writeFileSync(join(broken, '.claude', 'hooks', 'rules.json'), '{ not json')
  const run = (command) =>
    spawnSync('node', [join(broken, '.claude', 'hooks', 'rules.mjs')], {
      input: JSON.stringify({
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command },
        cwd: broken,
      }),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: broken },
    }).stdout
  assert.match(run('git push origin feature'), /fail closed/)
  assert.doesNotMatch(run('ls'), /deny/)
})

test('on GitHub, --github-pr sets the pr-rules status and closes a pull request opened past the limit', () => {
  const pr = (n, extra = {}) => ({
    number: n,
    state: 'open',
    draft: true,
    body: body(),
    head: { ref: 'feature', sha: 'abc1234def' },
    ...extra,
  })
  const table = {
    'repos/mcthaydt/One/pulls/104': pr(104),
    'repos/mcthaydt/One/pulls/104/files': [{ filename: 'src/a.ts' }],
    'repos/mcthaydt/One/pulls': open(5),
    'repos/mcthaydt/One/statuses/abc1234def': {},
    'repos/mcthaydt/One/issues/104/comments': {},
    ...Object.fromEntries(
      [100, 101, 102, 103].map((n) => [`repos/mcthaydt/One/pulls/${n}/files`, [{ filename: 'src/b.ts' }]]),
    ),
  }
  const env = { GITHUB_REPOSITORY: 'mcthaydt/One', PR_NUMBER: '104', PR_ACTION: 'opened' }
  const tablePath = join(top, 'gh-table.json')
  writeFileSync(tablePath, JSON.stringify(table))
  const log = join(top, 'gh-log.txt')
  writeFileSync(log, '')
  const r = spawnSync('node', [join(repo, '.claude', 'hooks', 'rules.mjs'), '--github-pr'], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, ...env, PATH: `${bin}:${process.env.PATH}`, GH_TABLE: tablePath, GH_LOG: log },
  })
  assert.equal(r.status, 1, r.stdout + r.stderr)
  const calls = readFileSync(log, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l))
  assert.ok(
    calls.some(
      (c) =>
        c.includes('repos/mcthaydt/One/statuses/abc1234def') &&
        c.includes('state=failure') &&
        c.includes('context=pr-rules'),
    ),
  )
  assert.ok(calls.some((c) => c.includes('repos/mcthaydt/One/pulls/104') && c.includes('state=closed')))

  writeFileSync(
    tablePath,
    JSON.stringify({ ...table, 'repos/mcthaydt/One/pulls': open(2).concat([{ number: 104 }]) }),
  )
  writeFileSync(log, '')
  const ok = spawnSync('node', [join(repo, '.claude', 'hooks', 'rules.mjs'), '--github-pr'], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, ...env, PATH: `${bin}:${process.env.PATH}`, GH_TABLE: tablePath, GH_LOG: log },
  })
  assert.equal(ok.status, 0, ok.stdout + ok.stderr)
  assert.ok(readFileSync(log, 'utf8').includes('state=success'))
})

test('audit 1: a query string, a variable or a config file cannot hide the route', () => {
  const good = writeJson('b6.json', { title: 't', head: 'feature', base: 'main', draft: true, body: body() })
  const table = baseTable(3)
  assert.match(
    bash(`gh api -X POST 'repos/mcthaydt/One/pulls?x=1' --input ${good}`, { table }).reason,
    /3 at most/,
  )
  assert.match(
    bash(`gh api -X PUT 'repos/mcthaydt/One/pulls/230/merge?a=1' -f merge_method=squash`).reason,
    /squash|merge_method/,
  )
  assert.match(
    bash(`gh api -X PATCH 'repos/mcthaydt/One/pulls/7?' -f state=open`, { table }).reason,
    /3 at most/,
  )
  assert.match(
    bash(`gh api -X POST '/repos//mcthaydt/One/pulls#x' --input ${good}`, { table }).reason,
    /3 at most/,
  )
  assert.match(bash(`P=repos/mcthaydt/One/pulls; gh api -X POST $P --input ${good}`).reason, /cannot read/)
  assert.match(
    bash('U=https://api.github.com/repos/o/r/pulls; curl -X POST "$U" -d @b.json').reason,
    /curl writes/,
  )
  assert.match(bash('curl -K /tmp/cfg -X POST').reason, /curl writes/)
  assert.equal(bash('curl -s -H "Authorization: Bearer $T" https://example.com/x').denied, false)
})

test('audit 1: checks, protection, settings and API commits are refused', () => {
  for (const c of [
    'gh api -X POST repos/mcthaydt/One/statuses/abc -f state=success -f context=pr-rules',
    'gh api -X POST repos/mcthaydt/One/check-runs -f name=gate',
    'gh api -X DELETE repos/mcthaydt/One/branches/main/protection',
    'gh api -X DELETE repos/mcthaydt/One/branches/main/protection/enforce_admins',
    'gh api -X PATCH repos/mcthaydt/One -F allow_squash_merge=true',
    'gh api -X PUT repos/mcthaydt/One/contents/README.md -f message=x -f content=eA== -f branch=b',
    'gh api -X POST repos/mcthaydt/One/git/commits -f message=x',
    'gh api -X PATCH repos/mcthaydt/One/git/refs/heads/b -f sha=abc',
    'gh repo edit --enable-squash-merge',
    'gh pr update-branch 7',
  ])
    assert.equal(bash(c).denied, true, c)
  for (const c of [
    'gh api -X POST repos/mcthaydt/One/issues/7/comments -f body=hi',
    'gh api -X POST repos/mcthaydt/One/pulls/7/requested_reviewers -f "reviewers[]=x"',
  ])
    assert.equal(bash(c).denied, false, `${c}: ${bash(c).reason}`)
})

test('audit 1: reopening through the issues API counts against the limit', () => {
  const table = {
    ...baseTable(3),
    'repos/mcthaydt/One/issues/7': { number: 7, state: 'closed', pull_request: {} },
  }
  assert.match(
    bash('gh api -X PATCH repos/mcthaydt/One/issues/7 -f state=open', { table }).reason,
    /3 at most/,
  )
  assert.match(bash('gh issue reopen 7', { table }).reason, /3 at most/)
  assert.match(
    mcp(
      'mcp__github__issue_write',
      { method: 'update', owner: 'mcthaydt', repo: 'One', issue_number: 7, state: 'open' },
      { table },
    ).reason,
    /3 at most/,
  )
  assert.equal(
    bash('gh api -X PATCH repos/mcthaydt/One/issues/7 -f state=open', {
      table: { ...table, 'repos/mcthaydt/One/pulls': open(1) },
    }).denied,
    false,
  )
})

test('audit 1: a positional parameter in the path is unknown too', () => {
  assert.match(bash('gh api -X PATCH repos/mcthaydt/$1/pulls/$2 --input x.json').reason, /cannot read/)
})

test('audit 2: gh that the shell builds, wraps or feeds in is refused', () => {
  const del = 'gh api -X DELETE repos/mcthaydt/One/branches/main/protection'
  writeFileSync(join(repo, 'y.sh'), `${del}\n`)
  for (const c of [
    'GH=gh; $GH api -X DELETE repos/mcthaydt/One/branches/main/protection',
    '$(echo gh) api -X DELETE repos/mcthaydt/One/branches/main/protection',
    `f(){ gh "$@"; }; f api -X DELETE repos/mcthaydt/One/branches/main/protection`,
    `function f { gh "$@"; }; f api -X DELETE repos/mcthaydt/One/branches/main/protection`,
    `echo '${del}' | bash`,
    `printf '%s\\n' '${del}' | sh`,
    `bash -s <<'EOS'\n${del}\nEOS`,
    `bash <<'EOS'\n${del}\nEOS`,
    `source <(echo '${del}')`,
    `echo '${del}' > z.sh && bash z.sh`,
    'bash y.sh',
    `python3 -c 'import subprocess; subprocess.run(["gh","api","-X","DELETE","repos/mcthaydt/One/branches/main/protection"])'`,
    `python3 - <<'EOS'\nimport subprocess\nsubprocess.run(["gh", "api", "-X", "DELETE", "repos/mcthaydt/One/branches/main/protection"])\nEOS`,
    `find . -maxdepth 0 -exec gh api -X DELETE repos/mcthaydt/One/branches/main/protection ;`,
  ])
    assert.equal(bash(c).denied, true, c)
})

test("audit 2: workflow runs and releases are the owner's", () => {
  for (const c of ['gh workflow run release.yml', 'gh release create v9.9.9', 'gh release delete v1.0.0'])
    assert.equal(bash(c).denied, true, c)
  assert.equal(
    mcp('mcp__github__actions_run_trigger', {
      method: 'run_workflow',
      owner: 'mcthaydt',
      repo: 'One',
      workflow_id: 'release.yml',
      ref: 'main',
    }).denied,
    true,
  )
  assert.equal(
    mcp('mcp__github__actions_run_trigger', {
      method: 'rerun_workflow_run',
      owner: 'mcthaydt',
      repo: 'One',
      run_id: 1,
    }).denied,
    false,
  )
  for (const c of [
    'gh run rerun 123 --failed',
    'gh workflow list',
    'gh release list',
    `bash -s <<'EOS'\necho hi\nEOS`,
    `cat <<'EOS' > notes.txt\ngh api -X DELETE x\nEOS`,
    'find . -maxdepth 1 -name "*.md" -exec cat {} ;',
    'echo hi | sh -c "cat"',
    'npx -y @biomejs/biome@2.5.15 check --write x.mjs',
    'pnpm dlx @scope/tool@1.0.0 --help',
  ])
    assert.equal(bash(c).denied, false, `${c}: ${bash(c).reason}`)
})
