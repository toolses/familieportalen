import Groq from 'groq-sdk';
import { extractJson } from '../../shared/extract-json.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Du er en spesialisert data-ekstraktor for norske skoleplaner. Din oppgave er å transformere bilder av ukeplaner til strukturert JSON-data.

### LOGISKE REGLER:
1. IDENTIFISERING: Finn ukenummer og årstall i teksten (f.eks. "UKE 9, 2026"). 
2. DATO-BEREGNING: Beregn ISO-datoer (YYYY-MM-DD) for uken basert på ukenummeret. Mandag er ukesstart.
3. DATA-SAMMENFØYNING: Du må se sammenhengen mellom de to bildene. Hvis side 1 har en lekse for onsdag og side 2 viser fagene for onsdag, skal alt knyttes til samme dato i JSON-responsen.
4. LEKSE-LOGIKK: 
   - "Ukelekser" (oppgaver som gjelder hele uken) skal føres på mandag med beskrivelsen "Ukelekse: [tekst]".
   - Dagsspesifikke lekser/beskjeder skal føres på den spesifikke datoen de tilhører.
5. FILTRERING: Ikke opprett egne objekter for "Minimat", "Lunsj" eller "Friminutt" med mindre det står en unik beskjed der (f.eks. "Husk gode klær"). Generelle rutiner ignoreres.
6. KLOKKESLETT: Bruk formatet HH:MM. Hvis en aktivitet mangler tidspunkt, la feltet være null.

### KATEGORIER:
Bruk kun disse kategoriene: 
- "school_class" (fagtimer)
- "homework" (lekser/oppgaver)
- "test" (prøver/fremføringer)
- "reminder" (beskjeder som "husk tursekk", "lad læringsbrett", "gymtøy")

### UTDATA-FORMAT:
Returner KUN et rent JSON-objekt uten noe forklarende tekst eller markdown-formatering.

JSON-STRUKTUR:
{
  "metadata": {
    "uke": number,
    "aar": number,
    "trinn": "string"
  },
  "events": [
    {
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM eller null",
      "end_time": "HH:MM eller null",
      "title": "string",
      "description": "string (inkluder sidetall, hva som skal gjøres, eller spesifikke krav som 'lad nettbrett')",
      "category": "string"
    }
  ]
}`;

export async function parseSchoolPlan(frontImage, backImage) {
  const imageMessages = [frontImage, backImage]
    .filter(Boolean)
    .map((b64) => ({
      type: 'image_url',
      image_url: { url: b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}` },
    }));

  const response = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: imageMessages },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  });

  const rawText = response.choices[0].message.content;
  const parsed = extractJson(rawText);

  return { raw: rawText, data: parsed };
}
