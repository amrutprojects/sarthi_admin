# ADR-0001: Two repositories; feature modules; legacy code wrapped, not rewritten

- Status: Accepted
- Date: 2026-10-19

## Context

The brief describes one repository with `frontend/` and `backend/`. The project already has two GitHub repositories (`sarthi-admin`, `sarthi-api`) and the team chose to keep them separate. The panel was organised by page area (`pages/<area>/`), with one global `services/` folder. Most screens still read the original portal's sample data (`src/legacy`).

## Decision

1. Two repositories, each independently installable, testable, buildable and deployable, each with its own docs and tooling.
2. Feature modules (`src/modules/<feature>/`) are the primary unit, with `pages/`, `components/`, `hooks/`, `services/`, `schemas/`, `types/`, `tests/` and an `index.ts` inside. The application shell lives in `src/app` and `src/layouts`; reusable UI in `src/components`.
3. The original portal JavaScript (`src/legacy`) stays as it is and is typed via `types/legacy.ts`. Screens move from sample data to the API one module at a time, following the users module.

## Consequences

- Teams can work on separate modules with few merge conflicts; the route table in `app/router.tsx` is the main shared file.
- Sample-data screens keep working during the migration; their data access is isolated in `services/mock`, so replacing it does not touch the components' callers.

## Update (24 Nov 2026)

The sample-data stage is over. The product owner decided that screens never show invented figures: `services/mock` and the sample dataset in `src/legacy/data.js` were removed, and every screen or figure with no API source shows an empty state in English and Marathi until its module is connected.
