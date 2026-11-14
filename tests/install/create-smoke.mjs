// The README's "Start here", run for real on the system CI gives it, with the packed package in place of npm. Usage:
//   node create-smoke.mjs <package>.tgz
// It uses only Node and what it installs, and exits non-zero with a sentence at the first thing that is not so. The
// agent's turn over MCP (the step after "break the rules") joins when the MCP server is built.
import { spawn, spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Worker } from 'node:worker_threads'
import { GAME_FOLDER, PACKAGE_NAME, START_HERE } from './create-commands.ts'

const WINDOWS = process.platform === 'win32'
/** The tarball itself, or the one tarball in a folder (a download's folder). */
function findTarball(given) {
  if (given === undefined) return undefined
  const path = resolve(given)
  if (!existsSync(path)) return undefined
  if (!statSync(path).isDirectory()) return path
  const found = readdirSync(path).find((name) => name.endsWith('.tgz'))
  return found === undefined ? undefined : join(path, found)
}
const tarball = findTarball(process.argv[2])
if (tarball === undefined) {
  console.error('Usage: node create-smoke.mjs <package>.tgz (or the folder that holds it)')
  process.exit(2)
}

/** The word, quoted for the shell this system uses. */
const quoteForWindows = (word) => (/[\s"]/.test(word) ? `"${word.replaceAll('"', '\\"')}"` : word)
const quoteForPosix = (word) => `'${word.replaceAll("'", "'\\''")}'`
const quote = WINDOWS ? quoteForWindows : quoteForPosix
const commandLine = (command, args) => [command, ...args].map(quote).join(' ')
const slashes = (path) => path.replaceAll('\\', '/')
const NO_COLOUR = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }

/** Says what went wrong, with the command's own words, and stops. */
function fail(sentence, output = '') {
  console.error(`\nFAILED: ${sentence}`)
  if (output !== '') console.error(`\n${output.trimEnd().split('\n').slice(-40).join('\n')}`)
  process.exit(1)
}

/** Runs a command to its end in `cwd`; returns its status and everything it said. */
function run(command, args, cwd, env = NO_COLOUR) {
  const line = commandLine(command, args)
  const done = spawnSync(line, { cwd, env, shell: true, encoding: 'utf8', timeout: 900_000 })
  return {
    status: done.status,
    output: `${done.stdout ?? ''}${done.stderr ?? ''}`,
    stdout: done.stdout ?? '',
  }
}

/** Runs it and requires this exit status. Returns what it said. */
function must(what, command, args, cwd, status = 0, env = NO_COLOUR) {
  const done = run(command, args, cwd, env)
  if (done.status !== status)
    fail(`${what}: \`${commandLine(command, args)}\` ended with ${done.status}, not ${status}.`, done.output)
  return done.output
}

const said = (what, output, text) => {
  if (!output.includes(text)) fail(`${what}: the output does not say "${text}".`, output)
}
const step = (what) => console.log(`ok  ${what}`)

// A folder whose name has a space in it, as a person's own often has. The temp folder is named in full: a Windows
// runner's short form (RUNNER~1) is a second name for it, and Vite refuses a file it reaches under the other one.
const work = mkdtempSync(join(realpathSync.native(tmpdir()), 'create smoke '))
const game = join(work, GAME_FOLDER)

// 1. The README's first command, with one swap: the package for the tarball. Nothing else in it is changed.
const [first = '', ...rest] = START_HERE
const [, ...afterPackage] = first.split(' ')
console.log(`The one swap: "${PACKAGE_NAME}" is the tarball ${tarball}.`)
const made = must(
  "the README's first command",
  'npx',
  [
    '--yes',
    '--package',
    tarball,
    'automata',
    ...afterPackage.slice(1),
    '--framework',
    `file:${slashes(tarball)}`,
  ],
  work,
)
said('the new game', made, 'Made my-game.')
said('the new game', made, 'npm run check says whether the game is sound.')
step('create makes a game')

// 2. The README's next commands, as written (but `npm run dev`, which has its own step below).
const checkOf = (what, status = 0, ...args) =>
  must(what, 'npx', ['--no', 'automata', 'check', ...args], game, status)
for (const line of rest.filter((command) => command !== 'npm run dev' && !command.startsWith('cd '))) {
  const [command, ...args] = line.split(' ')
  const output = must(`the README's \`${line}\``, command, args, game)
  if (line === 'npm run check') said('npm run check', output, 'Everything passed.')
}
said('check', checkOf('check'), 'Everything passed.')
step('npm install and npm run check pass in the new game')

// 3. Change a number with the framework's own writer: the check says the content changed, and does not fail.
const levelPath = join(game, 'content', 'levels', 'level-1.json')
const original = readFileSync(levelPath, 'utf8')
const framework = await import(
  pathToFileURL(join(game, 'node_modules', '@automataframework', 'framework', 'dist', 'headless.js')).href
)
const level = JSON.parse(original)
level.things[0].x = 9.5
writeFileSync(levelPath, framework.writeContent('level', level))
said('after a number changed', checkOf('a changed number'), 'content has changed since this was recorded')
step('a changed number is a note, not a failure')

// 4. Accepting records the play again, and the note is gone.
must('npm run accept', 'npm', ['run', 'accept'], game)
const accepted = checkOf('after accept')
said('after accept', accepted, 'Everything passed.')
if (accepted.includes('has changed since'))
  fail('after accept: the check still says the content changed.', accepted)
step('npm run accept ends the note')

// 5. Break a file: the check names the file and the place, and exits with 1.
level.things[0].x = 'far'
writeFileSync(levelPath, `${JSON.stringify(level, null, 2)}\n`)
said(
  'a broken file',
  checkOf('a broken file', 1),
  'content/levels/level-1.json: things[0].x: This must be a number.',
)
level.things[0].x = 9.5
writeFileSync(levelPath, framework.writeContent('level', level))
step('a broken file is named, at its place')

// 6. Break the rules: a game's rules may not roll their own dice.
const movePath = join(game, 'src', 'features', 'hero', 'move.ts')
const move = readFileSync(movePath, 'utf8')
writeFileSync(movePath, `${move}\nexport const luck = Math.random()\n`)
const brokenRun = run('npx', ['--no', 'automata', 'check', '--json'], game)
if (brokenRun.status !== 1) fail('a broken rule: check --json did not exit with 1.', brokenRun.output)
const broken = JSON.parse(brokenRun.stdout)
const rules = broken.steps.find((s) => s.step === 'rules')
if (rules === undefined || !JSON.stringify(rules.problems).includes('Math.random'))
  fail('a broken rule: the rules step does not name Math.random.', JSON.stringify(broken, null, 2))
writeFileSync(movePath, move)
step('a clock or dice in the rules is named')

// 7. An agent plays: a session's Worker, the built file the package ships, spoken to as the MCP server will speak to it.
// The rules are changed in `move.ts` between two sessions, and the second one plays the new rules.
const workerFile = pathToFileURL(
  join(game, 'node_modules', '@automataframework', 'framework', 'dist', 'session-worker.js'),
)
function openSession() {
  const worker = new Worker(workerFile, { workerData: { folder: game } })
  const waiting = new Map()
  let next = 0
  worker.on('message', ({ id, reply }) => {
    waiting.get(id)?.(reply)
    waiting.delete(id)
  })
  worker.on('error', (error) => fail(`a play session's Worker stopped: ${error.message}`))
  const ask = (message) =>
    new Promise((resolve) => {
      waiting.set(next, resolve)
      worker.postMessage({ id: next++, message })
    })
  return { ask, end: () => worker.terminate() }
}
const heroX = (state) => state.things.find((thing) => thing.character === 'hero').x
async function playRight(ticks) {
  const session = openSession()
  const started = await session.ask({ kind: 'start' })
  if (!started.ok) fail(`a play session did not start: ${started.sentence}`)
  const stepped = await session.ask({ kind: 'step', ticks, hold: { 1: ['right'] } })
  if (!stepped.ok) fail(`a play session did not step: ${stepped.sentence}`)
  const recorded = await session.ask({ kind: 'recording' })
  await session.end()
  return { x: heroX(stepped.state), tick: stepped.state.tick, recording: recorded.recording }
}
const ran = await playRight(60)
if (ran.tick !== 60 || !(ran.x > 3)) fail(`a play session: the hero is at ${ran.x} after ${ran.tick} ticks.`)
writeFileSync(join(game, 'replays', 'agent-run.json'), ran.recording)
const replayRun = run('npx', ['--no', 'automata', 'replay', '--json'], game)
if (replayRun.status !== 0) fail('replay of the agent run did not exit with 0.', replayRun.output)
const replayed = replayRun.stdout
const verdicts = JSON.parse(replayed).map((result) => `${result.file}: ${result.verdict}`)
if (!verdicts.includes('replays/agent-run.json: ok') || !verdicts.includes('replays/level-1.json: ok'))
  fail(`replay: the recordings are ${verdicts.join(', ')}.`, replayed)
writeFileSync(movePath, move.replace('const RUN = 6', 'const RUN = 3'))
const slower = await playRight(60)
if (!(slower.x < ran.x))
  fail(`a session after the rules changed still plays the old ones: x ${slower.x}, was ${ran.x}.`)
const diverged = run('npx', ['--no', 'automata', 'replay', 'replays/agent-run.json', '--json'], game)
if (!diverged.output.includes('diverged'))
  fail('replay: the agent run does not say diverged after the rules changed.', diverged.output)
writeFileSync(movePath, move)
rmSync(join(game, 'replays', 'agent-run.json'))
step('an agent plays a session, saves it, and sees the rules change')

// 7b. An agent through `automata mcp`, started the way the game's own `.mcp.json` says, and spoken to with nothing but
// JSON lines. The server is started once and the rules are changed under it: it must answer from the files as they are
// now, never from the rules it saw first (audit C1).
function openMcp() {
  const config = JSON.parse(readFileSync(join(game, '.mcp.json'), 'utf8')).mcpServers.automata
  const child = spawn(config.command, config.args, { cwd: game, stdio: ['pipe', 'pipe', 'pipe'] })
  const waiting = new Map()
  let buffer = ''
  let said = ''
  let next = 1
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', (chunk) => {
    buffer += chunk
    for (let end = buffer.indexOf('\n'); end >= 0; end = buffer.indexOf('\n')) {
      const line = buffer.slice(0, end)
      buffer = buffer.slice(end + 1)
      if (line.trim() === '') continue
      let message
      try {
        message = JSON.parse(line)
      } catch {
        fail(`automata mcp printed a line that is not JSON: ${line}`)
      }
      waiting.get(message.id)?.(message)
      waiting.delete(message.id)
    }
  })
  child.stderr.on('data', (chunk) => {
    said += chunk
  })
  child.on('error', (error) => fail(`automata mcp could not be started: ${error.message}`))
  const send = (message) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`)
  const request = (method, params) =>
    new Promise((resolve) => {
      const id = next++
      const timer = setTimeout(
        () => fail(`automata mcp did not answer ${method} in two minutes.`, said),
        120_000,
      )
      waiting.set(id, (reply) => {
        clearTimeout(timer)
        resolve(reply)
      })
      send({ id, method, params })
    })
  const tool = async (name, args) => {
    const reply = await request('tools/call', { name, arguments: args })
    if (reply.error) fail(`automata mcp refused ${name}: ${reply.error.message}`, said)
    return { text: reply.result.content[0].text, isError: reply.result.isError === true }
  }
  const end = () =>
    new Promise((resolve) => {
      const timer = setTimeout(() => fail('automata mcp did not stop when its input ended.', said), 20_000)
      child.on('close', (code) => {
        clearTimeout(timer)
        resolve(code)
      })
      child.stdin.end()
    })
  return { request, send, tool, end }
}
const mcp = openMcp()
const hello = await mcp.request('initialize', {
  protocolVersion: '2025-11-25',
  capabilities: {},
  clientInfo: { name: 'create-smoke', version: '1' },
})
if (hello.result?.serverInfo?.name !== 'automata')
  fail('automata mcp did not say its name.', JSON.stringify(hello))
mcp.send({ method: 'notifications/initialized' })
const listed = (await mcp.request('tools/list')).result.tools.map((one) => one.name)
if (listed.length !== 11 || !listed.includes('play_step') || !listed.includes('check'))
  fail(`automata mcp lists ${listed.join(', ')}.`)
const sound = await mcp.tool('check', { folder: '.' })
if (sound.isError || JSON.parse(sound.text).ok !== true)
  fail('mcp check: the new game is not sound.', sound.text)
const firstStart = await mcp.tool('play_start', { folder: '.' })
if (firstStart.isError) fail('mcp play_start did not start.', firstStart.text)
const firstSession = JSON.parse(firstStart.text).session
const firstStep = await mcp.tool('play_step', { session: firstSession, ticks: 60, hold: { 1: ['right'] } })
const mcpRan = JSON.parse(firstStep.text).state
if (firstStep.isError || mcpRan.tick !== 60 || heroX(mcpRan) !== ran.x)
  fail(
    `mcp play_step: the hero is at ${heroX(mcpRan)} after ${mcpRan.tick} ticks, the Worker's was ${ran.x}.`,
    firstStep.text,
  )
const saved = await mcp.tool('play_save', { session: firstSession, file: 'mcp-run' })
if (saved.isError) fail('mcp play_save did not save.', saved.text)
const same = await mcp.tool('replay', { folder: '.', file: 'mcp-run' })
if (same.isError || JSON.parse(same.text)[0].verdict !== 'ok')
  fail('mcp replay: the saved play is not ok.', same.text)
await mcp.tool('play_stop', { session: firstSession })
// The rules change under the running server.
writeFileSync(movePath, move.replace('const RUN = 6', 'const RUN = 3'))
const secondStart = await mcp.tool('play_start', { folder: '.' })
const secondStep = await mcp.tool('play_step', {
  session: JSON.parse(secondStart.text).session,
  ticks: 60,
  hold: { 1: ['right'] },
})
if (!(heroX(JSON.parse(secondStep.text).state) < ran.x))
  fail('mcp: a session started after the rules changed still plays the old ones.', secondStep.text)
const changed = await mcp.tool('replay', { folder: '.', file: 'mcp-run' })
if (!changed.isError || !changed.text.includes('diverged'))
  fail('mcp replay: the saved play does not say diverged after the rules changed.', changed.text)
writeFileSync(movePath, move)
const again = await mcp.tool('replay', { folder: '.', file: 'mcp-run' })
if (again.isError || JSON.parse(again.text)[0].verdict !== 'ok')
  fail('mcp replay: the saved play is not ok once the rules are back.', again.text)
