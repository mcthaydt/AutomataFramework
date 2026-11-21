# CI speed-ups: implementation audit, cycle 1 (lane 3)

Audited 2026-11-21 (UTC, from `date`) by a fresh session. Starts from the plan audit in this folder
(`2026-11-21-ci-speedups-1-plan-audit.md`), which holds the verified pin, tool naming and before numbers.

Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to the spec
and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or incomplete
integrations. Do your best work.

## Read and checked

- Every removed step: the `actions/cache` of `~/.cache/ms-playwright`, the version step, `playwright install --with-deps`
  and `install-deps`. Nothing else in those jobs read `steps.version` or `steps.browser`, so nothing is left dangling.
- No test, shard count, engine list, `--bail`/`--max-failures`, timeout, upload or `ONLY` value changed in the image PRs.
  Criterion 3 (same files per shard) holds by reading: the test commands are byte-identical.
- `gh run download` became `actions/download-artifact` (pinned `9000827…`, v8.0.2) in Framework `create-play` and Site
  `shards`, with the same artifact name and folder. The Site shard log shows "Download artifact has finished
  successfully" and 65 passed on `ba11c8f`.
- `--user 1001` works: checkout, pnpm, setup-node's cache and Firefox ran on the image in all four repos.
- Identity: every commit on the four heads is authored and committed by McThayDT; every body ends "Requested by
  **McThayDT**".

## Findings

UNIT: all four PRs, "After" section. VERDICT: red. REQUIREMENT: criterion 4 in each body; `release` "One small pull request
per change, with before and after numbers from real runs". REASON: "After: filled in from this pull request's own runs"
is still a placeholder. EVIDENCE: the bodies at the heads named below. EXPECTED: measured after numbers next to the
before ones. FIX: body only. My measurement, for checking yours (jobs with an image on these PRs' runs, job start to
first test step): Framework n=20 p50 46 s max 53 s; Editors n=37 p50 47 s max 58 s; Examples n=18 p50 45 s max 55 s;
Site n=8 p50 47 s max 52 s; image pull 22 to 34 s per job. See plan-audit note N1 on wording.

UNIT: all four PRs, `docs/superpowers/live/claude-project-thread-c4m1h4.md`. VERDICT: red. REQUIREMENT: CLAUDE.md "Live
state in a file": the session deletes the file in its last commit before it hands the branch to the audit, so the commit
the audit names is the one that merges. REASON: the file is still on every head, with "Last commit: (see next update)".
EXPECTED: no live-state file on the head the verdict names. FIX: one commit per branch deleting that file; it changes no
behavior, so a re-check is reading the diff.

UNIT: Framework #228 and Site #68, `check`. VERDICT: red (until #229/#69 merge). REQUIREMENT: criterion 2, green on the
full run. EVIDENCE: `check` failed on `c41abfe` (`tests/workflows/create.test.ts` 3 failed, `online.test.ts` 1 failed)
and on `ba11c8f` (`tests/workflows/ci.test.ts` 1 failed), both the install-line assertions #229/#69 change. EXPECTED: a
full run green on the head after #229/#69 are on `main`. FIX: merge #229/#69 (with the plan-audit red fixed), merge
`main` into #228/#68, full run.

UNIT: Editors #147. VERDICT: red. REQUIREMENT: `release` lane 2+ "a clean run: unchanged code is never retried into
green"; criterion 2. EVIDENCE: on `b856de9` `browsers (chromium 5/6)` failed: `sign-in.journey.test.ts` "when the sign-in
has run out, a reload still shows the list of games", `locator.waitFor: Timeout 10000ms`; the gate went red. It is the
flaky test already in Editors `history.md` (line 88, #137, same shard), not caused by the image. The failed jobs were
re-run "as a diagnosis". On `a2022d9` only two checks had finished at 15:04 UTC. EXPECTED: a full
run on the final head, all green the first time. FIX: report the diagnosis result as diagnosis (both results), get a
clean full run on the final head; the flaky journey gets its own thread (it is red on `main`'s history too), and #147
still merges only after Editors #146.

UNIT: Examples #86. VERDICT: red (until its run ends). EVIDENCE: `b6c04fe` (image alone) had a green `gate`; the folded
head `2da8eb8` had 18 checks queued at 15:04 UTC. EXPECTED: green full run on `2da8eb8` or later. FIX: none beyond the
run, plus the two reds above.

## Verdicts posted

- Framework #228 `c41abfe` FAIL: 4 red (after numbers, live file, `check` until #229, plan red)
- Editors #147 `a2022d9` FAIL: 3 red (after numbers, live file, no clean full run)
- Examples #86 `2da8eb8` FAIL: 3 red (after numbers, live file, run not finished)
- Site #68 `ba11c8f` FAIL: 4 red (after numbers, live file, `check` until #69, plan red)

What re-checks a fix: the bodies' after numbers against the measurement above; the diff showing the live file gone; the
check-runs on the new head all `success` on the first full run; and for the plan red, `tests/workflows/` on `main`
asserting the pinned image. The approach itself is sound, and nothing in the image PRs weakens a check.
