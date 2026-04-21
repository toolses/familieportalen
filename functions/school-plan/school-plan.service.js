import { extractJson } from '../shared/extract-json.js';

let Groq;
let groq;
async function getGroq() {
  if (!groq) {
    if (!Groq) {
      Groq = (await import('groq-sdk')).default;
    }
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
}
const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

/**
 * ISO week date calculation — same logic as the frontend.
 * Returns ISO date strings for Mon–Fri of the given week/year.
 */
function getDatesOfWeek(week, year) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);

  const targetMonday = new Date(mondayWeek1);
  targetMonday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);

  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(targetMonday);
    d.setUTCDate(targetMonday.getUTCDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** Format a date like "23. feb" for use in prompts */
function formatNorwegianShort(isoDate) {
  const d = new Date(isoDate + 'T00:00:00Z');
  const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  return `${d.getUTCDate()}. ${months[d.getUTCMonth()]}`;
}

// ── Step 1 prompt: extract week number + year only ──────────────

const EXTRACT_WEEK_PROMPT = `Du ser på et bilde av en norsk ukeplan for barneskolen.
Din ENESTE oppgave: finn ukenummeret og årstallet.
Returner KUN dette JSON-objektet, ingenting annet:
{"uke": <nummer>, "aar": <årstall>, "trinn": "<klassetrinn eller tom string>"}`;

// ── Prompt A: Tekst- og lekseanalytiker (tekstside) ─────────────

function buildTextAnalysisPrompt(dates, dateMap) {
  return `Du er en ekspert på teksttolking. Analyser bildet av ukeplanens tekstsider.

**Dato-anker:** Uke som dekker Mandag ${formatNorwegianShort(dates[0])} - Fredag ${formatNorwegianShort(dates[4])}.

**DATO-MAPPING (forhåndsberegnet — BRUK DISSE):**
- Mandag = ${dateMap.Mandag} (${formatNorwegianShort(dates[0])})
- Tirsdag = ${dateMap.Tirsdag} (${formatNorwegianShort(dates[1])})
- Onsdag = ${dateMap.Onsdag} (${formatNorwegianShort(dates[2])})
- Torsdag = ${dateMap.Torsdag} (${formatNorwegianShort(dates[3])})
- Fredag = ${dateMap.Fredag} (${formatNorwegianShort(dates[4])})

**Instrukser:**

### 1. **Seksjon "Beskjeder":**
   - Alt her blir "information" med dato = ${dateMap.Mandag} (Mandag).
   - Lag en "information"-event per tydelig beskjed.

### 2. **Seksjon "Ordenselever":**
   - Hopp over denne seksjonen. Den inneholder kun navn og har ingen relevant info for kalenderen.

### 3. Seksjon "Lekser til":
- **VISUELT ANKER:** Du SKAL først identifisere overskriften på kolonnen (f.eks. "Onsdag") og deretter lese kun teksten som står direkte vertikalt under denne overskriften. 
- **1:1 MAPPING:** Teksten skal lagres på den faktiske datoen den står oppført under i planen. Ingen dagsforskyvning skal skje i OCR-prosessen.
- **TOMME FELT:** Hvis en kolonne er tom, inneholder kun bindestreker, eller kun har fagnavn uten instruks (f.eks. kun ordet "Norsk"), skal du **IKKE** opprette et event.

**Mapping-regler:**
- **Ukelekse:** Tekst under "Ukelekse" eller generelle fag-lekser → "category": "homework", "date": ${dateMap.Mandag}, "title": "Ukelekse: [Fag]".
- **Lekse til Tirsdag:** Tekst direkte under overskriften "Tirsdag" → "category": "homework", "date": ${dateMap.Tirsdag}, "title": "Lekse tirsdag".
- **Lekse til Onsdag:** Tekst direkte under overskriften "Onsdag" → "category": "homework", "date": ${dateMap.Onsdag}, "title": "Lekse onsdag".
- **Lekse til Torsdag:** Tekst direkte under overskriften "Torsdag" → "category": "homework", "date": ${dateMap.Torsdag}, "title": "Lekse torsdag".
- **Lekse til Fredag:** Tekst direkte under overskriften "Fredag" → "category": "homework", "date": ${dateMap.Fredag}, "title": "Lekse fredag".

**KATEGORIER:**
- "information": Generell informasjon og beskjeder fra skolen.
- "reminder": Logistikk, prøver, "husk"-punkter.
- "homework": Alle typer lekser.

**UTDATA:** Returner KUN et rent JSON-objekt:
{
  "events": [
    { "date": "YYYY-MM-DD", "title": "string", "description": "string", "category": "information|reminder|homework" }
  ]
}`;
}

// ── Prompt B: Rutenett-ekspert (timeplan-side) ──────────────────

function buildGridAnalysisPrompt(dates, dateMap) {
  return `
# SYSTEM-PROMPT: LOGISTIKK-DETEKTOR (TIMEPLAN-SKANNING)

**Rolle:** Du er en logistikk-ekspert for foreldre. Din oppgave er å skanne timeplanen og KUN trekke ut ting foreldre må huske eller handle på.

**DATO-MAPPING (IKKE AVVIK):**
- Kolonne 1 = Mandag (${formatNorwegianShort(dates[0])}) = ${dateMap.Mandag}
- Kolonne 2 = Tirsdag (${formatNorwegianShort(dates[1])}) = ${dateMap.Tirsdag}
- Kolonne 3 = Onsdag (${formatNorwegianShort(dates[2])}) = ${dateMap.Onsdag}
- Kolonne 4 = Torsdag (${formatNorwegianShort(dates[3])}) = ${dateMap.Torsdag}
- Kolonne 5 = Fredag (${formatNorwegianShort(dates[4])}) = ${dateMap.Fredag}

**KRITISKE INSTRUKSER:**

1. **IGNORER standard skolefag.** Matte, Norsk, Engelsk, Naturfag, Samfunnsfag, KRLE, Musikk, K&H, Kunst og Håndverk, Matematikk — IKKE lag events for disse med mindre de har spesiell logistikk-info.

2. **SØK ETTER logistikk-stikkord:** Husk, Ta med, Klær, Utstyr, Tur, Sekk, Tursekk, Matpakke, Gymtøy, Gym, Svømming, Uteskole, Friluft, Skidag, Aktivitetsdag, Felles aktivitet.

3. **GYM / Svømming:** Lag en reminder for hver dag som har Gym eller Svømming. Tittel: "Husk gymtøy" / "Husk badetøy". Beskriv hva som trengs.

4. **UTESKOLE:** Trekk ut ALL tekst om utstyr, bekledning og oppmøte som en reminder. Tittel: "Husk til Uteskole". Beskrivelse: alt om klær, sekk, mat, oppmøtested.

5. **Turer og spesielle aktiviteter:** Alt som bryter med vanlig undervisning og krever at foreldre gjør noe (pakker sekk, sender med utstyr, leverer tidlig osv).

6. **Alt du finner skal ha category "reminder".**

7. **Returner TOMT events-array hvis du ikke finner noe logistikk-relevant.**

**JSON-FORMAT:**
{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "title": "string",
      "description": "string",
      "category": "reminder"
    }
  ]
}`;
}

// ── Merge & deduplicate ─────────────────────────────────────────

function mergeEvents(eventsA, eventsB, validDates) {
  const all = [...eventsA, ...eventsB];
  const validSet = new Set(validDates);

  // Clamp hallucinated dates to Monday
  for (const e of all) {
    if (!validSet.has(e.date)) {
      e.date = validDates[0];
    }
  }

  // Deduplicate by date+title+category
  const seen = new Set();
  const unique = [];
  for (const e of all) {
    const key = `${e.date}|${e.title?.toLowerCase()?.trim()}|${e.category}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(e);
    }
  }

  // Sort by date then category order
  const catOrder = { information: 0, reminder: 1, homework: 2 };
  unique.sort((a, b) => {
    const dc = a.date.localeCompare(b.date);
    if (dc !== 0) return dc;
    return (catOrder[a.category] ?? 9) - (catOrder[b.category] ?? 9);
  });

  return unique;
}

// ── Main export ─────────────────────────────────────────────────

export async function parseSchoolPlan(frontImage, backImage, options = {}) {
  const { weekOverride, yearOverride } = options;
  const toImageContent = (b64) => ({
    type: 'image_url',
    image_url: { url: b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}` },
  });

  const frontContent = toImageContent(frontImage);
  const backContent = backImage ? toImageContent(backImage) : null;

  // ── Step 1: Extract week number + year ──────────────────────
  console.log('[Split&Merge] Step 1: Extracting week info...');
  let step1;
  try {
    step1 = await (await getGroq()).chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: EXTRACT_WEEK_PROMPT },
        { role: 'user', content: [frontContent] },
      ],
      temperature: 0.0,
      max_tokens: 100,
    });
  } catch (apiErr) {
    console.error('[Split&Merge] Step 1 Groq-feil:');
    console.error('  Status:', apiErr.status);
    console.error('  Melding:', apiErr.message);
    if (apiErr.error) console.error('  API-respons:', JSON.stringify(apiErr.error, null, 2));
    const err = new Error(`Groq API-feil i steg 1 (uke-ekstraksjon): ${apiErr.message}`);
    err.rawAiText = apiErr.message;
    throw err;
  }

  const step1Raw = step1.choices[0].message.content;
  console.log('[Split&Merge] Step 1 raw:', step1Raw);

  let weekInfo;
  try {
    weekInfo = extractJson(step1Raw);
  } catch (jsonErr) {
    console.error('[Split&Merge] Step 1 JSON-feil. Rå AI-tekst:', step1Raw);
    const err = new Error(`Kunne ikke lese uke-info fra AI: ${jsonErr.message}`);
    err.rawAiText = step1Raw;
    throw err;
  }

  const { uke: aiUke, aar: aiAar, trinn } = weekInfo;

  // Use override if provided, otherwise fall back to AI-detected values
  const uke = weekOverride || aiUke;
  const aar = yearOverride || aiAar;

  if (weekOverride) {
    console.log(`[Split&Merge] Week override: using uke ${uke} (AI detected ${aiUke}), år ${aar}`);
  }

  // ── Step 2: Calculate dates server-side ─────────────────────
  const dates = getDatesOfWeek(uke, aar);
  const dateMap = {
    Mandag: dates[0],
    Tirsdag: dates[1],
    Onsdag: dates[2],
    Torsdag: dates[3],
    Fredag: dates[4],
  };

  console.log(`[Split&Merge] Uke ${uke}, ${aar}: ${dates.join(', ')}`);

  // ── Step 3: Split — two parallel AI calls ───────────────────
  const promptA = buildTextAnalysisPrompt(dates, dateMap);
  const promptB = buildGridAnalysisPrompt(dates, dateMap);

  const gridImage = backContent || frontContent;

  console.log('[Split&Merge] Step 3: Sending parallel calls (Prompt A: tekst, Prompt B: rutenett)...');

  let resultA, resultB;
  try {
    const client = await getGroq();
    [resultA, resultB] = await Promise.all([
      client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: promptA },
          { role: 'user', content: [frontContent] },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
      client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: promptB },
          { role: 'user', content: [gridImage] },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    ]);
  } catch (apiErr) {
    console.error('[Split&Merge] Groq API-feil i parallelle kall:');
    console.error('  Status:', apiErr.status);
    console.error('  Melding:', apiErr.message);
    if (apiErr.error) console.error('  API-respons:', JSON.stringify(apiErr.error, null, 2));
    const err = new Error(`Groq API-feil i analyse: ${apiErr.message}`);
    err.rawAiText = apiErr.message;
    throw err;
  }

  const rawA = resultA.choices[0].message.content;
  const rawB = resultB.choices[0].message.content;

  console.log('[Split&Merge] Prompt A rå-lengde:', rawA.length, 'tegn');
  console.log('[Split&Merge] Prompt B rå-lengde:', rawB.length, 'tegn');

  // ── Step 4: Parse & Merge ─────────────────────────────────
  let parsedA, parsedB;
  try {
    parsedA = extractJson(rawA);
  } catch (e) {
    console.error('[Split&Merge] Prompt A JSON-feil. Rå tekst:', rawA);
    const err = new Error(`JSON-parsing feilet for Prompt A (tekst): ${e.message}`);
    err.rawAiText = `--- PROMPT A (FEILET) ---\n${rawA}\n\n--- PROMPT B ---\n${rawB}`;
    throw err;
  }

  try {
    parsedB = extractJson(rawB);
  } catch (e) {
    console.error('[Split&Merge] Prompt B JSON-feil. Rå tekst:', rawB);
    const err = new Error(`JSON-parsing feilet for Prompt B (rutenett): ${e.message}`);
    err.rawAiText = `--- PROMPT A ---\n${rawA}\n\n--- PROMPT B (FEILET) ---\n${rawB}`;
    throw err;
  }

  const eventsA = Array.isArray(parsedA.events) ? parsedA.events : [];
  const eventsB = Array.isArray(parsedB.events) ? parsedB.events : [];

  console.log(`[Split&Merge] Prompt A: ${eventsA.length} events, Prompt B: ${eventsB.length} events`);

  const mergedEvents = mergeEvents(eventsA, eventsB, dates);
  console.log(`[Split&Merge] Merged: ${mergedEvents.length} events totalt`);

  const data = {
    metadata: { uke, aar, trinn: trinn || '' },
    events: mergedEvents,
  };

  return {
    raw: `--- PROMPT A (Tekst, ${eventsA.length} events) ---\n${rawA}\n\n--- PROMPT B (Rutenett, ${eventsB.length} events) ---\n${rawB}`,
    rawOcr: '',
    data,
  };
}
