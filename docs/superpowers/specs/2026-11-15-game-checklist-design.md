# The game checklist: every game gets it by default

The Owner, 2026-11-15: "The must haves must be baked into every game we make, and pull from the nice to haves if it
makes sense to." The Owner keeps a checklist of what a finished web game needs ("Must have" and "Good to have", in
plain words), and this spec makes every game made with AutomataFramework meet every "Must have" box **by default**:
through the framework's defaults, the starter game `automata create` writes, and checks that fail when a game breaks
one. It also takes the "Good to have" boxes that a framework can give for free.

The Owner, same day: only the boxes about **the game itself** are in scope. The parts about sending a game to a
host (the questions asked when it is sent, appeals, a store page's name, line, clips and age rating, content ratings
and the feed) are not about the game's code and are left out here.

This is **Cycle 12**, one spec and one plan (plan Q, "quality"), built in parts.

## Principles served

- **Onboarding comes first** (the Owner, 2026-11-13). Half of the "Must have" list is onboarding: a first-time player
  knows in five seconds what to do, can work it out with nobody explaining, can lose and try again, and is never left
  on a blank screen. A first-time developer gets all of it from `automata create` without reading this page.
- **1, agent-first.** Every box the framework can judge becomes a step of `automata check` (and its MCP tool), so an
  agent that breaks one is told at the file and line, in words, before a person ever plays the game.
- **The drunk-grandma test.** The new screens (Try again, How to play) and the new check sentences pass it.
- **6, the stack carries over whole.** No new dependency in the framework. The template's one possible new
  development dependency, Playwright for a real browser in the game's own CI, is the Owner's yes to Q1 below.

It breaks none: 2D only; no editor code (the editors are on hold until the mockups are approved, and nothing here
changes a shape they call); nothing ported ahead of its user (the template and the demo use every part at once).

## How each box is handled

Each box gets one of these:

- **Done**: true of every game today, with the proof (a file, a test or a CI job). A "Done" box still gains a test in
  the template's or the create journey's checks if none holds it for a made game, so it cannot quietly break.
