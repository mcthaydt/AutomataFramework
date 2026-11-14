# Watch mode: the demo game plays itself before Play is pressed

An addendum to [`2026-11-13-2d-first-layer-design.md`](2026-11-13-2d-first-layer-design.md). That spec says the home
page has "the demo game playable on the page"; it does not say what a visitor sees before pressing Play. The Owner
decided it (2026-11-14, the site's design audit, Q3 b): **the game plays its recorded play by itself on arrival, and
Play hands over the controls.** Until this is built the site shows the game's real picture.

## Principles served

- **1, agent-first.** The recorded play is a documented file (`replays/<level>.json`) and watching is one documented
  address (`?watch`) and one documented function (`watchReplay`). An agent can record a new play, read it, and see
  it shown, with the same commands a person uses. Nothing about watching is kept anywhere but those files.
- **6, the stack carries over.** Watching is the deterministic sim playing a replay: the same file CI already plays
  in four engines. No video, no new dependency.
- **Onboarding comes first** (the Owner, 2026-11-13). A visitor sees what the game is, and what to do in it, before
  pressing anything.

It breaks none: it is 2D only, each repo changes only its own part, and nothing is ported.

## What a visitor sees

1. They arrive at the home page. The game's place shows the game's real picture, as today.
2. Once the game's place is near the window, the game loads behind the picture. When it is ready the picture gives
   way to the game itself, playing the recorded play of its first level: the box walks, pushes the other box, jumps.
   Nothing of the site's is drawn over it. Nobody is asked to press anything for this to happen.
3. They press any Play button. The same game, with no reload, starts the level again from the beginning with the
   controls in their hands: keys on a computer, the game's own buttons under a thumb.
4. If the game cannot be watched (an old build, a broken or missing recording, a browser that stops it), the picture
   stays and Play works exactly as it does today. Watching never puts a problem on the screen.

## The three parts

**The framework** gains one function, `watchReplay`, beside `startGame`: it draws a loaded game playing a `Replay`,
with no keyboard, no touch buttons and no recorder. Every game made with the framework can use it, for a title
screen's backdrop as much as for a site. It plays the commands whatever the content is now (as `playReplay` does),
so an editor's change to a level does not stop it; a replay made for another seed or tick rate is refused in words.

**The demo game** opens watching when its address ends in `?watch`, and playing otherwise. Watching, it reads
`replays/<the first level>.json` beside the page (the same file CI checks, now copied into `dist/`), says
`data-state="watching"` on its root, and waits to be told to play. It is still while it is off the screen. Told to
play, it stops the recording and starts an ordinary game from the beginning.

**The site** frames `/play/?watch` on arrival instead of waiting for Play, keeps the picture until the game says it
is watching, and on Play tells the game to hand over. The picture stays in the page for everyone the game is not
loaded for.

## How the page and the game talk

Two messages, both `postMessage`, both plain objects, and nothing else:

| From | To | Message | Meaning |
|---|---|---|---|
| the game | the page that frames it | `{ "automata": "state", "state": "watching" \| "playing" \| "problem" }` | sent each time the game's state changes |
| the page | the game | `{ "automata": "play" }` | stop watching; start the level with the controls live |

The game sends only to its own origin and listens only to its parent at its own origin; the site listens only to its
own frame at its own origin. A game framed by another site (itch.io) is never told to play by it and simply plays
when touched (see Q2). The game's root keeps `data-state`, so a journey or an agent reads the same state from the
page.

## Not in this addendum

- Sound. The game has none yet; when it does (M2), a watching game is silent.
- A way to pick which recording is watched. It is the first level's, the file the site's numbers already come from.
- Watching in the editors.

## The Owner's answers (2026-11-14)

The Owner chose: **Q1 (a), Q2 (a), Q3 (b), Q4 (a).** The game says "The game is playing by itself. Tap it to play."
while it watches; a tap or click on the moving game starts it (a dragging finger still scrolls the page); it plays
itself for every visitor, including those who asked for less motion or to save data; and it plays again and again with
a one-second rest between, for as long as it is on the screen. The questions below are kept as they were asked, so the
reasons stay with the answers.

## The questions as asked

Each had a recommendation. The plan's tasks that depended on an answer waited for it.

**Q1. The words at the top of the game while it plays itself.** *Answered (a).*
Today the strip says "You are the box on the left.
Push the other box." and what to press, which is not true of a recording.

- (a) New words while watching: "The game is playing by itself. Tap it to play." **Recommended.** (If Q2 is (b):
  "The game is playing by itself. Press Play to try it.")
- (b) No words while watching: only the game's art. The site's own bar above it says "Play it".
- (c) Today's words stay, so a watcher reads the goal while seeing it done.

**Q2. Touching the moving game.** *Answered (a).*

- (a) A tap or click on the game starts it, the same as a Play button. A finger that drags across it scrolls the
  page instead. **Recommended:** a moving game invites a tap, and one that ignores it looks broken.
- (b) Only the Play buttons start it.

**Q3. Visitors who asked their device for less motion, or to save data.** *Answered (b).*

- (a) They keep the still picture, and the game loads when they press Play, as today. **Recommended.**
- (b) The game plays itself for everyone.

**Q4. How long it plays.** *Answered (a).* The recording is six seconds.

- (a) Again and again, with a one-second rest between, for as long as it is on the screen. **Recommended.**
- (b) Three times, then it holds its last moment until Play.
- (c) Once, then it holds its last moment until Play.
