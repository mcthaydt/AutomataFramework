# Implementation audit: the framework's M1 thin thread

Written 2026-11-13. Stage 5 (Implementation audit) of cycle 1, for `main` at `b7b672f` (PR 6), read against the
[spec](../specs/2026-11-13-2d-first-layer-design.md), the
[plan](../plans/2026-11-13-m1-thin-thread-framework.md), the
[plan audit](2026-11-13-m1-framework-plan-audit.md), `CLAUDE.md` and [`progress.md`](../progress.md) (the stage 4
handoff, rulings and deferred minors).

## The answer first

The build is what the plan asked for, and it holds together. Every M1 framework item in the spec is on `main`, all 15
tasks are done except the publish check (Task 15 Step 5), the plan audit's B1 to B5 and S1 to S9 were applied where
they fall, and `main` is green: 370 Node tests in 56 files, 106 browser tests in 13 files on Chromium, the WebKit,
Firefox and `package` jobs passing. The three goldens were recorded once from Node's log and have never moved since.
WebKit and Firefox match them in CI. No commit carries AI attribution, every commit is by McThayDT, and no strategy text is
in the tree or its history.

Nothing here blocks M1. There are **eight should-fix findings** for Stage 6 (Fixes), F1 to F8. The two that matter most
are a blank canvas when the game is resized while it is still (F1) and boxes that a person can hardly see against
the sky (F3). Nine minor items are noted for later plans (M1 to M9).

Two things are still open and are **not code findings**:

- **Publishing waits on the Owner.** The `release` run on `main` (run 43508244662) failed with `ENEEDAUTH`, because the
  repository has no `NPM_TOKEN` secret. Once the Owner adds it, re-running that run publishes 0.1.0 (see F2 for how
  the workflow should change first).
- **The phone and tablet pictures were not looked at.** The cloud container's network refuses the host GitHub keeps
  Actions artifacts on (`productionresultssa7.blob.core.windows.net`), through the GitHub tool and through
  `gh run download` alike. The artifacts exist (`screens-chromium`, `screens-webkit`, `screens-firefox` on run
  43508244678, two PNGs each). The drunk-grandma check below is worked out from the code and the layout arithmetic,
  and says so. The pictures still need a person's eyes, or a session on a network that allows that host.

## Method

- Read every file under `src/features/{commands,content,level,render,input,host,game}` and the two entries in full;
  the lifted `sim` and `physics` files were checked where the plan changed them (renames, `fixedRotation`, gravity,
  errors) and against what the upper layers rely on.
- Read the CI and release workflows, the `main` run's job list and the Node and Chromium logs (test counts above). The
  WebKit and Firefox logs were not read line by line; both jobs passed.
- `git log -p` on `tests/golden/` to check that no hash moved after it was first recorded; `git log` for authors and
  attribution; a search of the tree for strategy words.
- Colour contrast worked out with the WCAG formula from the colours in the code and the fixture.
- No tests were run (project rule). Nothing here was measured in a browser.

## Against the spec and the plan

| M1 framework line | Where | Verdict |
|---|---|---|
| sim | Tasks 2 to 4, lifted | Done |
| physics | Task 5, lifted, `fixedRotation` added | Done |
| commands and replay | Tasks 6, 7 | Done |
| content, level and character only | Tasks 8, 9 | Done |
| render | Task 11 | Done (F1) |
| keyboard and touch input | Task 12 | Done (F4, F6) |
| the web host | Task 13 | Done |
| published to npm | Task 15 | Built and packed; publishing waits on `NPM_TOKEN` |
| one replay hash in four engines | Tasks 4, 5, 10 | Done: `bounce` `021df7c6554d00c6`, `physics-scene` `76f6444ea2fe50e3`, `push-crate` `70ab51b4547bd369`, `idleHash60` `fa986edc200c5437` |

The interfaces in the plan match the code, name for name, including the contract in "What the other repos rely on":
the two entries, the project file, the level and character files, `writeContent`, the JSON replay, `playReplay`
and `verifyReplay`. The dependency order holds (`render` reads `level` and `physics` through their entries; `game` is
the only feature that wires the rest together), no file passes 600 lines (`create-sim.ts` is the longest at 578), and
only the dependencies the plan and the Owner allowed are in `package.json`.

## Should fix (Stage 6)

**F1. A resize while the game is still leaves a blank canvas.** `createRenderer` refits on every `ResizeObserver`
call, and `stage.resize` calls `app.renderer.resize`, which sets the canvas's width and height. Setting those clears a
WebGL drawing buffer. Nothing draws again until the loop's next frame, and while the game is paused by hand
(`game.pause()`) the loop asks for no frames. So turning a phone while paused shows an empty canvas until the player
resumes. This was found by reading; no test covers it. *Fix:* the renderer keeps the last views it drew and draws them
again after a refit. Add a browser test: pause, resize the mount, and expect a draw. The same change can also cover
the first-frame minor (M1): draw once when the renderer gets its first delta, not only on the next frame.

