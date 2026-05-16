// =============================================================
// Tetris (proto-004) — macro pass.
// HTML5 Canvas + vanilla JS, single file.
//
// Sections:
//   1. Constants (grid, layout, timing, scoring, colors)
//   2. Tetromino definitions
//   3. Rotation helper
//   4. Game state + reset
//   5. 7-bag randomizer
//   6. Spawn / collision / placement
//   7. Movement, rotation, hard drop
//   8. Lock, line clear, scoring, level
//   9. Input
//  10. update() — per-frame sim, state-machine driven
//  11. render() — board, piece, ghost, HUD, overlays
//  12. Game loop
// =============================================================

// ---------- 1. Constants ----------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const COLS = 10;
const ROWS = 20;
const CELL = 40;                    // board cell size, px
const BOARD_X = 20;                 // board top-left x in canvas px
const BOARD_Y = 20;                 // board top-left y in canvas px
const BOARD_W = COLS * CELL;        // 300
const BOARD_H = ROWS * CELL;        // 600
const PANEL_X = BOARD_X + BOARD_W + 20;  // 440

const SOFT_DROP_FACTOR = 10;        // soft drop is 10x faster than current gravity
const LOCK_DELAY = 0.5;             // seconds piece can rest on ground before locking
const MOVE_INITIAL_DELAY = 0.15;    // seconds before auto-repeat kicks in
const MOVE_REPEAT = 0.05;           // seconds between auto-repeat moves

// Scoring: index = lines cleared this lock. Multiplied by level.
const LINE_SCORES = [0, 100, 300, 500, 800];

// Gravity per level — seconds per row drop. Approximates the NES curve.
function gravityFor(level) {
  return Math.max(0.05, Math.pow(0.8, level - 1));
}

// ---------- 2. Tetromino definitions ----------
// Each piece has a bounding box size and a list of [x,y] cell offsets
// within that box, in its spawn orientation. Rotation is computed via
// rotate90cw() applied to the offsets.
const PIECES = {
  I: { size: 4, color: "#0e7490", blocks: [[0,1],[1,1],[2,1],[3,1]] },
  O: { size: 2, color: "#ca8a04", blocks: [[0,0],[1,0],[0,1],[1,1]] },
  T: { size: 3, color: "#6d28d9", blocks: [[1,0],[0,1],[1,1],[2,1]] },
  S: { size: 3, color: "#15803d", blocks: [[1,0],[2,0],[0,1],[1,1]] },
  Z: { size: 3, color: "#b91c1c", blocks: [[0,0],[1,0],[1,1],[2,1]] },
  L: { size: 3, color: "#c2410c", blocks: [[2,0],[0,1],[1,1],[2,1]] },
  J: { size: 3, color: "#1d4ed8", blocks: [[0,0],[0,1],[1,1],[2,1]] },
};
const PIECE_TYPES = ["I","O","T","S","Z","L","J"];

// Spawn x for each piece — center the bounding box horizontally on COLS=10.
function spawnX(type) {
  return Math.floor((COLS - PIECES[type].size) / 2);
}

// ---------- 3. Rotation helper ----------
// Rotate a set of blocks 90° CW within an NxN bounding box.
//   (x, y)  ->  (N - 1 - y, x)
function rotate90cw(blocks, size) {
  return blocks.map(([x,y]) => [size - 1 - y, x]);
}

// ---------- 3a. Audio (Web Audio synthesis) ----------
// All sounds are synthesized — no samples. Per the synthesis-vs-Foley rule,
// tonal/percussive game sounds are exactly what synth handles well.
// Lazy-init on first user interaction (browser autoplay policy).
let audioCtx = null;
let masterGain = null;
let musicGain = null;
function initAudio() {
  if (audioCtx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  audioCtx = new AC();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.8;
  masterGain.connect(audioCtx.destination);
  // Separate bus for the music. Starts at 0, faded in by musicLoop.
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0;
  musicGain.connect(masterGain);
  lastStepTime = audioCtx.currentTime;
  musicLoop();
}

// Small helper: create a tone (osc + gain) with ADSR-ish envelope.
function tone({ type = "sine", freq, freq2, start, attack = 0.01, dur = 0.2, peak = 0.15 }) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freq2 !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(freq2, start + dur);
  }
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(g).connect(masterGain);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

