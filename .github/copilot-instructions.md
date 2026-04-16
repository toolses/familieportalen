## Project: Familieportalen

Family portal web app with Angular 19 frontend and Express backend.

### Key Rules

- **Angular**: Standalone Components only, Signals for state, `@if`/`@for`/`@switch` control flow (never `*ngIf`/`*ngFor`), inline templates, `inject()` over constructor DI
- **Signal inputs**: Use `input()` / `input.required()` over `@Input()` decorator
- **Styling**: Tailwind CSS, mobile-first
- **Backend**: Node.js Express with ES Modules (`import`/`export`, not `require`)
- **Language**: All UI text and error messages in Norwegian (Bokmål)
- **Dates**: ISO format (YYYY-MM-DD) internally, DD.MM.YYYY for display
- **Structure**: Feature-based folders under `features/` in both client and server
- **API proxy**: Frontend `/api` calls proxy to `localhost:3000` in development

### File Layout

```
client/src/app/features/<name>/    — Angular feature modules
server/src/features/<name>/        — Express route + service pairs
server/src/shared/                 — Shared backend utilities
```

### Categories for school events

`school_class`, `homework`, `test`, `reminder` — use only these values.
