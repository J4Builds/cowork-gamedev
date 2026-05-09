# proto-001-pong

## Status

prototype — macro pass

## How to run

Open `index.html` in any modern browser. Two ways:

- Double-click `index.html` in File Explorer.
- Or, from PowerShell in the project folder:
  ```powershell
  start index.html
  ```

No build step. No server required.

(If you ever hit a CORS-style error from `file://` on a future prototype that loads assets, run `python -m http.server 8000` from the project folder and open `http://localhost:8000`. Not needed for this one.)

## Controls

- **W / S** or **↑ / ↓** — move paddle
- **Space** — start match / play again

## What works

- Title → playing → game over → restart state machine
- Player paddle (clamped to court)
- AI paddle that tracks the ball with a capped speed (beatable)
- Ball physics: serve from center after a half-second pause, top/bottom wall bounce, paddle bounce with angle-by-hit-position, speed-up per hit (capped)
- Score tracking, first-to-7 win condition
- Random serve direction at match start, served toward the loser after a point

## Known issues / things to evaluate

- AI difficulty: lowered AI_SPEED from 320 → 260 after first playtest (felt too hard). Re-evaluate next playtest.
- Ball top speed (720 px/sec) chosen to avoid tunneling through the 12 px paddle at 60fps. If you see the ball clip through, that's the cause — fix is swept-collision or wider paddle.
- No sound or visual feedback on paddle hit / score (deliberate — micro pass).
- Serve delay is fixed at 0.5s; might want to tune.
- Only one input scheme. No remap.

## Next session

Replay with the new AI speed. Then continue micro pass:

1. Re-tune AI speed if 260 still feels off (try 240 or add small targeting noise).
2. Tune paddle speed, ball start/max/increment if needed.
3. Add hit feedback (screen shake, color flash, paddle thump).
4. Decide whether sound is in scope for this prototype.
