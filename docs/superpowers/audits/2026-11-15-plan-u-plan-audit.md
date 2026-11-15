# Plan U (the default game flow): plan audit

Stage 3 of the workflow, for [`plans/2026-11-15-game-flow.md`](../plans/2026-11-15-game-flow.md) as written in
`d67046b` (PR 103), against the M2 spec's "UI, screens and layouts (plan U)", "Watch mode" and "M1's deferred
minors" ([`specs/2026-11-14-m2-design.md`](../specs/2026-11-14-m2-design.md)), the
[no-default-language spec](../specs/2026-11-14-no-default-language-design.md), plan W and its audit, plan H and its
audit, plan H's build as it stands on its branch (PR 101, `b38c7e5`, not merged), and the code on `main` at `504c278`.
Written 2026-11-15.

**Verdict:** sound, and ready for stage 4 once the fixes below are in, which they are. The central calls hold
against the code: the four new project fields can be kept out of the sim in the one place that decides what the sim
hashes (`level/sim-content.ts`, whose output is all `create-sim.ts` hashes as `contentHash`), so no golden moves; the
three new features fit the layers (`ui` and `screens` above `web`, below `game`; `flow` the only one above `game`),
and everything each screen takes is in a feature below it (`Frames` is `src/lib/frames.ts`, `PadLike` and `Claim`
are `input`, `HeroBox` and `ReadPicture` are `render`, `languageRow` is `web`); every interface the plan consumes
exists on `main` or on plan H's branch under the name the plan uses (`Input`'s `capture`, `rebind`, `resetBindings`,
`inputsFor`, `dropped`, `onBindings`, `invite`, `onMenu`, `silence`; `Locale`'s `asked`, `suggested`, `wordsIn`,
`watching`; `Saves`' `check`, `list`, `erase`; `Settings.problem`; `Host.canQuit`; and on plan H's branch
`setSwapSides`, `swapSides`, `inputName`, `TouchSettingsSchema`, `TOUCH_SETTINGS_DEFAULT`, `heroControls`,
`Host.canBuzz`, `Game.setVibration`). No critical fault was found. Eight important ones were; all are fixed in the
plan. Eleven minor ones are fixed.

How it was checked: the plan and the spec sections were read whole. On `main`: `tests/architecture/rules.ts` (every
rule), `src/features/content/project.ts`, `load.ts`, `cues.ts`, `level/sim-content.ts`, `level/touch.ts` (the touch
events and their payload), `sim/create-sim.ts` (what `contentHash` covers), `game/game.ts`, `game/loop.ts`,
`game/watch.ts`, `input/pad-menu.ts`, `input/menu.ts`, `input/pads.ts`, `input/input.ts` (the `Input` interface),
`input/keyboard.ts` and `capture.ts` (where keys are heard), `locale/create.ts`, `locale/library/en.json`,
`saves/settings.ts`, `saves/slots.ts`, `saves/define.ts`, `saves/store.ts`, `host/host.ts`, `host/test.ts`,
`render/art.ts`, `tests/fixtures/game/screens.ts`, `tests/features/locale/library.test.ts`, `tests/install/`
(`smoke.mjs`, both tsconfigs), `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.build.json`,
`package.json`, `pnpm-workspace.yaml` and `.github/workflows/ci.yml` (`check`, `engines`, `screens`, `package`). On
plan H's branch: the diff's file list and the exports above. In AutomataFrameworkEditors' `main`: `package.json`,
`pnpm-workspace.yaml` and `svelte.config.js`. Nothing was run (the Owner, 2026-11-14: nothing runs locally, GitHub CI
only).

## The coordinator's questions

