# Familieportalen

Norsk familieportal-app for digitalisering av ukeplaner fra barneskolen. Fotografer ukeplanen, la AI tolke innholdet, rediger og lagre — alt tilgjengelig i en mobilvennlig kalendervisning. Støtter flere barn, samværsplan og Google Kalender-integrasjon.

## Slik fungerer det (brukerperspektiv)

### 1. Logg inn
Appen krever innlogging med Google-konto via Firebase Authentication.

### 2. Skann ukeplanen
Gå til **Skole**-fanen og velg barn, trykk deretter **Skann ukeplan**. Ta bilde av forsiden (beskjeder og lekser) og eventuelt baksiden (timeplanen). Appen sender bildene til AI som leser og strukturerer innholdet automatisk.

### 3. Gjennomgå og rediger
Etter skanning får du en gjennomgangsvisning med faner: **Informasjon**, **Beskjeder**, **Lekser** og **Fag**. Her kan du rette opp feil, endre kategori, og justere titler og beskrivelser før du lagrer.

### 4. Ukekalenderen (Skole)
Etter lagring vises planen som en dagsvisning med knapper for mandag–fredag. Hver dag viser:
- **Informasjon** (grønt) — beskjeder fra skolen, vises på alle dager i uken
- **Påminnelser** (gult) — logistikk, "husk"-punkter
- **Lekser** (blått) — dagsspesifikke lekser + ukelekser som gjentas hver dag
- **Fagtimer** (grått) — timeplanen for den valgte dagen

### 5. Kalender
Full ukevisning med alle hendelser (skoleplaner + Google Kalender). Filtrerbar på type. Støtter sveipe-navigasjon mellom uker, og redigering av hendelser via bunndialog.

### 6. Dashboard
Hjemmesiden gir et kjapt overblikk over dagens hendelser:
- **Husk i dag!** — kritiske påminnelser med handlingsord (ta med, husk, gymtøy osv.)
- **Påminnelser** — øvrige påminnelser
- **Lekser** — dagens lekser + ukelekser (markert med stjerne)
- **Dagens oversikt** — hendelser fra Google Kalender

### 7. Innstillinger
- Legg til/rediger/slett barn med navn og farge
- Koble til Google Kalender (OAuth-flyt)
- Konfigurer samværsplan (annenhver uke, med datooverrides)

## Tech Stack

- **Frontend:** Angular 21 (Standalone Components, Signals, `@if`/`@for` control flow) + Tailwind CSS v4
- **Backend (dev):** Node.js + Express (ES Modules) — `server/`
- **Backend (prod):** Firebase Cloud Functions v2 (samme Express-app) — `functions/`
- **Auth:** Firebase Authentication (Google-innlogging)
- **Database:** Firestore (familietilstand per bruker, sanntidssynkronisering)
- **AI:** Groq API med `meta-llama/llama-4-scout-17b-16e-instruct` (multimodal vision)
- **Ekstern API:** Google Calendar API v3

## Prosjektstruktur

```
familieportalen/
├── client/                        # Angular frontend
│   └── src/app/
│       ├── app.ts                 # Rot-komponent med header + bunnmeny
│       ├── app.routes.ts          # Ruter: /, /kalender, /skole, /innstillinger, /login
│       ├── features/
│       │   ├── dashboard/         # Dagens oversikt, quick actions, Google Kalender
│       │   ├── calendar/          # Ukevisning med filter og redigering
│       │   ├── skole/             # Per-barn skoleplaner, skann-flyt, ukevisning
│       │   ├── login/             # Google-innlogging via Firebase
│       │   ├── google/            # Google OAuth callback-håndtering
│       │   ├── settings/          # Barn-CRUD, Google Kalender, samværsplan
│       │   └── school-plan/
│       │       ├── models/        # TypeScript-interfaces (SchoolEvent, Child, osv.)
│       │       ├── services/      # HTTP-klient mot backend
│       │       ├── image-capture.component.ts   # Kamera/filopplasting
│       │       └── plan-review.component.ts     # Redigerbar event-liste
│       └── shared/
│           ├── components/        # EventEditSheetComponent (bunndialog for redigering)
│           ├── directives/        # SwipeDirective
│           ├── guards/            # auth.guard.ts (Firebase-beskyttet ruting)
│           ├── interceptors/      # auth.interceptor.ts (legger til Firebase ID-token)
│           ├── services/          # SchoolDataService, AuthService, GoogleCalendarService, osv.
│           └── utils/             # Dato-hjelpere, kategori-styling, bildeskaling
├── server/                        # Express backend (lokal utvikling)
│   └── src/
│       ├── index.js
│       ├── shared/extract-json.js # Rensing av AI-respons til gyldig JSON
│       └── features/
│           ├── school-plan/       # school-plan.routes.js + school-plan.service.js
│           └── google/            # google-auth.routes.js + google-calendar.routes.js
└── functions/                     # Firebase Cloud Functions (produksjon)
    └── features/
        ├── school-plan/           # Samme som server/, men med Firebase Admin SDK
        └── google-calendar/       # Google OAuth med token-lagring i Firestore
```

