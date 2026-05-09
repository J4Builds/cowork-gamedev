# NAMING

Conventions. Match them so files stay greppable.

---

## Folders

- `proto-{NNN}-{name}` for prototypes (e.g. `proto-001-pong`, `proto-002-breakout`)
- `game-{name}` for real projects (e.g. `game-arena`, `game-puzzler`)

## Code

- **HTML/JS prototypes**: `camelCase`, single file when possible.
- **Phaser**: scene-based organization, one file per scene.
- **Godot**: `PascalCase` for nodes/classes, `snake_case` for variables and files.

## Assets

Pattern: `{type}_{subject}_{variant}`

Examples:

- `sprite_player_idle`
- `sprite_player_run`
- `sfx_jump_01`
- `music_menu_loop`
- `bg_forest_layer1`

## Scenes / levels

Pattern: `scene_{type}_{name}`

Examples:

- `scene_menu_main`
- `scene_gameplay_arena01`
- `scene_ui_pause`

## Game state and data

Prefix by what they affect:

- `playerStats`
- `enemyConfig`
- `weaponData`
- `levelMeta`

## Branches

- `main` — always working.
- `experiment/{description}` — risky changes.
- `feature/{description}` — additive work.
