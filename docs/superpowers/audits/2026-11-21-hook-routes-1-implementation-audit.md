# Implementation audit: close the routes around the rule hooks (cycle 1)

HEADS: Framework #230 at 819eca9, Editors branch `claude/project-thread-rzyi5k` at dcbadfa (no pull request yet),
Examples #88 at 674e7bc, Site #70 at 2fade44. VERDICT: FAIL, 6 red, 5 notes.

Lane 3 (rule hooks and CI workflows). Auditor: a fresh session, Opus 5.5, medium (the Settings model for lane 3
audits). Started 2026-11-21T14:54:04Z.

Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to the
spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or
incomplete integrations. Do your best work.

## What ran

- The four changes are the same: `rules.mjs`, `rules.test.mjs`, `pr-rules.yml` and `rule-hooks.yml` have the same
  md5 in all four heads (`e984732…`, `ca20f93…`, `0fff2f1…`, `a04b5ce…`); `rules.json` differs only in `repo`.
- `node --test .claude/hooks/rules.test.mjs`: 11 of 11 pass at 819eca9. Against main's `rules.mjs` with the new test
  and `rules.json`: 9 fail, 2 pass (5 and 9), as the body says.
- `node .claude/hooks/rules.mjs --check`: no blanks, mergeGreen on.
- CI on 819eca9 when read (14:59 UTC): `rule-hooks` and `commit-authors` success; `gate` still running (browsers
  queued). Not judged here; it must be green before a merge.
- Bypass tries: each command below was fed to the new hook as a PreToolUse call, exactly as this session's hooks run
  it (`CLAUDE_PROJECT_DIR=/home/user node AutomataFramework/.claude/hooks/rules.mjs --find-repo`), from the repo's
  folder and from `/home/user`. Nothing was sent to GitHub except reads.

