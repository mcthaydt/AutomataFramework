---
name: merge-and-release
description: Use when merging a pull request (your own contained or standing change, or as the merge session), deleting branches, or when a release comes up: the lane, the checks, the merge commit, what to report, and who starts a release.
---

# Merging and releasing

## Who merges

The session that made a **contained** or **standing** change merges it itself once it is ready and green; it needs no
other session. The merge session merges **wide** changes, picks up any green pull request left open, and deletes
merged branches. A **closed** change merges only with the Owner's yes.

## The lane

Check out the pull request's head and run `node <AutomataFramework>/.claude/tools/lane.mjs` in its repo (it
compares with `origin/main`). Where it doesn't exist, classify from the diff and what the change is meant to do, by
the same lanes; never build tooling first.

- **contained** (docs, tests, one feature folder): merge once ready and the newest full run is green.
- **wide** (shared code, formats, the public surface, CI and setup): the same, and first run `graphify_impact` on the
  changed files (`graphify_tests_for` for their callers); name the affected callers' tests in the merge report. A
  caller with no test is reported to the pull request's thread, which adds it.
- **standing** (a test game's golden or recording that moves, a deletion): merge like a wide change when the plan or
  the request calls for each move or deletion, quoting the Owner's standing yes in the merge commit's message:
  "test-game recording moves and screen deletions that the plan calls for, and that a revert can undo, merge on
  green with no owner card" (the Owner, 2026-11-16). Then post the before and after (the moved hashes, the deleted
  files) to the coordinator. A move or deletion neither calls for is closed.
- **closed** (a release, a migration, a new dependency, a real game's golden, a change to the approval and permission
  rules themselves): never merge without the Owner. Tell the coordinator, who puts it on a decision card, and quote
  the Owner's yes in the merge commit's message.

## When a pull request is held

A quick `quick ` run never counts: only the newest full run does. Every required check must pass; the one exception
is the Owner's explicit yes for that pull request, quoted in the merge commit. These, and only these, hold a pull
request; it stays open, the coordinator hears in one line, and other merges go on:

- a required check is red. If it is red on `main` too, it isn't this change's: the coordinator starts its fix
  thread, and this pull request merges once that fix lands or the Owner grants the exception;
- a merge conflict (merge `main` into the branch; never rebase or force-push);
- a commit whose author or committer is not `McThayDT`, or a Claude credit anywhere (`commit-authors` should have
  failed it; if it didn't, that is a defect to report too);
- a golden that moved (`tests/golden/`, `template/replays/level-1.json`, and each repo's goldens in its `CLAUDE.md`)
  without a commit naming it and its before and after;
- the closed lane without the Owner's yes.

A check that isn't required never holds a merge. A repo over `branchesPerRepo` (`.claude/workflow.json`) is
reported, and its merged branches are deleted.

## The merge

- A merge commit, never a squash: `gh pr merge <n> --merge --subject "Merge pull request #<n>: <title>" --body ""`,
  so no pull request body or trailer is copied into it.
- Then delete the branch. Any session may delete a branch whose pull request is merged or closed; never `main` or a
  branch with an open pull request.
- Report each merge to the coordinator in one line. Never leave a passing pull request open.

## Releases

Releases are big and few (see `docs/decisions.md`), and they are in the closed lane: `release.yml` runs only when the
Owner starts it by hand. A session may prepare a release's pull request and say what it would publish; it never
starts one, tags or publishes.