// Lock tap — wood-block-style percussive click. Mid-range triangle wave so
// it's audible on small speakers (an earlier low-freq sine sweep at 120->60 Hz
// was below the physical range of most laptop/monitor drivers).
function playLock() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  tone({ type: "triangle", freq: 380, freq2: 180, start: t, attack: 0.002, dur: 0.08, peak: 0.28 });
}

// Line clear — pitch/voicing scales with clear count. Sparse-event audio
// (per Snake): each event is self-contained, no chain pitch.
//   1: single tone
//   2: fifth interval (perfect fifth)
//   3: triad chord
//   4 (Tetris): ascending arpeggio with longer release — the payoff moment
function playLineClear(count) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  if (count === 4) {
    // Ascending arpeggio: E5 A5 C#6 E6, staggered 60ms apart.
    const notes = [659, 880, 1109, 1319];
    notes.forEach((f, i) => {
      tone({ type: "triangle", freq: f, start: t0 + i * 0.06, attack: 0.005, dur: 0.32, peak: 0.22 });
    });
  } else {
    const sets = {
      1: [880],
      2: [880, 1319],
      3: [880, 1109, 1319],
    };
    const notes = sets[count] || [880];
    notes.forEach((f) => {
      tone({ type: "sine", freq: f, start: t0, attack: 0.005, dur: 0.18, peak: 0.22 });
    });
  }
}

// Level-up sting — quick rising sine sweep.
function playLevelUp() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  tone({ type: "sine", freq: 440, freq2: 880, start: t, attack: 0.02, dur: 0.25, peak: 0.22 });
}

// Game over — descending three-note minor: A5, F5, D5.
function playGameOver() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  const notes = [880, 698, 587];
  notes.forEach((f, i) => {
    tone({ type: "sine", freq: f, start: t0 + i * 0.18, attack: 0.02, dur: 0.42, peak: 0.22 });
  });
}

// ---------- 3b. Background music (light techno) ----------
// Beat-grid scheduler at fixed 120 BPM. Two-layer rhythm — kick on every
// quarter note + closed hi-hat on every off-beat — consistent throughout
// the game. No melody, no intensity scaling. Pure groove that sits
// behind the SFX.

const STEPS_PER_BAR   = 16;     // 16th-note grid
const TECHNO_BPM      = 120;
const STEP_DURATION   = 60 / TECHNO_BPM / 4;  // seconds per 16th note
const MUSIC_PLAY_GAIN = 0.3;
const MUSIC_FADE      = 0.4;    // gain fade-in/out on phase change

let lastStepTime      = 0;
let lastScheduledStep = -1;
let prevMusicTarget   = -1;
let hatNoiseBuffer    = null;

// Cached white-noise buffer for the hi-hat (cheap to reuse, no need to
// regenerate per hit).
function ensureNoiseBuffer() {
  if (hatNoiseBuffer || !audioCtx) return;
  const dur = 0.1;
  const size = Math.floor(audioCtx.sampleRate * dur);
  hatNoiseBuffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
  const data = hatNoiseBuffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
}

// Kick drum — square wave thump, exponential pitch sweep 180->55 Hz.
// Square (not sine) keeps it audible on small speakers via the harmonics.
function playKick(time) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(180, time);
  osc.frequency.exponentialRampToValueAtTime(55, time + 0.06);
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(0.30, time + 0.002);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  osc.connect(g).connect(musicGain);
  osc.start(time);
  osc.stop(time + 0.14);
}

// Closed hi-hat — short high-passed noise tick.
function playHat(time) {
  if (!audioCtx) return;
  ensureNoiseBuffer();
  const src = audioCtx.createBufferSource();
  src.buffer = hatNoiseBuffer;
  const filt = audioCtx.createBiquadFilter();
  filt.type = "highpass";
  filt.frequency.value = 7000;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.10, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
  src.connect(filt).connect(g).connect(musicGain);
  src.start(time);
  src.stop(time + 0.05);
}