- **Framework**: a default the plan adds to the framework, so every game that uses `startFlow` gets it.
- **Template**: a default the plan adds to the starter game `automata create` writes (`template/`).
- **Check**: a step the plan adds to `automata check` (and so to every game's CI, which runs it), or a journey in the
  framework's own CI that plays the made game.
- **Game maker**: only the game's own makers can judge it. The skills and the template's `AGENTS.md` name these boxes
  so an agent works through them, and `automata check --ship` (below) prints them as a list to try by hand.
- **Left out**: about sending the game to a host, not about the game (the Owner, 2026-11-15).

Most boxes get more than one. "Proof" names where it is held today; the plan writes the missing tests.

### Must have: It works

| Box | How | Proof today, and what is added |
|---|---|---|
| Opens and plays on an iPhone | Done + Check | The `create-play` job plays the made game in WebKit at phone sizes (`tests/create/create.journey.test.ts`). Added: the journey also plays it from the built folder, as a host serves it, not only from `automata play`. A real iPhone is the maker's (see "Check these yourself") |
| Opens and plays on an Android phone | Done + Check | The same journey in Chromium at 390×844 with touch. Added: a Chromium run with Android's user agent and a mobile viewport |
| Opens and plays on a computer | Done | The same journey at 1280×720 in three engines |
| Runs with WebGL; WebGPU optional | Done | `render/stage.ts` asks Pixi for `preference: 'webgl'`; nothing needs WebGPU. Added: a browser test that starts a game with WebGPU missing |
| Can be played with a gamepad | Done + Framework | Plan H's hero takes a gamepad; plan U's menus and pause answer one (`input/pad-menu.ts`). Added: the Try again and How to play screens (below) answer a gamepad too; a journey plays a level, loses and tries again by pad alone |
| The Play again button always works | Framework + Template | **New: losing.** The flow has no lost step today: a level can only be finished. `automata.toml` gains `lost = "<event>"`, as `done` names the event that ends a level; the flow gains a `lost` step and the **Try again** screen (Try again, the main button; Menu). Pause gains **Start again**. Both start the level afresh with no reload. The template's level gains a gap to fall into, and its hero raises `hero.fell` when it drops below the level's lowest tile (a built-in event of plan H's hero, so every built-in hero has it) |
| You can't get stuck with no way forward | Framework + Check | Pause is always there (plan U's HUD button, Escape, a pad's Start), and now pause always has Start again and Menu. Added to `automata check`: a level whose `done` event can never be raised (no door, no thing of the kind it names) is a problem at the level's file |
| Play again without reloading the page | Framework | Try again and Start again build a new sim in the same page (as Continue does today). A journey restarts 50 times in a row and checks the page did not reload |
| Works after switching apps and back | Done + Framework | A hidden page pauses the game (`game/game.ts`, `host.onVisibility`); PR 136 (I1) keeps the flow paused until Keep playing. The sound resumes on the next tap (`web/speaker.ts`). Added: a journey hides and shows the page in three engines and plays on |
| Reloading the page doesn't break it | Done + Check | The flow opens again from the saved settings and games (`flow/places.ts`). Added: the create journey reloads mid-level and at every screen |
| The page doesn't scroll around | Framework + Template | Today only the template's CSS stops it (`overscroll-behavior: none`). `startFlow` now sets it on the page itself: no scrolling of the document, no rubber band, `touch-action: none` over the game, so a game that writes its own page keeps it. A journey swipes on the game at phone size and checks the page did not move |
| The whole game fits on the screen | Done + Check | The game fills its mount (`100dvh`), every screen is laid out from the container's size (plan U, `ui/size.ts`), and screens are tested at five sizes. Added: the create journey checks at each size that the canvas and every button sit wholly inside the viewport and the safe area |
| No sound until the player taps | Done | A browser allows none; the speaker is built on the first gesture and says so with a button (`web/notice.ts`). Added: a journey asserts no sound plays before the first tap |
| You can play with the sound off | Done + Check | Nothing in the flow needs sound; volume 0 is a setting. Added: the journey plays a level and loses with the volume at 0 |
| Slow or failed loading says so | Framework | Today a failure is the problem screen in words, but a slow load is a turning ring forever. Added: the loading mark becomes a bar that fills as files arrive (no letters, since there is no language yet); after 10 seconds without a file arriving it shows the framework's "Still loading. Your internet may be slow." in the device's language; a file that fails is fetched once more, then is the problem screen with **Try again** (reload). Never a blank screen: a journey loads the game with the network slowed and with one file failing |

### Must have: There's a game here

| Box | How | Proof today, and what is added |
|---|---|---|
| In five seconds it is clear what you do | Framework + Template + Game maker | Plan H's hints show the keys or the thumbs until each is used (`input/thumb-hints.ts`). Added: the level's **goal line**, an optional `goal` message key per level (the template's: "Get to the door."), shown for three seconds when a level starts and on the pause screen. Whether it is *clear* is the maker's |
| You can win or lose, or have something to aim for | Framework + Template + Check | `done` (win) exists; `lost` (above) is added. The template has both. `automata check` warns when a game has neither `done` nor `lost`, and says what to add |
| A new player works it out alone | Framework + Game maker | The hints, the goal line and How to play (below). The rest is the maker's (and "hand it to someone" in the list to try) |
| Enough to do: a few minutes or a reason to replay | Game maker + Framework | The maker's. The framework helps with the best score (below), which is a reason to play again |

### Must have: It's its own thing

| Box | How | Proof today, and what is added |
|---|---|---|
| Not a copy, or a starter kit with nothing changed | Check | Added: `automata check --ship` fails a game that is still the starter: the name "My Game", the id `my-game`, or a level, figure or word file byte-for-byte the template's. Plain `automata check` only notes it |
| You made the art, music and characters, or may use them | Game maker | The figure builder and the photo library make art the maker owns (library photos are CC0, with their records). `automata check --ship` lists it to confirm |

### Must have: It feels finished

| Box | How | Proof today, and what is added |
|---|---|---|
| No stand-in pictures | Done + Check | A picture that is missing is a problem screen (`ArtError`); `automata art` paints every figure. Added: `--ship` fails a figure still the template's |
| No test words or numbers on screen | Check | Added: a `words` rule in the `files` step: a message that is empty, equals its key, or holds `TODO`, `FIXME`, `lorem`, `xxx` or `test` as a word is a problem, in every language. `--ship` fails on it; plain `check` notes it |
| No half-made menus | Done + Framework | The framework's screens are whole and tested; a game that replaces one (`screens`) owns it. Added: `--ship` fails a game whose `screens` option names a screen with no file |
| No hidden spots that do something when tapped | Game maker | A game's own page is its makers'. The framework's screens have none, and every button has a name (see "Easy for everyone") |
| No sloppy pictures or words | Game maker | Judged by looking. `--ship` lists it |

### Must have: It's honest

| Box | How | Proof today, and what is added |
|---|---|---|
| The store page shows the real game; the host's content rules | Left out | About sending the game (the Owner, 2026-11-15) |
| No ads; nothing pops up to cut in while playing | Framework + Template + Check | Added: the template's page carries a **strict content security policy** (below), so no ad script or outside frame can load. The framework opens nothing on its own: its only `window.open` is a link the player pressed (`host/link.ts`). `automata check`'s `rules` step, today on the game's rules only, gains a `page` part over every file under `src/`: `alert`, `confirm`, `prompt`, `window.open`, `Notification`, `document.write` and an outside address in code are problems, each sentence naming the safe way |

### Must have: It's safe

| Box | How | Proof today, and what is added |
|---|---|---|
| Never asks for a password or personal details | Check + Game maker | Added: the `page` part flags an `<input>` of type `password`, `email` or `tel`, or with `autocomplete` of a name, address or phone. A question in words is the maker's |
| Never asks for money or sends players to pay | Check | Added: the `page` part flags the Payment Request API and an outside address; the policy blocks both at run time |
| Doesn't track players or send what they do | Framework + Template + Check | The framework sends nothing anywhere (its only network is a game's own files and, online, the game's own room). Added: the policy's `connect-src` is the game's own origin plus the room server `automata.toml` names; `navigator.sendBeacon` and an outside address are `page` problems; a journey records every request a whole visit makes and fails on any to another origin |
| No other sites or windows unless asked | Done + Check | A link opens only from a player's press (`host/link.ts`). Added: as above |
| Only does what a game does; nothing hidden in the background | Framework + Check | The loop stops on a hidden page (`game/game.ts`). Added: the `page` part flags service workers, `Worker` from an outside address, `navigator.geolocation`, camera and microphone requests and clipboard reads; the policy's `worker-src` is the game's own origin |

### The policy

The template's `index.html` gains one `<meta http-equiv="Content-Security-Policy">`, the strictest that the framework
runs under (its no-eval promise is proven in `tests/features/csp/`):

`default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
media-src 'self' blob:; font-src 'self'; connect-src 'self' <room>; frame-src 'none'; object-src 'none'; base-uri 'self';
form-action 'none'`.

`'unsafe-inline'` for styles stays because Svelte and the kit set inline styles; scripts never get it. `<room>` is the
room server's address when `automata.toml` turns multiplayer on, written by `automata play` and the build. A game that
truly needs another address lists it in a new `[network] allow = [...]` table in `automata.toml`, which the policy and
the `page` check both read, so it is one documented line an agent and a reviewer can see. `automata check` keeps the
meta in the page (removing it is a problem) and reads the allow list back to the maker in `--ship`.

### `automata check --ship`

Plain `automata check` stays what a game passes every day. `--ship` is what a game passes before it goes anywhere:
every step, with the notes above turned into problems ("still the starter", placeholder words, a figure still the
template's), and at the end the boxes only the makers can judge, as a short list in plain words (the "Game maker" rows
and the "Check these yourself" list). The template's CI runs `automata check`; `--ship` is run by hand, by an agent
before a release, or by a publish step later (Release 4).

## Good to have: what every game gets

The Owner: "pull from the nice to haves if it makes sense to." The plan takes every box the framework can give a game
for free and that cannot be wrong for a kind of game; it leaves the ones that are design choices to the maker.

| Group | Taken (how) | Left to the maker |
|---|---|---|
| Playing | Pausing and carrying on (done, plan U). The score goes up when it should: `automata.toml` gains an optional `score = "<resource>.<field>"`, which the HUD shows and the flow keeps the best of (below) | It gets harder bit by bit |
| Touch | Thumb controls and big buttons (done: plan H's thumbs, plan U's kit at 44 and 48 px). Nothing against the edge (done: safe-area insets in `input/thumbs.ts`, `ui/Frame.svelte`). Double tap doesn't zoom and holding doesn't select (framework: `startFlow` sets `touch-action: none`, `user-select: none` and no callout over the game; today only the touch buttons have them). Two fingers at once (done: thumbs track each pointer). Reacts at once (done: input is read each frame, no click delay). Left and right hands (done: "Swap sides", plan U) | — |
| Phone browser | Fits as the address bar moves (done: `100dvh`; added to the journey). Sideways or asks to turn (done: every screen and the thumbs at both turns). Clear of the notch (done: safe areas). **Back does something sensible** (framework: the flow adds one history entry when play starts, so Back pauses the game, Back on pause goes to the menu, and Back on the menu leaves) | — |
| Tablets and computers | Upright and sideways (done, 820×1180 and 1180×820 journeys). Keyboard and mouse (done). Big screen not blurry (done: `resolution` follows the device's density, whole-pixel camera in `render/stage.ts`) | — |
| Speed | Same speed everywhere (done: a fixed tick, the determinism rule). No slow-down over time or restarts (check: the 50-restart journey compares the sim's entity count and the page's canvas count before and after). Small files (check: the build's total and each picture over 512 KB is a `--ship` note). Loading shown on slow internet (framework, above). The next level's files are read before it is needed (done: `loadGame` reads every file up front) | Smooth on an ordinary or older phone; flashy effects (the maker's art) |
| How it feels | No lag and no lost taps (done: every press is a command for the next tick; plan H). Buttons show they were pressed (done: the kit's pressed state). Hits land the same every time (done: determinism). Same speed on fast and slow (done). No tiny words (check: the kit's words are 18 px or more; a `--ship` note for a game's CSS under 14 px). Important things not shown with a faint flicker (framework: plan F's shake and freeze honour reduced motion) | — |
| Sound | A mute button (framework: a Sound on/off switch on the pause screen, the same setting as volume 0). Volume works (done: plan U's settings). Sound back after switching apps (done: `web/speaker.ts`). Many sounds don't get painfully loud (framework: a compressor before the speaker's master gain, beside the repeat limiter `audio/audio.ts` has). Music loops without a gap (done: notes are scheduled ahead, `audio/music-player.ts`; added: a test that a looped track has no gap at the seam) | — |
| Loading and internet | Shows progress, still loads on slow internet, retries (framework, above). Says so when the internet drops (done online: plan N's waiting screen) | — |
| Screens | Start (done: menu). **How to play** (framework: a pause and menu item that lists the hero's moves and their keys, thumbs and pad buttons, in words, from the hero's `moves` and the bindings; plus the goal line). Pause (done). **Game over** (framework: Try again, above). Clear Play again (framework). Score easy to see, best score (framework: `score`). Fits small and big phones, words stay in their boxes (done: plan U's five-size tests, which check overflow). Nothing covers what the player needs (done: the HUD sits in corners away from the jump thumb) | — |
| Saving | Best score kept (framework: the flow's progress save gains `best`). Settings kept (done). Sensible first settings (done: device language, reduced motion). Missing or broken save still opens (done: `saves/envelope.ts` reads a broken slot as a problem the saves screen shows; added: a journey with garbage in storage). Wipe and start fresh (framework: Settings gains **Delete all my saves**, with a yes/no). A new version doesn't wipe saves (done: `saves/define.ts` upgrades one version at a time; added: `--ship` fails a game whose save schema changed without `version` going up, read from the last recorded `replays/` meta) | — |
| Fair play | It isn't easier on a faster phone (done: fixed tick). What looks like a hit is a hit (done: one physics world draws and decides). Time to react (the goal line and a level start that waits for the first press, framework) | Luck never makes a level impossible; things never appear on top of the player |
| Easy for everyone | Calms down for less motion (done for the kit and loading; plan F for shake). How-to-play in words (framework, above). Buttons have names (done: the kit's `aria-label`s; added: a check that every button in the flow has an accessible name). Words readable against what's behind (check: a test of the kit's colours at 4.5 to 1, and of the template's) | Colour never the only clue; sound never the only clue (the maker's art; plan H already pairs every buzz with something drawn) |
| Polish | Something happens on score, hit and loss (template: the template's land, take and fall each have a feel file and a sound). Screens change smoothly (framework: the kit fades screens in and out, still under reduced motion) | — |

"Check these yourself" (ten minutes on real phones, one hand, bad Wi-Fi, lock and unlock, many restarts, battery, a
stranger, still fun after 30 seconds) is the maker's, and `--ship` prints it. The 50-restart, hide-and-show and
slowed-network journeys are the framework's best stand-ins.

## What gets built (plan Q, in parts)

- **Part A, the template on the flow** (this takes over plan K's Step U, the handoff in plan U's plan). The template's
  page becomes one `startFlow` call; `automata.toml` gains `levels`, `done`, `lost`, `score` and a goal; the level gains
  a gap and a door; feel and sound for take, land and fall. The template's recording (`template/replays/level-1.json`)
  **moves once**, named in its commit and shown to the Owner before and after, before it merges.
- **Part B, framework defaults.** `lost` and the Try again screen; Start again on pause; How to play; the goal line;
  `score` and `best`; the pause screen's sound switch; Delete all my saves; the page-wide touch and scroll defaults; the
  loading bar, the slow line, one retry and Try again on the problem screen; Back; the compressor; screen fades.
- **Part C, checks.** The policy in the template and its check; the `page` part of the `rules` step; the `words` rule;
  the `done`/`lost` reachability rule; `--ship` and its list; the skills and `AGENTS.md` name the maker's boxes.
- **Part D, journeys.** The create journey grows: built folder, lose and try again by touch, keys and pad, 50
  restarts, hide and show, reload on every screen, slowed and failing network, every request same-origin, fits the
  viewport and safe area, no sound before a tap, broken storage.

New words (Try again, Start again, How to play, Still loading, Delete all my saves, the sound switch, the move names)
go in the framework's library in all six languages and wait for native readers like the rest.

## Not in this cycle

- The demo game (AutomataFrameworkExamples) picks it all up when its framework pin moves past Part B; its own `lost`,
  goal lines and score are plan D's, in its repo. A handoff, not a part.
- The editors: nothing here changes what they call. Their Play stays `startGame`.
- A publish step that runs `--ship` (Release 4).
- The Ruken target stays left out (CLAUDE.md); the boxes are judged on the plain web build.

## Questions for the Owner

- **Q1. A real browser in every game's own CI.** The template's CI today runs `automata check` (files, art, rules,
  lint, types, replays, tests): no browser. The best proof that a made game opens, fits and plays is a browser playing
  it. (A) the template gains Playwright as a development dependency and a short play test in its own `tests/`, run by
  its CI in Chromium and WebKit; (B) no new dependency: the framework's `create-play` job is the only browser proof, and
  a game's own CI stays without one. **The Owner chose A (2026-11-15).** The template gains Playwright as a development
  dependency (an exact version, set by the plan) and a play test its CI runs in Chromium and WebKit: it opens the built
  game at a phone and a desktop size, plays to the end of the level, loses and tries again, and fails on any request
  to another origin.

Settled here as the builder's calls, for the audit to weigh: losing is an event named in `automata.toml` (as `done`
is); the built-in hero raises `hero.fell`; the policy's exact text and `[network] allow`; `--ship` as a flag, not a new
command; the 10-second slow line; the Good to have boxes taken and left as in the table.
