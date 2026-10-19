# Creating a frontend module

`src/modules/users` is the reference implementation. Example below: a `centres` module backed by the API's `/centres` endpoints.

## 1. Files

```
src/modules/centres/
  types/centre.types.ts        API DTOs (match the API's OpenAPI schemas) and list params
  services/centreApi.ts        Thin typed calls through services/api-client (list, get, create, update, …)
  hooks/useCentres.ts          Query key factory + useQuery / useMutation hooks; mutations invalidate keys
  schemas/centreSchema.ts      Zod form schemas (mirror the API's validation messages)
  components/CentreForm.tsx    React Hook Form + zodResolver; shows server field errors
  components/CentreTable.tsx   Presentational; data and actions via props
  components/CentreFilters.tsx
  pages/CentresPage.tsx        Container: hooks + components + permission gating + all UI states
  tests/                       schema, form and page tests
  index.ts                     Public API (what other modules may use)
```

Only create the folders you need.

## 2. Wire it up

1. Route: add the path to `ADMIN_ROUTES` in `constants/navigation.ts` (with its sidebar key) and the lazy page to `PAGES` in `app/router.tsx`.
2. Sidebar: add the menu entry to `NAV` in `constants/navigation.ts`.
3. Permissions: add the menu key to `MENU_KEYS` and any named actions to `ACTION_ACCESS` in `modules/auth/permissions.ts`, using the API's permission codes (`centres.view`, `centres.create`, …). The API must define the same menu in its permission catalogue.

## 3. Rules

- All HTTP through `services/api-client.ts`; never `fetch` directly.
- Server data only in TanStack Query; UI state in component state or the Zustand store.
- Handle every state: loading (skeleton), error (message + Retry), empty, success (toast), unauthorized (403 → "not permitted").
- Gate navigation and actions with `RequireAccess`, `<Can action>` / `useCan()` — remember the API enforces permissions; the UI only hides what the user cannot do.
- Creates send an `Idempotency-Key` (one per dialog, `newIdempotencyKey()`).
- Import other modules only from their `index.ts`.
- Keep components small; split containers (data + permissions) from presentational components.
- Responsive from 320 px: use the design-system classes and `tw-` utilities; check phone, tablet and desktop widths.

## Checklist

- [ ] Types match the API's OpenAPI DTOs
- [ ] `xxxApi` service via `api-client`; idempotency key on create
- [ ] Query key factory; mutations invalidate the right keys
- [ ] Zod schema + React Hook Form; server 422/409 errors shown on fields
- [ ] Loading, error/retry, empty, success and 403 states
- [ ] Route + sidebar + permission mapping; actions gated with `useCan`
- [ ] `index.ts` exports only the public surface; `npm run lint` passes (boundaries)
- [ ] Tests: schema, form, page (states + permission gating)
- [ ] Checked at 375 px, 768 px and desktop widths
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass
