---
name: automata-api
description: Use when you need to know whether a name the framework exports exists, or which entry to import it from. Read it before you write an import.
---

# The framework's API

Every export of the framework is listed in one file, in the package: `docs/api/framework.api.md`. In a game that is
`node_modules/@automataframework/framework/docs/api/framework.api.md`. It is made from the code, so it is never out of date.

**A name that is not in that file does not exist.** Do not guess one, and do not import a name you only remember: look it
up there first. If the name you want is missing, the framework does not do it, and the rule you are writing has to.

## The three entries

| Import from | What it holds | May a rules file import it? |
|---|---|---|
| `@automataframework/framework/headless` | Everything that needs no page: the sim, content, commands, physics, saves, audio | Yes: it is the only one |
| `@automataframework/framework` | The same, and the page: the game, the picture, the controls, the browser's host | No: it needs a page |
| `@automataframework/framework/server` | The room server for multiplayer, which needs Node | No |

The rules are `src/headless.ts` and every file it imports. `automata check` fails a rules file that imports anything but
`@automataframework/framework/headless` and the game's own files.

The page's own files (`src/features/page/`) may import `@automataframework/framework`.

## Where else to look

- A content file's rules: `schemas/<kind>.schema.json` in the package, one for each kind of file, and one for a recording,
  `schemas/replay.schema.json`. Skill `automata-content` says which kind is for what.
- How a game is laid out and checked: skill `automata`.
- How to add a rule: skill `automata-rules`.