## Arkitektur: Split & Merge AI-pipeline

Backenden kjører tre AI-kall mot Groq:

1. **Steg 1 — Uke-ekstraksjon:** Forsidebildet sendes for å hente ut ukenummer og årstall. Datoer (man–fre) beregnes server-side.
2. **Steg 2A — Tekstanalytiker (Prompt A):** Forsidebildet analyseres for beskjeder (`information`), lekser (`homework`) og påminnelser (`reminder`).
3. **Steg 2B — Rutenett-ekspert (Prompt B):** Baksidebildet analyseres for timeplanen (`school_class`) og eventuelle påminnelser.

Steg 2A og 2B kjøres parallelt med `Promise.all`. Resultatene slås sammen, dedupliseres og sorteres etter dato og kategori.

### Event-kategorier

| Kategori | Beskrivelse | Visning |
|---|---|---|
| `information` | Beskjeder fra skolen | Vises på alle ukedager |
| `reminder` | Logistikk, husk-punkter | Dagsspesifikk |
| `homework` | Lekser (ukelekser vises alle dager) | Dagsspesifikk + ukelekse |
| `school_class` | Fagtimer fra timeplanen | Dagsspesifikk |

## Datalagring

All familietilstand lagres i Firestore under `users/{uid}`:
- Liste over barn (navn, farge, klassetrinn)
- Ukeplaner per barn
- Samværsplan (rotasjon + datooverrides)
- Aktivt barn og aktiv uke

Google Kalender-tokens lagres i Firestore under `config/googleCalendar` (produksjon) eller i `.google-tokens.json` (lokal utvikling). En enkelt OAuth-konto deles av alle brukere.

## Kom i gang

### Forutsetninger

- Node.js 18+
- Groq API-nøkkel (hent på https://console.groq.com)
- Firebase-prosjekt med Authentication og Firestore aktivert

### Backend (lokal utvikling)

```bash
cd server
cp .env.example .env   # Legg inn GROQ_API_KEY og Google OAuth-verdier
npm install
npm run dev            # Starter på http://localhost:3000
```

### Frontend

```bash
cd client
npm install
npx ng serve           # Starter på http://localhost:4200, proxyer /api → :3000
```

## API

### `POST /api/school-plan/parse`

Send ett eller to base64-kodede bilder av ukeplanen.

**Request:**
```json
{
  "frontImage": "<base64>",
  "backImage": "<base64>",
  "weekOverride": 9,
  "yearOverride": 2026
}
```

**Response:**
```json
{
  "raw": "--- PROMPT A (Tekst, 8 events) ---\n...\n--- PROMPT B (Rutenett, 15 events) ---\n...",
  "rawOcr": "",
  "data": {
    "metadata": { "uke": 9, "aar": 2026, "trinn": "3. trinn" },
    "events": [
      {
        "date": "2026-02-23",
        "title": "Matematikk",
        "description": "Side 45, oppgave 1-5",
        "category": "school_class"
      }
    ]
  }
}
```

### Google Auth (`/api/auth/google`)

- `GET /api/auth/google/url` — Returnerer OAuth consent URL
- `POST /api/auth/google/callback` — Veksler autorisasjonskode mot tokens
- `GET /api/auth/google/status` — Returnerer `{ connected: boolean }`
- `POST /api/auth/google/disconnect` — Sletter lagrede tokens

### Google Calendar (`/api/calendar`)

- `GET /api/calendar/list` — Returnerer liste over brukerens Google-kalendere
- `GET /api/calendar/events/:calendarId?timeMin=&timeMax=` — Returnerer kalender-events

### `GET /api/health`

Helsesjekk-endepunkt.
