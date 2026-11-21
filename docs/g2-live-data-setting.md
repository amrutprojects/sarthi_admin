# G-2: "Show live LMS data" on the Panel screens

Full note (setting, master switch, API, tests, what stays for later): amrut-kalash-api `docs/mt-g2-live-data-setting.md`.

- Module `src/modules/lms-live`: state hook (`GET /lms-reads/live-data`), `LmsDataSource` wrapper, the badge
  ("Local data" / "Live from LMS" + fetch time), live views of the screens, and the System Settings card (en + mr).
- Covered screens: Batches, Training Centres, Trainers, Live Training Monitor, Offline Training, Online Training,
  Attendance. Each page's existing component is unchanged (renamed `Local…Page`); the default export picks the source.
- Off (default, or any error of the state call): the local page exactly as before, no live read.
  On: one live answer per screen; an LMS error is an error state with Retry, never local data.
- Tests: `tests/g2-live-data.test.tsx`, `tests/api-client.test.ts`.
- Not yet: Dashboard / Executive / Today, ToT, detail pages, Progress and later screens.
- Kept permanently (user rule, 21 Nov 2026): Amrut's `lms_*` tables and the local data the off path shows; the setting
  only chooses the source, nothing is removed.