**Are the three Owner questions gated correctly?** They are now answered: the Owner chose the recommended option, (a),
for all three, relayed by the coordinator on 2026-11-15 (Q1 to this thread; Q1 to Q3 through the planning thread). The
plan is written to those answers, so no task changes. The question table now records the answers and the "Held for"
lines are gone. One gating fault existed and is moot: the order table said Part A needed "no Owner answer", yet Task 1
wrote the `warnings` and `splash` fields whose shape Q2 (b) and Q3 (b) would have changed, and Q3 (b) would have
added a step to Task 3's table. With every answer (a), Part A stands as written.

**Do `levels` and `done` stay out of the sim?** Yes, with one test fixed. `simContent` is the only door into the sim
(`game-sim.ts` passes `simContent(content)` to `createSim`, which hashes exactly that), and Task 1 removes all four
fields there beside `source`. Two things would have let one through: the "not given to the sim" test passed whatever
`simContent` did (I2), and the plan did not say that the early "same object" return must also check the four fields
(M7); a game writing only `levels` would then have handed the sim its project unchanged and moved its hash. Both are
fixed. Nothing else reads the project into the sim: the room's `contentHash` (`net/protocol.ts`) is the sim's.

**End-to-end tests and mobile first.** Covered: every screen has a browser test at the five `SCREENS` sizes in three
engines; Task 13 walks the flow on a real page; Task 17 is three whole visits (thumbs only on a phone, a gamepad only
on a tablet, a keyboard only on a desktop) plus every screen at every size, with pictures to `ci-screens`. Touch comes
first throughout: the primary button in the lower half on a phone, the pause button away from the jumping thumb and
outside the thumbs' element, no hover state, no small cross. The real game's journeys (the template's create journey,
the demo's) are handed to plans K and D, which own those pages.

## Important

**I1. Tasks 3 and 4 make a feature folder with no entry.** Task 3 creates `src/features/flow/steps.ts` and Task 4
`progress.ts` and `party.ts`, but `flow.ts` first appears in Task 13. The `feature-has-entry` rule fails any feature
folder without its `<feature>.ts`, so pull request A could not go green. *Fixed:* Task 3 creates `flow.ts` re-exporting
`steps.ts`, Task 4 adds its two files to it, and Task 13 fills it in.

**I2. The test that the four fields stay out of the sim cannot fail.** `expect(Object.keys(given.project)).not
.toEqual(expect.arrayContaining([four keys]))` passes as soon as one of the four is missing, and the test never wrote
`warnings`, so it passed even with three fields leaking into the sim. *Fixed:* all four are written and each is asked
about alone with `not.toHaveProperty`.

**I3. Task 2 collides with plan H's build.** Task 2 edits `game/game.ts` and `render/render.ts`; PR 101 (plan H,
in progress) changes both (39 and 14 lines), and the merge session stops on every conflict. *Fixed:* Task 2 moves to
the start of pull request B, which already waits for plan H. Part A is Tasks 1, 3 and 4 (15%); Task 1 and plan H both
touch `content/content.ts` lightly, and whichever lands second rebases.

**I4. Nothing tells TypeScript what a `.svelte` import is.** `ui.ts` imports `.svelte` files, and both `tsc -p .`
(`typecheck`) and `tsc -p tsconfig.build.json` (the declarations; `types` is empty there) read `src/` without a Svelte
plugin, so both fail on the first import. *Fixed:* Task 5 adds `src/features/ui/ambient.d.ts` (`declare module
'*.svelte'`, beside `web/ambient.d.ts`), and `ui.ts` gives every part its own `Component<Props>` type, so the declarations
and the API report never name a `.svelte` file.

**I5. The packed-install check would never read `tests/install/screens.ts`.** Both `tests/install/tsconfig.json` and
`tsconfig.ts6.json` list `files: ["consumer.ts"]`, so the `package` job copies the new file and typechecks nothing in
it; its `@ts-expect-error` would prove nothing. *Fixed:* Task 5 adds it to both `files` lists.

