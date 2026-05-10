# HANDOFF

Read this first at the start of every session. Quick context bridge — pointers, not a deep store.

## Last session — 2026-05-10

Polish pass on proto-001-pong — seven juice layers added in one bundle, validated on first playtest, no retuning needed:

- **Impact stack** on paddle hits: 50ms hit-stop (world freeze), 80ms paddle flash bloom, 70ms ball squash on impact axis (55% compression).
- **Score stack**: 280ms decaying screen shake (7px peak), per-side score-digit pulse (450ms, 1.55× peak with ease-out).
- **Motion**: 6-frame ball trail with fading alpha.
- **Audio**: three Web Audio voices (paddle = layered click + sweep thump, wall = light tick, score = layered up/down sweep). AudioContext lazy-inits on first keypress. Zero asset files.
- All knobs exposed as named constants at the top of `game.js` for one-line tuning.
- Pong now declared **shipped**. John's verdict: "just enough juice to make it interesting, but not so much that it doesn't feel like the original. The balance is perfect."
- Big lesson: restraint won. Conservative defaults across every dial added up to a feel that reads as polished without betraying the Atari silhouette. Watching Vlambeer's *Art of Screenshake* before tuning paid off — it gave John the vocabulary to evaluate what he was feeling.

## Active projects

(Empty — Pong shipped, Breakout starts next session.)

## Open decisions / next session candidates

1. **Start proto-002-breakout** — pre-committed direction. New mechanics: many-entity collision (bricks), level structure, brick state machines, optional powerups. Reuse the workflow (push script, Notion, Chrome smoke tests). Carry forward the juice principles validated on Pong.
2. **Something else** — John's call.

## Recently retired

- **proto-001-pong** — shipped 2026-05-10. Faithful Atari Pong with three difficulty presets and a restrained juice pass. Live at https://j4builds.github.io/cowork-gamedev/projects/proto-001-pong/. Reference point for "what restrained juice feels like" on future prototypes.

## Pending tooling work

- `studio/cowork-push.py` now aborts if any tracked file shrinks >50% since the last commit (defends against the Cowork mount sync bug). If a legitimate large deletion is needed, run with `--allow-shrink`.
- Mount sync gotcha: when `Read` returns truncated content or the script aborts on shrinkage, the workaround is to rewrite via bash heredoc to both `/tmp/cowork-mirror/<path>` and the working tree path, verify with `wc -c`, then push. Documented in COWORK_INSTRUCTIONS.md.

## Notion (workspace)

Game Dev page: https://www.notion.so/35bbb4f99a078018af1ae83c7d193a64

| Database | Data source ID |
|---|---|
| Projects | `776fd093-2300-4478-aaf3-c0eba8b25867` |
| Ideas | `a9be00d6-b3d0-4e9b-9231-c9953058410c` |
| Play Journal | `89c74f05-3b0b-4076-a42a-1573decc103d` |
| Design Log | `8a42bb6f-b88d-46b3-be63-671aa736caf9` |

Claude maintains these. John doesn't update Notion manually.

## Reading order at session start

1. **This file (HANDOFF.md)** — fastest context restore.
2. **studio/COWORK_INSTRUCTIONS.md** — how we work.
3. **Active project's DESIGN.md and README.md** — deeper state for whatever we work on this session.

## Retiring rules

When a game ships or is abandoned: move it from "Active projects" to "Recently retired" with a one-line summary (date + outcome). Once "Recently retired" grows past ~5 entries, the oldest drop off. Those games still exist in `projects/` and Notion's Projects database; they don't need to clutter this short-context file.

For "Pending tooling work": items get removed once resolved. If something lingers more than a session or two, it belongs in a real backlog (Notion Ideas database or GitHub Issues), not here.
