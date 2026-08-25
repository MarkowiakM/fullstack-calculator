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

## Phase 2 — Backend walking skeleton

- Smallest possible backend that runs: `go.mod`, `cmd/server/main.go` with
  just `GET /health`. The full server lifecycle (timeouts,
  graceful shutdown on SIGINT/SIGTERM) was written now rather than deferred,
  since that plumbing doesn't change shape when the real API lands later —
  only the mux's routes do.
- Booted it for real and hit `/health` with `curl` before trusting the test
  suite alone — same habit as the rest of this build: verify live, then
  write the test that pins it down.
- One handler test, one env-var-fallback test. Coverage on this package is
  low (~23%) by design — `main()`'s signal-handling loop isn't meaningfully
  unit-testable and isn't where the risk lives; the pieces that are worth
  testing are tested.

## Phase 3 — Frontend walking skeleton

- Vite's `react-ts` template, then swapped its default `oxlint` for ESLint
  (flat config) + Prettier (semicolons, double quotes). Tailwind v4 via
  `@tailwindcss/vite`, Vitest + React Testing Library wired into
  `vite.config.ts` directly via the `vitest/config` triple-slash reference.
- `shadcn init` wrote `Button`/`utils` into a literal `frontend/@/` folder
  instead of resolving the `@/*` alias to `src/`. Moved the files into
  `src/components/ui` and `src/lib`, confirmed the build and lint pass with
  the alias resolving correctly before moving on.

## Phase 4 — Backend Dockerfile

- Multi-stage: `golang:1.23-alpine` compiles a static binary
  (`CGO_ENABLED=0`), the runtime stage is plain `alpine` with just the
  binary and `ca-certificates` — no Go toolchain or source in the shipped
  image. `HEALTHCHECK` hits `/health` directly.
- Dockerizes the walking-skeleton server as-is; nothing about the Dockerfile
  needs to change once the real API lands in a later phase — `go build
  ./cmd/server` doesn't care how big the package graph behind that entrypoint
  gets.

## Phase 5 — Frontend Dockerfile

- Multi-stage: `node:22-alpine` builds the static bundle, `nginx:1.27-alpine`
  serves it — no Node toolchain in the shipped image.
- `nginx.conf` reverse-proxies `/api/` to the backend container by its
  compose service name. This means the browser only ever talks to one
  origin (the frontend's), so the containerized setup needs neither CORS
  nor an absolute backend URL baked into the frontend build — `VITE_API_URL`
  stays optional, for the case of pointing the frontend at a backend on a
  genuinely different origin.

## Phase 6 — Docker Compose: the milestone

- `docker-compose.yml` wires both services on one network with a
  healthcheck-gated `depends_on`, so the frontend container doesn't start
  serving until the backend actually answers `/health`, not just once its
  process has started.
- Root `Makefile` as the single entrypoint (`make up`, `make test`, ...).
  `up` depends on `backend/.env`/`frontend/.env` file targets that copy from
  the committed `.env.example` files automatically if missing — `make up`
  works on a bare clone with no manual setup step.
- `make test-docker` builds only each Dockerfile's `builder` stage and runs
  tests inside that, rather than `docker exec` into the running containers —
  the production images are deliberately stripped of the Go/Node toolchain
  and source, so there'd be nothing to run tests with in there.

## Phase 7 — Dev-mode Docker tooling

- Separate `Dockerfile.dev` per service, kept apart from the production
  `Dockerfile`s: backend runs `air` for hot-reload-on-save, frontend runs
  Vite's own dev server with HMR. `docker-compose.dev.yml` bind-mounts the
  source into each container so edits on the host take effect without a
  rebuild; `make dev` wires it together.
- Pinned `air` to `v1.61.7` instead of `@latest` — the newest release
  requires a Go toolchain newer than the `golang:1.23-alpine` base image
  (kept in sync with the production Dockerfile), so `@latest` failed the
  build outright.

## Phase 8 — Pre-commit hook

- Plain `.githooks/pre-commit` script, and backend/frontend checks stay independently scoped. Runs
  `gofmt`/`go vet` on staged `backend/*.go`, `eslint`/`prettier --check` on
  staged `frontend/*.{ts,tsx,js,jsx,css,json}`, each only when that side has
  staged files. Opt-in via `git config core.hooksPath .githooks`.

## Phase 9 — Backend domain logic

- `internal/calc`: 7 operations as pure functions returning
  `(decimal.Decimal, error)`. `add`/`subtract`/`multiply`/`divide` use
  `shopspring/decimal` throughout; `sqrt`/`power` fall back to `float64` —
  no exact decimal algorithm for irrational results.
- Division rounds to a fixed 10-decimal scale; the other three core ops need
  no rounding since decimal arithmetic on finite inputs is exact.
- `power`'s exponent magnitude is capped before computing, so `2^5000`
  fails fast instead of producing `+Inf`.
- Table-driven tests per operation, `errors.Is` against sentinel errors.
  95.5% coverage.

## Phase 10 — Full HTTP API layer

- `internal/api` replaces the walking skeleton's health-only mux:
  `POST /api/v1/calculations` dispatches on an `operation → {arity, fn}`
  map, CORS/recover/request-id/timeout middleware, sentinel errors mapped
  to `{status, code}` in one place.
- Registered the route without a method prefix so CORS middleware can
  answer an `OPTIONS` preflight before the handler's own method check runs
  — a method-prefixed pattern 405s the preflight at the mux level first.

## Phase 11 — API documentation

- OpenAPI spec + a ReDoc page (CDN bundle, no build step) describing both
  endpoints against the real request/response shapes and error codes.
- Served directly by the backend at `GET /docs` and `GET /docs/openapi.yaml`
  via `go:embed`, rather than left as static files — self-contained in the
  binary, no Dockerfile changes needed. Files live in `internal/api/` so
  they're part of the module `go:embed` reads from.
- `spec-url` is absolute (`/docs/openapi.yaml`), not relative — a relative
  reference from a page served at `/docs` (no trailing slash) resolves
  against the parent path per normal URL rules, not `/docs/openapi.yaml`.

## Phase 12 — Frontend API client

- `types.ts` (`Operation`/`BinaryOp`) + `api/client.ts` (axios), a relative
  `/api/v1/calculations` path, unchanged through both the Vite dev proxy and
  nginx's reverse proxy.
- Non-2xx responses and network failures are wrapped into a friendlier
  `CalculationError`; a cancellation (`axios.isCancel`) is re-thrown as-is
  so the reducer can tell it apart from a real failure.
- 100% statement coverage.

## Phase 13 — Pre-commit hook fix

- The hook ran `eslint` on every staged `frontend/*.json` file, including
  `package.json`/`package-lock.json` — ESLint has no JSON config here, so it
  printed "file ignored" warnings on every commit touching them. Split the
  staged-file list in two: `.ts`/`.tsx`/`.js`/`.jsx` go through both eslint
  and prettier, `.css`/`.json` go through prettier only.

## Phase 14 — Calculator state machine

- `appendDigit.ts` (leading-zero replacement, single decimal point, 12-digit
  cap) and `reducer.ts` (the discriminated-union state machine from the
  transition table) as pure functions, no components yet.
- `RESOLVED`/`REJECTED` are handled ahead of the per-state dispatch, since
  they're valid only when `state.status === "computing"` and
  `action.requestId` matches — anything else (wrong state, stale id) is
  discarded, which is the race-condition guard.
- Table-driven tests per state, including both bug-class cells (backspace
  cancelling a pending operator, `=` refusing to fire with no second
  operand) and the stale-requestId discard. 100% statement coverage.

