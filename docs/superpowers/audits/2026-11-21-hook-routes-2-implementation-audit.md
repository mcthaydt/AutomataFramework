# Implementation audit: close the routes around the rule hooks (cycle 2)

HEADS: Framework #230 at 35dc957, Editors branch `claude/project-thread-rzyi5k` at 0e0ccda (no pull request yet),
Examples #88 at 433acc8, Site #70 at 64cc05a. VERDICT: FAIL, 3 red, 7 notes. Cycle 1's six reds are all closed.

Lane 3. Auditor: the cycle 1 audit session (fresh to the code, not its writer), Opus 5.5, medium. Re-audit started
2026-11-21T15:04:50Z.

Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to the
spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or
incomplete integrations. Do your best work.

## What ran

- The four heads hold the same `rules.mjs` (md5 `c4fb915…`), `rules.test.mjs` (`9ef6572…`) and `pr-rules.yml`
  (`0fff2f1…`, unchanged since cycle 1).
- `node --test .claude/hooks/rules.test.mjs`: 15 of 15 pass at 35dc957. Against main's `rules.mjs`: 13 fail, 2 pass.
- `node .claude/hooks/rules.mjs --check`: no blanks, mergeGreen on.
- CI on 35dc957 when read (15:07 UTC): `rule-hooks` success, `commit-authors` success (one earlier run cancelled);
  no `gate` run yet. Not judged here; it must be green on the final head before a merge.
- Every cycle 1 command, and the new ones below, fed to the hook as a PreToolUse call exactly as this session's hooks
  run it. Nothing was sent to GitHub except reads.

## Cycle 1 reds: closed

All refused now: R1 `pulls?x=1` (judged, refused at the limit), `merge?a=1` squash, `ready_for_review?`; R2 `$P` path,
`curl -X POST "$U"`, `curl -K`; R3 `statuses/<sha>` (also from `/home/user` for Site); R4 DELETE protection, PATCH
repo settings; R5 reopening closed #210 through `PATCH pulls/210?`, `PATCH issues/210`, `gh issue reopen`, `gh pr
reopen`, MCP `issue_write` and MCP `update_pull_request` (all counted, refused at the limit); R6 PUT `contents`,
POST `git/refs`. Also refused: `/repositories/<id>/...` paths, `http://api.github.com:443/...`, `--method=delete`,
`-X $M`, a quoted program name (`g""h`), `bash -c '...'`, `bash <<'EOF'`, split quoting in the path, brace
expansion, REST workflow dispatches, `gh pr merge --admin`, `git push --mirror`, MCP squash merge.

## Red findings

### R1. A gh call the shell builds or feeds in is not read

UNIT: `rules.mjs`, `simpleCommands()` / `parseShell()`. VERDICT: red. REQUIREMENT: the owner's rule; the change's own
fail-closed rule (what the hook cannot read before the call is refused). EVIDENCE: all ALLOWED, each deleting branch
protection:
`GH=gh; $GH api -X DELETE repos/mcthaydt/AutomataFramework/branches/main/protection`;
`$(echo gh) api -X DELETE …/protection`;
`f(){ gh "$@"; }; f api -X DELETE …/protection`;
`echo 'gh api -X DELETE …/protection' | bash` and `printf … | sh`;
`bash -s <<'EOF'` (the same heredoc without `-s` is refused);
`source <(echo 'gh api -X DELETE …/protection')`;
`echo 'gh api -X DELETE …/protection' > y.sh && bash y.sh` (the script does not exist when the hook reads it).
EXPECTED: refused. FIX: (a) a command whose program word holds `$` or a backtick is refused when the line names
gh, git, curl or api.github.com, or simply always; (b) `bash|sh|zsh -s` with a heredoc is read like `bash <<EOF`;
(c) a shell that reads a pipe or a process substitution (`| bash`, `| sh`, `source <(…)`, `bash <(…)`) is refused;
(d) running a script file that cannot be read when the hook runs is refused; (e) a shell function definition's body
is judged as commands. A test for each. Files: `rules.mjs`, `rules.test.mjs`.

