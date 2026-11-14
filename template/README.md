# My Game

A small game made with [Automata Framework](https://github.com/mcthaydt/AutomataFramework): a hero, a crate to push,
and everything a game needs to be checked and played. Change it, make it yours, and keep it in a repository of your own.

## Play it

```
npm install
npm run dev
```

The game opens in your browser. Hold the left or right arrow key to move, and press Space to jump. Push the crate.

## Change something

1. Open `content/levels/level-1.json`. The `tiles` are the level's walls, one letter for each square: `#` is a wall and
   `.` is air. Make a wall longer, or add a gap.
2. Open `content/characters/crate.json` and change its `color`.
3. Open `src/features/hero/move.ts` and change `RUN` or `JUMP`. A bigger `JUMP` is a higher jump.
4. Run `npm run dev` again.

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
| The rules (how things move) | `src/features/` |
| The page that shows the game | `src/features/page/` |
| A recorded play, checked on every run | `replays/` |

An agent that works on this game starts at `AGENTS.md`.
