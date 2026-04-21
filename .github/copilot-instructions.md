## Project: Familieportalen

Family portal web app with Angular 21 frontend, Express dev backend, and Firebase Cloud Functions prod backend.

### Key Rules

- **Angular**: Standalone Components only, Signals for state, `@if`/`@for`/`@switch` control flow (never `*ngIf`/`*ngFor`), inline templates, `inject()` over constructor DI
- **Signal inputs**: Use `input()` / `input.required()` over `@Input()` decorator
- **Styling**: Tailwind CSS v4, mobile-first
- **Backend**: Node.js Express with ES Modules (`import`/`export`, not `require`)
- **Auth**: Firebase Authentication (Google sign-in) — ID token attached to all `/api/` requests via `auth.interceptor.ts`
- **Storage**: Firestore (`users/{uid}` for family state, `config/googleCalendar` for OAuth tokens in prod)
- **Language**: All UI text and error messages in Norwegian (Bokmål)
- **Dates**: ISO format (YYYY-MM-DD) internally, DD.MM.YYYY for display
- **Structure**: Feature-based folders under `features/` in both client and server/functions
- **API proxy**: Frontend `/api` calls proxy to `localhost:3000` in development

### File Layout

```
client/src/app/features/<name>/    — Angular feature modules
server/src/features/<name>/        — Express route + service pairs (dev)
functions/<name>/                  — Firebase Cloud Functions route + service pairs (prod)
server/src/shared/                 — Shared backend utilities
```

### Categories for school events

`school_class`, `homework`, `reminder`, `information` — use only these values.
