# My Game

A small game made with [Automata Framework](https://github.com/mcthaydt/AutomataFramework): a hero, a crate to push,
a spark to take, and everything a game needs to be checked and played. Change it, make it yours, and keep it in a repository of your own.

## Play it

```
cd my-game
npm install
npm run dev
```

The game opens in your browser. Hold the left or right arrow key to move, and press Space to jump. Push the crate, and touch the spark to take it.

## Change something

1. Open `content/levels/level-1.json`. The `tiles` are the level's walls, one letter for each square: `#` is a wall and
   `.` is air. Make a wall longer, or add a gap.
2. Open `content/characters/crate.json` and change its `color`.
3. Open `content/tunings/hero-moves.json` and change a number, like `walk-speed` or `jump-speed`. To give the hero a
   double jump, a wall jump or a dash, put `"double-jump": true`, `"wall-jump": true` or `"dash": true` in `moves` in
   `content/characters/hero.json`. A dash also needs a `dash` entry in the tuning file's `controls`, copied from `jump`.
4. Open the file of your game's language in `content/messages/` (`source` in `automata.toml` names it) and change a
   word. The game says it in six languages: write the same key in the other five files too, and `npm run check` names
   any that is missing.
5. Open `content/figures/crate.json` and change a paint's `color`, then run `npm run art` to paint its picture again. Commit
   the picture with the file.
6. Make a new sound with `npx --no automata sound new coin`, say when it plays in `content/cues/cues.json`, and run
   `npm run dev` again.

## Give it a name

Open `automata.toml` and change `name`. It is the name a person reads.

## Check it

```
npm run check
```

It says whether the game is sound, and if it is not, which file to fix and what is wrong with it. `npm run fix` puts
the files in their standard form for you. If you meant to change how the game plays, `npm run check` will say the
recording in `replays/` no longer matches; run `npm run accept` to record the new play.

## Where things are

| What | Where |
|---|---|
| The game's name, first level and files | `automata.toml` |
| Levels and characters | `content/` |
| What things look like, painted by `npm run art` | `content/figures/` |
| The words, one file for each language | `content/messages/` |
| Sounds, songs and what plays when | `content/sounds/`, `content/music/`, `content/cues/` |
| How the hero moves: its numbers and its controls | `content/tunings/` |
| The game's own rules (the score) | `src/features/` |
| The page that shows the game | `src/features/page/` |
| A recorded play, checked on every run | `replays/` |

An agent that works on this game starts at `AGENTS.md`.
