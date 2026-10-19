# ADR-0002: Public module APIs, checked automatically

- Status: Accepted
- Date: 2026-10-19

## Decision

- Each module's `index.ts` is its public API (e.g. `auth` exports `useAuth`, `useCan`, `<Can>`, permission helpers and types; `users` exports `UsersTab`, `useUsers`, `userKeys`, `User`).
- A file in `src/modules/A` imports from `src/modules/B` only via `../B` (the index). Inside a module, relative imports are free.
- `src/app` (router, providers, guards) may import module pages directly — it lazy-loads them by path.
- `scripts/check-boundaries.mjs` enforces this as part of `npm run lint`.

## Consequences

- Moving files inside a module never breaks other modules.
- Tests mock collaborators at the same boundary (`vi.mock('../../auth', …)`).
