# AI Usage Log

How AI (Claude, via Claude Code) was used on this assignment, by build phase.
Logged as a decision trail rather than a single upfront prompt, since that's
what actually happened — the code was built in reviewed phases with real
corrections along the way, and that's more honest evidence of how it was
driven than a polished one-shot prompt would be.

## Phase 1 — Planning

- Started from the assignment brief (kept verbatim in
  [`docs/OBJECTIVE.md`](./docs/OBJECTIVE.md)) and a Claude Design mockup built
  beforehand for the visual direction:
  [Sezzle kalkulator arytmetyczny](https://claude.ai/code/artifact/5d3891b1-1e06-4fe0-9f6a-b26792330b1d) —
  a dark, Sezzle-purple keypad UI. That mockup settled the look; the data
  model and API shape were worked out separately with Claude Code, in a
  planning pass before any code was written.
- Biggest upfront call: this reads as a payments-adjacent assignment
  (Sezzle), so plain `float64` arithmetic was ruled out before writing a
  single handler. Decimal precision needed to be the default, with `float64`
  used only where there's genuinely no alternative (irrational results from
  `sqrt`/`power`).
- Second call: one resource-shaped endpoint, `POST /api/v1/calculations`
  (`{operation, operands}`), instead of a route per operation (`/add`,
  `/subtract`, ...). Per-operation routes are RPC wearing REST's clothes, and
  seven near-identical handlers invite the kind of drift where one gets a
  fix and the others quietly don't.
- Frontend state was planned as a single discriminated-union reducer up
  front, specifically to rule out a class of bug before it could happen — a
  pile of separate `useState` calls is exactly how a dead "backspace after
  picking an operator" or "`=` computes `first OP first` with no second
  operand" gets shipped.
- Single `main` branch, conventional commits, a `docs/` folder for anything
  that isn't the app itself.
