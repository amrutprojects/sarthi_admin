# Coding conventions (admin panel)

## Naming

| Thing | Convention | Example |
|---|---|---|
| Components and their files | PascalCase | `UserForm.tsx`, `UsersPage.tsx` |
| Hooks | `useFeature…` | `useUsers`, `useCreateUser` |
| Services | `<feature>Api` | `userApi`, `importApi` |
| Schemas | `<thing>Schema` | `createUserSchema` |
| Types | PascalCase, files `*.types.ts` | `User`, `user.types.ts` |
| Variables and functions | camelCase | `newIdempotencyKey` |
| Constants | UPPER_SNAKE_CASE | `ACTION_ACCESS`, `PAGE_SIZE` |
| Query keys | factory per module | `userKeys.list(params)` |
| Tailwind classes | `tw-` prefix | `tw-flex tw-gap-2` |

## TypeScript

- `strict`; no `any` (ESLint error) — use `unknown` and narrow; `import type` for types.
- Types for API data mirror the API's OpenAPI DTOs; do not invent fields.

## React

- Function components and hooks only. Containers fetch and decide; presentational components render props.
- Every screen handles loading, error, empty, success and unauthorized states.
- Accessible markup: labels for inputs, `role="alert"` for field errors, buttons for actions, meaningful `aria-label`s.
- No `dangerouslySetInnerHTML` with data from users or the API (the legacy SVG chart output is generated locally).

## Security

- No tokens or personal data in localStorage/sessionStorage, URLs or logs.
- `VITE_*` variables are public; never put secrets in them.
- Frontend permission checks are for usability; never rely on them for security.

## Formatting, linting, commits

- Prettier (`npm run format`) and ESLint (`npm run lint`), LF line endings.
- Comments explain why (business rules, non-obvious decisions), not what.
- Imperative commit summaries; formatting-only changes in their own commit.
