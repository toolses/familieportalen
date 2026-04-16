# Fase 2: Angular Core & API-lag

## Mål
Sette opp Angular-frontend med tjenester, modeller og en debug-visning som viser rådata fra Groq API-et.

## Steg

### 1. Opprett Angular-prosjekt
- `ng new` med standalone, SSR=nei, Tailwind CSS
- Konfigurer proxy (`proxy.conf.json`) mot `localhost:3000` for `/api/*`
- Legg til `dev`-script som starter Angular med proxy

### 2. Modeller (Interfaces)
- `src/app/features/school-plan/models/school-plan.models.ts`
  - `SchoolEvent` — `{ date: string; title: string; description: string; category: 'homework' | 'test' | 'event' }`
  - `ParseResponse` — `{ raw: string; data: { events: SchoolEvent[] } }`
  - `ParseRequest` — `{ frontImage: string; backImage?: string }`

### 3. API-tjeneste (Service)
- `src/app/features/school-plan/services/school-plan.service.ts`
  - Standalone injectable med `HttpClient`
  - `parse(request: ParseRequest): Observable<ParseResponse>`
  - POST til `/api/school-plan/parse`

### 4. Debug-komponent (Sidevisning)
- `src/app/features/school-plan/school-plan.component.ts`
  - Signals: `loading`, `error`, `response` (ParseResponse | null)
  - Enkel knapp "Test med dummy-data" som sender hardkodet base64 til API
  - Toggle for "Vis rådata" som viser `response.raw` i en `<pre>`-blokk
  - Liste over `response.data.events` med dato, tittel, beskrivelse, kategori
  - `@if`/`@for` control flow

### 5. Routing
- `app.routes.ts`: default-rute → `SchoolPlanComponent`

### 6. App-shell
- `app.component.ts`: minimal header med "Familieportalen" tittel + `<router-outlet>`

## Filstruktur (ny)
```
src/
  app/
    app.component.ts
    app.routes.ts
    app.config.ts
    features/
      school-plan/
        models/
          school-plan.models.ts
        services/
          school-plan.service.ts
        school-plan.component.ts
  proxy.conf.json
```

## Ikke inkludert i denne fasen
- Kamera/bildeopptak (Fase 3)
- Fancy UI/styling (Fase 3)
- Persistering/database
- Autentisering