**I6. `svelte-check` on this repo's TypeScript is unproven.** The plan cites the Editors as proof of the versions, but
the Editors' only TypeScript is 6.0.3; this repo's is 7.0.2, and the override that would point `svelte-check` at
`typescript-6` is aimed at a peer dependency, which a pnpm override may not reach. *Fixed:* Task 5's first push prints
which `svelte-check` and which `typescript` it resolves; a TypeScript 7 there counts as a failed attempt under the
plan's own stop rule (two attempts, then stop and report; never swap tools).

**I7. A crate in the door would end the level.** `<kind>.touched` is raised for anything that touches a `sense` thing
(`level/touch.ts`), with `player` 0 when the toucher is not a hero. With `done = "door.touched"`, pushing a crate into
the door finishes the level: a drunk-grandma failure and a wrong "Well done!". *Fixed:* builder's call 4 says an event
whose payload has a number `player` counts only when it is 1 or more, and Task 13 gains the test.

**I8. Escape "on the mount" is not heard after a tap on the canvas.** A `keydown` goes to the focused element, and the
mount holds the focus only sometimes; `input/keyboard.ts` and `capture.ts` listen on the window for that reason.
*Fixed:* the flow listens for Escape on the window while the step is `playing`.

## Minor

- **M1.** Task 7 said `library.test.ts`'s number of words waiting for a native read is "updated"; the test holds
  `waiting` equal to `total` and writes no number. Reworded: the printed count rises, nothing in the test changes.
- **M2.** `grandma.test.ts` asked every screen for exactly one primary button; the splash and the hud have none.
  They are exempt.
- **M3.** Before there is a language (bad files), the problem screen's reload button had no word and none of the six
  icons fit. A seventh icon, `reload`, is drawn; the button is icon-only and primary, named by a developer line.
- **M4.** `Flow.game` and `Flow.locale` were `readonly` fields that change; they are functions, like `state()`.
- **M5.** The watching row did not say watching is silent and single-player (the spec's words); it does.
- **M6.** "A recording that cannot be read is skipped as `loaded` with `watch: false`" needs the flow to await the
  recording and `watchReplay` before it raises `loaded`; said.
- **M7.** `simContent`'s early return must also check the four fields (see the coordinator's second question).
- **M8.** `jumpSide` was undefined for a hero without `moves` (M1's touch buttons, jump on the right); said.
- **M9.** Task 2 listed `web/picker.ts` for a change it does not need: `createMenu` already names the pad, and the
  picker's one-argument listener still fits. Removed.
- **M10.** `svelte.config.js` has no `vitePreprocess`, unlike the Editors'. Kept: Svelte 5 reads type syntax in
  `<script lang="ts">` itself. Said in Task 5, with the one thing that would need it (TypeScript that emits code).
- **M11.** After a watcher takes over, the locale is made again; `followLanguage` and later screens must be given the
  new one. Said on `Flow.locale()`.

## Checked and sound

- The flow's table: every arrow in the Owner's order is there, `enter` puts the warnings before the flags exactly when
  Q2 (a) says they can be read, a taken-over watch skips the splash and the menu once (the spec: "Play goes to the
  title screen's first action"), and the events that mean nothing hand back the same object, which is what makes
  Review Focus 5 (one done screen, one save) a property of `advance`.
- The settings screen opened from the menu builds an `Input` on an element not on the page; `createInput`'s keyboard,
  capture and first-touch listeners are on the window, so capture works there as it does in a game.
- `padMenu` naming its pad is a one-line change: `createMenu` already calls its listeners with `(press, pad)`.
- The pictures: `engines` uploads `tests/**/__screenshots__/**` and `screens` copies them flat to
  `ci-screens/pr-<n>/<engine>/`, so Task 17's `flow-*.png` names arrive as the plan says.
- Words: no default language (no `'en'` in `src/`, words through keys), US spelling, nothing names a colour, no
  "slot", "binding" or "locale" on a screen; every button word at most four words.

## Handed on

Nothing new. The plan's Handoffs (plans K, D, T, F, N and the Editors) stand as written.
