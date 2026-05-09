# HANDOFF

Read this first at the start of every session. Quick context bridge — pointers, not a deep store.

## Last session — 2026-05-09

Built proto-001-pong macro pass and a first micro pass:

- Full state machine, paddles, AI, ball physics, scoring, win condition.
- AI iterated through three designs: naive tracker (320 → 260 px/sec, sharp shots couldn't score) → full trajectory prediction (became unbeatable) → predict-and-blend with three difficulty presets (Easy/Normal/Hard at predictionFraction 0.40/0.70/0.95). Default Normal feels right per playtest.
- Added pause (Space mid-match) and a difficulty selector (←/→) on title / pause / game-over screens. Selection persisted to localStorage.
- Set up workflow infrastructure: GitHub-via-mirror push (`studio/cowork-push.py`, now hardened with verify-after-rsync), public repo, GitHub Pages auto-deploy, Notion workspace integration with four databases, Claude in Chrome for self-driven smoke tests.
- Two design conversations captured in Notion Design Log: (1) Pong AI tuning lessons — speed cap alone doesn't fix prediction; (2) creative-vs-craft division of labor in our collaboration.

## Active projects

- **proto-001-pong** — `projects/proto-001-pong/` — status: playable. Decision pending: polish pass (juice + sound) or call shipped and start proto-002-breakout.

## Open decisions / next session candidates

1. **Polish Pong** — paddle-hit flash, screen shake, ball trail, basic hit/score sounds. Adds the "feel" layer to a mechanically-complete game. Estimate one session.
2. **Ship Pong, start proto-002-breakout** — call Pong done, move on. Breakout teaches brick collision (many entities) and powerups (item drops), reusable in larger genres.
3. **Something else** — John's call.

## Recently retired

(Empty — no games shipped or abandoned yet.)

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
