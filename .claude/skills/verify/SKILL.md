---
name: verify
description: Use when a change alters what the product does, before calling it done and before each commit that changes behavior: starts this repo's app or game from a clean checkout and drives it the way a person would.
---

# Verify

The runtime (`@automataframework/framework`) for 2D games. What a person ships is a game made from it, so this skill makes a game from the packed package with `automata create`, as `tests/create/made-game.ts` does, and plays it.

## Start it

From a clean checkout in a cloud container, in order. First pick the Node version (or other runtime) that `engines` in `package.json` asks for. Then install, build, and start every stand-in for an outside service (a database, payments, mail, sign-in), never the real one.

```sh
export SCRATCH=<the scratchpad directory your session names>     # set it first; nothing below works without it
export PATH=/opt/node24/bin:$PATH     # Node 24; the default `node` is 22
rm -rf "$SCRATCH/repo" && git clone -q . "$SCRATCH/repo" && cd "$SCRATCH/repo"     # the clean checkout: a fresh clone of this one, at its HEAD
pnpm install --frozen-lockfile
pnpm build
pnpm pack --pack-destination "$SCRATCH/pack"
mkdir -p "$SCRATCH/made game" && cd "$SCRATCH/made game"     # a space in the name, as a person's folder often has
npx --yes --package "$SCRATCH"/pack/*.tgz automata create my-game --source en --framework "file:$(ls "$SCRATCH"/pack/*.tgz)"
cd my-game && npm install --no-audit --no-fund
(setsid npm run dev -- --no-open --port 5199 > "$SCRATCH/play.log" 2>&1 &)     # `npm run dev` is `automata play`
for i in $(seq 60); do curl -sf http://localhost:5199/ >/dev/null && break; sleep 1; done     # up to 60 tries, once a second
for i in $(seq 60); do grep -q 'ready in' "$SCRATCH/play.log" && break; sleep 1; done
grep -q 'ready in' "$SCRATCH/play.log" && curl -sf http://localhost:5199/ >/dev/null && echo ready || { echo "not ready"; tail "$SCRATCH/play.log"; }
```

`$SCRATCH` is the scratchpad directory your session names; replace the `<...>` on the first line with its full path. Run the block from the root of this repo's checkout, since the clone is of the directory it runs in. The clone holds only committed files, so commit the change first (a local commit is enough), or the run shows the old code. There is no outside service to stand in for. Where `package.json`, `tests/create/made-game.ts` or this list differ, the files win and this skill is fixed.

It is ready when `$SCRATCH/play.log` says `ready in` and `curl -sf http://localhost:5199/` answers; the block prints `ready` when both hold. Last clean start, timed with `date` before and after: about 22 seconds warm and 42 seconds cold to ready (fresh-session runs), on commit 39cf051.

## Drive it

Open it in a real browser: the Chromium and Playwright the container already has (`require('playwright')`, then `chromium.launch()`), at each size in the device matrix in Settings. Tap, click, type and press keys the way a person would, and find things by their label or role. Take a screenshot at deviceScaleFactor 1 for your own check, and save it in the scratchpad, never in the repo. The main screen, what it shows and how to use it:

The language picker: the title "Play in English", six flags (English first, with a white ring) and a big Go button. Press Go and the menu follows, then Play, and the first level opens. At 390 wide and 820 wide it shows the same, with touch buttons.

```js
// Save as $SCRATCH/play.cjs, then run: cd "$SCRATCH" && SCRATCH="$SCRATCH" node play.cjs   (Node 24; `require('playwright')` already works)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await p.goto('http://localhost:5199/');
  await p.getByRole('button', { name: 'Go' }).waitFor();                    // the picker is drawn once Go shows; before that it is a loading bar
  await p.screenshot({ path: `${process.env.SCRATCH}/main.png` });          // the picker
  await p.getByRole('button', { name: 'Go' }).click();
  await p.locator('#game[data-state="menu"] [data-screen="menu"] button').first().click();   // Play
  await p.locator('#game[data-state="playing"]').waitFor();
  await p.waitForFunction(() => window.automataGame !== undefined);          // the page sets it a moment after the level opens
  const x = () => p.evaluate(() => window.automataGame.sim.describeSnapshot().entities.find((e) => 'player' in e.components).components.transform.x);
  const before = await x();
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(800); await p.keyboard.up('ArrowRight');
  console.log(before, await x());                                           // it grew: the hero walked
  await p.screenshot({ path: `${process.env.SCRATCH}/playing.png` });
  await b.close();
})();
```

Repeat at 390x844 and 820x1180 with `hasTouch: true`, and 1280x720 without, for the device matrix.

## The journeys

One line each, from a person's side: where it starts, the steps, and what they see at the end.

- Make a game and play it: `automata create`, install, `npm run dev`; pick a language, Go, Play, walk right with the arrow keys, jump with Space; the hero moves and the score changes when a spark is touched (`tests/create/checklist.journey.test.ts`).
- Lose and try again: walk into a hazard; "You lost" shows with a Try again button; Enter (keys) or a tap starts a new attempt on the same page.
- The online room: two players in one room, as `tests/journeys/online.journey.test.ts` plays it with `node tests/fixtures/online/server.ts` and the fixture page. Run it with `pnpm test:journeys` (Chromium only on a draft) rather than by hand.

## Stop it

Stop every server it started and clear what it wrote, so the next run starts clean.

```sh
pkill -f 'automata play'; pkill -f vite
rm -rf "$SCRATCH/repo" "$SCRATCH/made game" "$SCRATCH/pack" "$SCRATCH/play.log" "$SCRATCH/play.cjs" "$SCRATCH/main.png" "$SCRATCH/playing.png"
```

## When it breaks

A step that breaks or flakes is fixed in this skill first. Each known way a start or a step fails, what it looks like, and the fix:

- `automata: command not found` or a Node 22 error: `export PATH=/opt/node24/bin:$PATH` first; `engines` asks for Node 24.21 or newer.
- `TypeError: Cannot read properties of undefined (reading 'sim')`: `window.automataGame` is set a moment after the level opens, so the picker and menu come first and then `waitForFunction(() => window.automataGame !== undefined)`.
- `Ignored build scripts: msgpackr-extract` or `npm warn install-scripts` during install: expected and harmless; the game runs without it.
- `main.png` shows only a loading bar: wait for the Go button before the screenshot.
- Port 5199 already in use: a run before did not stop; run the stop commands.
- `git clean -xfd` is refused in some containers; the clean start is a fresh clone into `$SCRATCH/repo` (the first start commands), so nothing needs cleaning.
