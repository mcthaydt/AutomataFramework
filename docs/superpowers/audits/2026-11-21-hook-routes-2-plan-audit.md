# Plan audit: close the routes around the rule hooks (cycle 2)

HEADS: Framework #230 at 35dc957, Editors branch at 0e0ccda, Examples #88 at 433acc8, Site #70 at 64cc05a.
VERDICT: FAIL, 1 red. Lane 3. Auditor: Opus 5.5, medium.

Audit all of your work for completeness, consistency, cohesion, and harmony, both within itself and relative to the
spec and relative to the codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or
incomplete integrations. Do your best work.

## Cycle 1's P1: closed for `gh api`

`gh api` writes now pass only through an allowlist of judged routes, with paths normalized and unknown paths
refused, and the owner commands pin the required checks to GitHub Actions and turn off squash and rebase merges.
That is the class fix P1 asked for, for `gh api`.

## Red

### P2. The same rule must hold for the other two layers: the shell and the non-API routes

UNIT: the approach. REQUIREMENT: "Close all gaps." REASON: closed-by-default holds for `gh api` paths, but (a) gh
subcommands and GitHub MCP tools are still an open list (a release runs through `gh workflow run` and MCP
`actions_run_trigger` while the REST dispatch is refused), and (b) the shell layer still waves through what it
cannot read (a program in a variable, a pipe into a shell, a script made in the same call). FIX: apply the same
two rules there. Unread is refused: any command the hook cannot resolve before it runs, when the line could reach
GitHub. One answer per action: each refused REST write is refused on its gh subcommand and MCP twins. The
implementation audit's R1 to R3 are the instances to test.
