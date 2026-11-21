# CI speed-ups: plan audit, cycle 1 (lane 3)

Audited 2026-11-21 (UTC, from `date`) by a fresh session that wrote none of this work. The brief is the owner's approval
(decision card, 14:39 UTC: browser jobs in the pinned Playwright image as a new CI tool; Editors/Examples drafts run every
Node test; merge after audits) plus each pull request's body and acceptance criteria.

Commits examined: Framework #228 `c41abfe`, Editors #147 `a2022d9` (#148 folded in), Examples #86 `2da8eb8` (#87 folded in),
Site #68 `ba11c8f`. For fit: Framework #229 `58ae676`, Site #69 `67d50d9` (lane 1, not audited). The CLAUDE.md pull
requests (#231, Editors #149, Examples #89, Site #71) were closed during this audit; they get their own audit when reopened.

## What was verified

- **The image is pinned and real.** All four use `mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27`.
  Asked the registry live (`HEAD /v2/playwright/manifests/v1.63.0-noble`): `docker-content-digest` is that exact digest.
  Each repo's `package.json` pins Playwright `1.63.0` (Site: `@playwright/test`), matching the tag. Each job also fails
  plainly if `pnpm exec playwright --version` is not `Version 1.63.0`.
- **Named as a new CI tool.** Every image PR body has "New tool in CI: the Playwright image (Microsoft's registry, free,
  no account or secret)". Covered by the owner's 14:39 approval.
- **The approach matches `release`** ("Making CI fast": a browser job runs in an image that already holds the browsers,
  pinned by digest to the locked version). `git` 2.43.0 is in the image (seen in a Site shard log), so `fetch-depth: 0`
  and `--only-changed=origin/main` in Site's journeys still work.
- **Before numbers are real.** Re-measured from the Actions API (`/actions/workflows/<ci>/runs`, last 150 completed, jobs
  `filter=latest`), at 15:00 UTC, a window a few runs newer than the implementer's:

  | Repo | Body: setup p50/p95, install p50/p95, >10 min, run p50/p95 | Re-measured |
  |---|---|---|
  | Framework `browsers` | 46/121 s, 21/92 s, 11, 3.1/38.9 min | 44/110 s, 20/80 s, 10, 3.0/34.7 min |
  | Editors `browsers` | 45/320 s, 20/294 s, 20, 12.8/48.2 min | 43/379 s, 21/378 s, 34, 10.1/45.8 min |
  | Examples `browsers` | 42/142 s, 19/107 s, 15, 5.9/26.6 min | 40/114 s, 18/81 s, 15, 5.3/23.1 min |
  | Site `shards` | 45/118 s, 19/89 s, 9, 6.1/26.0 min | 44/117 s, 18/84 s, 9, 5.7/22.4 min |
  | Site `build` | 37/58 s | 36/60 s |

  Same order everywhere; the counts match in three repos. Editors' ">10 min" count differs (34 vs 20): its 150 runs span
  only ~37 h, so a few newer runs move it. Not a defect; the body should say which window it measured (note N2).
- **Editors/Examples drafts run every Node test.** `ONLY` is `--bail=1` on a draft and empty on a full run;
  `test:node` is `vitest run --project node` (no `--changed` inside). Nothing else in `check` used the full history, so
  dropping `fetch-depth: 0` is safe. Criteria 5 and 7 met by reading; 6 met by reading `ONLY` (a later draft's log will
  show it).

## Findings

UNIT: the change set (Framework #229 + #228, Site #69 + #68). VERDICT: red. REQUIREMENT: `release` "Never check less.
Lint rules and required checks only stay or grow"; the coordinator's brief "nothing weakens a check". REASON: #229 and #69
drop the install-line assertions, and the strict check that replaces them (each browser job in the lockfile's image,
pinned by digest, nothing installed) is only promised as a later pull request, so `main` runs with weaker workflow tests
between the merges, and with the three-PR limit nothing schedules that follow-up. EVIDENCE: #229 diff removes three
`toContain('pnpm exec playwright install --with-deps …')` assertions and the WebKit one; #69 skips every assertion when a
`container:` is present; the strict test already exists as `tests/workflows/browsers-image.test.ts` in reverted commit
`fe15338` (Framework) and `bca74b5` (Site). EXPECTED: no commit on `main` checks less than the one before. FIX (either):
(a) in #229/#69 before they merge, when the job has a `container:`, require the image regex from `fe15338` (tag = locked
version, `@sha256:[0-9a-f]{64}`, `--user 1001`) and no `playwright install|install-deps` line; or (b) open the
`browsers-image.test.ts` pull request in the same step that merges #228/#68, ahead of any other pull request in that repo,
and record that order in #228/#68's body. Files: `tests/workflows/*.test.ts` only.

UNIT: each image PR body. VERDICT: note (N1). The re-measured "after" on these PRs' own runs (jobs with an image):
job start to first test step p50 45 to 47 s, max 52 to 58 s, of which the image pull is 22 to 34 s. So the median does not
move; the win is the tail (before p95 110 to 379 s, and 9 to 34 jobs over 10 minutes). Say that plainly in "After" rather
than calling it faster at the median.

UNIT: each image PR body. VERDICT: note (N2). Name the time window of the 150 runs, so a re-measure can match it.

UNIT: Site #68. VERDICT: note (N3). `site.yml` (the deploy) calls `journeys.yml` (`uses: ./.github/workflows/journeys.yml`),
so this PR also moves the deploy's journeys into the image. The body says so; the session that merges should watch the
first `site` run on `main` too.

UNIT: future CLAUDE.md bullet (Framework #231, closed). VERDICT: note (N4), for its own audit. The bullet ends "so a quick
run never passes because it chose no test", but Framework's draft `check` keeps `--changed=origin/main --bail=1
--passWithNoTests` (`ci.yml:122`), so a Framework draft can still pass with no Node test. Either reword or drop
`--passWithNoTests` there. Site #71's body also carried a "Generated by" footer.

## Verdict

FAIL: 1 red (the check gap), 4 notes. The approach, the pin, the tool naming and the before numbers hold.
