# proto-003-snake

## Status

shipped

## How to run

Open `index.html` in any modern browser. Or play live at:
`https://j4builds.github.io/cowork-gamedev/projects/proto-003-snake/`

## Controls

- **↑ ↓ ← →** or **W A S D** — turn the snake
- **SPACE** — start / pause / resume / restart

## What works

### Macro pass

- 40 × 28 grid (20px cells), neutral zinc palette.
- Tick-based simulation at 60fps render / variable tick sim. Render decoupled from sim — that's the fundamental difference from Pong/Breakout.
- Three-stage speed ramp triggered by snake length: stage 2 at length 10 (after 7 food), stage 3 at length 22 (after 19 food).
- Double-buffered direction queue (capacity 2) with chain-validated 180° rejection — handles tight-corner double-taps without losing inputs.
- Self-collision check excludes the tail when not growing.
- Walls kill. Food respawns on a random empty cell.
- Title / playing / paused / dying / game-over states, all advanced via SPACE.
- BEST score persisted via `localStorage`.

### Juice pass

- **Audio.** Eat sound is a downloaded Foley sample (`sfx_munch.wav`) loaded via `HTMLAudioElement` (works under `file://` — fetch+decodeAudioData is blocked there by CORS). Volume tuned at 0.7. Synthesized voices for speed-ramp up-sweep, death sawtooth descent, and a 3-note F-minor arpeggio on game-over. AudioContext lazy-inits on first SPACE.
- **Visuals.** Snake-II-style rounded body via `roundRect` with selective corner radii — segments visually merge at corners so the snake reads as a continuous worm. Direction-aware eyes on the head (clearer at speed than color alone). Score-digit pulse on eat. Death-phase head flash + ~4px screen shake. Overlay-delay after game-over so audio cue lands first.
- **Restraint.** The eat-ring playfield flash was cut after playtest — the audio alone is sufficient feedback for the eat event.

### Audio design lessons from this session

1. **Sparse-chain audio.** Initial juice pass had pentatonic chain-ascending pitch on rapid eats (per the Breakout playbook). John pushed back: in Snake, eats are too sparse for the chain to dominate, so the *reset* to baseline registers as a descent and feels jarring. The ascending-audio principle holds for dense chains (Breakout tunneling) but fails for sparse-event games. Replaced with a flat per-event sound. Memory updated with the new sub-rule.
2. **Synthesis vs Foley.** Three rounds of Web Audio iteration on a "munch" sound (pip → thump+noise → two-bite nom-nom → four-puff mid-band) never landed it. Real Minecraft-style mouth sounds are recorded Foley; synthesis cannot fake the wet/organic character. Lesson: classify the sound target up front. Tonal / percussive → synth. Organic mouth/foot/cloth/water → sample. Saved as a feedback memory.

## Known issues

None reported.

## Next session

Snake is shipped. Next prototype is John's call. Per the learning ladder: proto-004 candidate is Tetris (builds on the tick-based foundation, adds rotation/wall-kicks, line-clear cascades, lock delay). Alternatively a small platformer to introduce continuous-physics + tile-collision + jump-feel — the most-underestimated genre on the ladder.