Routes the change does close (all refused): `gh api -X POST …/pulls` with `--input` of a missing file, with `-f`
fields, with `-XPOST`; `curl -XPOST`, `curl --request=POST`, `curl -X POST -d …` to api.github.com; `wget
--method=POST`; `node -e "fetch(…POST)"` through `npx`; `env gh …`, `timeout 60 gh …`, `xargs gh …`, `command gh …`,
`/usr/bin/gh …` (all judged); `gh api -X PUT …/pulls/230/merge` (squash); `gh api -X POST …/ccr/ready_for_review`
without a review; `git push` to main, `--force`, `+HEAD:`; MCP `create_or_update_file` on main; an over-limit `gh api
POST pulls` from the repo (it named the 4 open: #231, #230, #229, #228).

## Red findings

### R1. A query string on the path skips every pull request check

UNIT: `rules.mjs`, `ghApi()` and every path regex after it (`checkPrBodyBash`, `checkPrFlowBash`, `ghPrWrite`).
VERDICT: red. REQUIREMENT: the owner's rule (no route around the hooks); the body's table ("gh api POST
repos/o/r/pulls … judged like gh pr create"). REASON: the path regexes end in `$`, so `pulls?x=1` matches none.
EVIDENCE: all ALLOWED:
`gh api -X POST 'repos/mcthaydt/AutomataFramework/pulls?x=1' --input b.json` (opens a pull request past the limit,
which the same call without `?x=1` refused);
`gh api -X PUT 'repos/mcthaydt/AutomataFramework/pulls/230/merge?a=1' -f merge_method=squash`;
`gh api -X POST 'repos/mcthaydt/AutomataFramework/pulls/230/ccr/ready_for_review?'`;
`gh api -X PATCH 'repos/mcthaydt/AutomataFramework/pulls/228?' -f state=open`.
GitHub serves the query form: `gh api 'repos/mcthaydt/AutomataFramework/pulls/230?x=1'` returned 230. (A trailing
`/` is refused by the proxy: "Request path could not be canonicalized".) EXPECTED: each is judged like the same call
without the query. FIX: in `ghApi()`, cut the path at the first `?` or `#` (and collapse `//`), and do the same for
URLs `checkOtherRoutes` reads; one test per route above in `rules.test.mjs`. Files: `rules.mjs`, `rules.test.mjs`.

### R2. A path or URL held in a shell variable is not judged

UNIT: `rules.mjs`, `ghApi()` and `checkOtherRoutes()`. VERDICT: red. REQUIREMENT: the body's "fail closed" rule (a
body it cannot read is refused) applies to the path too. EVIDENCE: ALLOWED:
`P=repos/mcthaydt/AutomataFramework/pulls; gh api -X POST $P --input b.json` and
`U=https://api.github.com/repos/mcthaydt/AutomataFramework/pulls; curl -X POST "$U" -d @b.json`, and
`curl -K /home/user/cfg -X POST` (the URL is in the config file). EXPECTED: refused, like an unreadable body.
FIX: a `gh api` call that is not GET and whose path holds `$` or a backtick is refused; an HTTP tool call that
writes (method or data flag) and whose URL is unknown (`$`, backtick, `-K`/`--config`, `--url` from a file) is
refused. Tests for both. Files: `rules.mjs`, `rules.test.mjs`.

### R3. The `pr-rules` backstop can be forged by any session

UNIT: the design of `pr-rules.yml` plus `/mnt/project-files/setup/hooks-required-checks.md`. VERDICT: red.
REQUIREMENT: the body: "a session that never loaded the hooks … nothing merges without it". REASON: `pr-rules` is a
commit status, and the sessions' token can write statuses (it has admin and push:
`gh api repos/mcthaydt/AutomataFramework --jq .permissions` gave `admin:true, push:true`). EVIDENCE: the new hook
ALLOWS `gh api -X POST repos/mcthaydt/AutomataFramework/statuses/<sha> -f state=success -f context=pr-rules`, so a
session (hooked or not) can mark its own pull request as passing. The owner commands add `pr-rules` through the
`contexts` list, which pins no source; `gate` today is pinned (`"checks":[{"app_id":15368,"context":"gate"}]`).
EXPECTED: only the GitHub Actions run can satisfy `pr-rules`. FIX: (a) the owner commands set the required checks
with the source pinned to GitHub Actions (app 15368), see "Owner commands" below; (b) the hook refuses writes to
`repos/*/statuses/*` and `repos/*/check-runs*` on every route, with a test. Files: `rules.mjs`, `rules.test.mjs`,
`/mnt/project-files/setup/hooks-required-checks.md`.

### R4. A session can switch off branch protection, and the hook lets it

UNIT: `rules.mjs`, `checkOtherRoutes()` / `checkPrFlowBash()`. VERDICT: red. REQUIREMENT: the body: "Pushes to main,
force pushes and deleting main were already stopped by branch protection"; the owner's rule. REASON: the token is a
repo admin, so branch protection holds only while no session removes it. EVIDENCE: ALLOWED:
`gh api -X DELETE repos/mcthaydt/AutomataFramework/branches/main/protection`,
`gh api -X DELETE …/branches/main/protection/enforce_admins`,
`gh api -X PATCH repos/mcthaydt/AutomataFramework -F allow_squash_merge=true`. After the first, `gate`, `pr-rules`
and `commit-authors` are no longer required and main takes any push. EXPECTED: refused. FIX: the hook refuses any
non-GET call to `repos/<o>/<r>` itself, `…/branches/*/protection*`, `…/rulesets*`, `…/actions/permissions*`,
`…/hooks*` and `…/collaborators*`, on every route; tests. Files: `rules.mjs`, `rules.test.mjs`.

### R5. Reopening through the issues API is not counted

UNIT: `rules.mjs`, `checkPrFlowBash()` and `checkMcp()`. VERDICT: red. REQUIREMENT: the body's table ("gh pr
reopen, PATCH pulls/N state=open, MCP update_pull_request state:open … counted"). REASON: a pull request is also an
issue; `PATCH repos/o/r/issues/N state=open` reopens it. EVIDENCE: ALLOWED:
`gh api -X PATCH repos/mcthaydt/AutomataFramework/issues/228 -f state=open`. (`pr-rules` would close it afterwards on
its `reopened` event, so the backstop holds once R3 is fixed; the hook does not.) EXPECTED: counted against the
limit like the pulls route. FIX: treat `PATCH …/issues/N` with `state=open` like `…/pulls/N` (read the issue; when it
has `pull_request`, run `checkOpenLimit`); same for MCP `issue_write` with `state: open`. Tests. Files: `rules.mjs`,
`rules.test.mjs`.

