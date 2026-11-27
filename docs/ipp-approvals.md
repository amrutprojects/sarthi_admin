# IPP approvals

Sidebar group **IPP Approvals**, module `src/modules/ipp-approvals`. Student forms of IPP (the 3 Month Internship Placement Program, a separate
project) that its Auditor approved and sent in batches are decided here: Divisional Officer → COEP → Head Office, or the Super Admin while Head
Office approval is off. API: sarthi-api `docs/ipp-approvals.md` (`/api/v1/ipp-approvals`).

## Screens

| Path | Menu key | What it does |
|---|---|---|
| `/ipp-approvals` | `ipp-approvals` | Applications: To decide · Sent on · Sent back · All; search, stage, district, batch; select and approve several; approve or reject one |
| `/ipp-approvals/applications/:id` | `ipp-approvals` | Form by step, documents (preview, download), corrections, history, Approve / Reject, Previous / Next in the list it was opened from |
| `/ipp-approvals/batches`, `/ipp-approvals/batches/:id` | `ipp-approvals` | Batches with where their students are now; one batch with its applications and "Approve all that wait for me" |
| `/ipp-officers` | `ipp-officers` | Districts of each Divisional Officer; warning for districts with waiting applications and no officer |
| `/settings` | `settings` | Cards "Head Office approval" and "IPP connection" (hidden on 403 / 404; changing needs `settings.update`) |

## Rules

- What a user sees and decides comes from the API: `summary.stages` (none = read-only: the whole list, no tabs, checkboxes or decisions) and each
  row's `canDecide`. Permissions only open the menus (`ipp-approvals.view`, `ipp-officers.view`), allow editing officers (`ipp-officers.update`) and
  word the read-only note.
- The selection stays across pages and is cleared when the tab or a filter changes. "Select all in this batch" (with a batch filter) uses
  `POST /batches/:id/approve`, so the search and the other filters do not limit it; the confirmation says so.
- The approval confirmation names the next approval authority from the stage the application is at (`labels.ts`): Divisional Officer → "will be
  forwarded to the COEP for further review and approval"; COEP → "… to the Head Officer (HO) for final review and approval", or "… to the Super
  Admin …" while Head Office approval is off; Head Office or Super Admin → "this will be its final approval". Several at one stage get that stage's
  sentence; at several stages, each stage's next authority is named. A second approval still asks the reason.
- Divisional Officers, COEP and Head Officers (`GET /auth/me` → `portal: 'ipp'`) see the Applications menu only: no Dashboard, Outcomes,
  Certificate Verification or public site links, and every other screen shows the access notice or "Page not found" by direct URL
  (`modules/auth/permissions.ts` `IPP_OFFICER_MENUS`).
- A rejection concerns one application and needs a reason of 3–500 characters.
- A 409 (the application has moved on) shows the API's message, and every query of the module is read again, as after each write.
- Filters, sorting and the page are in the URL. Documents are streamed from IPP through the API and shown through an object URL of the document's
  own type (PDF, image, video); anything else can only be downloaded.
- The counts on the tabs are the ones the API gives: To decide (`toDecide`) and All (sum of `counts`).

## Tests

`src/modules/ipp-approvals/tests/`: list, application, batches, officer districts, settings cards, menu and permissions, API paths and wording.