const mcpStatus = await mcp.end()
if (mcpStatus !== 0) fail(`automata mcp ended with status ${mcpStatus}.`)
rmSync(join(game, 'replays', 'mcp-run.json'))
step('an agent plays through automata mcp, and the running server sees the rules change')

// 8. The game is as it was after step 4, so it passes again.
said('after the repairs', checkOf('after the repairs'), 'Everything passed.')
step('the game passes again once repaired')

// 9. The template's own scripts give the same answers.
said('npm run check', must('npm run check', 'npm', ['run', 'check'], game), 'Everything passed.')
must('npm test', 'npm', ['test'], game)
step('npm run check and npm test work')

// 10. `npm run dev` serves the game, and stops when it is told to.
const freePort = () =>
  new Promise((done, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, () => {
      const { port } = probe.address()
      probe.close(() => done(port))
    })
  })
const portIsFree = (port) =>
  new Promise((done) => {
    const probe = createServer()
    probe.once('error', () => done(false))
    probe.listen(port, () => probe.close(() => done(true)))
  })
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

const port = await freePort()
const devArgs = ['run', 'dev', '--', '--no-open', '--port', String(port)]
// On Windows `npm` is a script, so the shell starts it; elsewhere it is a process of its own, and a group to stop.
const dev = spawn(WINDOWS ? commandLine('npm', devArgs) : 'npm', WINDOWS ? [] : devArgs, {
  cwd: game,
  env: NO_COLOUR,
  shell: WINDOWS,
  detached: !WINDOWS,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let devSaid = ''
let devEnded = false
dev.stdout.on('data', (chunk) => {
  devSaid += chunk
})
dev.stderr.on('data', (chunk) => {
  devSaid += chunk
})
dev.once('exit', () => {
  devEnded = true
})
const fetchOk = async (path) => {
  try {
    const response = await fetch(`http://localhost:${port}${path}`)
    return response.ok ? await response.text() : undefined
  } catch {
    return undefined
  }
}
let page
for (let waited = 0; page === undefined && waited < 30_000 && !devEnded; waited += 500) {
  page = await fetchOk('/')
  if (page === undefined) await sleep(500)
}
if (page === undefined) fail('npm run dev: the page did not answer within 30 seconds.', devSaid)
const served = await fetchOk('/content/levels/level-1.json')
if (served === undefined || JSON.parse(served).id !== 'level-1')
  fail("npm run dev: the level's file was not served as it is.", devSaid)
// Stop it the way this system stops a child, then check that it is gone and the port is free.
if (WINDOWS) spawnSync(`taskkill /pid ${dev.pid} /T /F`, { shell: true })
else process.kill(-dev.pid, 'SIGINT')
for (let waited = 0; !(devEnded && (await portIsFree(port))) && waited < 5000; waited += 250) await sleep(250)
if (!devEnded || !(await portIsFree(port))) {
  if (!WINDOWS) process.kill(-dev.pid, 'SIGKILL')
  fail('npm run dev: it did not stop within five seconds of being told to, or the port stayed busy.', devSaid)
}
step('npm run dev serves the game and stops')

// 11. On Linux: the workflow a new game ships runs in a fresh copy, and the route the README gives while the package
// is not on npm works.
if (process.platform === 'linux') {
  const workflow = readFileSync(join(game, '.github', 'workflows', 'check.yml'), 'utf8')
  const lines = [...workflow.matchAll(/^\s*- run: (.+)$/gm)].map((m) => m[1] ?? '')
  if (lines.length === 0) fail("the game's workflow has no `run:` line.", workflow)
  const copy = join(work, 'fresh-copy')
  cpSync(game, copy, { recursive: true, filter: (path) => !/node_modules/.test(path) })
  for (const line of lines) {
    const [command, ...args] = line.split(' ')
    must(`the workflow's \`${line}\``, command, args, copy)
  }
  step("the game's own workflow passes in a fresh copy")

  const sha = process.env.HEAD_SHA
  if (sha === undefined) console.log('skip  the github: route (HEAD_SHA is not set)')
  else {
    const third = 'third-game'
    must(
      'create with a github: framework',
      'npx',
      [
        '--yes',
        '--package',
        tarball,
        'automata',
        'create',
        third,
        '--framework',
        `github:mcthaydt/AutomataFramework#${sha}`,
      ],
      work,
    )
    must('npm install of the github: route', 'npm', ['install'], join(work, third))
    const checked = must('npm run check', 'npm', ['run', 'check'], join(work, third))
    said('the github: route', checked, 'Everything passed.')
    step('the route the README gives while the package is not on npm works')
  }
}

rmSync(work, { recursive: true, force: true, maxRetries: 5 })
console.log("\nThe README's commands work, from a package to a game that plays.")