### R2. gh run from another program, in list form, is not read

UNIT: `rules.mjs`, `GH_IN_SCRIPT` and the wrapper handling. VERDICT: red. REQUIREMENT: the body's table ("a
node/python script that … calls gh pr create/gh api -X POST … refused"). EVIDENCE: ALLOWED:
`python3 -c 'import subprocess; subprocess.run(["gh","api","-X","DELETE","repos/…/branches/main/protection"])'`
and the same in `python3 - <<'EOF'`; `find . -maxdepth 0 -exec gh api -X DELETE …/protection \;`. The node
`execFileSync('gh',['api','-X','DELETE',…])` form is refused, so only the Python list form and `find -exec` miss.
EXPECTED: refused. FIX: `GH_IN_SCRIPT` also matches a list whose first two items are `"gh"` and `"api"`/`"pr"`
(any quote, any spacing) followed by a write flag or pr write word; `find … -exec|-execdir <cmd> \;|+` is judged as
`<cmd>`, like `xargs`. Tests. Files: `rules.mjs`, `rules.test.mjs`.

### R3. "Closed by default" covers gh api only; gh commands and MCP tools that do the same are let through

UNIT: `rules.mjs`, `GH_OWNER_ONLY` and `checkMcp()`. VERDICT: red. REQUIREMENT: the change's own rule ("every other
write … is refused, so a new route is closed by default"); CLAUDE.md lane 3 (anything published to npm, release
approvals and tags need the owner's approval or a recorded standing permission). EVIDENCE: `gh api -X POST
repos/…/actions/workflows/release.yml/dispatches` is REFUSED, but the same dispatch is ALLOWED as `gh workflow run
release.yml` and as MCP `actions_run_trigger` (`method: run_workflow`, `workflow_id: release.yml`). `release.yml`
is `workflow_dispatch` only, `contents: write`, `id-token: write`: it is the release. `gh release create v9.9.9` is
ALLOWED while `gh api POST repos/…/git/refs` (a tag) is refused. EXPECTED: one answer per action whatever the route.
FIX: add `workflow: ['run']` and `release: ['create', 'edit', 'delete', 'upload']` to `GH_OWNER_ONLY`; refuse MCP
`actions_run_trigger` with `run_workflow` and the MCP release-writing tools with the same reason ("list it as a
command for the owner", or a recorded standing permission). Reruns stay allowed. Tests. Files: `rules.mjs`,
`rules.test.mjs`.

## Owner commands (`/mnt/project-files/setup/hooks-required-checks.md`): PASS

Per repo, `PATCH …/protection/required_status_checks` with `checks` `gate`, `pr-rules`, `commit-authors`, each
`app_id` 15368 (GitHub Actions; today `gate` is already pinned to 15368), and `PATCH repos/…`
`allow_squash_merge=false allow_rebase_merge=false`. The check line reads `.checks`, and the file says an open pull
request needs a comment or a push to get its first `pr-rules` result. Well formed; the source pin closes cycle 1's
R3 on GitHub's side. Run only after each repo's pull request merges, as it says.

## Notes (not blocking, recorded)

- N1 to N5 from cycle 1 stand (local hook files editable; word-level script scanning; self-posted verdicts;
  deleting a pull request's branch; model).
- N6. `awk 'BEGIN{system("gh api -X DELETE …")}'` and Python building the path by concatenation pass. Same class as
  N2; the GitHub-side pins hold what reaches GitHub.
- N7. `git push origin --delete main` and tag pushes (`git push origin v1.0.0`, `--tags`) are allowed by the hook.
  Main's protection has `allow_deletions: false`, and no workflow runs on a tag push, so neither does harm today;
  for the retrospective.

## The fix round

The implementer fixes R1 to R3 in all four repos (same files), adds a test per command above, and names the new
heads. The re-audit reruns every command in this file and cycle 1's.
