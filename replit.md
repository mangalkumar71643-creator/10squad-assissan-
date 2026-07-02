# 10 Squad Assassin — Game Lobby

A multiplayer game lobby app with 3D character and environment visualization. Players can browse the lobby, view matchmaking, and see 3D-rendered characters.

## Run & Operate

- `pnpm --filter @workspace/game-lobby run dev` — run the frontend (port 5000, webview)
- `pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/api-server run start` — build + run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes to the dev database (never run against production manually)
- Required env: `DATABASE_URL` — Postgres connection string (automatically provided by Replit's built-in PostgreSQL)
- `SESSION_SECRET` — secret for session signing (provisioned but not yet wired into auth middleware)

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React 19, Vite 7, Tailwind CSS 4, Three.js / @react-three/fiber, Wouter, TanStack Query
- API: Express 5, Drizzle ORM
- DB: PostgreSQL + Drizzle ORM (Replit built-in)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec`)
- Build: esbuild (API server bundle), Vite (frontend)

## Where things live

- `artifacts/game-lobby/` — React + Three.js frontend
- `artifacts/api-server/` — Express 5 API server; requires `pnpm run build` before running
- `artifacts/mockup-sandbox/` — Vite sandbox for UI mockups
- `lib/db/` — Drizzle schema + PostgreSQL client; `src/schema/index.ts` is source of truth
- `lib/api-spec/` — OpenAPI specification (source of truth for the API contract)
- `lib/api-zod/` — Generated Zod schemas (run codegen to regenerate)
- `lib/api-client-react/` — Generated React hooks (run codegen to regenerate)

## Architecture decisions

- API contract is OpenAPI-first: edit the spec in `lib/api-spec`, run codegen, and the hooks + Zod schemas update automatically.
- The API server always requires a build step (`esbuild`) before it can run — there is no hot-reload for the server; rebuild on each change.
- `DATABASE_URL` is runtime-managed by Replit; do not set or override it manually.

## Product

A game lobby and matchmaking interface for "10 Squad Assassin" with 3D character rendering. Players can join, view, and manage game sessions.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The API server has no watch mode. After server-side code changes, run `pnpm --filter @workspace/api-server run build` before restarting the workflow.
- `pnpm-workspace.yaml` enforces a `minimumReleaseAge: 1440` (1 day) for all packages — newly published npm packages won't install until 24 hours after release.
- Never manually set `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, or `PGDATABASE` — these are managed by Replit.
- DB schema changes in development are applied with `pnpm --filter @workspace/db run push`. Production schema changes are applied automatically via Replit's Publish flow.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
