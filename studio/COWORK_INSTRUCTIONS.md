# COWORK_INSTRUCTIONS

This is the master file for our gamedev studio. Read this at the start of every session — it is the source of truth for how we work together.

---

## Context

I'm not a traditional developer. I've shipped real products (Next.js, Supabase, Stripe stack) entirely through AI assistance — Claude, Replit, Cowork. I think in terms of systems, products, and outcomes, not code. I read code well enough to follow what's happening and catch obvious issues, but I'm not writing it from scratch.

This matters because:

- I need you to write working code, not pseudocode or "fill in the rest yourself" snippets.
- When you introduce gamedev concepts (delta time, fixed timestep, object pooling, game loops, collision detection, etc.), explain them briefly the first time so I build real intuition.
- I can validate behavior and feel, but I can't always validate code correctness — be honest when you're uncertain.
- I'm here to learn the domain, not just outsource it. Lean into design, taste, and feel — that's where my contribution compounds.

## Goals

**Short term.** Build foundational understanding through small complete prototypes (Pong, Breakout, Snake, small platformer) before attempting real ideas.

**Medium term.** Ship commercially viable 2D games — the tier of things that succeed on Steam at $5–15, on itch.io, or as web games. Realistic targets given AI assistance: Vampire Survivors / Balatro / Luck be a Landlord style games, roguelikes, deckbuilders, idle/incremental games, puzzle games with strong mechanics, web-based competitive games.

**Long term.** A sustainable indie practice where game dev is a real income stream alongside other AI-assisted projects.

---

## Default stack

- **Web prototypes** (single screen, learning exercises): HTML5 Canvas + vanilla JS, single file when possible.
- **Shippable web games**: Phaser 3 + Vite.
- **Desktop / Steam-bound games**: Godot 4 with GDScript.
- **Backend** (when needed): Supabase.
- **Payments** (when needed): Stripe.
- **Never** suggest Unity unless I specifically ask.
- **Never** suggest Unreal under any circumstances.

Full details in `STACK.md`.

---

## Working principles

### Scope discipline

Default response to feature requests is to scope down. Ask whether the simpler version is enough before building complex. Build the smallest playable version first. The core loop must be validated as fun before any feature additions.

Gating question for every addition: **"Is this needed for the next playtest?"** If no, it goes in `CUT.md`.

### Iteration philosophy

- **Placeholder art always.** Solid colors, geometric shapes, simple primitives. No asset generation or sourcing until mechanics are validated.
- **Tune numbers and curves before rewriting code.** When something feels wrong, the first hypothesis is tuning, not architecture.
- **Commit after every working feature.** Branch for experiments. Never commit broken builds to `main`.

### Validation-first approach

Before building features, validate the assumption they're built on. A "fun" game mechanic should be testable in the smallest possible form first. This is the same discipline I use on other projects — figure out what's load-bearing, prove that piece works, then build around it.

### Macro-then-micro (for known genres)

When the genre is well-understood (clones, known mechanics), build all systems end-to-end as the first pass — title, gameplay, scoring, win condition, restart — then tune feel and polish in the micro pass. AI lets us reach the macro fast; the quality bar is set in the micro pass. Caveat: when the core mechanic is novel, the validation-first rule above still applies — you can't macro-build around a loop that hasn't proven itself fun.

---

## Documentation standards

Every project has:

**`DESIGN.md`** with:

- Core loop in one sentence
- Win/lose condition
- Fun test (what should specifically feel good — be specific)
- Inspirations and what's borrowed from each
- Out-of-scope list

**`README.md`** with:

- Status (prototype | playable | polish | shipped)
- How to run
- What works
- Known issues
- Next session plan

**`CUT.md`** for archived ideas with one-line reasons. Never delete ideas — cut features are also data.

Update these at session end, not as an afterthought.

---

## Code and asset conventions

Reference `NAMING.md` for the full list. Key points:

- Prototypes are numbered: `proto-001-pong`, `proto-002-breakout`.
- Real projects are named: `game-arena`, `game-puzzler`.
- Assets follow `{type}_{subject}_{variant}` (e.g. `sprite_player_idle`, `sfx_jump_01`).

---

## What I expect from you

1. **Push back on scope creep.** If I describe something that should take a week, tell me. If I describe something that belongs in v2, tell me.
2. **Teach as we go.** First time a gamedev concept appears, explain it briefly. Don't lecture — just enough that I build intuition.
3. **Suggest the boring solution first.** A Pong clone doesn't need clever architecture. Match complexity to project stage.
4. **Be honest when prototypes aren't working.** If the core loop isn't fun after it's built, say so directly. Don't help me polish something that should be cut. Cutting early is a feature.
5. **Default to working code over explanation.** Show implementation, then explain what's interesting about it. I learn by running things, not reading about them.
6. **Match your detail to the stage.** Prototypes get terse, working code. Real projects get more thorough explanation and architecture discussion.
7. **Don't generate or suggest art assets until mechanics are validated.** Don't worry about polish until the game is fun.
8. **When "walk me through" comes up, give me the operational steps, not the conceptual explanation.** I'll ask if I want the why.

---

## Session start protocol

1. Read `HANDOFF.md` at repo root first — last session summary, active projects, open decisions, current tooling notes. Fastest context restore.
2. Confirm which project we're working on, or whether this is a new prototype.
3. Ask the goal for this session — be specific.
4. If existing project, read its `DESIGN.md` and `README.md`.
5. Restate the plan before writing code.

## Session end protocol

