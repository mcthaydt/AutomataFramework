# Plan audit: close the routes around the rule hooks (cycle 1)

HEADS: Framework #230 at 819eca9, Editors branch `claude/project-thread-rzyi5k` at dcbadfa, Examples #88 at
674e7bc, Site #70 at 2fade44. VERDICT: FAIL, 1 red. Short path; the brief is the owner's request plus the pull
request body (its route table and acceptance criteria). Lane 3. Auditor: a fresh session, Opus 5.5, medium.

Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to the
spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or
incomplete integrations. Do your best work.

## The requirement

The owner, 2026-11-21 14:40 UTC: "Close all gaps. ALL SESSIONS NEED TO FOLLOW THE HOOKS, this is non-negotiable."

## What the plan gets right

- Two layers: the session hook refuses before the call, and `pr-rules` judges the same rules on GitHub from main's
  copy of `rules.mjs` (`pull_request_target`, main checked out, the pull request's code never run). The second layer
  is the only one that holds for a session that never loaded the hooks (a coordinator with no repo, a session on
  another machine, a session that edited its own hooks), so it is the right design.
- Fail closed for writes when the hook cannot judge (a crash, unreadable `rules.json`, an unreadable body or list).
- The same files in all four repos; a test that fails on main for each route.

## Red

### P1. The hook refuses a list of known routes; every write route not on the list goes through

UNIT: the approach in the body's route table, and the acceptance criteria. REQUIREMENT: "Close all gaps." REASON:
the table names the routes found and refuses each, so a route nobody listed is allowed. The implementation audit
found six such routes (query strings, paths in variables, forged statuses, branch protection and repo settings,
reopen through the issues API, commits through `contents`/`git` REST paths). And the backstop assumes two things
the plan does not secure: that a session cannot set the `pr-rules` status itself, and that it cannot remove branch
protection (the sessions' token is a repo admin). EXPECTED: the plan closes the class, not the instances.
FIX (bounded, `rules.mjs`, `rules.test.mjs`, the owner-commands file, and the body's table and criteria):
1. Normalize every GitHub API path before judging (cut `?`/`#`, collapse `//`, strip the host).
2. Refuse a non-GET `gh api` call, and any HTTP-tool write to a GitHub host, whose path is unknown (a variable, a
   backtick, a config file) or is not on an allowlist of the write paths the hooks judge: pull request create, edit,
   merge and the `ccr` routes; issue and pull request comments, reviews and review replies; labels and assignees;
   `git/refs` delete only off the default branch. Everything else (statuses, check runs, protection, rulesets, repo
   settings, contents, git data, merges, collaborators, hooks, workflow dispatch) is refused with the route rule.
3. The owner commands pin `gate`, `pr-rules` and `commit-authors` to GitHub Actions (app 15368) and turn off squash
   and rebase merges, so GitHub itself holds what a session could otherwise unpick.
4. One acceptance criterion per route in the implementation audit, run as tests.

Notes from the implementation audit (N1 to N5) apply here too and are not blocking.
