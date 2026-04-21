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
- No test framework set up yet
- Authentication via Firebase Auth (Google popup) — ID token sent with every `/api/` request via `auth.interceptor.ts`
- State persisted in Firestore `users/{uid}` — `FamilyState` object with children, plans, samværsplan, overrides
- Dates use ISO format (YYYY-MM-DD) internally; frontend converts to DD.MM.YYYY for display
- Error messages are in Norwegian

## Key Files
- `functions/school-plan/school-plan.service.js` — Groq API integration and system prompt (prod)
- `server/src/features/school-plan/school-plan.service.js` — Groq API integration (dev)
- `client/src/app/features/skole/skole.component.ts` — Main school plan container (week view + scan flow)
- `client/src/app/features/school-plan/models/school-plan.models.ts` — Shared TypeScript interfaces
- `client/src/app/shared/services/school-data.service.ts` — Central state store (Firestore sync)
- `client/src/app/shared/services/auth.service.ts` — Firebase Auth wrapper
- `client/src/app/shared/interceptors/auth.interceptor.ts` — Attaches Firebase ID token to `/api/` requests