### R6. A commit made through `gh api` skips the identity check

UNIT: `rules.mjs`, `checkIdentity()` / `checkOtherRoutes()`. VERDICT: red. REQUIREMENT: Identity (CLAUDE.md, Rules
that never bend); the body's claim that every way to write to GitHub is judged. REASON: the MCP twin is refused
("writes a commit through the API, authored by the token's account"), but the REST route is not. EVIDENCE: ALLOWED:
`gh api -X PUT repos/mcthaydt/AutomataFramework/contents/README.md -f message=x -f content=eA== -f branch=<any>`;
the same holds for `…/git/commits`, `…/git/refs`, `…/git/trees`. EXPECTED: refused like `create_or_update_file`.
FIX: refuse non-GET `gh api` calls to `…/contents/*`, `…/git/(commits|trees|blobs|tags|refs)*` and `…/merges`, with
the same reason as the MCP refusal; tests. Files: `rules.mjs`, `rules.test.mjs`.

R1, R2, R4, R5 and R6 are one class: the change lists the write routes it refuses, and every write route it did not
list goes through. The plan audit asks for the bounded fix that closes the class (an allowlist of `gh api` write
paths); the six fixes above are what that allowlist must pass.

## Owner commands (`/mnt/project-files/setup/hooks-required-checks.md`)

Checked by reading them and the current protection (`gh api …/branches/main/protection`): required checks today are
`gate` pinned to app 15368, `enforce_admins` on, 0 approving reviews; the repo allows merge, squash and rebase
merges. The commands are well formed, but:

- They add `pr-rules` and `commit-authors` with no source (R3). Replace each repo's line with one that pins all three
  to GitHub Actions:
  `GH_PAGER=cat gh api -X PATCH repos/mcthaydt/<Repo>/branches/main/protection/required_status_checks --input - <<< '{"strict":false,"checks":[{"context":"gate","app_id":15368},{"context":"pr-rules","app_id":15368},{"context":"commit-authors","app_id":15368}]}'`
  and the check line should read `.checks`, expecting the three with `app_id` 15368.
- Squash and rebase merges stay on, so a session that gets past the hook (R1) can squash. Add per repo:
  `GH_PAGER=cat gh api -X PATCH repos/mcthaydt/<Repo> -F allow_squash_merge=false -F allow_rebase_merge=false`.
- Once `pr-rules` is required, every open pull request has no `pr-rules` status until an event runs it; say in the
  file that a comment on each open pull request (or a push) starts it.

## Notes (not blocking, recorded)

- N1. The hook trusts the files it reads: `Edit` of `.claude/hooks/rules.json` (`maxOpenPrs: 99`) and `sed -i` on it
  are allowed, so a session can switch its own hooks off. Once R3 and R4 hold, `pr-rules` and branch protection
  catch anything that reaches GitHub; that is the real guarantee, and this note stays a note.
- N2. Script scanning is by words: `python3 -c` building the URL as `"api." + "github.com"` with `method="POST"` is
  allowed. No static check can close this; the backstop (R3, R4) does.
- N3. All sessions post as the same account, so a builder can post its own `<sha> PASS` verdict and `checkReviewed`
  cannot tell. Outside this change; for the retrospective.
- N4. `git push origin :<branch>` (deletes a pull request's branch, closing it) is allowed. Low cost; for the
  retrospective.
- N5. This session runs the default project model; the Settings model for lane 3 audits is the same (Opus 5.5,
  medium), so no deviation here.

## The fix round

The implementer fixes R1 to R6 in all four repos (same files, same text) and the owner-commands file, adds a test per
route above, and names the new heads. The re-audit reruns every command listed here against the new heads.
