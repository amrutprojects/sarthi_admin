# ADR-0008: Tailwind alongside the existing design system

- Status: Accepted
- Date: 2026-10-19

## Context

All 40+ screens are styled by the original design system (`src/styles/styles.css`, `amrut.css`), whose class names (`.grid`, `.card`, `.btn`, `.f`, …) overlap with Tailwind's. Rewriting every screen in Tailwind would be a large, risky change with no user benefit.

## Decision

- Add Tailwind 3 with **`prefix: 'tw-'`** (no collisions with existing classes) and **`preflight` disabled** (its reset would restyle existing screens).
- Map Tailwind's theme to the existing CSS variables (`brand-*`, `saffron`, `ink`, `line`, `ok`/`warn`/`danger`, radii, shadows, fonts), so Tailwind-built components match the current look.
- New components may use Tailwind utilities for layout and spacing, and keep using design-system classes (`btn`, `inp`, `card`, `tbl`) for standard controls — see `modules/users/components`.

## Consequences

- Two styling approaches coexist; reviewers should prefer design-system classes for standard controls and `tw-` utilities for layout, not mix one-off custom CSS.
- The `tw-` prefix is required in class names (`tw-flex`, `sm:tw-grid-cols-2`).
