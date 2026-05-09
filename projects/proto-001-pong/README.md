# proto-001-pong

## Status

prototype — micro pass

## How to run

Open `index.html` in any modern browser. Two ways:

- Double-click `index.html` in File Explorer.
- Or, from PowerShell in the project folder:
  ```powershell
  start index.html
  ```

No build step. No server required.

## Controls

- **W / S** or **↑ / ↓** — move paddle
- **Space** — start, pause, resume, play again
- **← / →** — change difficulty (in title / pause / game-over screens)

## What works

- Title → playing → paused → game-over → restart state machine
- Player paddle, AI paddle (predictive with three difficulty presets)
- Ball physics: serve from center after a half-second pause, top/bottom
  wall bounce, paddle bounce with angle-by-hit-position, speed-up per
  hit (capped at 720 px/sec)
- Score tracking, first-to-7 win condition
- Random serve direction at match start, served toward the loser after
  a point
- Difficulty selectable on title / pause / game-over; selection
  persisted to localStorage

## Difficulty knobs (per preset)

| Preset | aiSpeed | reaction | aimError | predictionFraction |
|--------|---------|----------|----------|--------------------|
| Easy   | 180     | 0.25 s   | ±50 px   | 0.40               |
| Normal | 220     | 0.20 s   | ±30 px   | 0.70               |
| Hard   | 280     | 0.10 s   | ±15 px   | 0.95               |

`aiPredictionFraction` blends the bounce-aware predicted intercept with
the ball's current y. Lower fraction = AI aims closer to where the ball
IS, missing where it WILL BE — that's the main lever that keeps sharp
shots scoreable.

## Known issues / things to evaluate

- Difficulty curve is set by feel, not measured. Re-tune any of the four
  knobs per preset based on playtest.
- Ball top speed (720 px/sec) chosen to avoid tunneling through the 12
  px paddle at 60fps. If the ball clips through, fix is swept-collision.
- No sound or visual feedback on paddle hit / score (deliberate — next
  micro pass).
- Serve delay is fixed at 0.5s.

## Next session

Playtest each difficulty. Then continue micro pass:

1. Adjust knobs per preset based on what felt off.
2. Add hit feedback (screen shake, color flash, paddle thump).
3. Decide whether sound is in scope for this prototype.
