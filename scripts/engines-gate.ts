// The `engines (<browser>)` check: green only when every one of that browser's shards passed.
//
// Why a script: the check has to read the shards' results from GitHub, and two things went wrong with one line of `gh`.
//   - GitHub sometimes answers 502 for a moment. A check that fails because the question was not answered says nothing
//     about the tests, so the answer is asked for again, a few times, before the check gives up.
//   - Re-running one job starts a new attempt that lists only the jobs that ran again, so a check that reads only its
//     own attempt cannot see the shards that passed before. Each shard is read from the newest attempt that has it.
//
// This file has no dependencies on purpose: the workflow runs it with Node alone.
import { fileURLToPath } from 'node:url'

/** The two things of a job this check reads. */
export type Job = { readonly name: string; readonly conclusion: string | null }

/** What the check says, and the lines that make it readable in the log. */
export type Verdict = { readonly ok: boolean; readonly lines: readonly string[] }

/** How many shards each browser is split into (`browsers (<engine> 1/6)` to `6/6`). */
export const SHARDS = 6

/**
 * Says whether every shard of one browser passed. `attempts` are the jobs of each attempt of the run, oldest first; a
 * shard counts as the newest attempt that lists it, so a shard that was run again is judged by its last result and one
 * that was not run again keeps the result it had.
 */
export function judge(attempts: readonly (readonly Job[])[], engine: string): Verdict {
  const prefix = `browsers (${engine} `
  const latest = new Map<string, string | null>()
  for (const jobs of attempts) {
    for (const job of jobs) {
      if (job.name.startsWith(prefix)) latest.set(job.name, job.conclusion)
    }
  }
  const lines = [...latest]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, result]) => `${name}: ${result}`)
  const passed = [...latest.values()].filter((result) => result === 'success').length
  return { ok: latest.size === SHARDS && passed === SHARDS, lines }
}

/** The part of `fetch` this script uses, so a test can stand in for GitHub. */
export type Ask = (
  url: string,
  init: { headers: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

/** How a request is repeated: how many tries in all, and how long to wait before the next one (in milliseconds). */
export type Patience = { readonly tries: number; readonly wait: (failures: number) => Promise<void> }

const waitSeconds = (failures: number): Promise<void> =>
  new Promise((done) => setTimeout(done, 2 ** failures * 1000))

export const PATIENCE: Patience = { tries: 5, wait: waitSeconds }

/** A failure that asking again could fix: GitHub's own 5xx, its rate limit, or the network dropping the call. */
const worthAskingAgain = (status: number): boolean => status >= 500 || status === 429

/** Asks GitHub for JSON, again after a 5xx, a rate limit or a dropped connection; any other answer ends the asking. */
export async function getJson(
  url: string,
  token: string,
  ask: Ask = fetch,
  patience: Patience = PATIENCE,
): Promise<unknown> {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  let last = 'no answer'
  for (let failures = 1; failures <= patience.tries; failures += 1) {
    try {
      const response = await ask(url, { headers })
      if (response.ok) return await response.json()
      last = `HTTP ${response.status}`
      if (!worthAskingAgain(response.status)) break
    } catch (error) {
      last = error instanceof Error ? error.message : String(error)
    }
    if (failures < patience.tries) await patience.wait(failures)
  }
  throw new Error(`GitHub did not answer ${url}: ${last}`)
}

/** Every job of one attempt of a run, a page of 100 at a time. */
export async function listJobs(
  repo: string,
  run: string,
  attempt: number,
  token: string,
  ask: Ask = fetch,
  patience: Patience = PATIENCE,
): Promise<readonly Job[]> {
  const jobs: Job[] = []
  for (let page = 1; ; page += 1) {
    const path = `repos/${repo}/actions/runs/${run}/attempts/${attempt}/jobs?per_page=100&page=${page}`
    const url = `https://api.github.com/${path}`
    const body = (await getJson(url, token, ask, patience)) as { jobs?: readonly Job[] }
    const found = body.jobs ?? []
    for (const job of found) jobs.push({ name: job.name, conclusion: job.conclusion })
    if (found.length < 100) return jobs
  }
}

/** Reads the run named by the environment, prints each shard of the browser, and fails the job unless all passed. */
async function main(): Promise<void> {
  const env = process.env
  const { GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: run, GITHUB_RUN_ATTEMPT: current } = env
  const { GH_TOKEN: token, ENGINE: engine } = env
  if (repo === undefined || run === undefined || current === undefined || token === undefined || !engine) {
    throw new Error('GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT, GH_TOKEN and ENGINE must be set.')
  }
  const attempts: (readonly Job[])[] = []
  for (let attempt = 1; attempt <= Number(current); attempt += 1) {
    attempts.push(await listJobs(repo, run, attempt, token))
  }
  const verdict = judge(attempts, engine)
  for (const line of verdict.lines) console.log(line)
  if (!verdict.ok) {
    console.error(`Every shard of ${engine} must have passed, and they have not.`)
    process.exitCode = 1
  }
}

// Run only when started from the command line, not when a test imports the checks above.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
