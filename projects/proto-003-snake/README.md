# proto-003-snake

## Status

playable (macro pass complete, juice pass deferred)

## How to run

Open `index.html` in any modern browser. Or play live at:
`https://j4builds.github.io/cowork-gamedev/projects/proto-003-snake/`

## Controls

- **↑ ↓ ← →** or **W A S D** — turn the snake
- **SPACE** — start / restart

## What works

- 40 × 28 grid (20px cells), Nokia LCD palette.
- Tick-based simulation. Render runs at 60fps via `requestAnimationFrame`, but the snake only advances on tick boundaries (8 / 12 / 16 ticks/sec across three stages).
- Three-stage speed ramp triggered by snake length: stage 2 at length 10 (after 7 food), stage 3 at length 22 (after 19 food). Threshold-tuned from the initial 8/16 after first playtest revealed those promotions came too early.
- **Double-buffered direction queue (capacity 2)** with chain-validated 180° rejection — handles tight-corner double-taps without losing inputs. Replaced a single-slot queue that felt laggy on rapid two-key turns.
- Self-collision check excludes the tail when the snake isn't growing (tail will vacate that tick).
- Food respawns on a random empty cell each time it's eaten.
- Title → playing → game over → restart, all via SPACE.
- Score / best / length in the HUD.
- **Macro-pass playtest (2026-05-14):** input model and ramp validated. Core loop confirmed.

## Known issues

None reported.

## Audio / juice

Deferred. No audio, no particles, no hit-stop, no screen effects — same playbook as Breakout: validate the macro pass first, then a possible juice session.

## Next session

Two paths from here:

1. **Juice pass on Snake** — port the same restrained-juice stack we built for Breakout (Web Audio voices, eat sound that ascends per chain index when food is grabbed in quick succession, ball-lost sweep variant for game-over, score pulse, brief screen flash on death, etc.). The ascending-audio principle from Breakout's lesson would carry directly to per-food chain audio if John eats two pellets in fast succession.
2. **Skip to proto-004** — move on to Tetris next per the learning ladder. Snake is functionally complete; juice is taste polish, not concept learning.

John's call at the start of next session.
