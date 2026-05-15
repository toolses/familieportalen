# Familieportalen — Klient

Angular 21 PWA-frontend for Familieportalen. Kjøres mot Express dev-backend lokalt, og mot Firebase Cloud Functions i produksjon.

## Kom i gang

```bash
# Installer avhengigheter
npm install

# Start utviklingsserver (med proxy mot Express backend på port 3000)
ng serve
```

Åpne [http://localhost:4200](http://localhost:4200) i nettleseren. Appen reloader automatisk ved filendringer.

## Bygge

```bash
# Produksjonsbygg
ng build
```

Artefakter legges i `dist/`. Produksjonsbuildet er optimalisert og bruker `environment.prod.ts` via filerstattninger.

## Testing

```bash
# Enhetstester (Vitest)
npm test

# Watch-modus
npm run test:watch

# Testdekning
npm run test:coverage

# E2E-tester (Playwright) — krever at ng serve kjører
npm run e2e

# Playwright UI-modus
npm run e2e:ui
```

Se `vitest.config.ts` og `playwright.config.ts` for konfigurasjon.

## Prosjektstruktur

```
src/app/
  features/
    dashboard/        — Hjem-siden (dagsoversikt)
    calendar/         — Kalender (uke- og månedsvisning)
    skole/            — Skoleplan (skanning og visning)
    school-plan/      — Modeller og gjennomgangskomponent for skoleplan
    lister/           — Sjekklister med taggering
    dokumenter/       — Dokumentbehandling (opplasting og visning)
    settings/         — Innstillinger (husstand, barn, varsler, samværsplan)
    google/           — Google OAuth callback
    login/            — Innloggingsside
  shared/
    services/         — Delte tjenester (auth, data, notifications)
    interceptors/     — HTTP-interceptors (auth token)
    components/       — Delte UI-komponenter
```

## Konvensjoner

- Standalone Components, ingen NgModules
- Signals for all tilstandshåndtering
- `@if` / `@for` / `@switch` — aldri `*ngIf`/`*ngFor`
- Inline templates (`template:`) — ikke `templateUrl:`
- `input()` / `input.required()` — ikke `@Input()`-dekorator
- `inject()` — ikke konstruktørinjeksjon
- Tailwind CSS v4, mobil-først
- All brukervendt tekst på norsk (bokmål)
