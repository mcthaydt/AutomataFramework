# No default language

An addendum to [`2026-11-14-m2-design.md`](2026-11-14-m2-design.md) (its "Languages (plan L)" part). The Owner's direction
(2026-11-14): **English is not the default language anywhere a player or an editor user looks.** In the Owner's words:
"let's also not make it where english is just like the default language, that's a bit racist". Localization is first class.

Plan L, as built on `main`, made English the source, the fallback and the first in every list. This spec takes that
out. Each game names the language its team writes in, a player with no match is asked rather than given English, and
lists put the player's own language first. It also adds the `automata words` command the Owner approved, so the
translated words can be listed and marked as read against the game's own language.

## Principles served

- **1, agent-first.** The game's own language is one documented field in `automata.toml`. Which words a native speaker
  has read is the documented `automata.translations.toml`. Both can be read and changed with one command
  (`automata words`) and one MCP tool (`words`), the same way by a person or an agent. Nothing is assumed that is not
  written in a file.
- **2, iPad-first editors.** The editors follow the same rules (no default language, a first-run picker, the player's
  own language first), and the picker works by touch first.
- **The drunk-grandma test and onboarding come first** (the Owner, 2026-11-13). A first-time player who does not read
  the team's language is never dropped into it. They see flags, press theirs, and the game speaks it from then on.

It breaks none: it is 2D only, nothing is mixed in from 3D, and nothing new is ported. It adds no dependency.

## The Owner's answers (2026-11-14)

