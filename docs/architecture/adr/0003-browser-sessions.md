# ADR-0003: Cookie session with an in-memory CSRF token

- Status: Accepted (replaces the sessionStorage bearer token)
- Date: 2026-10-19
- Applies to: amrut-kalash-admin and amrut-kalash-api (full rationale in the API repository's ADR-0003)

## Decision (panel side)

- The panel never sees the session token: the API sets it as an HttpOnly, SameSite=Strict cookie. `services/api-client.ts` sends every request with `credentials: 'include'`.
- The CSRF token returned by `POST /auth/login` and `GET /auth/me` is kept in a module variable (memory only) and sent as `X-CSRF-Token` on POST, PUT, PATCH and DELETE.
- On load the app always calls `GET /auth/me`: 401 = signed out (shows the login page); network errors and 5xx are retried with back-off.
- Logout calls `POST /auth/logout` (the API revokes the session and clears the cookie), then clears every cached query.
- Nothing authentication-related is stored in localStorage or sessionStorage. The only persisted value is the UI preference `amrut-admin-ui` (sidebar collapsed).

## Consequences

- An XSS bug can no longer exfiltrate the session; keep React's escaping (no `dangerouslySetInnerHTML` with untrusted data) and add a Content-Security-Policy at the web server.
- The panel and API must be served from the same site in production (see Deployment in the README).