function scheduleStep(step, time) {
  const stepInBar = step % STEPS_PER_BAR;
  // Kick on every quarter note (steps 0/4/8/12).
  if (stepInBar % 4 === 0) playKick(time);
  // Closed hi-hat on every off-beat (steps 2/6/10/14).
  if (stepInBar % 4 === 2) playHat(time);
}

function musicLoop() {
  if (!audioCtx) { setTimeout(musicLoop, 100); return; }
  const t = audioCtx.currentTime;

  // Fade musicGain on phase change. Music plays only during "playing".
  const target = (state && state.phase === "playing") ? MUSIC_PLAY_GAIN : 0;
  if (target !== prevMusicTarget && musicGain) {
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setValueAtTime(musicGain.gain.value, t);
    musicGain.gain.linearRampToValueAtTime(target, t + MUSIC_FADE);
    prevMusicTarget = target;
  }

  // Schedule beats on the lookahead window during play.
  if (state && state.phase === "playing") {
    const ahead = 0.1;
    while (lastStepTime + STEP_DURATION < t + ahead) {
      lastStepTime += STEP_DURATION;
      lastScheduledStep++;
      scheduleStep(lastScheduledStep, lastStepTime);
    }
  } else {
    // Outside of play: keep clock current so we don't replay a backlog
    // when the game resumes.
    lastStepTime = t;
  }

  setTimeout(musicLoop, 25);
}

// ---------- 4. Game state ----------
const state = {
  phase: "title",          // "title" | "playing" | "paused" | "gameover"
  board: [],               // ROWS x COLS, null or color string
  current: null,           // { type, blocks, x, y, size, color }
  next: null,              // same shape as current (spawn orientation)
  bag: [],                 // upcoming pieces (7-bag)
  score: 0,
  lines: 0,
  level: 1,
  best: parseInt(localStorage.getItem("tetris_best") || "0", 10) || 0,

  // Timing
  dropTimer: 0,            // accumulates dt; when >= drop interval, piece drops 1 row
  lockTimer: 0,            // accumulates when piece can't drop; locks at LOCK_DELAY
  isOnGround: false,       // does current piece rest on ground/stack?
  softDrop: false,         // ArrowDown held?

  // Auto-repeat for left/right hold
  leftHold:  { t: 0, charged: false },
  rightHold: { t: 0, charged: false },
};

function emptyBoard() {
  const b = [];
  for (let r = 0; r < ROWS; r++) b.push(new Array(COLS).fill(null));
  return b;
}

function resetGame() {
  state.board = emptyBoard();
  state.bag = [];
  state.score = 0;
  state.lines = 0;
  state.level = 1;
  state.dropTimer = 0;
  state.lockTimer = 0;
  state.isOnGround = false;
  state.softDrop = false;
  state.leftHold = { t: 0, charged: false };
  state.rightHold = { t: 0, charged: false };
  state.next = makePiece(drawFromBag());
  spawnNext();
}

// ---------- 5. 7-bag randomizer ----------
function drawFromBag() {
  if (state.bag.length === 0) {
    // Refill and shuffle.
    state.bag = PIECE_TYPES.slice();
    for (let i = state.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.bag[i], state.bag[j]] = [state.bag[j], state.bag[i]];
    }
  }
  return state.bag.shift();
}

// ---------- 6. Spawn / collision / placement ----------
function makePiece(type) {
  const def = PIECES[type];
  return {
    type,
    size: def.size,
    color: def.color,
    blocks: def.blocks.map(b => b.slice()), // clone
    x: spawnX(type),
    y: 0,
  };
}

// Spawn the next piece as current; pull a new piece from bag for next.
// Returns false if the spawn position collides — game over.
function spawnNext() {
  state.current = state.next;
  state.next = makePiece(drawFromBag());
  state.dropTimer = 0;
  state.lockTimer = 0;
  state.isOnGround = false;
  if (collides(state.current.blocks, state.current.x, state.current.y)) {
    return false;
  }
  return true;
}

