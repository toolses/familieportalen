import { extractJson } from '../shared/extract-json.js';

let Anthropic;
let anthropic;
async function getAnthropic() {
  if (!anthropic) {
    if (!Anthropic) {
      Anthropic = (await import('@anthropic-ai/sdk')).default;
    }
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}
const MODEL = 'claude-sonnet-4-6';

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
  return `Du analyserer forsiden av en norsk ukeplan fra barneskolen (en tekstbasert A4-side, ikke et timeplan-rutenett).

**DATO-MAPPING (bruk alltid disse eksakte datoene):**
- Mandag = ${dateMap.Mandag} (${formatNorwegianShort(dates[0])})
- Tirsdag = ${dateMap.Tirsdag} (${formatNorwegianShort(dates[1])})
- Onsdag = ${dateMap.Onsdag} (${formatNorwegianShort(dates[2])})
- Torsdag = ${dateMap.Torsdag} (${formatNorwegianShort(dates[3])})
- Fredag = ${dateMap.Fredag} (${formatNorwegianShort(dates[4])})

---

### SEKSJON "Beskjeder" (evt. "Informasjon", "Melding"):
Lag én "information"-hendelse. Dato = ${dateMap.Mandag}. Tittel: "Beskjed fra skolen". Beskrivelse: kopier teksten ordrett.

### SEKSJON "Ordenselever", "Ukens mål", "Læringsmål", "Sosialt mål":
HOPP OVER. Ingen hendelser.

### SEKSJON "Lekser til" / "Ukens lekser":

**A. Ukelekse-blokken** (tekst som gjelder hele uken, vanligvis øverst i seksjonen):
Dato = ${dateMap.Mandag} for alle. Lag ÉN separat hendelse per punkt/linje:

- Punkt MED fagnavn-prefiks (f.eks. "Norsk:", "Matematikk:", "Engelsk:"):
  → title: "Ukelekse: [Fagnavn]"  (f.eks. "Ukelekse: Norsk")
  → description: teksten etter kolonet — kopier nøyaktig inkl. sidetall, oppgavenummer og minutter
  → category: "weekly_homework"

- Punkt UTEN fagnavn-prefiks (f.eks. "Lad læringsbrettet...", "Les i boken din..."):
  → title: "Ukelekse"
  → description: hele teksten
  → category: "weekly_homework"

**B. Dagskolonne-tabellen** (kolonner med ukedagsnavn: Mandag, Tirsdag, Onsdag, Torsdag, Fredag):
Identifiser kolonneoverskriften visuelt og les kun teksten rett under den tilhørende kolonnen.
Tomme kolonner, bindestreker eller blanke felt → ingen hendelse.

For hver kolonne MED tekst, bestem kategori slik:
- Logistisk handling (inneholder ord som "pakk", "ta med", "husk", "rydd", "lever", "ta hjem", "sett i sekken") → category: "reminder", title: selve teksten (maks 50 tegn)
- Faglig oppgave (les, skriv, øv, gjør, lær) → category: "homework", title: selve teksten (maks 50 tegn)
Beskrivelse = teksten kopiert ordrett. Dato = datoen for kolonnen.

---

**UTDATA:** Returner KUN dette JSON-objektet, ingen annen tekst:
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

**VIKTIG OM LAYOUT:** Kolonneoverskriftene (dagnavnene) kan være rotert 90 grader i bildet. Les dem nøye. Rad-overskriftene til venstre viser time-nummer (1.time, 2.time osv.).

**DATO-MAPPING (IKKE AVVIK):**
- Kolonne 1 = Mandag (${formatNorwegianShort(dates[0])}) = ${dateMap.Mandag}
- Kolonne 2 = Tirsdag (${formatNorwegianShort(dates[1])}) = ${dateMap.Tirsdag}
- Kolonne 3 = Onsdag (${formatNorwegianShort(dates[2])}) = ${dateMap.Onsdag}
- Kolonne 4 = Torsdag (${formatNorwegianShort(dates[3])}) = ${dateMap.Torsdag}
- Kolonne 5 = Fredag (${formatNorwegianShort(dates[4])}) = ${dateMap.Fredag}

**KRITISKE INSTRUKSER:**

1. **IGNORER standard skolefag** som kun nevner fagnavnet uten ekstra info. Matte, Norsk, Engelsk, Naturfag, Samfunnsfag, KRLE, Musikk, K&H — ignorer BARE fagnavn alene. Hvis det er tilleggstekst i samme celle, les den.

2. **SØK ETTER følgende — lag en "reminder" for hvert funn:**

   **Logistikk:** Husk, Ta med, Klær, Utstyr, Tur, Sekk, Tursekk, Matpakke, Gymtøy, Gym, Svømming, Uteskole, Friluft, Skidag, Aktivitetsdag, Felles aktivitet, Dugnad, Leirskole

   **Prøver og faglige hendelser:** Prøve, Klasseprøve, Gloseprøve, Skriveprøve, Test, Høreprøve, Tentamen, Diktat, Fagdag

   **Skoletid-endringer:** Skoleavslutning, Tidlig slutt, Kortdag, Planleggingsdag, Fri, Fridag, Utdeling, Dele ut

   **Spesielle aktiviteter:** Stasjoner (som erstatning for vanlig undervisning), Aktivitetsdag, Tema-dag, Besøk, Teater, Konsert, Idrettsdag, Svømmehall

3. **GYM / Svømming:** Lag en reminder for hver dag. Tittel: "Husk gymtøy" / "Husk badetøy".

4. **UTESKOLE:** Trekk ut ALL tekst om utstyr, bekledning og oppmøte. Tittel: "Husk til Uteskole". Beskrivelse: kopier all relevant tekst fra cellen.

5. **PRØVER:** Tittel: "[Fag]prøve" (f.eks. "Gloseprøve" eller "Matematikkprøve"). Beskrivelse: eventuell tilleggstekst om pensum.

6. **SKOLEAVSLUTNING / KORTDAG:** Tittel: "Kortere skoledag". Beskrivelse: klokkeslett og dag.

7. **Alt du finner skal ha category "reminder".**

8. **Returner TOMT events-array hvis du ikke finner noe relevant.**

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
  const toImageContent = (b64) => {
    const data = b64.startsWith('data:') ? b64.split(',')[1] : b64;
    return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } };
  };

  const frontContent = toImageContent(frontImage);
  const backContent = backImage ? toImageContent(backImage) : null;

  // ── Step 1: Extract week number + year ──────────────────────
  console.log('[Split&Merge] Step 1: Extracting week info...');
  let step1;
  try {
    step1 = await (await getAnthropic()).messages.create({
      model: MODEL,
      system: EXTRACT_WEEK_PROMPT,
      messages: [{ role: 'user', content: [frontContent, { type: 'text', text: 'Analyser bildet.' }] }],
      temperature: 0.0,
      max_tokens: 100,
    });
  } catch (apiErr) {
    console.error('[Split&Merge] Step 1 Claude-feil:');
    console.error('  Status:', apiErr.status);
    console.error('  Melding:', apiErr.message);
    if (apiErr.error) console.error('  API-respons:', JSON.stringify(apiErr.error, null, 2));
    const err = new Error(`Claude API-feil i steg 1 (uke-ekstraksjon): ${apiErr.message}`);
    err.rawAiText = apiErr.message;
    throw err;
  }

  const step1Raw = step1.content[0].text;
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
    const client = await getAnthropic();
    [resultA, resultB] = await Promise.all([
      client.messages.create({
        model: MODEL,
        system: promptA,
        messages: [{ role: 'user', content: [frontContent, { type: 'text', text: 'Analyser bildet.' }] }],
        temperature: 1,
        max_tokens: 4096,
      }),
      client.messages.create({
        model: MODEL,
        system: promptB,
        messages: [{ role: 'user', content: [gridImage, { type: 'text', text: 'Analyser bildet.' }] }],
        temperature: 1,
        max_tokens: 4096,
      }),
    ]);
  } catch (apiErr) {
    console.error('[Split&Merge] Claude API-feil i parallelle kall:');
    console.error('  Status:', apiErr.status);
    console.error('  Melding:', apiErr.message);
    if (apiErr.error) console.error('  API-respons:', JSON.stringify(apiErr.error, null, 2));
    const err = new Error(`Claude API-feil i analyse: ${apiErr.message}`);
    err.rawAiText = apiErr.message;
    throw err;
  }

  const rawA = resultA.content[0].text;
  const rawB = resultB.content[0].text;

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
