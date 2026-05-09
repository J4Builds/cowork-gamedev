# STACK

Tech choices are locked. Don't bikeshed.

---

## Engines / runtimes

| Stage | Stack | Why |
|---|---|---|
| Prototypes (single-screen, learning) | HTML5 Canvas + vanilla JS, single file | Fastest possible iteration. No build step. Read top to bottom. |
| Web-shippable games | Phaser 3 + Vite | Proven 2D engine, fast HMR, easy itch.io deploy. |
| Desktop / Steam-bound | Godot 4 with GDScript | Free, open-source, great 2D, exports to all desktop targets. |

**Never** Unity unless I specifically ask. **Never** Unreal under any circumstances.

---

## Source control

- **GitHub.** Public repos by default — portfolio value. Private only when there's a real reason (unreleased commercial project, NDA, etc.).
- One repo per project. Studio meta lives in this top-level repo.

## Project management

- **Notion.** Set up later. One page per project plus a master backlog.

## Backend (when needed)

- **Supabase.** Leaderboards, accounts, save state, anything multiplayer-adjacent.

## Payments (when monetizing)

- **Stripe.** Same stack I already know.

## Asset creation

- **Placeholders first.** Solid colors, shapes. No real assets until mechanics are validated.
- **Aseprite** for pixel art when needed.
- **freesound.org** for SFX.
- **Suno** (or similar) for music.

## Distribution

- **itch.io** for web games and early access.
- **Steam** when a project has earned the listing fee and the polish budget.
