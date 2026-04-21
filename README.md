# Familieportalen

Norsk familieportal-app for digitalisering av ukeplaner fra barneskolen. Fotografer ukeplanen, la AI tolke innholdet, rediger og lagre — alt tilgjengelig i en mobilvennlig kalendervisning.

## Slik fungerer det (brukerperspektiv)

### 1. Skann ukeplanen
Gå til **Skole**-fanen og trykk **Skann ukeplan**. Ta bilde av forsiden (beskjeder og lekser) og eventuelt baksiden (timeplanen). Appen sender bildene til AI som leser og strukturerer innholdet automatisk.

### 2. Gjennomgå og rediger
Etter skanning får du en gjennomgangsvisning med fire faner: **Info**, **Beskjeder**, **Lekser** og **Fag**. Her kan du rette opp feil, endre kategori, og justere titler og beskrivelser før du lagrer.

### 3. Ukekalenderen
Etter lagring vises planen som en dagsvisning med knapper for mandag–fredag. Hver dag viser:
- **Informasjon** (grønt) — beskjeder fra skolen, vises på alle dager i uken
- **Påminnelser** (gult) — logistikk, "husk"-punkter, prøver
- **Lekser** (blått) — dagsspesifikke lekser + ukelekser som gjentas hver dag
- **Fagtimer** (grått) — timeplanen for den valgte dagen

### 4. Dashboard
Hjemmesiden gir et kjapt overblikk over dagens hendelser:
- **Husk i dag!** — kritiske påminnelser med handlingsord (ta med, husk, gymtøy osv.)
- **Påminnelser** — øvrige påminnelser
- **Lekser** — dagens lekser + ukelekser (markert med stjerne)

### 5. Innstillinger
Konfigurer hushold-etiketter (f.eks. "Hos Mamma" / "Hos Pappa") og administrer lagrede data.

## Tech Stack

- **Frontend:** Angular 19+ (Standalone Components, Signals, `@if`/`@for` control flow) + Tailwind CSS
- **Backend:** Node.js + Express (ES Modules)
- **AI:** Groq API med `llama-4-scout-17b-16e-instruct` (multimodal vision)
- **Lagring:** localStorage (ingen database)

## Prosjektstruktur

```
familieportalen/
├── client/                        # Angular frontend
│   └── src/app/
│       ├── app.ts                 # Rot-komponent med header + bunnmeny
│       ├── app.routes.ts          # Ruter: /, /skole, /innstillinger
│       ├── features/
│       │   ├── dashboard/         # Dagens oversikt, quick actions
│       │   ├── skole/             # Ukekalender, skann-flyt, lagring
│       │   ├── settings/          # Hushold-innstillinger, databehandling
│       │   └── school-plan/
│       │       ├── models/        # TypeScript-interfaces (SchoolEvent, etc.)
│       │       ├── services/      # HTTP-klient mot backend
│       │       ├── image-capture.component.ts   # Kamera/filopplasting
│       │       └── plan-review.component.ts     # Redigerbar event-liste
│       └── shared/
│           ├── services/          # SchoolDataService (signals + localStorage)
│           └── utils/             # Dato-hjelpere, kategori-styling
└── server/                        # Express backend
    └── src/
        ├── index.js
        ├── shared/extract-json.js # Rensing av AI-respons til gyldig JSON
        └── features/school-plan/
            ├── school-plan.routes.js
            └── school-plan.service.js   # Split & Merge AI-pipeline
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
| `reminder` | Logistikk, prøver, husk-punkter | Dagsspesifikk |
| `homework` | Lekser (ukelekser vises alle dager) | Dagsspesifikk + ukelekse |
| `school_class` | Fagtimer fra timeplanen | Dagsspesifikk |

## Kom i gang

### Forutsetninger

- Node.js 18+
- Groq API-nøkkel (hent på https://console.groq.com)

### Backend

```bash
cd server
cp .env.example .env   # Legg inn GROQ_API_KEY
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
  "backImage": "<base64>"
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

### `GET /api/health`

Helsesjekk-endepunkt.
