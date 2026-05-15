# Project: Familieportalen

## Architecture

- Monorepo with `client/` (Angular 21), `server/` (Express dev backend), and `functions/` (Firebase Cloud Functions prod backend)
- Feature-based folder structure under `features/` — each module is self-contained
- Angular dev server proxies `/api` to Express backend on port 3000
- Firebase Authentication (Google sign-in) with auth guard on all routes except `/login`
- Firestore as state store — realtime `onSnapshot` sync across devices/tabs

## Conventions

### Angular (client/)
- **Standalone Components only** — no NgModules
- **Signals** for all state management (no RxJS subjects for UI state)
- **New control flow syntax**: `@if`, `@for`, `@switch` — never `*ngIf`/`*ngFor`
- **Inline templates** — use `template:` not `templateUrl:` (components are small)
- **Signal inputs**: prefer `input()` / `input.required()` over `@Input()` decorator
- **inject()** function over constructor injection
- Tailwind CSS v4 for styling, mobile-first
- All user-facing text in Norwegian (Bokmål)

### Backend

Two variants — identical feature code, different infrastructure:

| | `server/` | `functions/` |
|---|---|---|
| **Runtime** | Node.js standalone (`node --watch`) | Firebase Cloud Functions v2 |
| **Auth middleware** | None (open API, dev only) | `verifyFirebaseToken` on all `/api/` routes |
| **Google token storage** | `.google-tokens.json` file on disk | Firestore `config/googleCalendar` |
| **Deploy** | Local dev only | `firebase deploy --only functions` |

- ES Modules (`"type": "module"` in package.json)
- Feature routes mounted at `/api/<feature-name>/`
- AI responses are cleaned via `shared/extract-json.js` before returning to client
- Body size limit is 10MB (base64 images)

### General
- Authentication via Firebase Auth (Google popup) — ID token sent with every `/api/` request via `auth.interceptor.ts`
- State persisted in Firestore `users/{uid}` — `FamilyState` object with children, plans, samværsplan, overrides
- Dates use ISO format (YYYY-MM-DD) internally; frontend converts to DD.MM.YYYY for display
- Error messages are in Norwegian

## Key Files
- `functions/school-plan/school-plan.service.js` — Claude Sonnet 4.6 OCR integration and system prompt (prod)
- `server/src/features/school-plan/school-plan.service.js` — Claude Sonnet 4.6 OCR integration (dev)
- `client/src/app/features/skole/skole.component.ts` — Main school plan container (week view + scan flow)
- `client/src/app/features/school-plan/models/school-plan.models.ts` — Shared TypeScript interfaces
- `client/src/app/features/school-plan/plan-review.component.ts` — Post-scan review and editing of parsed events
- `client/src/app/shared/services/school-data.service.ts` — Central state store (Firestore sync)
- `client/src/app/shared/services/auth.service.ts` — Firebase Auth wrapper
- `client/src/app/shared/interceptors/auth.interceptor.ts` — Attaches Firebase ID token to `/api/` requests
- `client/src/app/features/dokumenter/dokumenter.component.ts` — Document management (upload, view, edit, delete)
- `client/src/app/features/lister/list-detail.component.ts` — List detail with item tagging

## Features

| Route | Feature |
|---|---|
| `/` | Dashboard (Hjem) — daily overview of reminders, events, homework |
| `/kalender` | Calendar — week/month view with Google Calendar integration |
| `/skole` | School plan — scan, OCR, and manage weekly school schedules |
| `/lister` | Lists — checklists with item tagging (assign to family members) |
| `/dokumenter` | Documents — upload, view, and manage family documents/PDFs |
| `/innstillinger` | Settings — household, children, push notifications, samværsplan |

## School event categories
`school_class`, `homework`, `weekly_homework`, `reminder`, `information` — use only these values.

## Testing

### Unit tests (Vitest + @analogjs/vite-plugin-angular)
- Run: `npm test` (inside `client/`)
- Watch mode: `npm run test:watch`
- Coverage: `npm run test:coverage`
- Config: `client/vitest.config.ts`, setup: `client/src/test-setup.ts`
- Pure utility functions and services with no Angular DI: instantiate directly (`new ServiceClass()`)
- Firebase mocking: use `vi.mock('firebase/app')` and `vi.mock('firebase/auth')` at top of spec file
- For Angular components/services that need DI: use `setupTestBed` from `@analogjs/vitest-angular/setup-testbed` inside the test file (not in global setup)

### E2e tests (Playwright)
- Run: `npm run e2e` (requires `ng serve` running, or set `CI=1` to auto-start)
- UI mode: `npm run e2e:ui`
- Config: `client/playwright.config.ts`
- Tests: `client/e2e/`
- Only tests unauthenticated routes without auth mocking (login page, redirects)

## CHANGELOG

**Always update `CHANGELOG.md` when making user-facing changes.**

- Add new entries under `## [Unreleased]` at the top of the file
- Use the section headers: `### Lagt til`, `### Endret`, `### Fikset`, `### Fjernet`
- Group entries by feature area (e.g. **Skoleplan:**, **Kalender:**, **Lister:**)
- Write in Norwegian (Bokmål)
- One line per change — describe *what changed from the user's perspective*, not implementation details
- Do **not** create a new versioned section; leave entries under `[Unreleased]` until a release is tagged
