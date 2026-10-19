# ADR-0006: Frontend testing

- Status: Accepted (e2e pending)
- Date: 2026-10-19

## Decision

- **Vitest + React Testing Library** in jsdom (`vitest.config.ts`, `tests/setup.ts`).
- **Module tests** live in `src/modules/<name>/tests/`:
  - schemas (Zod rules),
  - forms (validation messages, submitted values, server field errors),
  - screens with the module's API service mocked — loading, error with retry, empty, unauthorized (403), permission-gated actions, filters reaching the API.
- **Cross-cutting tests** in `tests/` (e.g. `api-client.test.ts`: cookies, CSRF header, Idempotency-Key, error mapping, 401 handling).
- Query by role and label (accessibility-first), not by CSS class.
- `renderWithProviders` (`tests/test-utils.tsx`) gives each test a fresh QueryClient and a router.
- **Browser end-to-end** (Playwright against the dev stack): planned for login, Users & Roles and the student import; not set up yet. Until then the API's e2e and contract tests cover the server side of those journeys.

## Consequences

- A new module ships with schema, form and screen tests at minimum.
- CI runs `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
