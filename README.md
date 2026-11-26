# AMRUT × SUMAGO — Admin Panel

React single-page admin panel for the AMRUT × SUMAGO programme. It talks to the REST API in [sarthi-api](https://github.com/amrutprojects/sarthi-api) and is organised as feature modules.

| Concern | Choice |
|---|---|
| UI | React 18, TypeScript (strict), Vite 5, React Router 6 (lazy-loaded pages) |
| Server state | TanStack Query ([ADR-0007](docs/architecture/adr/0007-state-management.md)) |
| Client state | Zustand (`src/store`) — UI preferences and screen filters only |
| Forms | React Hook Form + Zod |
| HTTP | One fetch-based client (`src/services/api-client.ts`), cookie session + CSRF ([ADR-0003](docs/architecture/adr/0003-browser-sessions.md)) |
| Styling | Existing design system (`src/styles`) + Tailwind with `tw-` prefix ([ADR-0008](docs/architecture/adr/0008-tailwind-alongside-existing-css.md)) |
| Quality | ESLint, Prettier, module boundary check, Vitest + React Testing Library |

## Quick start

Requires Node.js 20+ and the API running locally (see the API repository).

```bash
npm install
cp .env.example .env      # VITE_API_PROXY_TARGET = where the API runs (default http://localhost:5001)
npm run dev               # http://localhost:5174
```

Sign in with an account created in the API (`npm run admin:create`, or `npm run demo:users` for one demo account per role).

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with HMR; `/api` is proxied to the backend |
| `npm run build` | Type-check, then build `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | ESLint + module boundary check |
| `npm run format` / `format:check` | Prettier |
| `npm test` / `test:watch` / `test:coverage` | Vitest |

## Structure

```
src/
  main.tsx               Entry: styles, legacy bridge, providers, <App/>
  app/                   App.tsx, router.tsx (route table, lazy pages), providers.tsx (Query, Router, Auth), routing/ (ProtectedRoute, RequireAccess)
  layouts/               AdminLayout and its shell components (Sidebar, Topbar, MobileNav)
  modules/<feature>/     pages/, components/, hooks/, services/, schemas/, types/, tests/, index.ts (public API)
    auth/                Session (TanStack Query), login page, permission rules, <Can/>
    users/               Reference module — see docs/development-guidelines/module-guide.md
    roles-permissions/   Roles, permission matrix, menu visibility
    students/            Student data import and register
    ipp-approvals/       Approval of the IPP student forms by the officers (docs/ipp-approvals.md)
    dashboard, candidates, network, delivery, training, outcomes, outreach, governance, platform
                         Screens with no API source yet show an empty state (no sample data)
  components/            ui/ (design-system primitives), tables/, feedback/ (errors, toasts, dialogs), charts/
  services/              api-client.ts (the only HTTP client); geography.ts (Maharashtra districts, reference data)
  constants/             navigation.ts (sidebar, routes, menu keys)
  hooks/  store/  types/  utils/  styles/
  legacy/                Original portal JavaScript (reference data, charts, maps, helpers), typed via types/legacy.ts
tests/                   Test setup, shared test utilities, cross-cutting tests
docs/                    Architecture, ADRs, module guide, conventions
```

## Documentation

- [Architecture overview](docs/architecture/README.md) and [decision records](docs/architecture/adr/)
- [Module creation guide and checklist](docs/development-guidelines/module-guide.md)
- [Conventions](docs/development-guidelines/conventions.md)
- API contract: the API's `/api/docs` (Swagger UI) and `/api/v1/openapi.json`

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API base URL. Development: `/api/v1` (proxied). Production: the API origin + `/api/v1`, on the same site as the panel (cookies). |
| `VITE_API_PROXY_TARGET` | Development only: where the dev server proxies `/api` |
| `VITE_PUBLIC_SITE_URL` | The public website (Track / Verify links) |

Variables are baked in at build time; build once per environment. `.env` and `.env.*` (except `.env.example`) are git-ignored. Never put secrets in `VITE_*` variables — they are visible in the bundle.

## Deployment

1. `npm ci && npm run build` with the environment's `.env.production` (or variables in CI).
2. Serve `dist/` as static files over HTTPS, with every unknown path falling back to `index.html` (client-side routing, e.g. `try_files $uri /index.html` in nginx).
3. Serve the panel and the API on the same registrable domain (e.g. `admin.example.gov.in` / `api.example.gov.in`) and list the panel origin in the API's `FRONTEND_URL`.

## Open items

- **Browser end-to-end tests** (Playwright) for login, Users & Roles and the student import journey are not set up yet; component tests and the API's e2e tests cover the logic today.
- **No sample data (24 Nov 2026)**: the panel shows only live figures from the API. Every KPI, panel or screen with no API source yet shows an empty state in English and Marathi ("No data yet · अद्याप माहिती नाही", `NoData` / `NoDataLabel` / `NotAvailablePage` in `components/ui`), never a sample number, name, district or date. The LMS screens (Batches, Trainers, Centres, Live / Offline / Online training, Attendance) show LMS data when "Show live LMS data" is on in System Settings, and otherwise a message to turn it on. The former sample dataset (`services/mock`, most of `legacy/data.js`) is retired; `legacy/data.js` keeps only reference data (programme name, candidate status labels, the 36 districts and their talukas). Screens still waiting for an API: Today's Operations, At-Risk, Centre detail and onboarding, Batch and Trainer detail, Trainer ToT, Student Progress, Assessments, Certification, Marketing, Mobilization, Communications, Reports, Finance, PMO, QA, Tasks, Documents, LMS Integration, Student App, Administration, Audit Log, and the parts of Dashboard, Executive, Districts, District detail, Map, Lifecycle and System Settings that have no live source.
- About 29 ESLint warnings remain from `react-refresh/only-export-components` in the shared UI kit (files export components and helpers together); harmless at runtime.
