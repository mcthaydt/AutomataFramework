# Setup 1: implementation audit (AutomataFramework)

**341c569 FAIL: 3 red**

- Pull request: #224, branch `claude/project-thread-id2dw7`, head `341c569` (examined), base `main`.
- Lane: 2 (first-time setup from the owner's own rules text). Audit: one fresh lane 2 review.
- Rules: the owner's fresh kit (CLAUDE.md and the skills, `review` loaded), the project file `kit/message.md`.
- Reviewer: a fresh session that did not write this change. Audited 2026-11-21 09:28 UTC.

Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to the spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or incomplete integrations. Do your best work.

## What was checked, and how

| Check | Result | Evidence |
| --- | --- | --- |
| The restore is exact | PASS | `git diff 76d2ac4 76d2ac4^` and `git diff f1614aa^ f1614aa` are the same patch (index lines aside); both 30 files changed, 2699 insertions(+), 1 deletion(-). |
| Kit text verbatim: `after-compaction.md`, `rules.mjs`, skills `build`, `owner-updates`, `review`, `staged-path`, `visual-check` | PASS | Byte-identical to the kit (trailing blank line aside). |
| Kit text verbatim: CLAUDE.md and `release` | PASS | The only differences are the placeholders filled: [PROJECT], [WHAT IT IS FOR], [STACK], the five commands, [COMMIT AUTHOR], [OWNER NAME], [WIDE PATHS], [HARD-TO-UNDO PATHS]. See note N2. |
| Kit text: `.claude/settings.json` | PASS, note N1 | Parsed as JSON it equals the kit's; the layout is Biome's. |
| `verify` | PASS, note N3 | The repo's own copy, restored unchanged. |
| `rules.json` values | FAIL | Red 1 (`mergeGreen.statuses`), red 2 (message tools). `repo` and `prBody.footerStrippedByCi: true` are right: `scripts/check-commit-authors.ts` takes the tool's footer off (the Owner's choice, 2026-11-17). `firstTimeSetup` stays `true` until a follow-up turns it off (note N4). |
| `node .claude/hooks/rules.mjs --check` | PASS | "no blanks"; identity, attribution, prBody, prFlow, liveState, mergeGreen, ruleMix on. |
| The identity hook reads the filled Identity line | PASS | A `git commit` as McThayDT is allowed; as `Claude <noreply@anthropic.com>` it is refused. |
| SessionStart prints the rules | PASS | "Rule hooks are on in this repo (AutomataFramework)". |
| Commits: author, committer, trailers | PASS | Every commit authored and committed by McThayDT; no Claude trailer or "Generated" line. |
| Pull request body | PASS | Names lane 2 and acceptance criteria; last line "Requested by **McThayDT**"; draft. |
| Nothing else changed | FAIL |  Red 3 (`progress.md`). Other files: `biome.json` skips `rules.mjs`, the compaction-hook test accepts the second SessionStart entry and checks the rule hooks run on all four events, `history.md` and `progress.md` record the restart. |
| CI | not judged | The run was still going when this audit was written; `gate` must pass before merge. |

## Red findings

### Red 1: the required-status check blocks every merge

