# Changelog

Alle merkbare endringer i dette prosjektet dokumenteres her.
Format basert på [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versjonering følger [Semantic Versioning](https://semver.org/).

## [Unreleased]

---

## [0.3.0-beta] — 2026-05-15

### Lagt til
- **Dokumenter:** Ny fane for å laste opp, vise, redigere og slette dokumenter (bilder og PDF)
- **Dokumenter:** PDF-generering fra bilder med korrekt orientering
- **Dokumenter:** Fullskjermvisning med lukkeknapp, optimalisert for iPhone-viewport
- **Lister:** Tildeling av listepunkter til familiemedlemmer via tagger (barn og foreldre)
- **Google Kalender:** Støtte for å velge blant flere kalendere med individuelle farger per kalender
- **Google Kalender:** Personlig Google Kalender per bruker (i tillegg til delt familiekalender)
- **Google Kalender:** Viser alle kalenderhendelser på Hjem-siden med matchende kalenderfarger
- **Skoleplan:** Ny kategori `ukelekser` for lekser som gjelder hele uken (vises gruppert per barn på Hjem-siden)
- **Skoleplan:** Fullfør-toggle for ukelekser
- **Skoleplan:** Valgfrie lagremodi ved lagring av skannet ukeplan
- **Innstillinger:** Fanebasert navigasjon (Generelt / Admin)
- **Innstillinger:** Administrasjon av husstandsmedlemmer — slett og endre roller
- **Push-varsler:** Daglige påminnelsesvarsler med husstandsbasert logikk
- **Push-varsler:** Valgfri varsling ved opprettelse av manuelle påminnelser
- **Dashboard:** Distinkt visuell skille mellom hendelser for i dag og i morgen
- **Dashboard:** `EventEditModal` for redigering av påminnelser, hendelser og skoleoppgaver direkte fra oversikten
- **Navigasjon:** Haptisk tilbakemelding og forbedret layout i bunnnavigasjon
- **Ytelse:** Lazy-loading av feature-ruter for redusert initial bundelstørrelse

### Endret
- **Skoleplan:** Byttet OCR-modell fra Groq/Llama til Claude Sonnet 4.6 for bedre nøyaktighet
- **Skoleplan:** Bildet deles i to halvdeler før OCR-analyse for bedre oppløsning
- **Skoleplan:** Fjernet «Fag»-fane fra plan-gjennomgangssiden
- **Dashboard:** Fjernet automatisk kollaps av hendelsesbeskrivelser
- **Kalender:** Fjernet automatisk kollaps av hendelsesbeskrivelser; automatisk scroll til dagens dato
- **Kalender:** Refaktorert knappelayout for bedre design
- **Router:** In-memory scrolling for konsistent navigasjonsopplevelse

### Fikset
- **Skoleplan:** Forhindret at ukeplaner forsvinner etter skanning eller lekseredigering
- **Skoleplan:** Løst Firestore-dokumentstørrelsesgrense (base64-bilder lagres ikke lenger i Firestore etter analyse)
- **Skoleplan:** Rettet feil tildeling av beskrivelse i leksepunkter
- **Dashboard:** Fjernet overflødig Google Kalender-header
- **Dokumenter:** Løst viewport-problemer for PDF-visning på iPhone
- **Kalender:** Rettet to TypeScript-byggfeil i `GoogleCalendarService`
- **Google OAuth:** Rettet manglende `redirect_uri` i OAuth-URL

---

## [0.2.1-beta] — 2026-04-23

### Fikset
- Justert bunnpadding i navigasjonsbar, kalender og innstillinger

---

## [0.2.0-beta] — 2026-04-23

### Lagt til
- **Kalender:** Bryter mellom uke- og månedsvisning med swipe-støtte for begge visninger
- **Dashboard:** Redigering av påminnelser og kalenderhendelser direkte fra dashboardet
- **Dashboard:** Fremhevet visning av kommende påminnelser etter kl. 18:00 når ingen aktive påminnelser finnes
- **Skoleplan:** Fullføring av lekser med toggle og visuell tilbakemelding
- **Skoleplan:** Nye dedikerte komponenter for lekser (`HomeworkItem`) og påminnelser (`ReminderSheet`)
- **Skoleplan:** Ventende hendelser kan toggles med visuell tilbakemelding

### Endret
- Forbedret datovisning med `formatDateFull` på tvers av komponenter

### Fikset
- Forhindrer automatisk zoom på iOS-enheter i PWA
- Rettet scrolling-problemer i PWA-modus

---

## [0.1.0-beta] — 2026-04-22

Første beta-release. Dekker all funksjonalitet pushet til `main`.

### Skoleplan
- Skanning og bildeopplasting av ukeplaner
- AI-parsing av planer via Groq (kategorier: lekser, påminnelse, informasjon, klasse)
- Gjennomgang og redigering av parsede hendelser før lagring
- Forbedret bildeopplastings-UI og kameraflyt

### Google Kalender
- Google OAuth-autentisering (autorisasjon via redirect-flyt)
- Henting og visning av kalenderhendelserGoogle Calendar API-integrasjon for kalendersynkronisering

### Kalender
- Ukevisning med navigasjon (forrige/neste uke)
- Swipe-navigasjon mellom uker
- «I dag»-knapp for å hoppe til gjeldende uke
- Hendelsesredigering via modal-sheet
- Visning av samværsplan (hvem barna bor hos i dag)

### Lister
- Lister med full CRUD-funksjonalitet
- Detaljvisning for individuelle lister
- Støtte for ventende elementer

### Push-varsler
- Push-varsler via Firebase Cloud Messaging
- Planlagte varsler for bytting av bosted (samværsdager)
- Admin-funksjonalitet for å sende testvarsler

### Husstand
- Husholdningsstyring med invitasjonskoder
- Mulighet for å forfremme medlemmer til admin
- Forbedret admin-brukergrensesnitt med tydelige admin-etiketter

### Teknisk
- Firebase Authentication med Google Sign-In
- Firestore som sentral tilstandslagring med sanntids `onSnapshot`-synkronisering
- Firebase Cloud Functions som produksjonsbackend
- Express-server for lokal utvikling
- Migrering til Vitest for enhetstesting
- Playwright for E2E-testing
- Firebase-omstrukturering og splashscreen-håndtering
- Oppdaterte avhengigheter

### Feilfikser
- Rettet Firestore-regler som feilet ved pre-join-lesing for husstand

[Unreleased]: https://github.com/toolses/familieportalen/compare/v0.3.0-beta...HEAD
[0.3.0-beta]: https://github.com/toolses/familieportalen/compare/v0.2.1-beta...v0.3.0-beta
[0.2.1-beta]: https://github.com/toolses/familieportalen/compare/v0.2.0-beta...v0.2.1-beta
[0.2.0-beta]: https://github.com/toolses/familieportalen/compare/v0.1.0-beta...v0.2.0-beta
[0.1.0-beta]: https://github.com/toolses/familieportalen/releases/tag/v0.1.0-beta
