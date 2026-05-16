# proto-004-tetris

## Status

playable (macro + juice pass complete)

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

## Juice pass (this session)

Per playtest feedback, scope stayed tight — the game already felt good mechanically. Three things landed:

1. **Resize.** Cell size 30 → 40px. Board now 400×800, canvas 620×840. Fonts and panel scaled proportionally. Reads with more presence on screen instead of feeling cramped.
2. **Restart from pause.** ENTER while paused now restarts the run (consistent with ENTER on title and gameover). Overlay text updated: "P RESUME · ENTER RESTART".
3. **Audio.** All Web Audio synthesis — no samples needed (these are tonal/percussive, exactly what synth nails per the synthesis-vs-Foley rule). Lazy-init on first ENTER per browser autoplay policy.
   - **Lock thump.** Short low sine sweep 120→60 Hz, 120ms. Soft "clack" on settle, fires on every piece lock (including hard drops).
   - **Line clear, scales with count.** Sparse-event design per the Snake lesson — no chain pitch (would feel descending on the reset, Tetris locks are seconds apart). Each event is self-contained:
     - 1 line: single A5 tone.
     - 2 lines: A5 + E6 (perfect fifth).
     - 3 lines: A5 + C#6 + E6 (major triad).
     - 4 lines (Tetris): E5 → A5 → C#6 → E6 ascending arpeggio, triangle wave, longer release, 60ms stagger. Distinctly the payoff.
   - **Level up.** A4 → A5 ascending sweep, 250ms. Fires when crossing a 10-line threshold.
   - **Game over.** Descending three-note minor: A5 → F5 → D5, 180ms apart. Sine.
   - All volumes conservative (peak 0.12–0.18) per the juice restraint principle.

## Next session

Macro + juice both shipped. Tetris is at "playable" — could go straight to retired, or there's a polish-pass opportunity if playtest reveals anything.

Open follow-ups if we return:

- **DAS tuning** (150ms initial / 50ms repeat). Competitive players want shorter; might be sluggish for fast play.
- **Visual juice** — explicitly skipped per playtest feedback. Line-clear animation, lock flash, game-over fill, hard-drop trail could all come if needed.
- **SRS upgrade** if T-spins matter.
- **Hold slot** for strategic depth.
