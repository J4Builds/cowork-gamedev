# DESIGN_PRINCIPLES

A living doc. Starts sparse. Grows as I figure out what I actually believe.

---

## Seed principles

- **Fun first, polish second, art last.**
- **Scope is the killer.** Most failures are scope failures, not capability failures.
- **The last 20% is harder than the first 80%.** Polish, balance, juice, edge cases — that's where games die.
- **Cutting features is a feature.** Every feature you cut is one you don't have to build, balance, debug, or maintain.
- **Numbers matter more than architecture in early stages.** Tune before refactor.
- **Build the macro first, then adjust the micro.** When the genre is well-understood (clones, known mechanics), build all systems end-to-end as the first pass — title, gameplay, scoring, win condition, restart — then tune feel and polish. AI lets us reach the macro fast; the quality bar is set in the micro pass. (Caveat: when the core mechanic is novel, the "validate the smallest piece first" rule from `COWORK_INSTRUCTIONS.md` still applies — you can't macro-build around a loop that hasn't proven itself fun.)
- **Separate AI's physical capability from its decision quality.** When tuning AI difficulty, slowing the paddle and worsening its decisions are two different levers — and players notice and respect imperfect *decisions* but resent slow paddles. The right design is a smart-but-slightly-wrong AI, not a fast-but-dumb one. (Validated on proto-001-pong via the `predictionFraction` blend.)

---

## Open questions I'm sitting with

(Add as they come up.)

---

## Things I've learned the hard way

(Add after each project — what I wish I'd known at the start.)
