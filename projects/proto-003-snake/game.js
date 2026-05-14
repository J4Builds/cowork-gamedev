// =============================================================
// Snake — proto-003. Macro pass.
//
// Nokia Snake (1997) clone. Tick-based grid game.
//
// Reading order:
//   1. Canvas + constants
//   2. Game state
//   3. init() — fresh game
//   4. Input — double-buffered direction queue (see notes inside)
//   5. step() — one tick of simulation (THE game logic)
//   6. update(dt) — drives ticks at the current speed
//   7. render() — pure read of state
//   8. Game loop
// =============================================================

// ---------- 1. Canvas + constants ----------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;   // 800
const H = canvas.height;  // 600

const HUD_HEIGHT = 40;
const CELL = 20;
const COLS = W / CELL;                       // 40
const ROWS = (H - HUD_HEIGHT) / CELL;        // 28

// Playfield draws below the HUD strip. Convert grid -> pixel:
const px = (c) => c * CELL;
const py = (r) => HUD_HEIGHT + r * CELL;

// Three-stage speed ramp, triggered by snake length.
// Each "tick" advances the snake one cell. Shorter tick = faster.
const TICK_SEC = [1 / 8, 1 / 12, 1 / 16];     // 8, 12, 16 ticks/sec
const RAMP_AT  = [0,    10,      22];          // length thresholds (start length is 3)

// Maximum number of buffered direction presses. 2 is enough to thread a
// tight corner (UP then LEFT in the same input burst) without leaking
// inputs you didn't intend. Higher values start to feel "fated" — you
// can't change your mind.
const MAX_QUEUE = 2;

// Faithful Nokia LCD palette.
const COL_BG       = "#9bbc0f";  // LCD green
const COL_BG_DARK  = "#8bac0f";  // subtle grid tint
const COL_INK      = "#0f380f";  // the dark "pixel" — snake body, food, text
const COL_INK_DIM  = "#306230";  // mid green — snake head accent

// ---------- 2. Game state ----------
// phase: "title" | "playing" | "gameover"
const state = {
  phase: "title",
  snake: [],           // array of {x, y}, head at index 0
  dir: { x: 1, y: 0 }, // current committed heading
  pendingDirs: [],     // queue of up to MAX_QUEUE next directions; FIFO
  food: { x: 0, y: 0 },
  score: 0,
  best: 0,
  speedLevel: 0,       // index into TICK_SEC / RAMP_AT
  tickAcc: 0,          // accumulated seconds since last tick
};

// ---------- 3. init() ----------
// Resets everything for a fresh run. Snake starts length 3, mid-arena, going right.
function init() {
  const cx = Math.floor(COLS / 2);
  const cy = Math.floor(ROWS / 2);
  state.snake = [
    { x: cx,     y: cy }, // head
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy }, // tail
  ];
  state.dir = { x: 1, y: 0 };
  state.pendingDirs = [];
  state.score = 0;
  state.speedLevel = 0;
  state.tickAcc = 0;
  spawnFood();
}

function spawnFood() {
  // Pick a random empty cell. Cheap on a 40x28 grid; for a near-full snake
  // we'd want a smarter approach, but this is fine for a Snake prototype.
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
// Double-buffered direction queue, capacity MAX_QUEUE.
//
// Why queued at all: ticks fire every 60–125ms. A player threading a tight
// corner often presses both required directions inside one tick window.
//
// Validation: each new press is validated against the LAST queued direction
// (or state.dir if the queue is empty). The 180°-reject rule applies at
// every link, so you still can't reverse into yourself by mashing keys:
//   RIGHT, press UP → queue=[UP]. Press DOWN → DOWN is 180° from UP (the
//   last queued), so rejected. ✓
// But the tight-corner sequence works:
//   RIGHT, press UP → queue=[UP]. Press LEFT → 90° from UP, legal → queue=[UP, LEFT].
//   Tick 1: dir=UP. Tick 2: dir=LEFT. The corner happens over two ticks
//   but neither press was lost.

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
  if (state.pendingDirs.length >= MAX_QUEUE) return;       // queue full, drop
  const ref = state.pendingDirs.length > 0
    ? state.pendingDirs[state.pendingDirs.length - 1]
    : state.dir;
  if (d.x === -ref.x && d.y === -ref.y) return;            // 180° — illegal
  if (d.x ===  ref.x && d.y ===  ref.y) return;            // no-op
  state.pendingDirs.push(d);
}