- UNIT: `.claude/hooks/rules.json`, `mergeGreen.statuses`.
- VERDICT: red.
- REQUIREMENT: the setup check fills in the required statuses (`release`, Setup check), and the hooks must not refuse a merge that is green.
- REASON: `["gate"]` is a list of strings, but `rules.mjs` reads each entry as an object with a `context`, and it looks that context up in the commit status API, while `gate` is a GitHub Actions job, which GitHub reports as a check run.
- EVIDENCE: `rules.mjs` lines 1016 to 1028 (`status.statuses.find((x) => x.context === s.context)` on `repos/<repo>/commits/<sha>/status`). With a stub `gh` that reports a green `gate` status, `gh pr merge <n> --merge` is refused with "Matched: undefined on <sha> is missing". With `{"context":"gate"}` the stub passes, but on GitHub the status API lists no `gate` (`ci.yml`'s `gate:` job is a check run; no workflow posts a commit status; the status API for #224's head `341c569` returns `"total_count":0`), so the merge would still be refused as "gate ... is missing".
- EXPECTED: a merge with a green `gate` is not refused by the hooks.
- FIX: set `mergeGreen.statuses` back to `[]` (the kit's value, so the check is off) and let branch protection's required `gate` (step 1 of the owner's commands) hold the merge. Correct the pull request body's "required status `gate`" line to match. Files: `.claude/hooks/rules.json`, the pull request body.

### Red 2: the message tools are not filled in

- UNIT: `.claude/hooks/rules.json`, `ownerCommands.tools`.
- VERDICT: red.
- REQUIREMENT: the setup check fills in "session and message tools" (`release`, Setup check, the rule hooks item); the commands handed to the owner use `gh`, never plain git, and `gh api` lines start with `GH_PAGER=cat`.
- REASON: `ownerCommands.tools` is `[]`, so the check that reads commands handed to the owner never runs, though `history.md` records the session tools as found.
- EVIDENCE: `rules.mjs` lines 1131 to 1142 loop over `ownerCommands.tools`; with none listed nothing is checked. `--check` shows "ownerCommands on" but it judges nothing.
- EXPECTED: a fenced `git ...` line in a message to the owner is refused.
- FIX: list the tools this project's sessions use to message the owner and other sessions, each with its text field: `{"tool": "^mcp__hearthbot__(post_message|message_thread|message_coordinator)$", "fields": ["text"]}` and `{"tool": "^mcp__claude-code-remote__send_message$", "fields": ["message"]}`. File: `.claude/hooks/rules.json`.

### Red 3: `progress.md` drops the Owner's records that still stand

- UNIT: `docs/superpowers/progress.md`.
- VERDICT: red.
- REQUIREMENT: each Owner instruction is kept in `progress.md` (project instructions); the brief: nothing beyond the restore and the kit.
- REASON: the file was rewritten from scratch, and these Owner records that still apply are now only in git history: the Backlog (the photo-style look in the editors, the Owner's must-have; 3D later; the simple game maker idea), Plan Q's native-speaker reads with their open Owner decisions (who reads, payment, extra scope, which commit), the Owner's material decisions ("How heavy" is Rapier mass; draw order kept in the level), and the 2026-11-17 decision that `commit-authors` takes the tool's footer off, which this pull request's `footerStrippedByCi` relies on.
- EVIDENCE: `git show 76d2ac4^:docs/superpowers/progress.md` against the branch's file.
- EXPECTED: those sections kept below the new restart sections.
- FIX: carry the old Backlog and Material decisions sections, the Plan Q reads item and the 2026-11-17 footer decision into the new file. File: `docs/superpowers/progress.md`.

## Notes (not blocking, recorded here)

- N1. `.claude/settings.json` is not the kit's text byte for byte: Biome's 110-column limit breaks the kit's 122-character hook lines, so Biome laid them out again. It parses to exactly the kit's JSON. Worth one line in the pull request body.
- N2. The Identity line reads "McThayDT <107786093+mcthaydt@users.noreply.github.com> (author and committer)": the parenthesis is the old filled text, beyond the bare placeholder. The hooks read it correctly (identity check tested both ways).
- N3. `verify` is the repo's own skill, restored unchanged; a few of its fixed kit lines were reworded before the restart. Not this change.
- N4. `firstTimeSetup` stays `true` until a follow-up pull request turns it off; until then the rule-mix check is off. That follow-up is a rules change (lane 3) and should be tracked.
- N5. Not filled, judged right for now: `gpu` off (browser runs and screenshots happen on GitHub's runners and in cloud containers, as `verify` says); `hostedRunners` off (public repo). Worth considering: `ownerDevice` on, with the tools that reach the owner's computer (`mcp__hearthbot__start_remote_control`, `mcp__hearthbot__connect_device`, `mcp__claude-in-chrome__.*`, `mcp__remote-devices__.*`), since on a public repo nothing runs there (`release`, Where work runs); and the coordinator's thread-starting tool under `sessionTools` with model and effort required, if it takes those fields.
