## Project: Familieportalen

Family portal PWA for families with shared custody. Angular 21 frontend, Express dev backend, Firebase Cloud Functions prod backend.

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

### Features

| Route | Description |
|---|---|
| `/` | Dashboard — daily overview of reminders, events, and homework |
| `/kalender` | Calendar — week/month view with Google Calendar integration |
| `/skole` | School plan — scan, OCR (Claude Sonnet 4.6), and manage weekly schedules |
| `/lister` | Lists — checklists with item tagging (assign to family members) |
| `/dokumenter` | Documents — upload, view, and manage family documents/PDFs |
| `/innstillinger` | Settings — household, children, push notifications, samværsplan |

### School event categories

`school_class`, `homework`, `weekly_homework`, `reminder`, `information` — use only these values.

### CHANGELOG

**Always update `CHANGELOG.md` when making user-facing changes.**

- Add new entries under `## [Unreleased]` at the top of the file
- Use the section headers: `### Lagt til`, `### Endret`, `### Fikset`, `### Fjernet`
- Group entries by feature area (e.g. **Skoleplan:**, **Kalender:**, **Lister:**)
- Write in Norwegian (Bokmål)
- One line per change — describe *what changed from the user's perspective*, not implementation details
- Do **not** create a new versioned section; leave entries under `[Unreleased]` until a release is tagged
