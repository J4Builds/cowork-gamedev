# proto-004-tetris

## Status

prototype (macro pass complete, juice pass pending)

## How to run

Open `index.html` in any modern browser. Or play live at:
`https://j4builds.github.io/cowork-gamedev/projects/proto-004-tetris/`

## Controls

- **← →** — move piece left / right (hold to auto-repeat)
- **↑** — rotate clockwise
- **↓** — soft drop (10× gravity)
- **SPACE** — hard drop (slam to bottom + lock)
- **P** — pause / resume
- **ENTER** — start / restart

## What works

### Macro pass

- 10 × 20 board, 30px cells, dark neutral palette with standard tetromino colors (I=cyan, O=yellow, T=purple, S=green, Z=red, J=blue, L=orange).
- All 7 tetrominoes with bounding-box rotation (3×3 for most, 4×4 for I, 2×2 O which doesn't rotate).
- **7-bag randomizer.** Each refill shuffles all 7 piece types and deals them in order — guarantees one of every piece per 7-piece run, no droughts or floods.
- **Simple rotation with wall kicks.** Rotation tries the in-place rotated position first, then ±1 column, then ±2 columns (the wider kicks help the I-piece against walls). No SRS kick tables; T-spins are not possible.
- **Gravity ramp.** `dropInterval = max(0.05, 0.8^(level-1))` seconds per row. Approximates the NES Tetris curve.
- **Soft drop** (10× gravity while ↓ held) and **hard drop** (instant lock, ignores lock delay).
- **Lock delay** of 0.5 seconds. A successful rotation resets the timer (lets you wiggle into position at the last second). Sideways moves don't reset, so you can't infinite-spin.
- **Line clear + cascade.** Rows that are fully filled get spliced out; everything above shifts down. Multi-line clears handled in one pass.
- **Scoring.** Standard: 1=100, 2=300, 3=500, 4=800 — multiplied by current level. No soft/hard-drop bonus in the macro.
- **Level up** every 10 lines cleared; gravity tightens accordingly.
- **Ghost piece.** Translucent outline at the drop landing position. Makes hard-drop placement readable.
- **Next-piece preview** (next 1) in a side panel.
- **Title / playing / paused / gameover** state machine; advanced via ENTER / P.
- **Top-out detection** — game over when a new piece spawns colliding with the stack.
- **BEST score** persisted to `localStorage` (`tetris_best`).
- **Auto-repeat on hold** for left/right with 150ms initial delay + 50ms repeat. Edge-triggered for rotate, soft drop, and hard drop.

### Out of scope (cut for macro)

- SRS (Super Rotation System) with kick tables and T-spin support.
- Hold slot.
- Multi-piece next preview.
- Soft-drop / hard-drop scoring bonuses.
- All juice: animations on line clear, audio, screen shake, particles, lock-flash, level-up flourish.

## Known issues

None yet — bring playtest reports.

## Next session

Juice pass. Per the macro-then-micro discipline: now that the systems are correct, the next pass tunes feel.

Likely targets in priority order:

1. **Line-clear animation.** Right now lines snap out instantly. Even a 100ms flash + fade would massively improve the satisfaction of multi-line clears. Quadruple line clear (Tetris) deserves its own bigger flourish.
2. **Audio.** Lock thump on piece settle. Line-clear sound that scales with clear count (1-line vs 4-line distinctly different — per the ascending-audio principle, but careful since Tetris is sparse-event like Snake). Level-up sting.
3. **Lock flash.** Brief brightening of the piece's blocks on settle, so the lock event is visible.
4. **Game-over fill.** Fill the board row-by-row on top-out (classic Tetris animation), then show overlay.
5. **Hard-drop trail.** A faint vertical streak from the piece's pre-drop position to the lock position, so hard drops read as decisive instead of teleporty.
6. **Level transition.** Subtle color shift in the well frame at level-up, or brief flash.

Restraint principle applies — every individual element conservative; cumulative feel should be polished without any single dial dominating.

Also consider:

- **DAS tuning** (delayed auto-shift). The macro uses 150ms / 50ms; competitive Tetris players want shorter DAS. Worth a tuning pass if it feels sluggish.
- **Sparse vs dense audio.** Tetris is sparse (locks are seconds apart) — chain pitch escalation per Breakout would feel descending on the reset, per the Snake lesson. Each event probably wants its own self-contained sound.