// Does placing `blocks` (in piece-local coords) at board position (px, py)
// overlap a wall or a settled block?
function collides(blocks, px, py) {
  for (const [bx, by] of blocks) {
    const cx = px + bx;
    const cy = py + by;
    if (cx < 0 || cx >= COLS) return true;
    if (cy >= ROWS) return true;
    if (cy >= 0 && state.board[cy][cx] !== null) return true;
    // cy < 0 is allowed (piece partially above the board, e.g. at spawn)
  }
  return false;
}

// Stamp the current piece into the board.
function lockPiece() {
  for (const [bx, by] of state.current.blocks) {
    const cx = state.current.x + bx;
    const cy = state.current.y + by;
    if (cy >= 0 && cy < ROWS && cx >= 0 && cx < COLS) {
      state.board[cy][cx] = state.current.color;
    }
  }
}

// ---------- 7. Movement, rotation, hard drop ----------
function tryMove(dx, dy) {
  const p = state.current;
  if (!collides(p.blocks, p.x + dx, p.y + dy)) {
    p.x += dx;
    p.y += dy;
    return true;
  }
  return false;
}

// Rotate CW. If the rotated piece collides, try kicking left by 1, right by 1.
// (I-piece gets the same simple kicks — modern SRS uses different tables but
// for the macro this plays correctly.)
function tryRotate() {
  const p = state.current;
  if (p.type === "O") return;       // O doesn't rotate
  const rotated = rotate90cw(p.blocks, p.size);
  const kicks = [0, -1, 1, -2, 2];  // last two help the I-piece against walls
  for (const dx of kicks) {
    if (!collides(rotated, p.x + dx, p.y)) {
      p.blocks = rotated;
      p.x += dx;
      // Successful rotation resets lock timer (allows last-second adjustments).
      state.lockTimer = 0;
      return;
    }
  }
  // All kicks failed — silently cancel.
}

// Drop piece as far as it goes, then lock immediately. No lock delay.
function hardDrop() {
  let dropped = 0;
  while (tryMove(0, 1)) dropped++;
  finishLock();
}

// Compute where the current piece would land if it dropped now (ghost piece).
function ghostY() {
  const p = state.current;
  let y = p.y;
  while (!collides(p.blocks, p.x, y + 1)) y++;
  return y;
}

// ---------- 8. Lock, line clear, scoring, level ----------
function finishLock() {
  lockPiece();
  playLock();
  const beforeLevel = state.level;
  const cleared = clearLines();
  if (cleared > 0) {
    state.lines += cleared;
    state.score += LINE_SCORES[cleared] * state.level;
    state.level = 1 + Math.floor(state.lines / 10);
    playLineClear(cleared);
    if (state.level > beforeLevel) playLevelUp();
  }
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem("tetris_best", String(state.best));
  }
  if (!spawnNext()) {
    state.phase = "gameover";
    playGameOver();
  }
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (state.board[r].every(c => c !== null)) {
      state.board.splice(r, 1);
      state.board.unshift(new Array(COLS).fill(null));
      cleared++;
      r++; // re-check this row (which now has the row above shifted in)
    }
  }
  return cleared;
}

// ---------- 9. Input ----------
const keys = new Set();
const justPressed = new Set();
const GAME_KEYS = new Set([
  "ArrowLeft","ArrowRight","ArrowUp","ArrowDown",
  " ","p","P","Enter",
]);

window.addEventListener("keydown", (e) => {
  if (!keys.has(e.key)) justPressed.add(e.key);
  keys.add(e.key);
  if (GAME_KEYS.has(e.key)) e.preventDefault();
});
window.addEventListener("keyup", (e) => keys.delete(e.key));

// Edge-triggered helpers — call inside update(), then clear at end of frame.
function consumeJustPressed(key) {
  if (justPressed.has(key)) { justPressed.delete(key); return true; }
  return false;
}

// Hold-with-DAS helper: returns true when caller should perform the move.
function pollHold(key, hold, dt) {
  if (!keys.has(key)) { hold.t = 0; hold.charged = false; return false; }
  if (justPressed.has(key)) {
    // Initial press handled by consumeJustPressed elsewhere; this path
    // only handles sustained holds.
    hold.t = 0;
    hold.charged = false;
    return false;
  }
  hold.t += dt;
  if (!hold.charged) {
    if (hold.t >= MOVE_INITIAL_DELAY) {
      hold.charged = true;
      hold.t = 0;
      return true;
    }
  } else {
    if (hold.t >= MOVE_REPEAT) {
      hold.t = 0;
      return true;
    }
  }
  return false;
}

