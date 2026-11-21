# M3 — Attendance reports screen

Sidebar **Training Operations → Attendance reports** (`/attendance-reports`, module `src/modules/attendance-reports`).
Data from amrut-kalash-api `GET /attendance-reports` (see that repo's `docs/m3-attendance-reports.md`), which reads the
LMS live with Amrut's tenant key. The key never reaches the browser.

## What the screen does

- Drill-down **All divisions → division → district → centre → batches**: click a name to go down, the breadcrumb to go
  back up. Each level calls the API with `level` and the filters above it.
- Date range (From / To, default the LMS's last 30 days; "Last 30 days" clears it). A reversed range or one over 366 days
  is refused on screen without calling the API.
- KPI tiles: sessions held and records marked, Present %, Late %, Absent %; evidence counts: self check-ins, geo
  check-ins, selfies, group photos.
- Table per row: batches, sessions, present, late, absent, excused, present %, late %, absent %, attendance %, and the
  evidence counts, with a Total row. Rows the masters do not know carry a "Not in Amrut masters" badge; rows the API could
  not place under the chosen area are reported in a note.
- **Export CSV** (needs `reports.export`): the table on screen, in the chosen language, with area, range and "as of"
  on top (UTF-8 with BOM; cells starting with `= + - @` are neutralised).
- **English / मराठी** switch: all labels, and place names where Amrut knows the Marathi name. The Panel has no app-wide
  translation layer yet, so the labels live in `labels.ts`.

## States (no dummy numbers)

Unlike the other LMS screens, this one has no local data to fall back to: while live data is off it shows the off state, never figures.

| API | Screen |
| --- | --- |
| status `liveData:false`, or 404 `LMS_LIVE_DATA_OFF` (G-2 setting "Show live LMS data" off) | "Live LMS data is switched off", pointing to System Settings (with an Open System Settings button for users who may open it); no report call |
| status `enabled:false`, or 404 `LMS_READS_DISABLED` (server master switch off) | "Live LMS data is switched off", saying the server switch is off; no report call |
| status `configured:false`, or 503 `LMS_NOT_CONFIGURED` | "The LMS link is not configured" (no report call) |
| 503 `LMS_TIMEOUT` / `LMS_UNREACHABLE` / `LMS_UNAVAILABLE` / `LMS_KEY_REJECTED` / … | "The LMS cannot be reached right now", code, Try again |
| 200 with no rows | "No attendance in this range" |

## Access

The screen opens with `attendance.view`, `reports.view` or `lms.view` (`SCREEN_ACCESS['attendance-reports']`, the
same codes the API checks). CSV export: `exportAttendanceReports` = `reports.export`. No area scoping exists in the
Panel yet (users have no district or division assignment).

## Tests

`src/modules/attendance-reports/tests/` — the page (levels and drill-down with the filters sent, Marathi, CSV with and
without `reports.export`, empty, switched off, not configured, G-2 off code, LMS down with retry, date range) and the
helpers (level, range, error → state, percentages, CSV content and file name).
