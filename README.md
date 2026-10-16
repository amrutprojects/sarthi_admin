# AMRUT × SUMAGO — React Admin Panel

React 18 + TypeScript + Vite + React Router version of the internal MIS (the screens behind sign-in).
The public website (`../index.html`, `../assets/`) is **not** part of this app and was not modified.

## Commands

```bash
cd admin-panel
npm install
npm run dev       # http://localhost:5174
npm run typecheck # tsc, strict mode, no emit
npm run build     # type-checks, then outputs dist/
npm run preview   # serve the production build
```

Copy `.env.example` to `.env`:

| Variable | Purpose |
|---|---|
| `VITE_PUBLIC_SITE_URL` | URL of the existing public site; Home / Track / Verify links open it |
| `VITE_API_BASE_URL` | Base URL for a future backend (`src/services/api.js → http()`); unused today |

## How it is built

- **TypeScript**: `strict` mode with `noUnusedLocals` / `noUnusedParameters` (`tsconfig.json`). `npm run build` fails on any type error. There is no `any` in the source.
  - `src/types/domain.ts`: the programme data model (Candidate, Batch, Centre, District, Trainer, Kpis, Task, …). These are the shapes a real backend API should return.
  - `src/types/legacy.ts`: typings for the five shared JS modules kept from the original portal (`window.AS`: data service, chart/map generators, UI helpers, strings).
  - `DataTable<T>` and `Column<T>` are generic, so each table's render/sort/export callbacks are checked against its row type. `FilterBar` is generic over its filter-state object.
  - The original JS modules in `src/legacy/*.js` stay JavaScript (unchanged copies). They are typed through `types/legacy.ts` rather than converted.

- **React shell**: `LoginPage`, `AdminLayout`, `Sidebar`, `Topbar` (global search, notifications, profile menu, role switch, help), `MobileNav`, `ProtectedRoute`, `AuthContext`.
- **Routing**: `HashRouter`, so URLs stay `#/dashboard`, `#/candidates/:id` and so on, as before.
- **Auth**: same demo-role session (`sessionStorage` key `amrut_sumago_session_v1`). There is no real backend auth because the project has no backend.
- **Data**: `src/services/api.js` wraps the existing mock service `AS.db` (`src/legacy/data.js`). Replace it with REST calls here when a backend exists.
- **Pages**: all 40 admin screens are React components (functional components + hooks):

  | Folder | Screens | Data service |
  |---|---|---|
  | `pages/dashboard/` | Dashboard, Executive Command Centre, Today's Operations | `dashboardService.js` |
  | `pages/candidates/` | Candidate Master, Candidate Detail (8 tabs), Lifecycle & Funnel, At-Risk Engine | `candidateService.js` |
  | `pages/network/` | Districts, District Detail, Taluka Detail, District Map, Centres, Centre Detail, Centre Onboarding | `networkService.js` |
  | `pages/delivery/` | Batches, Batch Detail (8 tabs), Trainers, Trainer Detail, Trainer ToT | `deliveryService.js` |
  | `pages/training/` | Live Monitor, Offline, Online, Attendance, Student Progress | `trainingService.js` |
  | `pages/outcomes/`, `pages/outreach/` | Assessments, Certification, Marketing, Campaign Detail, Mobilization, Communications | `outcomeService.js` |
  | `pages/governance/`, `pages/platform/` | Tasks, Documents, Reports, Report Detail (14 reports), Finance, PMO, QA, LMS, Student App, Administration, Users & Roles, Audit Log, Settings | `governanceService.js` |

- **UI kit**: `src/components/ui/` (PageHead, Card, Kpi, FilterBar, DataTable with search/sort/paging/columns/CSV-Excel-PDF export, Modal, Drawer, badges, timeline, lists) reproduces the original markup and class names, so `styles.css` applies unchanged.
- **Shared dialogs**: `components/GlobalDialogs.jsx` hosts the task detail drawer, the create-task dialog and the LMS sync dialog, which several pages open. React modals and drawers render into `#react-modal-root` / `#react-drawer-root`.
- **Kept from the original code** (`src/legacy/`, unchanged copies of `../assets/js/`): the mock data service (`data.js`), strings (`amrut.js`), the SVG chart and map generators (`charts.js`, `map.js`) and helper formatters, toast and export (`ui.js`). The chart and map output is wrapped by `src/components/charts/`, and `hooks/useLegacyEvents.js` handles the `data-go` links inside it. None of the original page modules are loaded.
- **Styles**: `src/assets/css/styles.css` and `amrut.css` are copies of the originals.

### Behaviour differences from the original

- Certification KPI links ending in `?state=generated` or `?state=issued` now filter the register. In the original they did nothing.
- On Report Detail, **Apply filters** applies the selected district through the URL (`?district=`). In the original it only showed a toast.
- **Reset** on the Map page restores the map defaults. In the original it set every field to `ALL`.

## Deployment

`npm run build`, then upload `dist/` to any static host or to a sub-folder next to the public site,
for example `/admin/`. `base: './'` in `vite.config.js` makes asset paths relative, so any folder works.
Set `VITE_PUBLIC_SITE_URL` to the public site's production URL before building.
