---
name: verify
description: Use when a change alters what the product does, before calling it done and before each commit that changes behavior: starts this repo's app or game from a clean checkout and drives it the way a person would.
---

# Verify

The runtime (`@automataframework/framework`) for 2D games. What a person ships is a game made from it, so this skill makes a game from the packed package with `automata create`, as `tests/create/made-game.ts` does, and plays it.

## Start it

From a clean checkout in a cloud container, in order. First pick the Node version (or other runtime) that `engines` in `package.json` asks for. Then install, build, and start every stand-in for an outside service (a database, payments, mail, sign-in), never the real one.

```sh
export PATH=/opt/node24/bin:$PATH     # Node 24; the default `node` is 22
pnpm install --frozen-lockfile
pnpm build
pnpm pack --pack-destination "$SCRATCH/pack"
mkdir -p "$SCRATCH/made game" && cd "$SCRATCH/made game"     # a space in the name, as a person's folder often has
npx --yes --package "$SCRATCH"/pack/*.tgz automata create my-game --source en --framework "file:$(ls "$SCRATCH"/pack/*.tgz)"
cd my-game && npm install --no-audit --no-fund
(setsid npm run dev -- --no-open --port 5199 > "$SCRATCH/play.log" 2>&1 &)     # `npm run dev` is `automata play`
```

`$SCRATCH` is the scratchpad directory. There is no outside service to stand in for. Where `package.json`, `tests/create/made-game.ts` or this list differ, the files win and this skill is fixed.

It is ready when `curl -sf http://localhost:5199/` answers and `$SCRATCH/play.log` says `ready`. Last clean start, timed with `date` before and after: 46 seconds from a fresh clone to the page answering (clone 0 s, install 9 s, build 3 s, pack and create 14 s, game install 14 s, ready in 1 s), on commit 011c616.

## Drive it

Open it in a real browser: the Chromium and Playwright the container already has (`require('playwright')`, then `chromium.launch()`), at each size in the device matrix in Settings. Tap, click, type and press keys the way a person would, and find things by their label or role. Take a screenshot at deviceScaleFactor 1 for your own check, and save it in the scratchpad, never in the repo. The main screen, what it shows and how to use it:

The language picker: the title "Play in English", six flags (English first, with a white ring) and a big Go button. Press Go and the menu follows, then Play, and the first level opens. At 390 wide and 820 wide it shows the same, with touch buttons.

```js
// $SCRATCH/play.cjs, run with `node` under Node 24 (`require('playwright')` already works)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await p.goto('http://localhost:5199/');
  await p.screenshot({ path: `${process.env.SCRATCH}/main.png` });          // the picker
  await p.getByRole('button', { name: 'Go' }).click();
  await p.locator('#game[data-state="menu"] [data-screen="menu"] button').first().click();   // Play
  await p.locator('#game[data-state="playing"]').waitFor();
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
rm -rf "$SCRATCH/made game" "$SCRATCH/pack" "$SCRATCH/play.log"
```

## When it breaks

A step that breaks or flakes is fixed in this skill first. Each known way a start or a step fails, what it looks like, and the fix:

- `automata: command not found` or a Node 22 error: `export PATH=/opt/node24/bin:$PATH` first; `engines` asks for Node 24.21 or newer.
- The page answers but `window.automataGame` is undefined: the game only exists after Play is pressed; click through the picker and menu first.
- Port 5199 already in use: a run before did not stop; run the stop commands.
- `git clean -xfd` is refused in some containers; use a fresh clone in the scratchpad instead.
