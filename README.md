# Familieportalen

Family portal web app. First module: **Ukeplan-digitizer** — photograph a Norwegian school weekly plan, have AI extract structured events, then review/edit them.

## Tech Stack

- **Frontend:** Angular 19 (Standalone Components, Signals, `@if`/`@for` control flow) + Tailwind CSS
- **Backend:** Node.js + Express (ES Modules)
- **AI:** Groq API with `llama-4-scout-17b-16e-instruct` (multimodal vision)

## Project Structure

```
familieportalen/
├── client/          # Angular frontend
│   └── src/app/
│       ├── app.ts, app.config.ts, app.routes.ts
│       └── features/school-plan/
│           ├── models/school-plan.models.ts
│           ├── services/school-plan.service.ts
│           ├── school-plan.component.ts      # Container (IDLE → UPLOADING → REVIEW)
│           ├── image-capture.component.ts    # Camera/file upload with compression
│           └── plan-review.component.ts      # Editable event list with debug toggle
└── server/          # Express backend
    └── src/
        ├── index.js
        ├── shared/extract-json.js
        └── features/school-plan/
            ├── school-plan.routes.js
            └── school-plan.service.js
```

## Getting Started

### Prerequisites

- Node.js 18+
- Groq API key (get one at https://console.groq.com)

### Backend

```bash
cd server
cp .env.example .env   # Add your GROQ_API_KEY
npm install
npm run dev            # Starts on http://localhost:3000
```

### Frontend

```bash
cd client
npm install
npx ng serve           # Starts on http://localhost:4200, proxies /api → :3000
```

## API

### `POST /api/school-plan/parse`

Send one or two base64-encoded images of a weekly school plan.

```json
{
  "frontImage": "<base64>",
  "backImage": "<base64>"
}
```

Returns:

```json
{
  "raw": "AI raw text",
  "data": {
    "metadata": { "uke": 9, "aar": 2026, "trinn": "3. trinn" },
    "events": [
      {
        "date": "2026-02-23",
        "start_time": "08:30",
        "end_time": "09:15",
        "title": "Matematikk",
        "description": "Side 45, oppgave 1-5",
        "category": "school_class"
      }
    ]
  }
}
```

Categories: `school_class`, `homework`, `test`, `reminder`

### `GET /api/health`

Health check endpoint.