1. Commit all working changes via `studio/cowork-push.py "<message>"`.
2. Update `README.md` with current state and next session plan.
3. Update `DESIGN.md` if mechanics or scope changed.
4. Move cut features to `CUT.md` with reasons.
5. Note any open questions or decisions deferred.
6. **Sync Notion** — see the Notion sync section below for what to update.

---

## Auto-commit workflow (GitHub via mirror)

I can write files into the `Game Dev` folder, but the Cowork mount blocks the unlink/rename operations git relies on, so git can't run directly inside that folder. Instead, `studio/cowork-push.py` keeps a private mirror of the working tree under `/tmp/cowork-mirror` (a regular Linux filesystem where git works fine), rsyncs my latest edits into it, and runs `git push` to GitHub over HTTPS.

**Repo:** https://github.com/J4Builds/cowork-gamedev (public — also serves as portfolio).

**Live game URL** (auto-deploys via GitHub Pages on each push to main):
`https://j4builds.github.io/cowork-gamedev/projects/<project-name>/`

**Auth:** A fine-grained PAT with Contents: Read+Write, stored at `studio/.github-token` (gitignored). Rotate when it expires (default 90 days) by generating a new one at https://github.com/settings/tokens?type=beta and overwriting that file.

**How I commit:**

1. I edit files via the Cowork file tools (John sees changes immediately).
2. I run `python3 studio/cowork-push.py "<commit message>"`.
3. The script wipes the mirror's working tree (preserving `.git`), rsyncs the source in (excluding `.git`, the token, `node_modules/`, etc.), then `git add -A && git commit && git push`.

**Mount-sync gotcha:** the Cowork mount sometimes shows Linux a stale or truncated view of files I just edited via host-side tools. When that happens, the rsync picks up the bad version and the commit corrupts the file on GitHub. Mitigation: when editing larger files (anything over a few hundred lines), rewrite via bash heredoc directly to both `/tmp/cowork-mirror/<path>` and the working tree path, rather than trusting the file tools to round-trip cleanly. Verify with `wc -c` before pushing.

**Verification:** I check `https://github.com/J4Builds/cowork-gamedev/commits/main` after each push. If the diff is wildly larger than expected (lots of files in a "small" commit), the mount-sync bug probably hit; revert and rebuild that commit.

**Cadence:** per the working principles — after every working feature, with a clear message.

**Local-vs-remote state:** John's local `.git` history will lag behind GitHub's. The local working tree always reflects my latest edits, so John can play the local file or the live URL — both are current. To sync local `.git` with GitHub when curiosity calls: `git fetch && git reset --hard origin/main`. Otherwise ignore the local `.git` and treat GitHub as truth.

**For future PATs:** John writes them straight into `studio/.github-token`, not into chat — keeps secrets out of conversation logs.

---

## Notion sync (workspace)

The Game Dev Notion page (https://www.notion.so/35bbb4f99a078018af1ae83c7d193a64) holds the things that don't belong in the repo: project status across all games, idea pool, reference-game journal, design reflections.

**Four databases** live as children of the Game Dev page:

| Database | URL | What goes in it |
|---|---|---|
| Projects | https://www.notion.so/198fef06ece848feaff7518a6e1c958f | One row per game. Status, genre, engine, GitHub URL, Live URL, current goal, last touched. |
| Ideas | https://www.notion.so/45e9e582dccc4470889055ba9fc44acd | Half-baked thoughts. Pitch, what's interesting, reference games, status (raw → prototyped). |
| Play Journal | https://www.notion.so/4dd2ea4a671c48ddac3b8184d3a5361d | Reference games studied. Core loop, what to steal, what's not working, monetization. |
| Design Log | https://www.notion.so/51bbb58764c746fd93e4fff525a78faf | Per-session design reflections. Optional Project relation. |

**Data source IDs** (for `notion-create-pages` calls):

- Projects: `776fd093-2300-4478-aaf3-c0eba8b25867`
- Ideas: `a9be00d6-b3d0-4e9b-9231-c9953058410c`
- Play Journal: `89c74f05-3b0b-4076-a42a-1573decc103d`
- Design Log: `8a42bb6f-b88d-46b3-be63-671aa736caf9`

**Sync rules:**

I am the one maintaining Notion. John doesn't update it; I do. As we collaborate in chat, I listen for moments that map to one of the four databases and queue them mentally. **At session end** I update Notion with anything that landed during the session:

- A project status changed (e.g. macro complete → polish; or shipped) → update the Projects row.
- John mentioned a new game idea, or refined one → add or update an Ideas row.
- John mentioned playing a reference game and what he took from it → add a Play Journal row.
- We had a design conversation worth remembering — a tuning insight, a principle, a "this is what good feel means" moment — → add a Design Log entry, optionally relating it to the Project.

I don't proactively ask "should this go in Notion." I notice and write at session end.

**Caveat:** Notion isn't versioned the way git is. Anything load-bearing for how I work (instructions, principles, protocols, naming, schema for cowork-push) lives in this repo, not Notion. Notion is for John's reference and reflection.

---

## Folder layout

```
HANDOFF.md                  <- session-to-session context bridge; read first
studio/                     <- meta: instructions, principles, templates, tools
  COWORK_INSTRUCTIONS.md    <- this file
  DESIGN_PRINCIPLES.md      <- evolving design philosophy
  STACK.md                  <- locked tech choices
  NAMING.md                 <- naming conventions
  cowork-push.py            <- GitHub-via-mirror push tool
  templates/                <- copy these into new projects
projects/                   <- proto-NNN-* and game-* live here
learning/                   <- experiments, sketches, notes — no shipping pressure
```
