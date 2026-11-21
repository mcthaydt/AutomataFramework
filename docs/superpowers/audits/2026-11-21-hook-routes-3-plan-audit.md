# Plan audit: close the routes around the rule hooks (cycle 3)

HEADS: Framework #230 at d947cd7, Editors branch at 9013431, Examples #88 at 55f377d, Site #70 at 1c8f665.
VERDICT: FAIL until the implementation audit's R1 to R3 close; P2 is closed. Lane 3. Auditor: Opus 5.5, medium.

Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to the
spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or
incomplete integrations. Do your best work.

## P2: closed

The shell layer now refuses what it cannot read, and the release routes give one answer on every route.

## The limit of the session hook, for the owner to see once

The hook reads command text. Any program that can run another program (make, git config, an interpreter, a file
written earlier) is a new way to hide a call from it, so each cycle finds new instances. Cycle 3 asks for generic
fixes (scan the whole line, scan files as they are written, keep the hook settings and the setup script out of
reach) so this stops being a list.

What holds whatever the hook misses, once the owner commands run: no pull request merges without `gate`,
`pr-rules` and `commit-authors` from GitHub Actions, and a pull request opened past the limit is closed by
`pr-rules`. What does not: the sessions' GitHub token is a repo admin, so a hidden call could still change settings
or protection, or start the release. Only a narrower token, or a proxy rule that refuses those GitHub paths,
closes that for good, and both are the owner's to decide. This is a product decision for the coordinator to put to
the owner, not a red on this change.
