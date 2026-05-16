# Tetris (proto-004)

## One-sentence pitch

A faithful Tetris clone — seven tetromino shapes fall onto a 10×20 well, you slide and rotate them as they fall, clear lines by completely filling rows, lose when the stack reaches the top.

## Core loop

See the falling piece and the next preview → read the stack → choose where to place the current piece → rotate and slide it there before it locks → clear lines if you set up a complete row → the stack stays manageable, you live another piece. Pace increases with level, eventually faster than you can plan.

## Win/lose condition

- **Lose:** a newly-spawned piece can't fit (top-out — the stack reaches into the spawn area).
- **Win:** no win state. Endless score-chase, level keeps climbing.

## Fun test

The "clutch Tetris." The stack is high, gravity is fast, and an I-piece appears in the next slot. You hold breath through the current piece, set up a flat shelf with a 4-tall gap on one side, and the I-piece drops into the gap for a quadruple line clear. The peak moment is the visual snap of four full rows disappearing at once. Bonus peak: doing this when you didn't think the I-piece was coming.

If a player at level 5+ can predictably set up and land a Tetris (4-line clear), the game works.

## Inspirations

- **Tetris (Pajitnov, 1984)** — everything: 7 tetrominoes, 10-wide well, rotation, line clears, gravity ramp.
- **Tetris Guideline (modern)** — 7-bag randomizer (each set of 7 contains all pieces once, no flooding or droughts), ghost piece, hard drop, next-piece preview, scoring multipliers, soft drop. We skip SRS and hold-piece for the macro.
- **NES Tetris (1989)** — feel of "simple rotation with a small wall kick" — the rotation system we're using. No T-spins. Classic.
- **proto-003-snake (us, 2026-05)** — tick-based foundation, state machine pattern (title/playing/paused/gameover), localStorage best score, restraint discipline for the eventual juice pass.

## Out of scope (macro)

- **SRS (Super Rotation System)** with full kick tables and T-spin support — explicit cut. We use simple rotation with a 1-cell wall kick. T-spins are not possible. If we extend Tetris later, this is the upgrade.
- **Hold slot** — explicit cut. Adds UI panel + input handler. Strategic depth-up. Reconsider in a v2.
- **Multi-piece next preview** (showing next 3-6 pieces) — we show next 1 only. Sufficient for a learning prototype.
- **DAS / ARR tuning** (delayed auto-shift, auto-repeat rate) — we use a simple "hold to repeat after 150ms" pattern. Competitive tuning is juice-pass territory.
- **Soft-drop scoring + hard-drop scoring** — score comes from line clears only. Drop bonuses are guideline-standard but skippable for the learning prototype.
- **Visual juice** — no animation on line clear (lines snap out), no audio, no screen shake, no particles. Deferred to next session per the macro-then-micro discipline. Neutral palette with standard piece colors.
- **Local multiplayer, marathon vs sprint vs ultra modes, leaderboards, touch input.**

## What this prototype is for (concepts to internalize)

This builds on Snake's tick-based foundation. New concepts:

1. **7-bag randomizer.** Naive `Math.random() % 7` creates "droughts" (no I-piece for 14 pieces) and "floods" (three Z-pieces in a row). The bag fixes this: shuffle all 7 pieces, deal them in order, refill when empty. Each 7-piece run guarantees one of every shape. The math is the same as drawing from a deck.
2. **Bounding-box rotation.** Each piece lives in a 3×3 (or 4×4 for I, 2×2 for O) bounding box. To rotate 90° CW, the cell at (x, y) within the box moves to (N-1-y, x) where N is the box size. This is the cleanest way to express rotation without per-piece hardcoded rotation tables.
3. **Collision-checked rotation with wall kick.** Rotation can put the piece into a wall or settled block. The wall-kick fix: try the rotated piece at its current position; if it collides, try shifting left by 1, then right by 1; if all fail, cancel the rotation. Modern systems (SRS) use bigger kick tables for T-spins. We use the simple version.
4. **Lock delay.** When a piece touches the bottom (can't drop further), there's a brief grace window (~0.5s) before it locks into place. Without this, fast gravity makes precise placement impossible. The grace window resets each time the piece moves successfully — though we cap the resets implicitly by not tracking them (juice-pass concern).
5. **Line clear + cascade.** Detect any row that's fully filled, remove all such rows, shift everything above downward by the number of cleared rows. Score multiplies non-linearly: 1=100, 2=300, 3=500, 4=800 (times level). The non-linearity is the entire reason "Tetris" (4-line clear) is the strategic goal.
6. **Top-out.** Game over isn't "you ran out of moves" — it's "the next piece can't spawn without overlapping the stack." A different lose condition shape than Pong/Breakout/Snake.

## Current state

Not started.
