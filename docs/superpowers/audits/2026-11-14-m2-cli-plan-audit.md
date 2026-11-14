# M2 plan K (the `automata` command, MCP and skills): plan audit

Stage 3 of the workflow, for [`plans/2026-11-14-m2-cli.md`](../plans/2026-11-14-m2-cli.md) as merged in `641584b`
(PR 67), against the [M2 spec](../specs/2026-11-14-m2-design.md)'s "The agent tools (plan K)", its Goals, anti-goals,
Testing and "Done means", M1's minors M4, M5 and M9, the first-layer spec's layer 15 and "Agent skills ship with the
package", the code on `main` at `641584b`, and the other M2 plans as they stand there: C, I, V and N (built and fixed),
P (built and audited; its fixes merged as PR 68 while this audit was written), and A, S and T (planned and audited, not built).
AutomataFrameworkExamples (`main`), AutomataFrameworkSite (`facts`) and AutomataFrameworkEditors were read where the
plan touches them. Written 2026-11-14.

**Verdict:** sound in shape and ready for stage 4 once the Owner answers Q1, which holds Task 11 and only Task 11. The
central calls hold against the code: the command is one more entry of the one package, every command is an Effect
program over four ports a Node test can fake, a game is checked with the framework it installed, and the template is a
real game this repo's CI plays in four engines. One critical fault was found: a long-running `automata mcp` keeps
answering from the game's code as it was when first loaded, so the agent loop the plan exists for would be told "as
recorded" after the agent changed the rules. Eight important faults were found, the worst two being that `npx
automata` in a folder without the install fetches an unrelated npm package called `automata`, and that the "not on npm
yet" route the README gives cannot be followed with npm alone. All nine are fixed in the plan. Twenty minor findings are
fixed or handed to the plan they belong to, and the end-to-end proofs gain seven checks.

How it was checked: the plan was read whole, and the spec's parts named above. On `main`, read for every call the plan
makes: `src/features/commands/` (`replay.ts`, `play.ts`, `recorder.ts`, `sequence.ts`, `players.ts`, the entry),
`src/features/sim/create-sim.ts` (the schema hash and what it covers, `describeSnapshot`, the 16-world limit),
`dmath.ts`'s exports, `src/features/level/game-sim.ts`, `src/features/game/` (`game.ts`, `watch.ts`, `online.ts`),
`src/headless.ts`, `src/index.ts`, `tests/architecture/rules.ts` (`LAYERS`, `PURE_FEATURES`, `PAGE_FEATURES`, the
package rows, the import patterns), `package.json` (`files`, `exports`, `prepare`), `vite.config.ts`,
`.github/workflows/ci.yml` (every job), `vitest.config.ts`'s projects, `tests/install/` and M1's audit for M9. Plans A,
S and T for every name Part 2 calls, and plan A's audit I7. In Examples: `src/headless.ts`, `src/features/plugins/`,
`package.json`, `tests/replay/`, `tests/journeys/`. In the Site: `src/features/facts/parse.ts`. The npm registry for
`@modelcontextprotocol/sdk` 1.32.2 and for the name `automata`. Nothing was run.

## The coordinator's questions

- **Can `main` take Part 1's fifteen tasks today, ending in a journey on Linux, Windows and macOS?** Yes. Every name
  Tasks 1 to 15 consume is on `main`: `createGameSim` (async), `loadGame`, `parseContent`, `writeContent`,
  `formatDiagnostic`, `PROJECT_FILE`, `CONTENT_TYPES`, `jsonSchemaFor`, `parseReplay`, `verifyReplay`, `playReplay`,
  `createRecorder`, `writeReplay`, `ReplaySchema`, `createSequence`, `controlsCommand`, `Player`, `Thing`, `Transform`,
  `Body`, `FRAMEWORK_VERSION`, `openSettings`, `startGame` and `webHost`; the nine `dmath` functions Task 4 names are
  exactly the nine `dmath.ts` exports; `describeSnapshot().header.schemaHash` exists and plan N already sends it on
  the wire. The order is right: Task 2 before Task 7, so the template's recording is format 2; Task 13 before Task 14
  is safe because the `package` job already proves TypeScript 7 reads the `.ts` paths in the declarations. The
  journey on three systems is Task 13, with gaps on Windows and macOS (I8) and in what an agent is shown doing (E1 to
  E3).
- **Part 2's steps after plans A, P, S, T, L and U.** Right in kind: one step per built-in, never ahead of it. Every
  name Steps A, S and T call is in those plans' contracts (`artFiles`, `artProblems`, `paintedPath`, `readPicture`,
  `Listed.hero`, `GameAudio`, `webSpeaker`, `testSpeaker`, `audio.log()`). Three corrections: each step waits for its
  plan's fixes stage, not only its build (M12); Steps L and U are written against plans that do not exist yet (M20); saves
  and online play, both on `main`, had no step and no line saying why (M13).
- **Does the template work under either answer to plan A's pictures question?** Yes, with one fix. The sim never
  reads a painted file (plan A's atlases are "for people and other tools"; clips and `Sprite` use the sheet the painter
  computes), so `replays` and the play sessions do not care where pictures live; `create` and `play` paint, so a new
  game has them under either answer; and the two lines that differ are as the plan says. What the plan missed: a
  painted atlas is a `.json` under `content/` that `automata.toml` does not list, and Task 3's "not listed" rule would
  call every one of them a problem (I4).
- **Task 15's command for the four new required checks.** It is the form plan N's `online` check was added with, so it
  works on `main`'s protection. It holds only if each `create` job is named `create (<os>)`, which needs a matrix of
  one key, `os`, and no `name:` on the job; the plan now says so and gives the command that reads the list back (M15).
- **Q1, how `automata mcp` speaks MCP.** Still the Owner's, sent on to the coordinator, not defaulted. The audit agrees
  with (b). The facts check out: 1.32.2 is the newest version (published 2026-10-23), MIT, with seventeen direct
  dependencies (`express`, `hono`, `@hono/node-server`, `cors`, `jose`, `ajv` and more), and more beneath them, which
  (c) would put in every game (M17). The fixes here do not change what Q1 holds.
- **Are the end-to-end tests adequate?** Nearly. The plan's two jobs are a real proof: a clean folder, the packed
  package, three systems, an agent over stdio, three browsers at five sizes. Missing: an agent that changes the code
  between two calls (the C1 fault would pass every test as written), the `.mcp.json` a game ships, `create` over MCP
  (the spec's "Done means"), `play` off Linux, the workflow a new game ships, the route the README gives while the
  package is not on npm, and the first-time player's first look at the page. E1 to E7 add them.

## The Owner question

**Q1. How `automata mcp` speaks MCP (a new dependency).** As the plan puts it, unchanged: (a) our own small server
and no dependency; (b) our own server and `@modelcontextprotocol/sdk` 1.32.2 for development only, so CI drives it with
the official client (recommended, and the audit agrees: it is the only proof that a real client can talk to us, and
nothing reaches a game's install); (c) the SDK at run time, which brings seventeen packages and their own into every
game. Task 11 waits; Tasks 1 to 10 do not.

## Critical

**C1. A running `automata mcp` answers from old code.** Node keeps every module it has imported for the life of the
process, keyed by its address. `Code.load` imports the game's `src/headless.ts` (and through it every rules file)
once; the next `check`, `replay` or `play_start` in the same server gets the same modules back. So an agent that runs
`replay` (ok), changes `move.ts`, and runs `replay` again is told "as recorded", and a new play session plays the old
rules. That is the agent's whole loop through MCP, and nothing in the plan's tests reaches it: every MCP test runs on
the memory layer, and Task 13's step 7 changes nothing between calls. A query on the top file's address would not
cure it, because the files it imports keep their own addresses. *Fixed:* the server runs game code only in a fresh
place. `check`, `replay` and `create` start the command itself as a child (`process.execPath`, the package's own
`dist/cli.js`, the command and `--json`), which also makes the "same as typing" column literally true and keeps
Koota's sixteen worlds per process out of the server's way; each play session is a `node:worker_threads` Worker,
started by `play_start` with its own modules, and the answer says a session plays the rules as they were when it
started. `serveMcp` takes a `Runner` port for this, faked in memory. Task 11 and Task 12 gain the tests, and E1 proves
it in the clean folder.

## Important

**I1. `npx automata` can run someone else's package.** The npm registry has a package called `automata` (3.0.4, a
state-machine library, no `bin` today). In a folder where the game's install is missing, `npx automata …` does not find
our bin and fetches that package, and npm assumes "yes" when its input is not a terminal or it sees CI, which is how
an MCP client starts a server. Today it fails with npm's own words; if that package ever gains a bin, it runs. The plan
writes `npx automata` in `.mcp.json`, `AGENTS.md`, the skills, the README and the help sentences. `npx` as an MCP
command also fails on Windows in most clients, which need `cmd /c` for it. *Fixed:* `.mcp.json` starts
`node node_modules/@automataframework/framework/dist/cli.js mcp` (no `npx`, the same on every system); what a person
types is an `npm run` script (`dev`, `check`, `fix`, `test`, and a new `accept` for `automata replay --accept`), and
what an agent is told to type is `npx --no automata <command>`, which refuses to fetch anything. The words test in
Task 7 and the skills test in Task 10 fail on a bare `npx automata`. This also settles Review Focus 1's real path:
before `npm install`, `npm run check` gives npm's "automata: not found", so the README's "Start here" says, in one
line, that this means `npm install` was skipped.

**I2. The README's "not on npm yet" route cannot be followed with npm.** The README tells a newcomer to make a game
with `--framework github:mcthaydt/AutomataFramework#<commit>`, and the template and README use npm. npm builds a git
dependency by running its `prepare` script, and the framework's is `pnpm build`: a machine with only Node has no
`pnpm`, so `npm install` fails. Examples does not see this because it installs with pnpm. *Fixed:* Task 14 changes
`prepare` to `node --run build` (Node 24's own script runner; the same build, under pnpm and npm alike) and the
`create` job's Linux leg makes a second game with `--framework github:…#<this commit>` and installs it with npm (E6).

**I3. The template's recording is a golden that nobody else knows about.** `template/replays/level-1.json` is outside
`tests/golden/`. Plans A, S and T are being built beside this one, and each one's "no golden moved" check is `git diff
main -- tests/golden`; the merge session watches the goldens it is told about. Any later change to the default sim's
shape or play turns the template's parity test red in a pull request whose author was never told the file exists.
Task 2's parity test also commits a schema hash inside a test file, a second hidden golden. *Fixed:* `CLAUDE.md`'s
Structure gains `template/replays/` as a golden (Task 7); the template's parity test fails with a message that says
what moved and that the Owner sees before and after (as Examples' does); Task 2's value goes to
`tests/golden/schema-hash.json` (M5); and the handoff asks the coordinator to tell the merge session and the plans in
flight (A, S, T) the day Task 7 merges.

**I4. Painted atlases would fail the `files` step.** Task 3 makes "a `.json` under `content/` that `automata.toml` does
not list" a problem. Plan A paints `content/figures/<id>.atlas.json` beside every figure and backdrop, never listed.
Under answer (a) they are committed and the step fails on every game with a figure; under (b) it fails after any
`play`, `create` or `art` on the person's own machine. *Fixed:* Step A widens the rule to "not listed and not painted
from a listed file" (`artFiles`' paths), with a test under each answer.

**I5. Two jobs would run each other's journeys.** `online` runs `pnpm test:journeys`, which is every
`tests/journeys/**/*.journey.test.ts`; the create journey placed there would run in `online` with no tarball and fail,
and `create-play` running "the journeys project" would run the online journey a second time. Both jobs upload
`tests/journeys/__screenshots__/**`, so the pictures would mix. *Fixed:* the create journey is its own Vitest project,
`create`, in `tests/create/` (`create.journey.test.ts`), run by `create-play` alone; it uploads `screens-create`,
which the `screens` job's `screens-*` pattern already collects.

**I6. Review Focus 4 and 5 promise more than the tests reach on Windows and macOS.** Only `create` runs off Linux, and
it never starts `play`: the one command that hands a terminal to a child, forwards signals and waits on a port.
Windows has no SIGINT to forward, and a `.cmd` child under `shell: true` is the likeliest thing to be left running.
*Fixed:* the `create` job gains a step (E4): `npm run dev -- --no-open --port <free port>`, wait for Vite's line, fetch
`/` and `/content/levels/level-1.json` (both 200, the level's text), stop it the way that system stops a child, and
check the port is free.

**I7. A first-time player is told nothing.** Until Step U the template's page is a hero and a crate. On a phone the
touch buttons say what to press; on a desktop nothing does, and the README is not on screen. The project's rule is
that a first-time player learns what to do, how, and that they did it. *Fixed:* `page.ts` shows one line of words over
the game on a keyboard device, "Arrow keys to move. Space to jump.", from the game's own bindings, gone after the
first move and back on a fresh page; the browser test and the create journey check it (E7). Step U replaces it with
the framework's screens.

**I8. The README and the journey can still drift on the first command.** `START_HERE` is said to tie the README, the
smoke and the README test together, but the README's first command, `npx @automataframework/framework create my-game`,
cannot be what the smoke runs (the package is not on npm), and the smoke runs `npm install <tarball>` and `npx automata
create` instead. *Fixed:* the smoke runs the README's first line with one swap it names, the package for the tarball
(`npx --yes --package <tarball> automata create my-game --framework file:<tarball>`), and `tests/docs/readme.test.ts`
checks the other words are the README's.

## Minor

- **M1.** `Code.load` returns `GameCode` or a `CliError`, but Task 3 needs a third answer: the game's framework loaded
  and its `src/headless.ts` broken (`codeProblem`, with the `files` step still using the game's framework). *Fixed:*
  `GameCode.rules` is `{ plugins } | { problem: Diagnostic }`.
- **M2.** `instanceof` fails across two copies of the framework (`ReplayFormatError`, `LevelError`,
  `SimFaultedError`), which is the case when the command and the game's install differ. *Fixed:* the command tests
  errors from game code with the game copy's own classes (`code.framework.ReplayFormatError`).
- **M3.** `cli-has-no-page` reads `PAGE_FEATURES` (render, input, web, game today); `story`, `ui` and `screens` join
  later and the rule would miss them until someone remembers. *Fixed:* the rule allows `cli` only the features
  `src/headless.ts` re-exports, read from its text.
- **M4.** The rules step's lists miss `Math.asinh`, `acosh` and `atanh` (not exact), `crypto.getRandomValues` and
  `crypto.randomUUID` (dice), `requestAnimationFrame`, `setImmediate` and `queueMicrotask` (time), and `process.`
  (Node). *Fixed:* each joins the row it belongs to, with a test.
- **M5.** Task 2's parity test kept the schema hash inside the test. *Fixed:* `tests/golden/schema-hash.json`,
  recorded in CI the way the other goldens are (I3).
- **M6.** Examples' `tests/replay/level-1.parity.test.ts` (line 63) reads `verdict.detail` for every reason but
  `diverged`; `code-changed` has no `detail`, so Examples' types fail when its pin passes Task 2.
  *Handed to plan D* and the pin-moving pull request: use `'detail' in verdict`, as `test-game.parity.test.ts` does.
- **M7.** When the content and the rules both changed, `content-changed` hides the second. A format 2 replay knows
  both hashes. *Fixed:* the content-changed verdict carries `rulesChanged: boolean`, and the sentence adds "Its rules
  have changed too." when it is true.
- **M8.** Task 10's double jump "type-checks", but a module made from the skill's text at test time is never seen by
  `tsc`. *Fixed:* `tests/skills/double-jump.ts` is committed, `tsc` checks it, and the test says the skill's code
  blocks are that file's text.
- **M9.** The tarball check should name the dot paths, which packers treat specially: `template/.mcp.json`,
  `template/.github/workflows/check.yml`, and `template/replays/level-1.json`. *Fixed.*
- **M10.** The `create` job built and packed once per system. *Fixed:* `create-pack` builds and packs once on Linux and
  uploads the tarball; the three `create` legs download it, so every system tests the same bytes, as a release would
  ship them.
- **M11.** `play_step` with an action the game does not have, or a player not in the game, would be refused by the sim
  in silence. *Fixed:* `"<action>" is not one of this game's actions: left, right, jump.` and `There is no player <n>
  in this game. It has: 1.`, as results with `isError`.
- **M12.** Step P was free to start after PR 46, before plan P's eight fixes (stage 6). Those merged as PR 68 while
  this audit was written, so Step P is free once Part 1 merges. *Fixed* for the rest: every Part 2 step starts after
  its plan's fixes stage merges, not only its build.
- **M13.** Saves (plan V) and online play (plan N) are on `main`, in no step, and in no "not here" row. *Fixed:* Step U
  brings saves with the saves screen; a row says online stays off in the template, the per-game choice the spec gives,
  with plan N's README as the way to turn it on.
- **M14.** Call 9 says the skills are in "the format agents' tools already read". True of the format, not the place:
  tools load skills from their own folders, not `node_modules`. *Fixed:* the README and `AGENTS.md` say to read them,
  and `automata mcp` serves them; nothing claims they load by themselves.
- **M15.** Task 13 now pins the matrix to one key, `os`, with no job `name:`, so the contexts are `create
  (ubuntu-latest)` and so on; Task 15 adds the command that reads the list back.
- **M16.** A co-op game's replay can record `players` as `''` (a room starts with nobody, heroes join). *Fixed:* `''`
  is `[]`, not `[NaN]`, with a test.
- **M17.** Q1 (c)'s "seventeen packages" is the direct count. *Fixed* in the plan's words.
- **M18.** A `#` import (a package's `imports`) was "any other package" to the rules step. *Fixed:* it is resolved
  through the game's `package.json` `imports`, and refused with its own sentence if it cannot be.
- **M19.** Task 13's Step 2 expected the two jobs to fail on "their first assertions that are not yet true (they
  should be few)", which no one can check. *Fixed:* the first push has the script, the journey and the workflow
  tests, and the red run is the workflow test (the jobs are not in `ci.yml` yet); the jobs then go green or name a
  port to fix.
- **M20.** Steps L and U are written against plans that do not exist. *Fixed:* each says that plan's own audit checks
  the step against its handoff, and that what is on `main` wins.

## The end-to-end proofs, added

- **E1.** An agent changes the code between two calls (C1): over MCP, `replay` is ok; the smoke adds 1 to the run
  speed in `move.ts`; `replay` answers `diverged`; `play_start` plays the new speed; the file is put back.
- **E2.** The server is started exactly as the game's `.mcp.json` says, on all three systems (I1).
- **E3.** `create` over MCP (the spec's "an agent through `automata mcp` can create"), then `check` on the new folder
  before its install: the `npm install` sentence, exit 2 in the report (Review Focus 1, for real, on three systems).
- **E4.** `play` on Windows and macOS (I6).
- **E5.** The workflow a new game ships: the Linux leg runs each `run:` line of the new game's `check.yml`, in order,
  read from the file.
- **E6.** The `github:` route the README gives while the package is not on npm, installed with npm (I2).
- **E7.** In `create-play`, the hint is on screen before the first move on a keyboard, gone after it, and not shown on
  touch (I7).

## Checked and found right

- **The schema hash.** It covers plugin names, components, commands, events, resources, systems and plugin configs, so
  it moves when the rules change shape and not when only their arithmetic does, as Task 2 says; `diverged` is the
  right answer for the second, and its sentence points at `src/`. Content first is right: a joint or a figure in the
  content switches a plugin on and moves the schema hash too.
- **The order in `verifyReplay`.** Setup, content, then hashes is what `main` does; Task 2 slots the rules between
  content and hashes. Every caller that sees `content-changed` today still does.
- **M5's checks.** The recorder never writes a check at tick 0 or at the last tick, and `verifyReplay` compares by
  position, so refusing unordered or repeated checks is what makes "the same tick, not the same place" true. No golden
  on `main` and neither of Examples' recordings breaks the new rules.
- **Format 1 still reads.** Examples' two goldens and the Site's `facts` (it reads `ticks` and `finalHash` only) are
  untouched.
- **One copy of the sim.** Node resolves a pnpm link to its real path, so `realpath` plus `import()` names the same file
  the game's own import does, under npm and pnpm.
- **Type stripping.** Node refuses it only under `node_modules`; a game's `src/` is not, and the template's
  `"type": "module"` makes its `.ts` files modules. Task 1's smoke proves it before anything rests on it.
- **The template's name.** Leaving `name = "My Game"` keeps the recording valid; the content hash covers the name and
  nothing in `package.json` or `page.ts`.
- **Effect and the layers.** `effect` is already a runtime dependency; the rule's `only` list widens by one folder.
  `cli` last in `LAYERS`, reached only from `src/cli.ts`, mirrors the `server` rule on `main`.
- **The required-checks command** is the form the `online` check was added with.
- **Q1's facts.** 1.32.2 is current, MIT, two weeks old and more; seventeen direct dependencies.
- **Proportion and percentages.** Part 1's 70% is fifteen tasks at 4.5% and 2.5%; Part 2's 30% is six steps at 5%.

## For other plans, not fixed here

- **The coordinator and the merge session:** `template/replays/level-1.json` and `tests/golden/schema-hash.json` are
  goldens from the day Tasks 2 and 7 merge; tell plans A, S and T (I3).
- **Plan D:** `verdict.detail` in `level-1.parity.test.ts` before the pin passes Task 2 (M6).
- **Plans L and U:** their audits check Steps L and U against their handoffs (M20).
