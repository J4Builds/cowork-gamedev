// =============================================================
// Snake — proto-003. Macro + juice pass.
//
// Modernized palette, Snake-II-style rounded body, restrained juice stack.
//
// Reading order:
//   1. Constants + palette
//   2. Game state
//   3. init() + spawnFood()
//   4. Input — double-buffered direction queue
//   5. Audio — lazy Web Audio, eat / speed-ramp / death / game-over voices
//   6. step() — one tick of simulation
//   7. gameOver() — death phase transition (drives shake + flash)
//   8. update(dt) — drives ticks, advances timers/effects/transitions
//   9. render() helpers (drawSegment, drawHeadEyes, drawOverlay)
//  10. render()
//  11. Game loop
// =============================================================

// ---------- 1. Constants + palette ----------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;   // 800
const H = canvas.height;  // 600

const HUD_HEIGHT = 40;
const CELL = 20;
const COLS = W / CELL;                       // 40
const ROWS = (H - HUD_HEIGHT) / CELL;        // 28

const px = (c) => c * CELL;
const py = (r) => HUD_HEIGHT + r * CELL;

const TICK_SEC = [1 / 8, 1 / 12, 1 / 16];     // 8, 12, 16 ticks/sec
const RAMP_AT  = [0,    10,      22];          // length thresholds (start length is 3)

const MAX_QUEUE = 2;

// Neutral dark palette — zinc grays + green snake + red food.
const COL_BG        = "#18181b";  // zinc-900
const COL_BG_GRID   = "#232327";  // very subtle checker tint
const COL_SNAKE     = "#16a34a";  // green-600 body (slightly less neon)
const COL_HEAD      = "#4ade80";  // green-400 head
const COL_HEAD_EYE  = "#18181b";  // bg color so eyes read as cutouts
const COL_FOOD      = "#ef4444";  // red-500
const COL_HUD       = "#e5e5e5";  // neutral-200
const COL_DEATH     = "#fef2f2";  // near-white death flash

// Juice tuning dials. Conservative defaults — restraint principle.
const SCORE_PULSE_SEC   = 0.30;   // how long the SCORE number stays inflated
const DYING_SEC         = 0.55;   // death phase: shake + head flash before overlay
const OVERLAY_DELAY_SEC = 0.45;   // pause after death sting before GAME OVER text appears
const SHAKE_PEAK_PX     = 4;

// ---------- 2. Game state ----------
// phase: "title" | "playing" | "paused" | "dying" | "gameover"
const state = {
  phase: "title",
  snake: [],
  dir: { x: 1, y: 0 },
  pendingDirs: [],
  food: { x: 0, y: 0 },
  score: 0,
  best: 0,
  speedLevel: 0,
  tickAcc: 0,

  // juice
  scorePulse: 0,        // 1 → 0 over SCORE_PULSE_SEC
  deathTimer: 0,        // counts up during "dying" phase
  overlayDelay: 0,      // counts down once in "gameover" phase
};

// Load BEST from localStorage if present (juice persistence between sessions).
try {
  const stored = parseInt(localStorage.getItem("snake_best") || "0", 10);
  if (Number.isFinite(stored) && stored > 0) state.best = stored;
} catch (e) { /* localStorage unavailable, ignore */ }