**F2. `release.yml` publishes without waiting for CI.** It runs on every push to `main`, at the same time as `ci`, so a
version can go to npm from a commit whose checks then fail. *Fix:* start the release from `ci` finishing green on
`main` (`on: workflow_run`, `workflows: [ci]`, `types: [completed]`, with the job guarded by
`github.event.workflow_run.conclusion == 'success'` and checking out `github.event.workflow_run.head_sha`), and add
`workflow_dispatch` so a release can be started by hand once `NPM_TOKEN` exists. Do this before the Owner re-runs the
failed release, so the first publish already goes through the gate.

**F3. The boxes are hard to see against the sky** (drunk-grandma). The sky is fixed at `SKY_COLOR` `#9fd3f0`, and every
box is drawn as a flat fill with no outline. Against that sky, the fixture's crate (`#c9a227`) has a contrast of 1.5 to
1 and the hero (`#e4572e`) 2.3 to 1. WCAG asks 3 to 1 for a shape a person must make out. The Examples game starts from
these files, and a game cannot change the sky. On a phone held upright, the hero is about 20 by 24 pixels (see F4).
*Fix:* in `stage.ts`, draw every `Look` box with a dark outline (one pixel wide whatever the scale, for example
`#1b1b24`), so any colour reads against any sky. Changing the fixture's colours is not needed then.

**F4. On a phone held sideways, the touch buttons sit over the play area, and nobody has seen it.** Upright (390 by
844), the 16 by 9 level fits as a 390 by 219 strip with its top at y 312, and the buttons sit in the sky below it,
which is fine. Sideways (844 by 390), the level fills the height (43.3 pixels a tile, 75-pixel bars at the sides). The
left buttons, 64 pixels tall and 16 pixels from the bottom, then cover the bottom two rows of tiles at the left, and
the hero, which starts at (2.5, 7.5), about x 166 to 201 and y 303 to 347, is partly under the Right button (about x 96
to 174, y 310 to 374). The buttons are see-through, but a
thumb on Right hides the hero it moves. The test takes pictures at 390 by 844 and 820 by 1180 only, both upright.
*Fix in Stage 6:* add the two sideways pictures (844 by 390, 1180 by 820) to `game.browser.test.ts`, so the Owner
sees it. *The layout itself* (moving the level up, or the buttons out of its way) belongs with M2's layouts, which
cover "upright and sideways" in claim 1. That's an Owner's call (question 1 below).

**F5. The touch buttons' words are a little faint over the sky.** White 18 px bold text on `rgba(20,20,30,0.45)` over
`#9fd3f0` comes to 4.3 to 1. 18 px bold is just under WCAG's "large text", so it needs 4.5. *Fix:* raise the
background's alpha to 0.55, which gives 5.7 to 1.

**F6. `checkControls` lets two mistakes through to a crash.** It checks the action name, the label and keys used twice,
but not `side` or `keys`. A game written in JavaScript, or an agent that writes `side: 'Left'`, gets
`TypeError: Cannot read properties of undefined (reading 'append')` from `createTouch` instead of a sentence. *Fix:*
check that `side` is `'left'` or `'right'` and that `keys` is a list of strings, with messages in the file's voice
(for example `The action "jump" has side "Left". Use "left" or "right".`), and test both in `controls.test.ts`.

**F7. The README's example drops the place of a problem.** It prints `${d.file}: ${d.message}`, so
`content/levels/a.json: tiles[1]: This row has 15 tiles…` loses `tiles[1]`, the part that says where to look. *Fix:*
use `formatDiagnostic`, which is exported for exactly this.

