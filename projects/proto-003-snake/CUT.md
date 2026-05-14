# Cut features

Ideas considered and explicitly deferred. Cut features are also data — if a future Snake (proto-N or otherwise) wants to revisit, the reasoning is here.

## Macro pass (2026-05-14)

- **Wrap-around walls** — opted for Nokia-style walls-kill instead. Walls are a distinct collision type from self-collision, which is the concept this prototype exists to teach. Wrap-around is a five-line modulo change if we ever want a "relaxed mode".
- **Bonus / timed food** — Snake II territory. Tense base loop first.
- **Obstacles inside the arena** — same; expands the design surface beyond what a learning prototype needs.
- **Touch / swipe input** — keyboard-only for now. Mobile pass is its own thing.
- **Juice pass** — explicit defer. Macro first, polish only if the base loop validates.