// ---------- 3. init() + spawnFood() ----------
function init() {
  const cx = Math.floor(COLS / 2);
  const cy = Math.floor(ROWS / 2);
  state.snake = [
    { x: cx,     y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  state.dir = { x: 1, y: 0 };
  state.pendingDirs = [];
  state.score = 0;
  state.speedLevel = 0;
  state.tickAcc = 0;
  state.scorePulse = 0;
  state.deathTimer = 0;
  state.overlayDelay = 0;
  spawnFood();
}

function spawnFood() {
  while (true) {
    const x = Math.floor(Math.random() * COLS);
    const y = Math.floor(Math.random() * ROWS);
    if (!state.snake.some((s) => s.x === x && s.y === y)) {
      state.food = { x, y };
      return;
    }
  }
}

// ---------- 4. Input ----------
//
// Double-buffered direction queue, capacity MAX_QUEUE. See macro-pass notes
// in the commit history for the full reasoning; in short: chain-validated
// against the LAST queued direction so tight-corner double-taps register
// without losing inputs, while 180°-reject is preserved at every link.

const DIRS = {
  ArrowUp:    { x:  0, y: -1 },
  ArrowDown:  { x:  0, y:  1 },
  ArrowLeft:  { x: -1, y:  0 },
  ArrowRight: { x:  1, y:  0 },
  w:          { x:  0, y: -1 },
  s:          { x:  0, y:  1 },
  a:          { x: -1, y:  0 },
  d:          { x:  1, y:  0 },
};

function tryQueueDir(d) {
  if (state.pendingDirs.length >= MAX_QUEUE) return;
  const ref = state.pendingDirs.length > 0
    ? state.pendingDirs[state.pendingDirs.length - 1]
    : state.dir;
  if (d.x === -ref.x && d.y === -ref.y) return;
  if (d.x ===  ref.x && d.y ===  ref.y) return;
  state.pendingDirs.push(d);
}

window.addEventListener("keydown", (e) => {
  if (e.key === " " || e.code === "Space") {
    initAudio();   // unlock AudioContext on first user gesture
    if (state.phase === "title" || (state.phase === "gameover" && state.overlayDelay <= 0)) {
      init();
      state.phase = "playing";
    } else if (state.phase === "playing") {
      state.phase = "paused";
    } else if (state.phase === "paused") {
      state.phase = "playing";
    }
    e.preventDefault();
    return;
  }
  if (state.phase !== "playing") return;
  const d = DIRS[e.key];
  if (d) {
    tryQueueDir(d);
    e.preventDefault();
  }
});

// ---------- 5. Audio ----------
//
// Lazy-init AudioContext on first user gesture (browser autoplay policy).
// All voices are synthesized — no asset files.

let audioCtx = null;

// The munch sample uses an HTMLAudioElement instead of Web Audio decodeAudioData.
// Why: when index.html is opened directly (file://) most browsers block fetch()
// for local files (CORS), so the Web Audio path silently fails. HTMLAudioElement
// loads fine from file:// when the asset sits next to the page.
const munchAudio = new Audio("sfx_munch.wav");
munchAudio.preload = "auto";

function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    audioCtx = null;
  }
}

function playTone({ freq, dur, type = "sine", vol = 0.15, attack = 0.005, release = 0.05, freqEnd = null, freqCurve = "linear" }) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== null) {
    if (freqCurve === "exp") {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
    } else {
      osc.frequency.linearRampToValueAtTime(freqEnd, t0 + dur);
    }
  }
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + attack);
  gain.gain.setValueAtTime(vol, t0 + Math.max(attack, dur - release));
  gain.gain.linearRampToValueAtTime(0, t0 + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function playEat() {
  // cloneNode() lets two munches overlap if you eat fast; the original element
  // is just a template. .catch() swallows the rejected-promise that browsers
  // emit when play() is called before the user gesture has unlocked audio.
  const a = munchAudio.cloneNode();
  a.volume = 0.7;   // tune to taste
  a.play().catch(() => {});
}

function playSpeedRamp() {
  playTone({ freq: 400, freqEnd: 880, freqCurve: "exp", dur: 0.20, type: "square", vol: 0.10 });
}

function playDeath() {
  playTone({ freq: 440, freqEnd: 80, freqCurve: "exp", dur: 0.50, type: "sawtooth", vol: 0.20, release: 0.08 });
}

function playGameOver() {
  // Descending F-minor arpeggio: A4, F4, C4.
  if (!audioCtx) return;
  const seq = [440.00, 349.23, 261.63];
  seq.forEach((f, i) => {
    setTimeout(() => playTone({ freq: f, dur: 0.28, type: "triangle", vol: 0.16 }), i * 130);
  });
}

// ---------- 6. step() ----------
function step() {
  if (state.pendingDirs.length > 0) {
    state.dir = state.pendingDirs.shift();
  }

  const head = state.snake[0];
  const newHead = { x: head.x + state.dir.x, y: head.y + state.dir.y };

  if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
    return gameOver();
  }

  const willGrow = newHead.x === state.food.x && newHead.y === state.food.y;
  const bodyLen = willGrow ? state.snake.length : state.snake.length - 1;
  for (let i = 0; i < bodyLen; i++) {
    const s = state.snake[i];
    if (s.x === newHead.x && s.y === newHead.y) return gameOver();
  }

  state.snake.unshift(newHead);
  if (willGrow) {
    state.score += 1;
    if (state.score > state.best) {
      state.best = state.score;
      try { localStorage.setItem("snake_best", String(state.best)); } catch (e) { /* ignore */ }
    }
    playEat();
    state.scorePulse = 1;

    // Speed ramp.
    const prevLevel = state.speedLevel;
    while (
      state.speedLevel < TICK_SEC.length - 1 &&
      state.snake.length >= RAMP_AT[state.speedLevel + 1]
    ) {
      state.speedLevel += 1;
    }
    if (state.speedLevel > prevLevel) playSpeedRamp();

    spawnFood();
  } else {
    state.snake.pop();
  }
}