**F8. Two docs are behind the code.** `CLAUDE.md`'s Structure block still lacks `src/headless.ts`, `tests/lib/`,
`tests/fixtures/` and `tests/install/` (the plan audit's N6). `progress.md` still said the plan audit was in review.
This audit updates `progress.md`. *Fix:* add the four paths to `CLAUDE.md` in Stage 6.

## Minor (noted, not fixed now)

**M1. The first frame draws only sky** (deferred by Stage 4). Confirmed. The first loop frame only sets the clock, and
the scene is empty until the first step's resync delta, so a page shows sky for one frame, about 16 ms. *Ruling:*
acceptable for M1. F1's fix closes it for free if it draws on the first delta.

**M2. `game.replay()` throws after `game.stop()`** (deferred by Stage 4). Confirmed: `recorder.replay()` asks the
disposed sim for its hash and gets `SimDisposedError`. It is now written on `Game.replay`. *Ruling:* acceptable for M1.
M2's saves plan should have `stop()` keep the last replay, so "save what I just did" works after quitting.

**M3. A game whose code throws has no broken state.** The loop stops and rethrows (Stage 4's ruling), but `startGame`
does not know. The next visibility change calls `loop.start()` again, the faulted sim throws again, and so on, one
error per tab switch. Nothing is lost or corrupted. *For M2's screens:* a faulted game should stay stopped and say so.

**M4. A replay cannot tell "the game's code changed" from "the play diverged".** `Replay` records the content hash but
not the sim's schema hash, so a replay played against changed game code, or a new framework version, says
`diverged` at the first check, not why. The plan defined the format this way, and Review Focus 5 asked only about
content. *For the M2 plan:* add the schema hash to the replay (format 2) and a `code-changed` verdict, since agents
change code more often than content.

**M5. `parseReplay` does not check `checks`.** Ticks out of order, repeated, or past `ticks` are accepted, and
`verifyReplay` compares checks by position, so a hand-edited replay can report a wrong `diverged` tick. Only a person
or agent editing a replay meets it.

**M6. Zod's `jitless` is set only by the browser entry.** An editor that imports only `/headless` in a page under a
strict CSP would have Zod probe `new Function`. The Editors repo sets its own CSP, so this is a note for its plan, not
a defect here.

**M7. The canvas's resolution is fixed when it is made.** Moving the window to a screen with another pixel density
leaves it blurry until reload.

**M8. Stacked tile runs leave seams.** Each row's run is its own box, so a wall several tiles tall is several boxes,
and a body sliding down it can catch on the joins. The M1 level has only a floor; the M2 levels will have walls.

**M9. The packed `.d.ts` files keep `.ts` import paths.** The install smoke proves they resolve for a TypeScript 7
consumer, the stack's version. A consumer on another version is not tested. The Examples repo uses the same stack, so
this matters only for outside games.

## The rulings, reviewed

Each ruling in `progress.md` was checked against the code. All stand.

- **Task 12.** `ACTION_NAME` and `MAX_ACTIONS` shared from `commands`: right, one definition. Keys with Ctrl, Cmd or
  Alt left to the browser: right, or Cmd+R would make the hero jump. Touch buttons at least 64 px, tested at 48: right.
  Above both the 44 and 48 px floors.
- **Task 13.** A throwing frame stops the loop and rethrows: right, see M3 for what is missing above it. Controls
  checked before the sim is made: right, and tested. Screenshots git-ignored and uploaded: right.
- **Task 14.** `load.ts` imports relatively, so the declarations resolve: right. `sideEffects: false` dropped because
  `src/index.ts` sets `jitless` on load: right; with it, a bundler could drop that line. The api-report lifted without
  its break check: right for 0.1.0. *It must return before 0.2.0*, when there is a published report to compare with.
  `schemas/` and `docs/api/` out of Biome: right, they are written by scripts, and CI checks them.
- **Task 15.** A git identity and `git push origin --tags` in the release job: right, since `main` is protected and
  the checkout is detached. Provenance on: right.
- **Task 5.** After a restore, the physics adapter trusts the entity's `fixedRotation`: right. The stated cost (an
  edit between the last sync-in and a snapshot is lost in the restored sim) is real but needs a game to toggle
  uprightness mid-tick, which nothing does.
- **Task 9.** Two files claiming one id reported: beyond the plan, and right for an agent.
- **The whole-branch fix.** A thumb sliding from one button onto the next presses the second: right, and it is tested.

## Drunk-grandma check, from the code

What a person sees, worked out from the code (not from the pictures; see "The answer first"):

- **Upright phone (390 by 844):** sky, with the level as a strip across the middle (390 by 219), a dark floor, a
  mustard box (the crate) and a smaller red-orange box (the hero), each about 20 to 24 pixels. At the bottom, three
  buttons with plain words: Left and Right in the left corner, Jump in the right. The words say what to press.
  F3 and F5 make the boxes and the words easier to see.
- **Tablet (820 by 1180):** the same, larger (51 pixels a tile), easy to see apart from F3's contrast.
- **Sideways phone:** not pictured. The buttons cover the hero's corner (F4).
- **What is happening:** nothing on screen says which box is you or what to do. In M1 that is the Examples game's
  job, since title and help screens are M2, so it is not counted here. It belongs in M2's screens plan.

## For the Owner

1. **Sideways layout on phones (F4).** Option A (recommended): add the sideways pictures now, and fix the layout
   with M2's layouts, where claim 1's "upright or sideways" is planned. Option B: also move the level and the buttons
   apart in Stage 6, which pulls a piece of M2's layout work forward.
2. **`NPM_TOKEN`.** Add it as a repository secret (Settings, Secrets and variables, Actions). After Stage 6 lands F2,
   start the release by hand (or re-run run 43508244662) and check that npm shows 0.1.0.
3. **The pictures.** Either open the `screens-*` artifacts on run 43508244678 yourself, or allow
   `productionresultssa7.blob.core.windows.net` in the cloud environment's network settings so a session can read
   them.
