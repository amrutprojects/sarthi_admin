# ADR-0007: TanStack Query for server state, Zustand for UI state

- Status: Accepted
- Date: 2026-10-19

## Context

The brief asks for TanStack Query for server state and Zustand or Redux Toolkit for shared client state, chosen by need. Live screens previously used ad-hoc `useEffect` loading hooks; screen filters lived in a global object from the legacy code.

## Decision

- **TanStack Query** for everything that comes from the API: queries with per-module key factories (`userKeys.list(params)`), mutations that invalidate affected keys, `keepPreviousData` for paged lists. The session itself is the query `['auth','me']`. Defaults in `app/providers.tsx`: 30 s stale time, no retries on 4xx.
- **Zustand** (`store/ui.store.ts`) for the small amount of shared client-only state: sidebar collapsed/open and per-screen filters (`usePersistentState`). Only the sidebar preference is persisted (localStorage, fail-safe).
- **Redux Toolkit is not used**: there is no complex client-side domain state that would justify it.
- Local component state (`useState`) remains the default for anything used by one component.

## Consequences

- Server data is never copied into Zustand; components read it from queries.
- Older live screens (roles, permissions, menu visibility, student import) still use the earlier `useApiData` helper; migrate them to query hooks when they are next changed (pattern: `modules/users/hooks/useUsers.ts`).
