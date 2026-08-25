# CLAUDE.md

Full-stack calculator: Go REST backend, React/TypeScript frontend. Recruitment
assignment — see `README.md` for the full write-up and `AI_USAGE.md` for how
Claude Code was used.

## Stack

- **Backend**: Go 1.22+, stdlib `net/http` only (no router dependency),
  `github.com/shopspring/decimal` for exact arithmetic.
- **Frontend**: React 19 + TypeScript (`strict: true`), Vite, Tailwind CSS,
  shadcn/ui, ESLint + Prettier (semicolons, double quotes).
- **Tests**: Go `testing` + `httptest`. Frontend: Vitest + React Testing Library.
- **Containers**: multi-stage Dockerfiles per service, `docker-compose.yml`,
  `Makefile` as the single entrypoint.

## Conventions

- Single `main` branch, conventional commits (`feat:`, `fix:`, `docs:`,
  `test:`, `chore:`, `ci:`). A bug fix ships as two commits: `fix:` then
  `test:`.
- Built as a **walking skeleton first**: repo scaffold → minimal backend +
  frontend stubs → both dockerized → `docker compose up` working end-to-end
  → *then* real backend logic, *then* real frontend logic. Don't write
  feature code before the skeleton runs.
- Backend domain logic (`internal/calc`) is pure — no `net/http` import — and
  operates on `decimal.Decimal`, never `float64`, for `add/subtract/multiply/divide`.
- API operands and results are JSON **strings**, never JSON numbers (a JSON
  number decodes to `float64` before `decimal` sees it). The frontend never
  calls `parseFloat` on a value it will send back to the API.
- Frontend calculator state is a discriminated union driven by `useReducer`,
  not scattered `useState`. Only `src/api/client.ts` calls `fetch`.

## Commands

```bash
# Backend
cd backend && go vet ./... && go test ./... -cover

# Frontend
cd frontend && npm run lint && npx vitest run --coverage && npm run build

# Full stack
docker compose up --build   # or: make up
```

## Pre-commit hook

`.githooks/pre-commit` runs `gofmt`/`go vet` on staged backend files and
`eslint`/`prettier --check` on staged frontend files — each side only runs
its own toolchain, and only when it has staged files. Not installed
automatically; enable once per clone:

```bash
git config core.hooksPath .githooks
```
