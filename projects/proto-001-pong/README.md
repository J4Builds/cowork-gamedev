# proto-001-pong

## Status

shipped — mechanically complete + polished (juice pass landed first try)

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
- **Juice**: hit-stop, paddle flash, ball squash on paddle contact;
  screen shake + score pulse on a point; ball trail; three procedural
  Web Audio voices (paddle / wall / score)

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

## Juice knobs (per the polish pass)

All exposed as named constants in `game.js` under `// ---------- Juice
knobs ----------`. Tuned conservatively — restraint is the rule.

| Knob                    | Value | Effect |
|-------------------------|-------|--------|
| HITSTOP_DURATION        | 0.05s | World freeze on paddle hit |
| PADDLE_FLASH_DURATION   | 0.08s | Paddle bloom on hit |
| BALL_SQUASH_DURATION    | 0.07s | Ball compress-and-spring window |
| BALL_SQUASH_AMOUNT      | 0.55  | 0..1 fraction along impact axis |
| SHAKE_DURATION          | 0.28s | Screen shake on a point |
| SHAKE_MAGNITUDE         | 7 px  | Peak amplitude of decaying shake |
| SCORE_PULSE_DURATION    | 0.45s | Score-digit pulse window |
| SCORE_PULSE_SCALE       | 1.55× | Peak scale of pulsing digit |
| TRAIL_LENGTH            | 6     | # of ghost samples behind ball |

Audio voices are programmatic (`playPaddleHit`, `playWallBounce`,
`playScore`) — no asset files. AudioContext lazy-inits on first keypress
to satisfy browser autoplay policy.

## Known issues / things to evaluate

- Difficulty curve is set by feel, not measured. Re-tune any of the four
  knobs per preset based on playtest.
- Ball top speed (720 px/sec) chosen to avoid tunneling through the 12
  px paddle at 60fps. If the ball clips through, fix is swept-collision.
- Serve delay is fixed at 0.5s.

## Next session

Pong is shipped. Move on to **proto-002-breakout** — different mechanics
to learn (many-entity collision, brick state, level structure, optional
powerups). Pong stays available at the live URL as a reference point for
how restrained juice should feel.
