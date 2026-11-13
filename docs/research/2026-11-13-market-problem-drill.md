# Is AutomataFramework solving a real problem? A market drill

Written 2026-11-13, before any planning, at the Owner's request: critique and drill the idea using the "raw material,
then hard questions, then steelman and tear down" method. It is a hypothesis to check with public signals, not a decision.
Nothing here reopens a decision in the spec by itself; where the facts point against one, it says so once.

Two things are fixed by the Owner (2026-11-13) and are not treated as open questions here: **there will be no customer
interviews**, and **the editors are iPad-first and also work on phones**, because the Owner wants them.

## The answer first

- **The pain is real, but it is not the one the spec leads with.** People who make games with coding agents stall on
  game feel, state bugs and the agent losing the thread, and they give up. The "boring 80%" (saves, menus, settings,
  remapping, languages, layouts) is real but is the pain of people who already finish games. Nobody in the material
  asks for cross-browser replay hashes. (Editing on an iPad is the Owner's requirement, not something this drill tests.)
- **The best version of the idea is already being built by someone with a ten-year head start.** Phaser, the most used
  2D browser framework, has turned itself into "Describe a game. Play it today.": a Phaser Game Agent (June 2026, built
  on Claude Managed Agents), a new engine line, Phaser AE, behind "every new game", a CLI, an MCP server and paid
  "packs" (for example a preloader pack). On the Godot side there are at least five MCP servers and an AI-native Godot
  fork (Summer Engine, $20 to $200 a month). "Agent-first 2D web framework" is not an empty space.
- **Paying for the editor app is the weakest part.** The iPad-first editors are fixed; what is unproven is that people
  will pay for the app when the same editors are free in the browser. Demand for an editor follows adoption of its
  framework; adoption has to come first, and it is free.
- **Where AF is genuinely different:** a replay that hashes the same in every engine is an *oracle an agent can test
  against*. That idea, "your agent can't quietly break your game", is the sharpest one in the pitch and the one nobody
  else sells. It is a strong feature and a weak company on its own.
- **The most promising buyer found is not in the spec.** Agent-made browser games flood itch.io (new pages doubled in
  two months; downloads and purchases did not) and get deleted as slop. The places that pay for web games, the ad
  funded portals, have quality bars that look a lot like AF's claim 1. "Make an agent's game good enough to be accepted
  and earn" is a pain with money attached. The portals publish their requirements, so this can be checked by reading.
- **Recommended next step:** check the cheap public signals listed at the end (portal requirements, the unread reviews,
  a fake-door page for the paid app) before planning. The thin thread should prove the framework, the built-ins,
  `automata check`, the replay oracle, one game, web publishing and the iPad-first editors' save-to-GitHub path first;
  the paid app's price and store listing can follow what the fake door shows.

## How this was made, and what it is missing

The method asks for 25 to 40 competitor sites fully scraped, the incumbents' earnings calls, 100+ reviews and every
forum thread. Here is what was actually done:

- **Done:** about 30 web searches across competitors, Unity's Q3 2026 results, the GDC 2026 survey, AI game makers,
  iPad engines, vibe-coding post-mortems, the itch.io AI flood and determinism; one fetched comparison of about 30 AI
  game tools with their prices (from Ludo, Althera Games, Summer Engine and Taskade, three of which are vendors ranking
  themselves).
- **Not done:** the cloud container's network blocks most sites, so the earnings call transcripts, app-store reviews,
  G2/Capterra reviews and Reddit threads were seen only as search results (headline, source, date), not read in full.
  The 100+ reviews step was not done. Where this doc states a figure from a headline, it says so.
- **Background knowledge** (things known before 2026-06 and not re-checked today) is marked **[bk]**. Treat those as
  leads to verify.
- No quotes are invented; post-mortems are cited by title.

A fuller pass on reviews and threads would be worth an hour on the Mac, where pages load: Construct and GameMaker
reviews on Capterra, Xogot's App Store reviews, and r/gamedev, r/godot and r/aigamedev threads on "vibe coding".

## The raw material, condensed

### Incumbent engines

| Product | What it is now | Money | Source |
|---|---|---|---|
| Unity | Engine; money is ads (Grow, the "Vector" ad platform) | Q3 2026 revenue $622M, first GAAP profit since IPO, driven by Vector (headline: "Vector's 126% surge") | [Inven Global](https://invenglobal.com/articles/28232/unity-posts-first-gaap-profit-since-ipo-as-q3-revenue-hits-622m), [GuruFocus call highlights](https://www.gurufocus.com/news/9177164/unity-software-inc-u-q3-2026-earnings-call-highlights-first-gaap-profit-vectors-126-surge-and-a-blockbuster-q4-outlook), [Unity IR](https://investors.unity.com/news/news-details/2026/Unity-Reports-Third-Quarter-2026-Financial-Results/default.aspx), [Nasdaq transcript](https://www.nasdaq.com/articles/unity-software-u-q3-2026-earnings-call-transcript) |
| Godot | Free, open source; growing on Steam | W4 Games (Godot founders' company) raised $18M Series B led by Tencent, Aug 2026, for enterprise and Asia | [Godot growth stats 2026](https://godotengine.org/article/godot-growth-stats-2026/), [Pocket Gamer](https://pocketgamer.biz/w4-games-raises-18m-to-expand-godot-enterprise-push/), [Steam surge](https://www.pulse.bot/gaming/news/indie-boom-godot-engine-sees-surge-in-steam-releases-a418b7af-c158-413e-bad1-6adf9acab614/) |
| Phaser | 2D browser framework turned agent product | Game Agent, Phaser AE engine, CLI, MCP, packs with free and paid tiers, new licensing (Feb 2026), Phaser Editor v5 (Apr 2026) | [Phaser home](https://phaser.io/), [Game Agent](https://phaser.io/news/2026/06/phaser-game-agent), [built with Claude Managed Agents](https://phaser.io/news/2026/06/how-we-built-the-phaser-game-agent-with-claude-managed-agents-and-superserve), [Phaser AE v2](https://phaser.io/news/2026/07/phaser-ae-v2-is-now-the-engine-behind-every-new-game), [agent about](https://phaser.io/agent/about), [CLI](https://phaser.io/cli), [MCP](https://phaser.io/agent/mcp/manual), [preloader pack](https://phaser.io/packs/preloader/api.md), [pricing](https://phaser.io/pricing), [licensing](https://phaser.io/news/2026/02/new-flexible-licensing-options-now-available), [Editor v5](https://editor.phaser.io/news/2026/04/phaser-editor-v5-release) |
| Construct 3 | Browser no-code 2D, subscription | Subscription; long-running forum anger at "browser + subscription"; iPad Pro issues threads | [Capterra pricing](https://www.capterra.com/p/201543/Construct-3/pricing/), [forum: "C3 is a bad idea now"](https://www.construct.net/en/forum/construct-3/general-discussion-7/sorry-guys-c3-bad-idea-132781), [iPad Pro issues](https://construct.net/en/forum/construct-3/general-discussion-7/issues-construct-ipad-pro-137732) |
| GameMaker | 2D desktop engine | Free for non-commercial, one-time price for commercial **[bk]** | [Capterra](https://www.capterra.com/p/158594/GameMaker-Studio/pricing/) |
| GDevelop | Open-source no-code, with AI credits | Free 40 credits/mo; $7.99 / $13.99 / $39.99 | fetched comparison (Ludo, Taskade) |
| Defold | Free, foundation funded by donations and partners | Donations | [Defold donate](https://defold.com/donate) |
| PixiJS | Renderer, not an engine; free | Sponsorship **[bk]** | — |

### AI game makers and agent tools

From the fetched comparison (prices as those pages state them; some disagree):

| Product | Kind | Price | Who it is for | Do you get the code? |
|---|---|---|---|---|
| Rosebud AI | Prompt to browser game (Phaser) | Free credits; $15, $30 (commercial rights), $50 (code download) | Makers, jams | Only on top tier |
| Astrocade | Social prompt-to-game | Free; raised $56M (Sequoia, Sea), May 2026 | Casual players | No |
| Star | Hosted browser games | Free; $20; $50 | Creators | Yes |
| Makko AI | 2D studio with art | Free art budget | 2D devs | Claims yes |
| OpenGame | Game file generator | $15 for 80 credits | Downloaders | Yes |
| Bitmagic | Kit for coding agents | Pro subscription | Developers | Yes |
| Summer Engine | AI-native Godot | Free; $20 / $60 / $200 | Developers shipping | Yes (Godot project) |
| Websim, Google Playground | Hosted generators | Free | Experimenters | No |
| Bezi, Coplay, Nimble Fox | Agents inside Unity | Subscriptions; Coplay raised $1.2M | Unity devs | Yes |
| Game Sett | Agents for game studios | Raised $27M (2025) | Studios | — |
| Godot MCP servers (Coding-Solo, Godot MCP Pro, ivanmurzak, godot-ai) | Let Claude drive Godot | Free; "Pro" paid | Godot devs | Yes |
| Xogot | Godot for iPad and iPhone | App Store; free for students | iPad devs | Yes |
| Ludo, Scenario, Meshy, Layer, Leonardo, Suno, ElevenLabs | Asset generators | Credits | Everyone | Assets |
| Cursor, Claude Code, Replit, Bolt, Lovable, v0 | General coding agents that make games | $0 to $30 seats | Coders | Yes |

Sources: [Ludo comparison](https://ludo.ai/compare/best-ai-game-makers), [Althera Games](https://altheragames.com/en/blog/ai-game-generators-2026), [Summer Engine on Rosebud pricing](https://www.summerengine.com/blog/rosebud-ai-pricing), [Summer Engine tool list](https://www.summerengine.com/blog/how-to-make-games-with-ai), [Taskade list](https://www.taskade.com/blog/ai-game-generators), [Astrocade on Fortune](https://fortune.com/2026/05/05/astrocade-raises-56-million-series-b-sequoia-video-games-platform-ali-amir-sadeghian/), [Bezi at BVP](https://www.bvp.com/companies/bezi), [Coplay](https://gamesbeat.com/coplay-raises-1-2m-to-build-ai-copilot-for-game-devs/), [Nimble Fox](https://gamesbeat.com/nimble-fox-launches-ai-tool-for-building-unity-games-worldwide/), [Game Sett](https://techcrunch.com/2025/05/07/game-sett-funding-a-startup-building-ai-agents-for-game-development-emerges-from-stealth-with-27m), [Godot MCP](https://mcpservers.org/servers/Coding-Solo/godot-mcp), [Godot MCP Pro](https://mcpservers.org/servers/youichi-uda/godot-mcp-pro), [Xogot](https://gamefromscratch.com/xogot-godot-for-ipad-released/), [Xogot free for students](https://gamefromscratch.com/xogot-godot-on-ipad-now-free-for-students/), [hyperPad on iPad dev](https://www.hyperpad.com/blog/game-development-on-ipad).

Patterns across them:

- **Credits, not seats.** Prompt tools charge per generation; re-rolls are the revenue. Code export and commercial
  rights sit behind the top tier.
- **Two camps that do not talk.** Hosted toys for players (Astrocade, Rosebud, Websim) and agents bolted onto real
  engines for developers (Godot MCP, Summer, Bezi, Phaser AE). AF is in the second camp.
- **Their own admitted weaknesses:** a low ceiling (small 2D browser games), credits running out during iteration, and
  "the same prompt gives a different game". That last one is AF's opening.

### Where people who make games with agents get stuck

Post-mortems and devlogs (cited by title; read beyond the headline only where noted):

- [Post-mortem of my failed attempt to vibe-code a metroidvania game](https://forum.godotengine.org/t/post-mortem-of-my-failed-attempt-to-vibe-code-a-metroidvania-game/137567) (Godot forum, three pages of replies)
- [Why vibe-coded games feel terrible](https://exekite-web.pages.dev/blog/why-vibe-coded-games-feel-terrible) (game feel)
- [Vibe coding frustrations galore](https://munchmo.itch.io/xenodochium/devlog/983143/vibe-coding-frustrations-galore) (itch devlog)
- [Week 4 roguelike vibecoding: UI/UX](https://liminalwarmth.substack.com/p/week-4-roguelike-vibecoding-uiux) (menus and UI took a week of a month)
- [Mini Loot: when it all went wrong](https://dev.to/cberube_5/mini-loot-when-it-all-went-wrong-1amg)
- [FIGHT UWU BIRD: an adventure in vibe coding](https://gabzotronic.github.io/posts/2026-03-10-UWU/index.html)
- [A year of AI-assisted game development](https://porridgeai.blogspot.com/2025/12/adventures-with-vibes.html)
- [Decrypt: we built a game with Claude](https://decrypt.co/311183/we-built-game-vibe-coding-ai-claude?amp=1), [TechRadar: AI failed to recreate my 1980s platformer](https://www.techradar.com/computing/artificial-intelligence/i-asked-ai-to-recreate-my-classic-1980s-platform-game-and-it-failed-miserably-but-im-still-impressed-by-the-tech), [HN: AI-coded tower defense](https://hn.svelte.dev/item/44463967), [Elliot Smith: quick thoughts on AI in game dev](https://www.elliotcsmith.com/quick-thoughts-on-ai-in-game-dev/)

What the titles and the parts read agree on, in order of how often it comes up: **the game feels bad** (jump, timing,
juice); **the code rots** as the agent adds features and breaks old ones, and nobody notices until later; **UI and
menus eat the schedule**; **the agent loses the thread** on a bigger project; **art and sound** are a separate
problem. The second item is the one AF's replay oracle answers directly. The first is what the spec's Feel and Tuner
editors are for. None of them asks for an iPad.

### The market around it

- **GDC 2026 survey:** 36% of developers use generative AI; over half say it harms the industry, the highest yet.
  ([GamingOnLinux](https://www.gamingonlinux.com/2026/01/gdc-2026-report-36pct-of-devs-use-genai-28pct-target-steam-deck-and-8pct-target-linux/), [TechSpot](https://www.techspot.com/news/111128-more-than-50-game-developers-generative-ai-harming.html), [GDC](https://gdconf.com/article/gdc-2026-state-of-the-game-industry-reveals-impact-of-layoffs-generative-ai-and-more/))
- **The slop flood:** new game pages a day on itch.io doubled in two months while downloads and purchases did not;
  itch.io says it deleted "a couple terabytes of AI slop" (Nov 2026); over 500 Steam Next Fest demos used AI.
  ([Game Developer](https://www.gamedeveloper.com/pc/number-of-game-pages-doubles-on-itch-io-as-ai-clones-flood-the-store), [PC Gamer](https://pcgamer.com/software/ai/just-deleted-a-couple-terabytes-of-ai-slop-itch-io-pushes-back-against-the-flood-of-ai-on-its-storefront), [Kotaku](https://kotaku.com/itch-io-gen-ai-slop-terrabytes-deleted-claude-chagpt-steam-epic-2000752485), [Gamepressure](https://www.gamepressure.com/newsroom/steam-next-fest-severely-disappointed-players-more-than-500-games/z08800))
- **Determinism is a known hard problem** that engines mostly leave to the game: [Gaffer on Games](https://gafferongames.com/post/floating_point_determinism), [GDC 2024 cross-platform determinism talk](https://media.gdcvault.com/gdc2024/Slides/GDC+slide+presentations/Pollard_Bradley_CrossPlatformDeterminism+2024-03-26+09.34.19.pdf), [Is planck.js deterministic across JS runtimes?](https://salivity.github.io/planck.js/article/is-planck-js-deterministic-across-js-runtimes), [Godot forum: making physics deterministic](https://forum.godotengine.org/t/making-physics-fully-deterministic/22575), [debugging desync](https://bugnet.io/blog/how-to-debug-desync-in-deterministic-lockstep-games).
- **Most made games earn little:** a game dev report headline, "only 32% made $500"
  ([Game Dev Report](https://gamedevreport.beehiiv.com/p/only-32-made-500-and-why-is-this-so-satisfying)); itch.io traffic benchmarks ([How To Market A Game](https://howtomarketagame.com/2025/05/12/benchmark-itch-io-traffic/)).

## Question 1: what do the winners know that their customers would never admit?

1. **Most customers will never ship, and the business is built on that.** Unity's editor is the funnel; the profit is
   ads inside the few games that ship and scale (Q3 2026's first GAAP profit came on the back of Vector). Rosebud and
   Astrocade sell the feeling of making a game, billed per re-roll. Customers would not admit they are buying the
   feeling of being a game developer more than a shipped game.
2. **Nobody pays for the engine.** Godot, Defold, PixiJS and Phaser's core are free; GameMaker is free until you sell.
   Money is made on success (royalties, ads, console ports, enterprise support, which is W4's business) or on things
   around the engine (assets, courses, credits, packs). Construct's subscription is the exception and its forum has
   been angry about it for years.
3. **Engines are chosen for the tutorials, the community and the job market, not the feature list.** Godot's surge
   came from Unity breaking trust over the runtime fee **[bk]**, not from a feature. A newcomer framework competes on
   how many answers an agent (or a person) can find, and an agent knows Phaser and Godot from its training data.
4. **"Finishing" is mostly not a tooling problem.** It is content, polish, motivation and marketing. Tools that
   promise "finish your game" sell well to people who will still not finish. A tool helps the ones who would have
   finished anyway, a bit sooner.
5. **The users of AI game makers play more than they ship, and that is fine for the maker.** Output is disposable;
   "the same prompt gives a different game" is a feature when you are selling re-rolls.
6. **Professionals use AI and will not say so.** 36% use it, over half say it is harmful. "Built for agents" is a
   badge with hobbyists and a stigma with the people who sell games on Steam.

## Question 2: what does this industry take for granted, and what would make each belief false?

| Belief | What would make it false | Does AF bet against it? |
|---|---|---|
| An engine needs a big visual editor at its centre | Agents author most content, and the editor becomes a place to review and nudge, not to build | Yes, and this looks right |
| Determinism only matters for fighting games, RTS and netcode | Agents need a regression oracle: a replay that must still hash the same after every change | Yes; AF's strongest bet |
| Engines are free; money is made somewhere else | People pay per outcome (a game that passes a portal's QA, a shipped build) because agent compute makes outcomes cheap | Partly; the paid app is a different bet |
| Serious creation happens on a computer | A real group makes games on iPads or phones, not just students and hobbyists | Yes, by the Owner's choice. Others are there too: Xogot (Godot on iPad), Construct in the iPad browser (with issue threads), hyperPad and Codea. None owns "agent writes it, you tune it on the iPad" |
| Web games do not make money | Ad-funded web portals and in-chat game platforms pay creators **[bk]** | Not yet; the spec publishes to web and itch, not to a portal |
| The user is a developer | The user is a person with an idea who directs an agent | Yes |
| Prompt-to-game replaces engines / engines absorb AI | Both are true at once: toys for players, agents inside engines for builders | AF is in the "engines absorb AI" camp, with Phaser and Godot |
| Game feel cannot be generated | Feel is tuned with a few numbers, fast, by a person, after the agent writes the code | Yes, the Feel and Tuner editors |

Where the whole market agrees: free core, AI as an assistant, credits for generation. Where it is blind: nobody sells
"the agent cannot break what already works", and nobody connects the agent-made-game flood to the places that pay for
web games.

## Steelman, then tear-down

### The steelman, as a top-tier VC would pitch it

> Coding agents made the first 20% of a game free. An afternoon gets you a playable prototype. The last 80% (saves,
> menus, settings, remapping, languages, phone layouts, publishing) is boring, standard, and exactly where agents write
> spaghetti that breaks the parts that already worked. AutomataFramework is Rails for agent-made games: conventions an
> agent follows, built-ins it does not have to write, and a deterministic replay that hashes the same in every browser,
> so every change is checked against a recorded play. No other engine can tell an agent "you broke it" with certainty.
> Content lives in plain files with published schemas, so agents and people edit the same thing, and a person can fix
> the feel on an iPad without another prompt. It is free and open, so it rides every agent session that reads its
> skills. It makes money on the editor apps, then on hosting and publishing. Timing: the vibe-coding wave is here, the
> stores are drowning in broken games, and the winners will be the ones whose games actually work.

That is a good pitch. Now where it fails.

### Round 1: "Phaser already did this."

**The attack.** The closest product to AF is not a startup; it is Phaser, with the largest 2D browser community, a
decade of tutorials in every model's training data, its own agent built on the same Claude platform AF's users use, a
new engine line, a CLI, an MCP server, and packs that sell the boring parts. On the other side, Godot plus any of five
MCP servers, or Summer Engine, give agents a full engine with an editor and console exports. An unknown framework with
no users enters against both.

**The defence.** None of them sells determinism. Phaser uses Matter or Arcade physics and makes no cross-engine
promise **[bk]**; Godot's physics is not deterministic across machines (its own forum says so). AF's replay oracle and
its content-as-schema files are real differences.

**The verdict.** The difference is real but it is a feature Phaser could add, and it answers a pain ("the agent breaks
what worked") that users describe without asking for this cure. Unless public signals show people would switch
frameworks for it, AF's best move might be to be the thing that does it best and say so loudly, not to beat Phaser on
everything else.

### Round 2: "Who pays, and for what?"

**The attack.** The plan's revenue is the editors as paid apps on iPad, Android and desktop, while the same editors are
free in the browser. The buyer has to (a) use AF, (b) make games with an agent, (c) find the free browser editors not
good enough on their tablet or phone. Each is a small slice of the one before. Paid editors exist when the
framework is big (Unity's Asset Store, Phaser Editor) or the editor is the product (Procreate, Aseprite). Here,
editors follow adoption, and adoption is free, so revenue is years out. Xogot, the closest thing, made itself free for
students to get users.

**The defence.** The iPad-first editors are being built anyway, so Tauri makes the apps cheap once they exist; a paid
app is a low-cost option, not a big bet. iPad-first also fits schools and young makers, who are on iPads. And an app
can do what a browser tab does poorly: work offline, keep files local until Save, and sit on the home screen.

**The verdict.** Keep it as a cheap option, and give it reasons to exist beyond the browser version (offline, files,
Pencil, the home screen), but it is not a business model yet. The search found two places with money
closer to AF's strengths: the web portals (whose quality bars resemble claim 1) and, later, a hosted "ship and keep it
working" service (publish, run the replay check on every change, cloud saves). Both are hypotheses; neither is in the
spec.

### Round 3: "This is a twenty-person roadmap."

**The attack.** The first layer is four repos, nine editors and two builders, physics and networking in the core, six
game languages and nine editor languages, three publish targets, a site, and paid apps on three platforms. The first
attempt failed because of scope (its own rules say 3D and a showcase game took over before 2D shipped). "Minimal but
complete" here is not minimal. A VC would ask what single thing must be true for anything else to matter, and fund
only that.

**The defence.** The spec builds a thin thread through everything first, precisely so the joins are proven early.

**The verdict.** The thin thread is the right shape, but a thread through eleven editors and three platforms is still
long. The single thing that must be true is: "a person using an agent finishes and ships a 2D game with AF that they
would not have finished otherwise." That needs the framework, the built-ins, `automata check`, the replay oracle, one
game and one publish target, plus the iPad-first editors the Owner requires. Within the editors, the order matters:
the save-to-GitHub path and the one or two editors that fix the pain with evidence (Feel and Tuner, for game feel)
first; the rest widen after.

### Round 4: "Agent-made games do not find players."

**The attack.** The stores are drowning in agent-made games and buyers are not buying them; pros are hostile to AI. A
tool that helps make more of them helps make more of what nobody buys. Your users will not pay because their games do
not earn.

**The defence.** That is exactly the point: AF's pitch is games that work, not more games. The flood is the market
signal, because quality is now the scarce thing.

**The verdict.** The defence holds only if AF can show a measurable quality bar that a store or portal recognises.
"Passes CrazyGames' or Poki's QA" (mobile layouts, saves through their SDK, settings, languages, load size) would be
such a bar **[bk: their requirements need checking]**. "Hashes the same in Firefox" is not; players do not see it.

### Round 5: "Is determinism worth what it costs?"

**The attack.** Rapier's deterministic build is slower than its normal build; cross-engine parity in CI costs runner
time and test effort; and an agent can also catch regressions with plain browser tests and screenshots. Single-player
games do not need bit-exact replays.

**The defence.** Screenshots and Playwright tests are flaky and slow; a hash check runs in Node in milliseconds and is
exact, which is what an agent needs to act on. It also gives replays, bug reports with a recording attached, and
multiplayer later, for free.

**The verdict.** Determinism is the right core bet for an agent-first framework, because it turns "did the agent break
it?" into a yes or no. Sell it as that, in the user's words ("your agent can't quietly break your game"), and never as
"bit-exact across engines".

### Where the rounds leave the thesis

The surviving thesis: **AF is the 2D framework where an agent can't quietly break your game, and where the boring
parts a store asks for are already done.** It wins with people already making browser games with agents who have hit
the wall of broken changes and unfinished polish. It does not win by having the most editors; its editors win by
being the place a person tunes what the agent made, on the iPad, without another prompt. Its money, if any, comes
from getting games accepted and kept working, not from selling an editor.

## A first GTM hypothesis

- **Who:** solo makers already using Claude Code, Cursor or similar to make 2D browser games, who have abandoned at
  least one project after it started breaking, and who want it on the web where people play (itch.io and the portals).
  Second group to watch: teachers and clubs whose students make games on iPads, where iPad-first editors are a reason to choose AF.
- **The promise:** "Finish the game your agent started, and keep it working." Built-ins done, every change checked
  against a recorded play, one command to publish.
- **How they find it:** where agents look. Agent skills and an MCP server, a template that Claude Code, Replit or
  Lovable users can start from, and being the stack behind entries in vibe-coding game jams (Summer Engine runs a
  [Vibe Jam](https://www.summerengine.com/ja/vibe-jam)). Devlogs that show a broken change being caught by the replay
  check are the demo.
- **What it costs them:** nothing to start. Money, to test in this order: a paid service that publishes and keeps a game
  passing its replay check (subscription); a revenue share with or a pipeline into ad-funded web portals; the paid
  editor app, tested with a fake-door page before it is built.
- **The proof that it works:** ten outside people ship a game with AF and say the replay check caught something their
  agent broke. Until that is true, nothing else in the roadmap matters.

## The riskiest assumptions, most dangerous first

1. **Agent users feel the "finish" wall as a tool problem and would switch frameworks for a fix.** If they see it as
   motivation or content, no framework helps.
2. **They choose AF over Phaser AE or Godot with an MCP server.** Both are known to every model already.
3. **"Your agent can't break your game" is a pain people name themselves.** The material shows the symptom (the code
   rots) but nobody asking for this cure.
4. **People will pay for the editor app** when the browser editors are free. (The iPad-first editors themselves are the
   Owner's requirement and are not on this list.)
5. **Agent-made games can reach players and earn,** through portals or otherwise, so the makers have a reason to care
   about quality and to pay.
6. **One person directing agents can build and keep up the scope.** The first attempt is evidence against.

## How to check without interviews

There will be no customer interviews, so the checks are things that can be read or measured:

| Check | How | What it would show |
|---|---|---|
| The portals' requirements | Read the CrazyGames and Poki developer docs **[bk: confirm names and pages]** | Whether claim 1 is what a paying publisher asks for; if so, a portal belongs among the publish targets |
| The unread reviews | On the Mac, where pages load: Construct and GameMaker on Capterra, Xogot's App Store reviews, r/gamedev, r/godot and r/aigamedev threads on vibe coding | Whether the pains ranked above hold in a larger sample, and what iPad users complain about in Xogot and Construct |
| A fake door for the paid app | A store-style page on the site with a price and a "notify me" button, before the app is built | Whether anyone clicks to pay, and at what price |
| Public use | Downloads of the package, installs of the agent skills, games published with AF, jam entries | Whether the "finish" wall is felt as a tool problem (assumption 1) |
| The replay oracle in public | Devlogs and the demo game's CI showing an agent's breaking change caught | Whether the line "your agent can't quietly break your game" gets picked up (assumption 3) |

Signs the thesis is right: the portals' bar matches claim 1; outside games appear without being asked for; the fake door
gets clicks. Signs it is wrong: no outside use after launch; nobody clicks the price.

## What this means for the spec, said once

The spec's decisions stand until the Owner changes them. The facts above suggest, for the Owner's judgement:

- Lead the pitch with claim 3, in user words, and claim 1; they are the pains with evidence.
- Treat Phaser AE as the main competitor and name the difference plainly.
- Make the first layer's must-have the framework, built-ins, `automata check`, the replay oracle, one game and web
  publishing, together with the iPad-first editors' save path and the Feel and Tuner editors; let the other editors
  widen after, and let the paid app's price follow the fake door.
- Check the web portals' requirements; if they match claim 1, propose a portal as a publish target to the Owner.