// ---------- 7. gameOver() ----------
//
// Enters "dying" phase: shake + head flash for DYING_SEC, then transitions
// to "gameover" which plays the sting and waits OVERLAY_DELAY_SEC before
// drawing the GAME OVER overlay (so the audio cue lands first — same trick
// we used in Pong and Breakout's terminal phases).
function gameOver() {
  state.phase = "dying";
  state.deathTimer = 0;
  state.pendingDirs = [];
  playDeath();
}

// ---------- 8. update(dt) ----------
function update(dt) {
  // Advance juice timers regardless of phase (so they keep ticking during
  // dying/gameover too).
  state.scorePulse = Math.max(0, state.scorePulse - dt / SCORE_PULSE_SEC);

  // Death → game-over transition.
  if (state.phase === "dying") {
    state.deathTimer += dt;
    if (state.deathTimer >= DYING_SEC) {
      state.phase = "gameover";
      state.overlayDelay = OVERLAY_DELAY_SEC;
      playGameOver();
    }
    return;
  }
  if (state.phase === "gameover") {
    if (state.overlayDelay > 0) state.overlayDelay = Math.max(0, state.overlayDelay - dt);
    return;
  }
  if (state.phase !== "playing") return;

  state.tickAcc += dt;
  const tickLen = TICK_SEC[state.speedLevel];
  while (state.tickAcc >= tickLen && state.phase === "playing") {
    state.tickAcc -= tickLen;
    step();
  }
}

// ---------- 9. render helpers ----------

// Rounded segment with selective corner radii. A corner is rounded only
// if BOTH adjacent edges are "open" (no neighboring segment on that side).
// Cells touching a neighbor stay square along that edge, so the snake
// reads as a continuous worm rather than a chain of discrete squares.
function drawSegment(i) {
  const s = state.snake[i];
  const prev = state.snake[i - 1]; // toward head; undefined for head
  const next = state.snake[i + 1]; // toward tail; undefined for tail

  const has = { up: false, down: false, left: false, right: false };
  for (const n of [prev, next]) {
    if (!n) continue;
    if (n.x === s.x && n.y === s.y - 1) has.up = true;
    if (n.x === s.x && n.y === s.y + 1) has.down = true;
    if (n.x === s.x - 1 && n.y === s.y) has.left = true;
    if (n.x === s.x + 1 && n.y === s.y) has.right = true;
  }

  const r = CELL * 0.42;
  const tl = (!has.up    && !has.left)  ? r : 0;
  const tr = (!has.up    && !has.right) ? r : 0;
  const br = (!has.down  && !has.right) ? r : 0;
  const bl = (!has.down  && !has.left)  ? r : 0;

  ctx.beginPath();
  ctx.roundRect(px(s.x), py(s.y), CELL, CELL, [tl, tr, br, bl]);
  ctx.fill();
}