window.addEventListener("keydown", (e) => {
  if (e.key === " " || e.code === "Space") {
    if (state.phase === "title" || state.phase === "gameover") {
      init();
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

// ---------- 5. step() — one tick of simulation ----------
//
// This is the game. Everything else is plumbing.
//
// Each tick:
//   a. Commit the next queued direction (if any).
//   b. Compute the new head cell from the current direction.
//   c. Wall check: is the head out of bounds? → game over.
//   d. Self check: does the head land on a body segment? → game over.
//      Important: if we're NOT growing this tick, the current tail will vacate
//      its cell, so the tail doesn't count as occupied. If we ARE growing
//      (head landed on food), the tail stays and DOES count.
//   e. Push the new head.
//   f. If we ate, spawn new food, score++, maybe bump speed. Else, pop the tail.
function step() {
  // a. commit next queued dir
  if (state.pendingDirs.length > 0) {
    state.dir = state.pendingDirs.shift();
  }

  const head = state.snake[0];
  const newHead = { x: head.x + state.dir.x, y: head.y + state.dir.y };

  // c. wall
  if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
    return gameOver();
  }

  // d. self
  const willGrow = newHead.x === state.food.x && newHead.y === state.food.y;
  // If not growing, exclude the tail (it's about to move).
  const bodyLen = willGrow ? state.snake.length : state.snake.length - 1;
  for (let i = 0; i < bodyLen; i++) {
    const s = state.snake[i];
    if (s.x === newHead.x && s.y === newHead.y) return gameOver();
  }

  // e. advance
  state.snake.unshift(newHead);
  if (willGrow) {
    state.score += 1;
    if (state.score > state.best) state.best = state.score;
    // Speed ramp: promote level if length crossed the next threshold.
    while (
      state.speedLevel < TICK_SEC.length - 1 &&
      state.snake.length >= RAMP_AT[state.speedLevel + 1]
    ) {
      state.speedLevel += 1;
    }
    spawnFood();
  } else {
    state.snake.pop();
  }
}

function gameOver() {
  state.phase = "gameover";
}

// ---------- 6. update(dt) ----------
//
// dt is the seconds elapsed since the last render frame. We accumulate it
// and run as many ticks as fit at the current speed. The render loop runs
// at 60fps; the simulation only steps on tick boundaries — that's the
// fundamental difference from Pong/Breakout, where every frame was a
// physics step.
function update(dt) {
  if (state.phase !== "playing") return;
  state.tickAcc += dt;
  const tickLen = TICK_SEC[state.speedLevel];
  // while-loop guards against frame drops causing dt > tickLen.
  while (state.tickAcc >= tickLen && state.phase === "playing") {
    state.tickAcc -= tickLen;
    step();
  }
}

// ---------- 7. render() ----------
function render() {
  // Backdrop outside the playfield (so HUD strip + edges read as the canvas frame).
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // Playfield bg.
  ctx.fillStyle = COL_BG;
  ctx.fillRect(0, HUD_HEIGHT, W, H - HUD_HEIGHT);

  // Subtle grid tint — every other cell, super faint. Helps the eye read
  // motion at speed and gives the LCD-pixel-grid impression.
  ctx.fillStyle = COL_BG_DARK;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if ((r + c) % 2 === 0) ctx.fillRect(px(c), py(r), CELL, CELL);
    }
  }

  // Food — smaller circle so it reads distinct from snake even in same ink.
  ctx.fillStyle = COL_INK;
  ctx.beginPath();
  ctx.arc(
    px(state.food.x) + CELL / 2,
    py(state.food.y) + CELL / 2,
    CELL * 0.32,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Snake — body cells dark, head slightly lighter so its position reads at speed.
  for (let i = 0; i < state.snake.length; i++) {
    const s = state.snake[i];
    ctx.fillStyle = i === 0 ? COL_INK_DIM : COL_INK;
    // 1px inset so adjacent cells visually separate — pure aesthetic.
    ctx.fillRect(px(s.x) + 1, py(s.y) + 1, CELL - 2, CELL - 2);
  }

  // HUD.
  ctx.fillStyle = "#eee";
  ctx.font = "20px ui-monospace, Menlo, Consolas, monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${state.score}`, 16, HUD_HEIGHT / 2);
  ctx.textAlign = "right";
  ctx.fillText(`BEST ${state.best}`, W - 16, HUD_HEIGHT / 2);
  ctx.textAlign = "center";
  ctx.fillText(`LEN ${state.snake.length}`, W / 2, HUD_HEIGHT / 2);

  // Overlays.
  if (state.phase === "title") {
    drawOverlay("SNAKE", "PRESS  SPACE  TO  START", "← ↑ → ↓   or   W A S D");
  } else if (state.phase === "gameover") {
    drawOverlay("GAME OVER", `SCORE ${state.score}`, "PRESS  SPACE  TO  RESTART");
  }
}

function drawOverlay(title, line2, line3) {
  // Translucent panel.
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

// ---------- 8. Game loop ----------
let lastTime = performance.now();
function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(tick);
}

// Set up an initial title-screen render before any input.
init();
state.phase = "title";
requestAnimationFrame(tick);
