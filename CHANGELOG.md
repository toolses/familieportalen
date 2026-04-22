# Changelog

Alle merkbare endringer i dette prosjektet dokumenteres her.
Format basert på [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versjonering følger [Semantic Versioning](https://semver.org/).

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

[0.2.0-beta]: https://github.com/toolses/familieportalen/compare/v0.1.0-beta...v0.2.0-beta
[0.1.0-beta]: https://github.com/toolses/familieportalen/releases/tag/v0.1.0-beta
