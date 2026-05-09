# COWORK_INSTRUCTIONS

This is the master file for our gamedev studio. Read this at the start of every session — it is the source of truth for how we work together.

---

## Context

I'm not a traditional developer. I've shipped real products (Next.js, Supabase, Stripe stack) entirely through AI assistance — Claude, Replit, Cowork. I think in terms of systems, products, and outcomes, not code. I read code well enough to follow what's happening and catch obvious issues, but I'm not writing it from scratch.

This matters because:

- I need you to write working code, not pseudocode or "fill in the rest yourself" snippets.
- When you introduce gamedev concepts (delta time, fixed timestep, object pooling, game loops, collision detection, etc.), explain them briefly the first time so I build real intuition.
- I can validate behavior and feel, but I can't always validate code correctness — be honest when you're uncertain.
- I'm here to learn the domain, not just outsource it.

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

---

## Session start protocol

1. Confirm which project we're working on, or whether this is a new prototype.
2. Ask the goal for this session — be specific.
3. If existing project, read `DESIGN.md` and `README.md` before doing anything else.
4. Restate the plan before writing code.

## Session end protocol

1. Commit all working changes with clear messages.
2. Update `README.md` with current state and next session plan.
3. Update `DESIGN.md` if mechanics or scope changed.
4. Move cut features to `CUT.md` with reasons.
5. Note any open questions or decisions deferred.

---

## Auto-commit workflow (GitHub via mirror)

I can write files into the `Game Dev` folder but the Cowork mount blocks the unlink/rename operations git relies on, so git can't run directly inside that folder. Instead, `studio/cowork-push.py` keeps a private mirror of the working tree under `/tmp/cowork-mirror` (a regular Linux filesystem where git works fine), rsyncs my latest edits into it, and runs `git push` to GitHub over HTTPS.

**Repo:** https://github.com/J4Builds/cowork-gamedev

**Auth:** A fine-