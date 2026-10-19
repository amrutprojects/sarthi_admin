# Architecture overview (admin panel)

## Shape

```
main.tsx → AppProviders (QueryClient → BrowserRouter → AuthProvider) → App → AppRoutes
                                                                      ├─ /login → LoginPage
                                                                      └─ ProtectedRoute → AdminLayout → RequireAccess(navKey) → lazy page
```

- **`app/`** wires the application: providers, the route table (`router.tsx`, one lazy chunk per screen) and route guards. It is the only place that imports module pages directly.
- **`modules/<feature>/`** owns one feature: its pages, components, hooks (TanStack Query), API service, Zod schemas, types and tests. Other modules use it only through its `index.ts` ([ADR-0002](adr/0002-module-boundaries.md)).
- **`components/`** holds reusable, feature-agnostic UI: `ui/` (design-system primitives that reproduce the original markup and class names), `tables/`, `feedback/` (error boundary, toasts, confirm dialogs, API load states), `charts/`.
- **`services/api-client.ts`** is the single HTTP client. Feature services (`modules/*/services/*Api.ts`) are thin typed wrappers around it.
- **`store/`** (Zustand) holds client-only UI state; **TanStack Query** holds all server state ([ADR-0007](adr/0007-state-management.md)).
- **`legacy/`** is the original portal's JavaScript (sample data service, SVG chart and map generators, formatters), kept as-is and typed through `types/legacy.ts`. Screens not yet backed by the API read it via `services/mock`.

## Data flow (live modules)

```
Component → useXxx() hook (TanStack Query) → xxxApi service → api-client → /api/v1 (cookie + CSRF)
                ↑ invalidate on mutation success
```

- Reads are queries with keys from a per-module key factory (`userKeys`); writes are mutations that invalidate those keys.
- Errors surface as `ApiError` (`status`, `code`, `details`); 401 anywhere signs the user out; 403 shows a "not permitted" state; 422 field details are mapped onto form fields.

## Authentication and permissions

- Session = the API's HttpOnly cookie. On start the app asks `GET /auth/me` (query key `['auth','me']`); 401 means signed out. Network errors and 5xx are retried, so a backend restart does not sign anyone out.
- The CSRF token from login / `me` is held in memory and sent on every write ([ADR-0003](adr/0003-browser-sessions.md)). No token is ever in localStorage or sessionStorage.
- `modules/auth/permissions.ts` maps sidebar keys and named actions to backend permission codes. `RequireAccess` guards routes, `<Can action>` / `useCan()` gate buttons, and Menu Visibility hides menus per role. **These are usability controls; the API enforces every permission.**

## Styling

The existing design system (`src/styles/styles.css`, `amrut.css`) remains the base. New components may use Tailwind utilities with the `tw-` prefix; Tailwind's colours, radii and fonts map to the existing CSS variables ([ADR-0008](adr/0008-tailwind-alongside-existing-css.md)). Layouts are responsive from 320 px phones to large desktops.

## Decision records

| ADR | Decision |
|---|---|
| [0001](adr/0001-repositories-and-feature-modules.md) | Two repositories; feature modules; legacy code wrapped, not rewritten |
| [0002](adr/0002-module-boundaries.md) | Public module APIs, checked in `npm run lint` |
| [0003](adr/0003-browser-sessions.md) | HttpOnly cookie session + in-memory CSRF token |
| [0006](adr/0006-testing-strategy.md) | Vitest + Testing Library; e2e pending |
| [0007](adr/0007-state-management.md) | TanStack Query for server state, Zustand for UI state |
| [0008](adr/0008-tailwind-alongside-existing-css.md) | Tailwind with prefix, no preflight, mapped to theme tokens |

ADR numbers are shared with the API repository (0004, 0005, 0009 and 0010 are backend decisions).
