# Constraints

The learning edge of the work graph (`docs/rules.md`, "How work runs"). When a result is accepted or a finding
repeats, its cause becomes a constraint: a check if a program can see it, otherwise one line here. The plan and every
review split read this page when they cut the work, and hand the lines that apply to each node's brief.

One line each, newest last: the date, the rule, and why. A line carries the rule, never the output it came from. A
line a program now checks is deleted, and the page stays under 40 lines (the `agent-rules` check holds it there), so
prune the weakest line before adding one.

- 2026-11-16: A claim that a test or picture shows something names the run or file that shows it; an unsourced claim
  is not a finding. (Reviews that agreed without evidence.)
- 2026-11-16: A new pull request's body is read back after it is made, and a credit footer the tool added is taken out
  with the GitHub update call; a `gh api` edit puts it back. (`commit-authors` failed on every new pull request.)
- 2026-11-16: Code under `src/`, `tests/` and `scripts/` gives an exported value an explicit type
  (`isolatedDeclarations`), and `.mjs` files are written as Biome formats them. (Both failed the first CI run here.)
