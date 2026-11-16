---
name: merge-and-release
description: Use when acting as the merge session, merging a pull request, deleting branches, or when a release comes up: what to check before a merge, how to write the merge commit, what to report, and who starts a release.
---

# Merging and releasing

## The lane

Before anything else, check out the pull request's head and run `node <AutomataFramework>/.claude/tools/lane.mjs`
in its repo (it compares with `origin/main`). It names the lane from the changed files, and the lane decides:

- **contained**: merge once it is ready for review and its newest full run is green.
- **wide**: the same, and first run `graphify_impact` on the changed files (`graphify_tests_for` for their callers).
  Every affected caller must have a test, and the full run must have run it; name them in the merge report. If one
  has none, the pull request waits for that test, and its thread is told.
- **standing**: a test game's golden or recording that moves, or a deletion. If the plan or the request calls for each one, merge
  it like a wide change under the Owner's standing yes, quoted in the merge commit's message: "test-game recording
  moves and screen deletions that the plan calls for, and that a revert can undo, merge on green with no owner
  card" (the Owner, 2026-11-16). Then post the before and after (the moved hashes, the deleted files) to the
  coordinator. If neither calls for one, treat the change as closed.
- **closed**: a release, a migration, a new dependency, a real game's golden, or anything unplanned. Never merge. Report the lane and its
  reasons to the coordinator, put the question on a decision card, and wait for the Owner's own yes, quoted in the
  merge commit's message.

A quick `quick ` run never counts. A pull request that isn't ready to merge stays open, and the merge session goes
on with the others; it tells the coordinator in one line when:

- a check fails or there is a conflict (the pull request's own thread fixes it; a failure on `main` gets its own
  thread);
- a commit's author or committer is not `McThayDT`, or a Claude credit is anywhere (`commit-authors` should have
  failed it; if it didn't, that is a defect to report too);
- a golden moved (`tests/golden/`, `template/replays/level-1.json`, and each repo's goldens in its `CLAUDE.md`)
  without a commit naming it and its before and after.

A repo over `branchesPerRepo` (`.claude/workflow.json`) is reported, and its merged branches are deleted.

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