// Two small "cutout" dots on the head, positioned by direction.
function drawHeadEyes(s, dir) {
  const cx = px(s.x) + CELL / 2;
  const cy = py(s.y) + CELL / 2;
  const r = CELL * 0.10;
  const along = CELL * 0.20;   // along the heading axis
  const across = CELL * 0.20;  // perpendicular to it

  let e1, e2;
  if (dir.x === 1) {       // facing right
    e1 = { x: cx + along, y: cy - across };
    e2 = { x: cx + along, y: cy + across };
  } else if (dir.x === -1) { // left
    e1 = { x: cx - along, y: cy - across };
    e2 = { x: cx - along, y: cy + across };
  } else if (dir.y === -1) { // up
    e1 = { x: cx - across, y: cy - along };
    e2 = { x: cx + across, y: cy - along };
  } else {                   // down
    e1 = { x: cx - across, y: cy + along };
    e2 = { x: cx + across, y: cy + along };
  }

  ctx.fillStyle = COL_HEAD_EYE;
  ctx.beginPath();
  ctx.arc(e1.x, e1.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(e2.x, e2.y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawOverlay(title, line2, line3) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, HUD_HEIGHT, W, H - HUD_HEIGHT);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 56px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText(title, W / 2, HUD_HEIGHT + (H - HUD_HEIGHT) * 0.38);

  ctx.font = "24px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText(line2, W / 2, HUD_HEIGHT + (H - HUD_HEIGHT) * 0.55);

  ctx.font = "18px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillStyle = "#bbb";
  ctx.fillText(line3, W / 2, HUD_HEIGHT + (H - HUD_HEIGHT) * 0.68);
}

// ---------- 10. render() ----------
function render() {
  // Background.
  ctx.fillStyle = COL_BG;
  ctx.fillRect(0, 0, W, H);

  // Shake offset (during dying phase, decays as time progresses).
  let sx = 0, sy = 0;
  if (state.phase === "dying") {
    const fade = 1 - state.deathTimer / DYING_SEC;
    const k = SHAKE_PEAK_PX * Math.max(0, fade);
    sx = (Math.random() - 0.5) * 2 * k;
    sy = (Math.random() - 0.5) * 2 * k;
  }

  ctx.save();
  ctx.translate(sx, sy);

  // Subtle grid checker — much fainter than the LCD version, just enough
  // to give the eye a motion reference at high tick rates.
  ctx.fillStyle = COL_BG_GRID;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if ((r + c) % 2 === 0) ctx.fillRect(px(c), py(r), CELL, CELL);
    }
  }

  // Food.
  ctx.fillStyle = COL_FOOD;
  ctx.beginPath();
  ctx.arc(
    px(state.food.x) + CELL / 2,
    py(state.food.y) + CELL / 2,
    CELL * 0.34,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Snake — body first, then head on top (so eyes draw cleanly).
  ctx.fillStyle = COL_SNAKE;
  for (let i = state.snake.length - 1; i >= 1; i--) drawSegment(i);

  // Head — flash white during dying, otherwise the brighter green.
  let headColor = COL_HEAD;
  if (state.phase === "dying") {
    // Pulse between head color and death white at ~8Hz.
    const phase = Math.floor(state.deathTimer * 16) % 2;
    headColor = phase === 0 ? COL_DEATH : COL_HEAD;
  }
  ctx.fillStyle = headColor;
  drawSegment(0);
  if (state.phase !== "dying") {
    drawHeadEyes(state.snake[0], state.dir);
  }

  ctx.restore();

  // HUD (drawn outside the shake transform — it doesn't shake).
  const pulse = state.scorePulse;
  const scoreFontSize = Math.round(20 + 5 * pulse);  // 20 → 25 at peak
  ctx.fillStyle = COL_HUD;
  ctx.textBaseline = "middle";
  ctx.font = `20px ui-monospace, Menlo, Consolas, monospace`;
  ctx.textAlign = "right";
  ctx.fillText(`BEST ${state.best}`, W - 16, HUD_HEIGHT / 2);
  ctx.textAlign = "center";
  ctx.fillText(`LEN ${state.snake.length}`, W / 2, HUD_HEIGHT / 2);
  ctx.font = `${scoreFontSize}px ui-monospace, Menlo, Consolas, monospace`;
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${state.score}`, 16, HUD_HEIGHT / 2);

  // Overlays.
  if (state.phase === "title") {
    drawOverlay("SNAKE", "PRESS  SPACE  TO  START", "← ↑ → ↓   or   W A S D");
  } else if (state.phase === "paused") {
    drawOverlay("PAUSED", "PRESS  SPACE  TO  RESUME", "");
  } else if (state.phase === "gameover" && state.overlayDelay <= 0) {
    drawOverlay("GAME OVER", `SCORE ${state.score}`, "PRESS  SPACE  TO  RESTART");
  }
}

// ---------- 11. Game loop ----------
let lastTime = performance.now();
function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(tick);
}

init();
state.phase = "title";
requestAnimationFrame(tick);
