// =============================================================
// Prototype starter — HTML5 Canvas + vanilla JS, single file.
//
// Read top to bottom. Six sections:
//   1. Canvas + context setup
//   2. Input (keyboard state)
//   3. Game state (whatever your game needs)
//   4. update(dt) — advance the simulation
//   5. render()   — draw the current state
//   6. The game loop (requestAnimationFrame + delta time)
// =============================================================

// ---------- 1. Canvas + context ----------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

// ---------- 2. Input ----------
// We track which keys are currently held. On each frame, update() reads this.
// (Edge-triggered actions like "jump on press" need a separate just-pressed
// set — add when you need it.)
const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.key));
window.addEventListener("keyup",   (e) => keys.delete(e.key));

// ---------- 3. Game state ----------
// Replace this with whatever your prototype needs.
// Kept as a plain object so it's easy to inspect in devtools.
const state = {
  player: { x: W / 2, y: H / 2, r: 16, speed: 240 }, // speed = pixels/second
};

// ---------- 4. Update ----------
// dt is "delta time" — seconds since the last frame. Multiplying movement
// by dt makes the game frame-rate independent: a player moving at 240 px/s
// covers the same ground on a 60Hz monitor and a 144Hz monitor.
function update(dt) {
  const p = state.player;

  // Read input and move. Diagonal movement here is slightly faster than
  // cardinal (1.41x). Normalize the vector when that starts to matter.
  if (keys.has("ArrowLeft")  || keys.has("a")) p.x -= p.speed * dt;
  if (keys.has("ArrowRight") || keys.has("d")) p.x += p.speed * dt;
  if (keys.has("ArrowUp")    || keys.has("w")) p.y -= p.speed * dt;
  if (keys.has("ArrowDown")  || keys.has("s")) p.y += p.speed * dt;

  // Clamp to screen.
  p.x = Math.max(p.r, Math.min(W - p.r, p.x));
  p.y = Math.max(p.r, Math.min(H - p.r, p.y));
}

// ---------- 5. Render ----------
// Draw the current state. No simulation here — render is read-only.
function render() {
  // Clear (black background). For trails, draw a translucent rect instead.
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // Player — placeholder circle.
  const p = state.player;
  ctx.fillStyle = "#4ade80";
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();

  // HUD.
  ctx.fillStyle = "#888";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText("WASD / arrows to move", 12, 22);
}

// ---------- 6. The game loop ----------
// requestAnimationFrame schedules `tick` to run before the next browser
// repaint — typically ~60 times/sec. Each call gets a high-resolution
// timestamp; we diff it against the previous one to get dt.
//
// We cap dt at 1/30s so a tab-switch or breakpoint doesn't cause a huge
// "teleport" frame when the loop resumes.
let lastTime = performance.now();
function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