// ---------- 10. update() ----------
function update(dt) {
  if (state.phase === "title") {
    if (consumeJustPressed("Enter")) {
      initAudio();
      resetGame();
      state.phase = "playing";
    }
    justPressed.clear();
    return;
  }

  if (state.phase === "gameover") {
    if (consumeJustPressed("Enter")) {
      initAudio();
      resetGame();
      state.phase = "playing";
    }
    justPressed.clear();
    return;
  }

  if (state.phase === "paused") {
    if (consumeJustPressed("p") || consumeJustPressed("P")) {
      state.phase = "playing";
    } else if (consumeJustPressed("Enter")) {
      resetGame();
      state.phase = "playing";
    }
    justPressed.clear();
    return;
  }

  // phase === "playing"
  if (consumeJustPressed("p") || consumeJustPressed("P")) {
    state.phase = "paused";
    justPressed.clear();
    return;
  }

  // Edge-triggered: initial press moves once.
  if (consumeJustPressed("ArrowLeft"))  { tryMove(-1, 0); state.leftHold = { t: 0, charged: false }; }
  if (consumeJustPressed("ArrowRight")) { tryMove( 1, 0); state.rightHold = { t: 0, charged: false }; }
  if (consumeJustPressed("ArrowUp"))    { tryRotate(); }
  if (consumeJustPressed(" "))          { hardDrop(); justPressed.clear(); return; }

  // Held: auto-repeat after delay.
  if (pollHold("ArrowLeft",  state.leftHold,  dt)) tryMove(-1, 0);
  if (pollHold("ArrowRight", state.rightHold, dt)) tryMove( 1, 0);

  state.softDrop = keys.has("ArrowDown");

  // Gravity.
  const interval = gravityFor(state.level) / (state.softDrop ? SOFT_DROP_FACTOR : 1);
  state.dropTimer += dt;
  while (state.dropTimer >= interval) {
    state.dropTimer -= interval;
    if (!tryMove(0, 1)) {
      // Can't drop — start/continue lock-delay countdown.
      state.isOnGround = true;
      break;
    } else {
      state.isOnGround = false;
      state.lockTimer = 0;
    }
  }

  // Lock delay.
  if (state.isOnGround) {
    state.lockTimer += dt;
    if (state.lockTimer >= LOCK_DELAY) {
      finishLock();
    }
    // If a move/rotate freed the piece from the ground, lockTimer resets via
    // tryMove success above (next iteration). If still grounded but the
    // player moved sideways, lockTimer keeps counting up — players can't
    // infinite-spin (matches simple-rotation philosophy).
  }

  justPressed.clear();
}

// ---------- 11. render() ----------
function drawCell(px, py, color) {
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
}

function drawBoardFrame() {
  // Background well.
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
  // Subtle grid.
  ctx.strokeStyle = "#1f1f23";
  ctx.lineWidth = 1;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(BOARD_X + c * CELL + 0.5, BOARD_Y);
    ctx.lineTo(BOARD_X + c * CELL + 0.5, BOARD_Y + BOARD_H);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(BOARD_X,           BOARD_Y + r * CELL + 0.5);
    ctx.lineTo(BOARD_X + BOARD_W, BOARD_Y + r * CELL + 0.5);
    ctx.stroke();
  }
  // Frame.
  ctx.strokeStyle = "#3f3f46";
  ctx.lineWidth = 2;
  ctx.strokeRect(BOARD_X - 1, BOARD_Y - 1, BOARD_W + 2, BOARD_H + 2);
}

function drawSettled() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = state.board[r][c];
      if (v) drawCell(BOARD_X + c * CELL, BOARD_Y + r * CELL, v);
    }
  }
}

