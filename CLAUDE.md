# Project: Familieportalen

## Architecture

- Monorepo with `client/` (Angular 19) and `server/` (Express, ES Modules)
- Feature-based folder structure under `features/` — each module is self-contained
- Angular dev server proxies `/api` to Express backend on port 3000

## Conventions

### Angular (client/)
- **Standalone Components only** — no NgModules
- **Signals** for all state management (no RxJS subjects for UI state)
- **New control flow syntax**: `@if`, `@for`, `@switch` — never `*ngIf`/`*ngFor`
- **Inline templates** — use `template:` not `templateUrl:` (components are small)
- **Signal inputs**: prefer `input()` / `input.required()` over `@Input()` decorator
- **inject()** function over constructor injection
- Tailwind CSS for styling, mobile-first
- All user-facing text in Norwegian (Bokmål)

### Backend (server/)
- ES Modules (`"type": "module"` in package.json)
- Feature routes mounted at `/api/<feature-name>/`
- AI responses are cleaned via `shared/extract-json.js` before returning to client
- Body size limit is 10MB (base64 images)

### General
- No test framework set up yet
- No authentication — API is open
- No database — all processing is request/response
- Dates use ISO format (YYYY-MM-DD) internally; frontend converts to DD.MM.YYYY for display
- Error messages are in Norwegian

## Key Files
- `server/src/features/school-plan/school-plan.service.js` — Groq API integration and system prompt
- `client/src/app/features/school-plan/school-plan.component.ts` — Main container with state machine
- `client/src/app/features/school-plan/models/school-plan.models.ts` — Shared TypeScript interfaces
