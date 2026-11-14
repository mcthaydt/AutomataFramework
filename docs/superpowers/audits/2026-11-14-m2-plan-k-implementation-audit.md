# M2 plan K (the `automata` command, MCP and skills): implementation audit

Stage 5 of the workflow, for the code of [`plans/2026-11-14-m2-cli.md`](../plans/2026-11-14-m2-cli.md) Part 1 as
merged in PR 71 (`d7677e2`, Tasks 1 to 10 and 12 to 15) and PR 77 (`b91e52b`, Task 11, `automata mcp`), against that
plan, its [plan audit](2026-11-14-m2-cli-plan-audit.md) (PR 69), the [M2 spec](../specs/2026-11-14-m2-design.md) ("The
agent tools (plan K)") and the build's reported deviations. Written 2026-11-14. Part 2 (Steps A, P, S, T, L and U) is
not built yet and is out of scope.

**Verdict:** the build is sound and close to the plan. Every Part 1 task is there; every finding of the plan audit is
in the code but one (M16, below); the two new goldens are the only files under `tests/golden/` and `template/replays/`
that moved, each in a commit that names it (`b8ede1f`, `c969079`); CI on `main` at `b91e52b` is green in every job
(`check`, `package`, the three `engines`, `online`, `create-pack`, `create` on Linux, Windows and macOS, `create-play`,
`screens`). There is nothing critical. Two findings are important: what a game's rules print breaks `--json` and,
through a play session's Worker, the MCP protocol itself, which Review Focus 4 said could not happen; and a recording
that started with nobody (a co-op room's) is played with player 1, which undoes the plan audit's M16. Seven minor
findings and the notes follow, then the fixes, all applied on this branch. Every reported deviation is accepted. There
is no Owner question.

**How it was checked.** Every file under `src/features/cli/`, `src/cli.ts` and `src/lib/imports.ts` was read in full,
with the template (`template/`), the skills' sizes and the template's `AGENTS.md` and `README.md`, the memory layer
(`tests/fixtures/cli/`), the tests' names against the plan's, the smoke (`tests/install/create-smoke.mjs`) and
`vite.config.ts` and `package.json`. `verifyReplay`, `spawnLevel` and the room engine's replay were read where the
command depends on them. Node's behaviour for a Worker's output was taken from its documentation (`new Worker`'s
`stdout` option: unless it is `true`, the Worker's stdout "is automatically piped through to `process.stdout` in the
parent"). The checks on `b91e52b` were read with `gh run view`. Nothing was run locally.

## Critical

None.

## Important

**I1. What a game's rules print breaks `--json`, and a play session's print breaks `automata mcp`.**
The plan promises that `--json` "prints one JSON value on stdout and nothing else there", and Review Focus 4 lists "a
game whose rules call `console.log`" among the things after which "nothing but protocol ever reaches stdout". Two
holes:

- `automata check --json` and `automata replay --json` run the rules (the `replays` step) in the command's own process
  with `console` untouched, so a rule's `console.log` lands on stdout before the JSON. An agent typing the command gets
  text that does not parse; the MCP `check` and `replay` tools, which run exactly that command as a child
  (`Runner.command`), fail to parse it and answer `isError` with the raw text (`command-answer.ts` falls back to what
  was printed). The rule an agent is debugging is the one most likely to print.
- A play session runs in a `node:worker_threads` Worker started with no `stdout` option, so everything the Worker
  writes to its stdout is piped straight into the server's own stdout, past the `console` that `serveMcp` points at
  stderr. A rule that prints during `play_step` puts a line that is not JSON into the protocol. The test that claims
  otherwise (`mcp.test.ts`, "console.log from inside the rules reaches stderr") runs the session in the test's own
  process (the memory layer's worker), where the patched `console` hides the hole; the smoke's MCP step changes the
  rules but never makes them print.

*Fix:* `printToStderr` moves to its own file (`stderr.ts`), and `main` uses it for the whole run whenever `--json` is
given; the live Worker is started with `stdout: true` and its output is written to stderr. Tests: `stderr.test.ts`; in
`replay.test.ts`, a noisy rule under `--json` leaves stdout one JSON value and puts its line on stderr; and the smoke's
rule change (step 7, on three systems) now also prints on every tick, and both `replay --json`'s stdout and the MCP
server's every line and `replay` answer must parse as JSON.

**I2. A recording that started with nobody is played with player 1 (the plan audit's M16, undone).**
M16 fixed `meta.players` of `''` (a co-op room starts with nobody and heroes join by command; the room engine's replay
records exactly that) to mean no players. `playersOf` in `replay.ts` first turned `''` into `[0]`, and the Task 13
commit (`ff45f72`) fixed that by turning every empty answer into `[1]`, so that a recording with no `players` line at
all (the template's own `level-1.json` has `"meta": {}`) plays for player 1. That conflated two cases: a co-op
recording is now played with a hero who was never there, and `automata replay` calls it `diverged`. The same holds for
a play session an agent starts with `players: []` and saves. *Fix:* no `players` line is player 1, as before; `''` is
nobody; any other word is kept, so the level's own sentence ("Players are numbered 1 to 4, but one is NaN.") says what
is wrong. Test: a recording made with nobody plays "as recorded", and one whose `meta` has no `players` still plays
for player 1. No golden moves: neither golden has `players: ''`.

## Minor

- **M1. Words after the folder are dropped in silence.** `automata check my game` (a name with a space, typed without
  quotes) checks `my` and says nothing of `game`; `automata replay a.json b.json` plays only `a.json`. `parseArgs`
  keeps them in `rest` (the contract), and nothing reads it. *Fix:* the command refuses, exit 2:
  `automata check takes one folder, but more words came after "my": game. A folder with a space in its name goes in
  quotes, like "my games/first one".`
- **M2. `play_step` takes `"01"` or `"1.0"` as player 1, then holds nothing for them.** The player check reads the key
  with `Number`, and the tick loop looks the key up as `String(player)`. *Fix:* the key must be the number as the game
  writes it; `There is no player 01 in this game. It has: 1.`
- **M3. `play_save` writes over a recording that is already there,** the game's own `replays/level-1.json` included,
  so an agent could replace a recorded play without `automata replay --accept` and without anyone being told. *Fix:*
  `There is already a recording called <name>, in replays/<name>.json. Pick another name, or delete that file first.`,
  and nothing is written.
- **M4. `automata play` on a game that is not installed says "Starting My Game. Press Ctrl+C to stop." and then that
  the game's tools are not installed.** *Fix:* the sentence comes first and alone; nothing starts.
- **M5. A recording in a folder under `replays/` cannot be named.** `check` finds `replays/runs/first.json` (the files
  port lists the folder deeply) and tells the person to run `npm run accept -- replays/runs/first.json`, but
  `replayTarget` takes the folder above the file's folder as the game (`replays/`), which is not a game. *Fix:* the
  game is the folder above the last `replays` in the path. (The MCP `replay` tool's `file` still takes a name in
  `replays/` itself; that is what its description says.)
- **M6. `create`'s "Next:" line is not something a person can paste when the path has a space.** `cd my games/x`.
  *Fix:* the folder is quoted when it needs to be: `cd "my games/x"`.
- **M7. Task 15's boxes were never ticked,** though its work was done in PR 71 and PR 77 and the tracker says 100%.
  This audit repeated Step 1's checks: the goldens (above), no source file over 600 lines (the longest, `live.ts`, is
  under 360), Effect imported only under `src/features/cli/` and in `server/process.ts`, no `any`, no bare `npx
  automata` in the template, the skills or the README. *Fixed:* the boxes are ticked.

## Notes (no change)

- **The reported deviations are accepted.** `TOOLS` became `mcpTools(sessions)`, since play sessions belong to one
  server; `Runner.command` adds `--json` itself, so a tool hands it only the command's words; skills are listed in name
  order (`a686e9b`), which is stable on every file system; Node's own `(node:…)` notices are dropped from a child's
  error text, since they are not what the command said; and `Code.load` no longer `realpath`s the framework's folder,
  since Windows' 8.3 short names made two copies of it. The last reverses the plan audit's "One copy of the sim" note
  on purpose and stays right: Node's loader resolves a pnpm symlink to its real path by itself, so the command and the
  rules still share one copy. `CliError` is a plain class, not Effect's `Data.TaggedError`, because the declaration
  build cannot name the latter's `extends` call; its `_tag` keeps it distinguishable. `CheckReport` gained `advice`
  (the "run npm install" sentence) and `GameCode.rules` gained `actions`; both are additions the plan's tests asked
  for in other words.
- **Tests were pushed with the code, not red first** (the execution report says so). This was a process deviation, not
  a defect in what merged; every test this audit added was written against the code as it was and fails on it.
- **The rules step reads text** (the plan's call 10) and so does not see `Math['random']`, `Date()` without `new` or a
  name built at run time. The replays catch what it misses; no change.
- **A play step blocks the server for up to 3,600 ticks.** Messages are answered one at a time; a minute of play takes
  well under a second on the runners. No change.

## Fixes applied on this branch

| Finding | Where | Test |
|---|---|---|
| I1 | `src/features/cli/stderr.ts` (new), `cli.ts` (`main`), `mcp.ts`, `live.ts` (`startWorker`) | `stderr.test.ts`; `replay.test.ts` "--json is the only thing on stdout"; `create-smoke.mjs` step 7 |
| I2 | `replay.ts` (`playersOf`) | `replay.test.ts` "a recording that started with nobody" (`nobodysPlay` in `tests/fixtures/cli/recording.ts`) |
| M1 | `cli.ts` (`run`) | `cli.test.ts` "words after the folder are refused" |
| M2 | `session.ts` (`step`) | `session.test.ts` "\"01\" is not player 1" |
| M3 | `session.ts` (`save`) | `session.test.ts` "never written over" |
| M4 | `play.ts` | `play.test.ts` "told so before anything starts" |
| M5 | `replay.ts` (`replayTarget`) | `replay.test.ts` "a recording in a folder under replays/" |
| M6 | `cli.ts` (`create`) | `create.test.ts` "quoted in the cd line" |
| M7 | the plan's Task 15 | none |

No golden moves. No new dependency.