| Question | Answer |
|---|---|
| Q1. Scope | **Players and editor users only.** Developer text (the `automata` command's sentences and check results, its help, the README, the skills, the template's `AGENTS.md`) stays in English. This is a deliberate choice and not a gap to close: Google Translate covers it. |
| Q2. A player whose languages the game does not have | **They are asked.** No language is chosen for them. |
| Q2, also | **The game's default flow:** Warnings (if needed), then the Language picker, then the Splash, then the Main menu, then Gameplay (with pause), then back to the Main menu. |
| Q3. When the picker shows | **On every first visit**, with the device's language already chosen when the game has it, so one press of Go moves on. Later visits skip it. Settings changes it. |
| Q4. List order | **The player's own language first.** The rest follow one fixed order: how many people speak each as a first language. |
| The picker's look | **Just the flag** ("We just show the flag btw"). |
| Which flags for English and Spanish | **The United States' flag for English and Mexico's for Spanish** (the Owner's correction: "use US for English, Mexico for Spanish"). |
| English spelling | **US spelling** ("Use US spelling"): every word a player or an editor user reads in English is written the US way ("color", not "colour"). |

## Goals, non-goals, anti-goals

**Goals**

- A game's words have no built-in language. A game says which language its team writes in, and every check, mark,
  fallback and compile works from that language.
- No player ever gets a language they did not ask for because it is the framework's or the team's favourite.
- The `automata words` command and the MCP `words` tool list the unread translated words beside the game's own text,
  and mark them as read.
- No golden moves.

**Non-goals**

- Translating developer text (Q1).
- Adding languages. Games ship the six, the editors the nine, as already decided.
- Building the whole default flow. Plan U (the screens) owns it. This spec gives the picker and its place in the flow.

**Anti-goals** (it would fail even if it worked)

- `'en'` survives as a hidden fallback in code: a default argument, a `?? 'en'`, an `Exclude<Language, 'en'>`.
- English is first in a list because it was first in a constant.
- A player without a match is put into the team's language without being shown the picker.
- Words appear on the picker in one language before the player has picked it.

## The game's own language: `source`

`automata.toml` gets one field:

```toml
# The language your team writes the game's words in. Every other language is checked against it.
source = "ko"
```

- **One of the six languages.** It is required as soon as the game lists any `messages` file, and the game must list
  that language's file. A game with no words may leave it out. If it names a language while the game lists no words
  file, that is a problem the check names.
- **No default.** A game with words but no `source` does not load. The sentence says what to write:
  `Write the language your team writes the game's words in, like source = "es".`
- **Out of the sim.** The sim never sees `source`, in the same way it never sees words (`simContent`). Changing the
  game's own language moves no hash, and a test proves it: the template's replay keeps its hash with `source` set to
  each of the six.
- **Changing it is allowed.** The only thing it makes unread is the read marks (below).

The editors and the framework's own sentences have their own language in the same way. The framework's library
(`src/features/locale/library/`) declares `source = "en"` in its marks file, because English is what its authors write
in, not because English is special. The editors' words declare the same. Each is a stated fact about a team, in a file,
and nothing in the code reads it as a fallback.

## How a word is found

A player's word is looked up in this order:

1. the game's file in the player's language,
2. the framework's file in the player's language,
3. the game's file in the game's `source`,
4. the framework's file in the game's `source`,
5. the key itself.

Steps 3 and 4 are reached only when a word is missing, and `automata check` already fails a game with a missing word.
The source language stands in for a missing word because it is the one text the team is sure of. That is not a choice
of language for the player: the player has already chosen theirs.

A page with no game yet (`frameworkWords`) takes a language it is given and has no fallback, because the framework's
library is complete in all six. A test fails when it is not. Every default argument of `frameworkWords('en')` goes
away (`players.ts`, `onlineWords`, the touch overlay): the caller passes the player's language.

## Picking the language

`pickLanguage` no longer ends in a language. It answers the language, or nothing:

- **The saved choice** is used when the game has it.
- **Otherwise there is no choice yet**, and the game shows the picker. The host's language, then the device's own
  list in its order, decide which flag is already chosen there. When none of them matches, no flag is chosen.
- **A host that sets the language itself** (a store that knows the player's language) skips the picker when the game
  has that language. When the game does not, the picker shows as above.
- **Watch mode** skips the picker. Nobody is there to ask yet, so it uses the device's language when the game has it,
  else the game's `source`. This is the one place the source is shown without asking, and it lasts only while the game
  plays itself. When a player takes over (a tap, a key, the site's Play) on a first visit, the picker comes first, then
  the level.

The saved `language` settings section keeps its format. `null` now means "not chosen yet". A player who has picked
always has a language there, and "follow my device" stops being a choice: the device decides only which flag the
picker has chosen when it opens.

## The picker

The second step of the default flow, after any warnings and before the splash:

```
 ┌──────────────────────────────────────┐
 │                (globe)               │
 │                                      │
 │   [🇰🇷]   [🇨🇳]   [🇲🇽]                 │   the player's language first
 │   [🇺🇸]   [🇧🇷]   [🇯🇵]                 │   then by first-language speakers
 │                                      │
 │               [  ✓  ]                │   Go: big, an icon
 └──────────────────────────────────────┘
```

- **Only flags.** The Owner's call. No words show until a flag is chosen. Then the picker's title and Go's label
  appear in that language (`automata.picker.title`, `automata.picker.go` in the framework's library), so the player sees
  their choice work before they press Go. With no flag chosen there is a globe and an icon-only Go, which does nothing
  until a flag is chosen.
- **Each flag's accessible name** is the language's own name (`한국어`, `Español`), from `LANGUAGE_NAMES`. A screen
  reader says it, and the page's `lang` for that button is the language's tag.
- **The flags are drawn by the framework.** Six small SVG files in `src/features/locale/library/flags/` (nine in the
  editors), drawn simply enough to read at 44 pixels. They are not emoji, because Windows does not draw flag emoji, and
  no flag package is added. Chinese is China's flag, because our Chinese is Simplified (`zh-Hans`). Portuguese is
  Brazil's, because ours is Brazilian (`pt-BR`). Korean is South Korea's and Japanese is Japan's. English is the United
  States' flag, matching US spelling, and Spanish is Mexico's, matching the Latin American Spanish plan L chose (the
  Owner).
- **Touch, keys and pad.** Every flag is a 48-pixel target. Arrow keys and the pad move between flags, and Enter, Space
  or the pad's confirm presses Go. A chosen flag is outlined in the game's own touch colour (Examples: Peach Red), so
  the choice shows without words.
- **Kept.** Go saves the choice to the `language` settings section and goes on to the splash. The next visit skips the
  picker.
- **Settings** has the same flags, the current language first, then the fixed order. Choosing one changes every word
  at once, as it does today.
- **Where it lives.** The picker's rules (what is chosen, the order, what is kept) are the `locale` feature's, in
  Node, with no page. The screen is built by this spec's plan as the framework's own first-run screen. Plan U places it
  in the default flow, between the warnings and the splash, when it builds the flow.

## The order of languages

One fixed order, by first-language speakers (the plan takes the counts from one current edition of Ethnologue and
cites it):

- **Games:** 中文 (zh), Español (es), English (en), Português (pt), 日本語 (ja), 한국어 (ko).
- **Editors:** 中文, Español, English, Português, Русский (ru), 日本語, 한국어, Deutsch (de), Français (fr).

`LANGUAGES` takes this order, and it is used everywhere a list is made: the marks file's tables, the check's
sentences, the settings, and `languagesOf`. A list a player sees puts their own language first and moves nothing else.
No sentence or list puts the game's `source` first.

## What changes, by place

**Framework**

| Where | Today | After |
|---|---|---|
| `content/project.ts` | no field | `source`, optional; required with words; must be listed |
| `content/load.ts` | needs `en.json` when there are words | needs the `source`'s file; the sentence names the language |
| `content/messages.ts` | `englishLacks`, `englishMissing`, `checkAgainstEnglish`; `LANGUAGES` English first | `sourceLacks`, `sourceMissing`, `checkAgainstSource`; conversation and cutscene lines must be in the source; `LANGUAGES` in speakers' order |
| `content/translations.ts` | "English says…", paths built from `en.json` | "The Korean file says…", the source's name; paths from the source's file |
| `content/read-marks.ts` | `Exclude<Language,'en'>`, marks against English, `format = 1` | marks against the source; any language but the game's source; `format = 2` (below) |
| `locale/words.ts` | `own('en')`, `LIBRARY.en` | the chain above |
| `locale/pick.ts` | ends on `'en'` | answers a language or nothing |
| `locale/settings.ts` | `null` follows the device | `null` is "not chosen yet" |
| `locale/` | | the picker's rules, its two words in six languages, six flags |
| `game/players.ts`, `locale/online.ts`, the touch overlay | `frameworkWords('en')` by default | the caller's language, required |
| `cli/words.ts` (`compileWords`) | Paraglide's base locale is English; needs `en.json` | the base locale is the `source`; needs its file |
| `level/sim-content.ts` | | `source` stays out of what the sim is given |

**The read marks, format 2.** `automata.translations.toml` names the language the marks were made against:

```toml
format = 2
source = "ko"

[read.es]
"keeper.hello" = "3f0c9a1e5b7d2c44"
```

A mark is still the hash of the two texts (`readMark(sourceText, translated)`), so a word changed on either side is
unread again by itself. A marks file whose `source` is not the game's has every word unread. The check's note says so in
one sentence and names `automata words`. A `format = 1` file is read as `source = "en"`, which is what it was made
against, so no read is lost, and it is written back as format 2. The framework's own library file and the template's
move to format 2.

**`automata words`** (the Owner's yes, 2026-11-14):

- `automata words [folder]` lists, for each language in order, the words no native speaker has read: the key, the
  game's own text in its `source`, and the translation. A heading names the source language, like
  `Checked against Korean (ko)`.
- `automata words [folder] --read <language>` marks every listed word of that language as read, as it is now.
  `--read <language> <key> …` marks only those keys. It writes `automata.translations.toml` and nothing else.
- `--json` gives the same as data. The MCP `words` tool calls it, the same way the other tools call their commands.
- `automata check`'s note about unread words names the command: `12 words in Spanish wait for a native speaker. See
  them with automata words.`
- The command and its sentences are developer text, so they are in English (Q1).
- Paraglide's compile (`compileWords`) keeps its own job. Where plan K Part 2 puts it on the command line is plan K's
  call. If it shares the `words` name, it becomes `automata words --compile <outdir>`.

**Template and `automata create`**

- The template's `automata.toml` has `source` and a comment saying what it is. The comment on the words files no
  longer says "English comes first".
- `automata create` sets `source` from `--source <language>`, or else from the device's language when it is one of the
  six. With neither, it stops with one sentence that lists the six codes and shows `--source`. It never picks one. The
  template's six files are complete, so any of them can be the source.
- The template's marks were made against English. `create` keeps them when the new game's source is English, and
  otherwise writes an empty format 2 file for the new source, since nobody has read the others against it.
- `create-smoke.mjs` and the README's first steps pass `--source`.

**Docs** (developer text, in English): the framework README's words part, the template's README and `AGENTS.md`, the
skills, and the M2 spec's Languages part say "the game's own language (`source`)" wherever they now say English or
`en.json`. They list languages in the fixed order. The first-layer spec and the `CLAUDE.md` pages keep the languages
as a set, in the fixed order.

**US English.** Every English word a player or an editor user reads is written the US way (the Owner): the framework's
`library/en.json`, the template's `en.json`, the demo's words and the editors' words. `LANGUAGE_TAGS.en` becomes
`en-US`, and a list in English is joined the US way ("1, 2, and 4"), so `fill.ts` drops its `en-GB` special case.
Developer text is not a player's word and is left as written. Changing a word changes its read mark, so the English
words' marks against other languages are made again. No hash moves, because words are out of the sim.

**Examples (the demo game, plan D).** The demo's `source` is `"en"`, because English is the language its team writes
in. That is the team's choice, written in its `automata.toml`. The demo shows the picker on a first visit. On the Site,
a first-time visitor who presses Play gets the picker before the level. The Site's text does not change. The Examples
pin moves to the commit that lands this.

**Editors.** They read games with `loadGame`, so their pin moves when this lands, and a game with no `source` shows the
same sentence as the check. When the editors gain their nine languages (M3), they follow this spec: a first-run picker
of flags, the person's own language first, the nine in the fixed order, and no fallback but their own words' declared
language. Any editor that shows a game's words (Story, later) shows each translation beside the game's `source` text,
never beside English. Until M3 the editors' words exist in one language, which is the state today. This spec does not
widen M1's editors.

## Tests

**Node (unit), in CI**

- No `'en'` is a fallback: an architecture test fails on `'en'` in `src/` outside the language tables (`LANGUAGE_NAMES`,
  `LANGUAGE_TAGS`, the library's own file list).
- US English: a test fails on British spellings in the player-facing English files (`colour`, `favourite`, `centre`
  and the like), and an English list reads "1, 2, and 4".
- A game with words and no `source` does not load, and neither does a `source` whose file is not listed. A game whose
  source is Korean and whose English file is missing loads, and the check names the missing English.
- Lookup: a word missing in Spanish in a Korean-source game is said in Korean.
- `pickLanguage` answers nothing for French-only device tags, the saved language when there is one, and a host's
  language when the game has it.
- Read marks: format 2 written and read back byte for byte; format 1 read as English; changing `source` makes every word
  unread; marks for the source language itself are refused.
- `automata words` lists and marks, with and without keys, as words and as JSON. The MCP `words` tool answers the same
  JSON. `check`'s note names the command.
- `compileWords` uses the source as the base locale.
- `automata create`: with `--source ko`, with a device language, and with neither (the sentence).
- The order: `LANGUAGES` is the speakers' order, and a player's list puts their own language first.
- The framework's library is complete in all six, including the picker's two words, so `frameworkWords` never shows a
  key.

**End to end** (the journeys, in Chromium, WebKit and Firefox)

1. **A French browser, first visit:** the picker shows six flags and nothing chosen. Go does nothing. Pressing Korea's
   flag shows the title in Korean. Go leads to the next screen in Korean. A reload skips the picker.
2. **A Japanese browser, first visit:** Japan's flag comes first and is chosen. One press of Go, by touch, by Enter and
   by the pad (three runs), moves on in Japanese.
3. **Settings:** the current language is first. Choosing Spanish changes every word at once, and a reload keeps it.
4. **A Korean-source game:** a word missing in Spanish shows in Korean.
5. **Watch mode, first visit:** it plays without the picker. A tap shows the picker, then the level.
6. **The create journey:** `automata create --source es`, then `automata check` passes, `automata words` lists the
   unread words beside Spanish, and `--read pt` empties Portuguese.
7. **Examples:** the demo's first visit shows the picker in all three browsers, and the `ci-screens` pictures add the
   picker at phone, tablet and desktop, upright and sideways.

## Goldens

None move. `source` and the words are out of what the sim is given, so `template/replays/level-1.json`,
`tests/golden/`, and Examples' `replays/level-1.json` and `replays/test-game.json` keep their hashes. A test sets
`source` to each of the six and checks the template's recorded hash. The marks files (the library's and the template's)
change format, but they are not goldens and no replay reads them. A plan that finds a hash moving stops and reports
it. It is never re-recorded.

## Approaches

1. **A `source` field, with English kept as the fallback when it is missing.** The smallest change, but it is the
   default the Owner ruled out. Refused.
2. **No source at all: every language is equal, and a word missing anywhere shows its key.** This is pure, but it
   leaves the check nothing to compare against, the read marks nothing to hash with, and Paraglide no base locale. A
   missing word shows a key to a player. Refused.
3. **A required `source` per game, a picker for anyone without a saved choice, and the speakers' order (chosen).**
   The team's language is a stated fact used only to check and to stand in for a missing word. The player always
   chooses. It costs one field, one screen and one marks format.

## Plan

One plan, **plan W ("words: no default language")**, in Cycle 4 beside plan L, written to
`docs/superpowers/plans/2026-11-14-no-default-language.md`. It needs plan L (merged) and plan K Part 1 (merged). It
lands before plan U is planned, so plan U builds the flow with the picker already in it. Plan D (Examples) and the
Editors' pin follow it. The plan L and plan K Part 2 implementation audits leave the English default as it is and
point here.

## Left to the builder

- The exact drawing of each flag, inside the rule that each reads at 44 pixels.
- The sentence wording of the check and of `automata words`, held to the drunk-grandma test.
- How the picker's choice is kept until Go (in memory; nothing is written until Go).
- Whether `pickLanguage` keeps its name or splits into "the saved choice" and "the flag the picker opens on".
