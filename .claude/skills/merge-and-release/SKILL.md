---
name: merge-and-release
description: Use when acting as the merge session, merging a pull request, deleting branches, or when a release comes up: what to check before a merge, how to write the merge commit, what to report, and who starts a release.
---

# Merging and releasing

## Before a merge

Merge only a pull request that is ready for review and whose newest full run is green (a quick `quick ` run never
counts). Then check, and stop and report to the coordinator, waiting for an answer, on any of these:

- a failing check or a conflict;
- a commit whose author or committer is not `McThayDT`, or a Claude credit anywhere (`commit-authors` should have
  failed it; if it didn't, that is a defect to report too);
- a golden that moved (`tests/golden/`, `template/replays/level-1.json`, and each repo's goldens in its `CLAUDE.md`)
  without a commit naming it and the Owner's before-and-after;
- more than five branches in a repo, or a branch nobody asked for;
- any judgement call.

## The merge

- A merge commit, never a squash: `gh pr merge <n> --merge --subject "Merge pull request #<n>: <title>" --body ""`,
  so no pull request body or trailer is copied into it.
- Then delete the branch. Any session may delete a branch whose pull request is merged or closed; never `main` or a
  branch with an open pull request.
- Report each merge to the coordinator in one line. Never leave a passing pull request open.

## Releases

Releases are big and few (see `docs/decisions.md`), and they are in the hard-to-undo lane: `release.yml` runs only
when the Owner starts it by hand. A session may prepare a release's pull request and say what it would publish; it
never starts one, tags or publishes.