function drawPiece(piece, originX, originY, ghost) {
  for (const [bx, by] of piece.blocks) {
    const cx = originX + bx * CELL;
    const cy = originY + by * CELL;
    if (ghost) {
      ctx.strokeStyle = piece.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx + 2, cy + 2, CELL - 4, CELL - 4);
      ctx.globalAlpha = 1;
    } else {
      drawCell(cx, cy, piece.color);
    }
  }
}

function drawCurrent() {
  if (!state.current) return;
  // Ghost first, then real piece on top.
  const gy = ghostY();
  drawPiece(
    { blocks: state.current.blocks, color: state.current.color },
    BOARD_X + state.current.x * CELL,
    BOARD_Y + gy * CELL,
    true
  );
  drawPiece(
    state.current,
    BOARD_X + state.current.x * CELL,
    BOARD_Y + state.current.y * CELL,
    false
  );
}

function drawNext() {
  const px = PANEL_X;
  const py = BOARD_Y;
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText("NEXT", px, py + 16);

  // Preview box: 4x4 cells at 22px each, plus padding.
  const preCell = 28;
  const boxX = px;
  const boxY = py + 24;
  const boxSize = 4 * preCell;
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(boxX, boxY, boxSize, boxSize);
  ctx.strokeStyle = "#27272a";
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxSize - 1, boxSize - 1);

  if (state.next) {
    // Center the piece's bounding box within the 4x4 preview.
    const offsetCells = (4 - state.next.size) / 2;
    for (const [bx, by] of state.next.blocks) {
      const cx = boxX + (bx + offsetCells) * preCell;
      const cy = boxY + (by + offsetCells) * preCell;
      ctx.fillStyle = state.next.color;
      ctx.fillRect(cx + 1, cy + 1, preCell - 2, preCell - 2);
    }
  }
}

function drawHUD() {
  const px = PANEL_X;
  let py = BOARD_Y + 28 + 4 * 28 + 28; // below next preview

  ctx.fillStyle = "#a1a1aa";
  ctx.font = "14px system-ui, sans-serif";

  const rows = [
    ["SCORE", state.score],
    ["LEVEL", state.level],
    ["LINES", state.lines],
    ["BEST",  state.best],
  ];
  for (const [label, val] of rows) {
    ctx.fillStyle = "#71717a";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(label, px, py);
    ctx.fillStyle = "#e4e4e7";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.fillText(String(val), px, py + 24);
    py += 52;
  }

  // Controls.
  py += 12;
  ctx.fillStyle = "#52525b";
  ctx.font = "13px system-ui, sans-serif";
  const controls = [
    "← →   MOVE",
    "↑       ROTATE",
    "↓       SOFT DROP",
    "SPACE   HARD DROP",
    "P       PAUSE",
  ];
  for (const line of controls) {
    ctx.fillText(line, px, py);
    py += 18;
  }
}

function drawOverlay(title, subtitle) {
  ctx.fillStyle = "rgba(9, 9, 11, 0.78)";
  ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
  ctx.fillStyle = "#e4e4e7";
  ctx.font = "bold 56px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, BOARD_X + BOARD_W / 2, BOARD_Y + BOARD_H / 2 - 16);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText(subtitle, BOARD_X + BOARD_W / 2, BOARD_Y + BOARD_H / 2 + 28);
  ctx.textAlign = "left";
}

function render() {
  // Clear.
  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, W, H);

  drawBoardFrame();
  drawSettled();
  if (state.phase === "playing" || state.phase === "paused") {
    drawCurrent();
  }
  drawNext();
  drawHUD();

  if (state.phase === "title") {
    drawOverlay("TETRIS", "PRESS ENTER TO START");
  } else if (state.phase === "paused") {
    drawOverlay("PAUSED", "P RESUME  ·  ENTER RESTART");
  } else if (state.phase === "gameover") {
    drawOverlay("GAME OVER", "PRESS ENTER TO RESTART");
  }
}

// ---------- 12. Game loop ----------
let lastTime = performance.now();
function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(tick);
}

// Initialize state for title screen — board empty, no piece yet.
state.board = emptyBoard();
state.next = makePiece(drawFromBag());
requestAnimationFrame(tick);
