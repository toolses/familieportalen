# Familieportalen – Funksjonalitetsbeskrivelse

> Dokumentet beskriver all funksjonalitet i Familieportalen fra et brukerperspektiv.
> Oppdatert: April 2026

---

## Oversikt

Familieportalen er en webapp (PWA) for familier med delt omsorg. Appen hjelper foreldre med å holde oversikt over barnas skoleuke, samværsplan, kalender, lister og påminnelser – alt synkronisert i sanntid mellom flere enheter og familiemedlemmer.

### Navigasjon

Appen har en fast bunnmeny med fem faner som alltid er synlig når man er innlogget:

| Ikon | Fane | Rute |
|------|------|------|
| 🏠 | **Hjem** | `/` |
| 📅 | **Kalender** | `/kalender` |
| 📖 | **Skole** | `/skole` |
| 📋 | **Lister** | `/lister` |
| ⚙️ | **Innstillinger** | `/innstillinger` |

Øverst i appen vises en header med Familieportalen-logoen, brukerens profilbilde (fra Google-kontoen) og en «Logg ut»-knapp.

Hvis en ny versjon av appen er tilgjengelig (PWA-oppdatering), vises et blått banner med teksten «Ny versjon er tilgjengelig» og en «Oppdater nå»-knapp.

---

## 1. Innlogging (`/login`)

### Hva brukeren ser
En enkel, sentrert side med:
- Overskriften «Familieportalen»
- Underteksten «Logg inn for å komme i gang»
- En stor «Logg inn med Google»-knapp med Google-logoen

### Funksjonalitet
- **Google-innlogging**: Brukeren trykker på knappen og får opp en Google-popup der de velger sin Google-konto. Etter vellykket innlogging sendes brukeren automatisk til Hjem-siden.
- **Laste-tilstand**: Mens innlogging pågår, vises en spinner og teksten «Logger inn...» på knappen, og knappen er deaktivert.
- **Feilhåndtering**: Hvis innloggingen feiler, vises en rød feilmelding: «Innlogging feilet. Prøv igjen.»
- **Beskyttede sider**: Alle andre sider krever innlogging. Hvis en uinnlogget bruker prøver å nå en beskyttet side, blir de omdirigert hit.

---

## 2. Hjem / Dashboard (`/`)

### Hva brukeren ser
Hjem-siden er en dagsoversikt som samler alt viktig for én dag på ett sted. Siden er designet for å gi et raskt overblikk over hva som skjer i dag (eller en annen valgt dag).

### Førstegangsopplevelse
Hvis ingen barn er lagt til ennå, vises en velkomstside med:
- Et stort ikon med en person og et pluss-tegn
- Overskriften «Velkommen!»
- Teksten «Kom i gang: Legg til ditt første barn for å bruke Familieportalen.»
- En «Legg til barn»-knapp som tar brukeren til Innstillinger

### Dagnavigasjon
- **Datovisning**: Øverst vises teksten «Hjem» og gjeldende dag (f.eks. «Onsdag 23.04»).
- **Navigasjonspiler**: Brukeren kan bla mellom dager med venstre/høyre-piler.
- **Sveip**: Man kan også sveipe venstre/høyre for å bytte dag.
- **Tilbake til i dag**: Trykk på datoen for å hoppe tilbake til dagens dato. Datoen er blå og klikkbar når man ser på en annen dag; grå når man allerede er på dagens dato.

### Samværsmerke
Øverst til høyre vises et merke som indikerer hvem barna er hos den valgte dagen:
- **Rosa merke**: «Hos Mamma» (med rosa bakgrunn)
- **Blått merke**: «Hos Pappa» (med blå bakgrunn)
- **Grått merke**: «Sett samvær» (hvis ingen rotasjon er konfigurert)
- **Trykk for å overstyre**: Ved å trykke på merket åpnes et panel der man raskt kan overstyre samværet for den valgte dagen til enten «Mamma» eller «Pappa». Man kan også sette det tilbake til standard rotasjon.

### Byttedag-varsel
Hvis i morgen er en byttedag (dvs. barna bytter mellom foreldrene), vises et fremtredende lilla/indigo-banner:
- Tekst: «Byttedag i morgen! Sjekk pakkelisten» (eller «Byttedag i dag!»)
- Banneret er klikkbart og tar brukeren direkte til bytte-hus-listen under Lister-fanen.
- Banneret har et 🔄-ikon.

### «Husk i dag!»-seksjon
Øverst blant innholdet vises en amber/oransje boks med viktige påminnelser for dagen. Denne inkluderer:
- **Skolrelaterte påminnelser**: Hendelser fra ukeplanen med kategori «påminnelse» som har nøkkelord som «husk», «ta med», «gymtøy», «matpakke», «badetøy» osv.
- **Manuelle påminnelser**: Påminnelser opprettet av brukeren selv.
- Hver påminnelse viser tittel, eventuell beskrivelse, og en farget prikk som indikerer hvilket barn/hvem det gjelder.
- Etter kl. 18:00 skjules skolepåminnelser (de er ikke lenger relevante), men manuelle påminnelser med klokkeslett fra kl. 18:00 vises fortsatt.
- Trykk på en påminnelse for å redigere den.

### Google Kalender-hendelser
Hvis familien har koblet til Google Kalender, vises dagens hendelser i en egen seksjon merket «Dagens oversikt» med Google-logoen:
- Hver hendelse viser navn, klokkeslett (start–slutt, «Hele dagen», eller datoperiode for flerdagshendelser), og eventuelt sted.
- Hendelsene er skrivebeskyttede (kommer fra Google Kalender).

### Manuelle hendelser
Hendelser opprettet av brukeren via Kalender-fanen vises i en indigo-farget seksjon merket «Hendelser»:
- Tittel, klokkeslett, beskrivelse og hvem hendelsen gjelder for.
- Trykk for å redigere.

### Påminnelser-seksjon
Skolepåminnelser som ikke allerede er fanget opp i «Husk i dag!»-seksjonen vises her.

### Lekser
Dagens lekser vises i en blå seksjon merket «Lekser»:
- Hver lekse viser tittel, beskrivelse, og hvilke barn den gjelder for.
- Lekser kan merkes som «fullført» direkte fra Hjem-siden.
- Trykk for å redigere.

### «I morgen»-seksjon
Påminnelser for neste dag vises i en egen seksjon:
- **Etter kl. 18:00**: Hvis det ikke er flere påminnelser igjen for i dag, vises morgendagens påminnelser i et fremtredende amber-design med overskriften «Husk i morgen!» – slik at foreldrene kan forberede seg til neste dag.
- **Før kl. 18:00**: Morgendagens påminnelser vises i et mer nedtonet design med overskriften «I morgen».

### Ukelekser
Nederst vises ukelekser (lekser som gjelder hele uken) gruppert per barn:
- Hver barnegruppe har et sammenleggbart panel merket med barnets navn og farge.
- Panelet er lukket som standard – trykk for å åpne.
- Inne i panelet vises alle ukelekser med mulighet for å merke dem som fullført.

### Tom dag
Hvis det ikke er noen hendelser overhodet for den valgte dagen, vises en tom-tilstand med et kalenderikon og teksten «Ingen hendelser i dag.» samt en «Gå til Skole»-knapp.

---

## 3. Kalender (`/kalender`)

### Hva brukeren ser
En fullverdig kalendervisning med to moduser: **Ukevisning** og **Månedsvisning**.

### Visningsvalg
Øverst til høyre er en segmentert kontroll med «Uke» og «Måned». Ved siden av vises dagens samværsmerke (Hos Mamma/Pappa).

---

### 3a. Ukevisning

#### Navigasjon
- **Ukenummer**: Viser f.eks. «Uke 17» med datoperiode (f.eks. «21.04 – 27.04»).
- **Piler**: Naviger med venstre/høyre-piler, eller sveip.
- **I dag-knapp**: Synlig når man er på en annen uke; hopper tilbake til gjeldende uke.

#### Filtrering
Under navigasjonen er det fire filterknapper:
- **Alle**: Viser alt (standard)
- **Lekser**: Kun lekser
- **Påminnelser**: Kun påminnelser (skole + manuelle)
- **Hendelser**: Kun manuelle kalenderhendelser

#### Dagsliste
For hver dag i uken (mandag–søndag) vises:
- **Dag-header**: Dagsnavn og dato (f.eks. «Mandag 21.04»). Dagens dag utheves med blå prikk og fet skrift. Helgedager vises i grå.
- **Samværslinje**: Øverst på hver dag vises en tynn farget linje (rosa for Mamma, blå for Pappa) og et lite merke til høyre.
- **Skolepåminnelser**: Vises i amber-farget boks med merkelapp «Påminnelse». Fargeprikk viser barnets farge. Trykk for å redigere.
- **Manuelle påminnelser**: Samme amber-design, med informasjon om hvem det gjelder, gjentagelse (hver uke / annenhver uke), og eventuelt klokkeslett.
- **Lekser**: Blå bakgrunn, med mulighet for å merke som fullført. Viser tittel og beskrivelse.
- **Manuelle hendelser**: Indigo-bakgrunn med merkelapp «Hendelse». Viser tittel, tid, beskrivelse, hvem det gjelder, og gjentagelse.
- **Google Kalender-hendelser**: Hvit boks med blå venstre-kant og Google-logo. Viser tittel, tid, beskrivelse og sted.
- Dager uten hendelser viser «Ingen hendelser».

#### Legg til-knapp (FAB)
Nede til høyre er en rund indigo-farget «+»-knapp. Ved trykk åpnes en meny med to valg:
- **Påminnelse**: Åpner skjema for ny manuell påminnelse.
- **Hendelse**: Åpner skjema for ny kalenderhendelse.

---

### 3b. Månedsvisning

#### Navigasjon
- Viser månedsnavn og årstall (f.eks. «april 2026»).
- Naviger med piler eller sveip.
- «I dag»-knapp for å hoppe tilbake.

#### Månedsrutenett
- 7 kolonner (Ma, Ti, On, To, Fr, Lø, Sø).
- Dagens dato utheves med blå bakgrunn.
- Valgt dag utheves med mørk bakgrunn.
- Under hvert datonummer vises fargeprikker som indikerer:
  - Skolehendelser (barnets farge)
  - Manuelle påminnelser (amber)
  - Manuelle hendelser (indigo)
  - Google-hendelser (blå)
- Under prikkene vises en tynn farget linje for samvær (rosa/blå).

#### Valgt dags hendelser
Når man trykker på en dag i rutenettet, vises hendelsene for den dagen under kalenderen:
- Dagsnavn med dato og samværsmerke.
- Alle hendelsestyper som i ukevisningen.
- «Ingen hendelser denne dagen» hvis tom.

#### Legg til-knapp
Samme FAB-knapp som i ukevisningen med mulighet for å opprette påminnelser og hendelser.

---

### 3c. Ny påminnelse (skjema)
Et bunnpanel (bottom sheet) med følgende felt:
- **Tittel**: Fritekstfelt
- **Beskrivelse**: Valgfritt tekstfelt
- **Dato**: Datovelger (viser dato i norsk format DD.MM.ÅÅÅÅ)
- **Klokkeslett**: Valgfri tidsvelger
- **Skolerelatert**: Bryter (toggle) – markerer påminnelsen som skolerelatert (vises da også på Skole-siden)
- **Gjelder**: Velg hvem påminnelsen gjelder for (Mamma, Pappa, og/eller hvert barn). Flere kan velges.
- **Gjentagelse**: Tre valg – Ingen, Hver uke, Annenhver uke

Knapper: «Lagre», «Slett påminnelse» (ved redigering), «Avbryt».

---

### 3d. Ny hendelse (skjema)
Et bunnpanel med følgende felt:
- **Tittel**: Fritekstfelt
- **Beskrivelse**: Valgfritt tekstfelt
- **Heldagshendelse**: Bryter (toggle)
- **Fra dato** og **Til dato**: Datovelgere
- **Fra tid** og **Til tid**: Tidsvelgere (skjult for heldagshendelser)
- **Gjelder**: Velg hvem hendelsen gjelder for (Mamma, Pappa, barn). Flere kan velges.
- **Gjentagelse**: Ingen, Hver uke, Annenhver uke

Knapper: «Lagre», «Slett hendelse» (ved redigering), «Avbryt».

---

## 4. Skole (`/skole`)

### Hva brukeren ser
Skolesiden gir oversikt over barnas ukeplaner fra skolen. Den har tre visninger: **Ukevisning**, **Skannmodus** og **Gjennomgang**.

### Barnevalg
Hvis det er registrert flere barn, vises en horisontal liste med knapper for hvert barn øverst. Hvert barn har sin egen farge og sitt eget navn. Aktivt barn er uthevet med hvit bakgrunn, ring i barnets farge, og skygge.

---

### 4a. Ukevisning

#### Uten plan
Hvis det ikke finnes noen ukeplan for det aktive barnet, vises:
- Et stort kalenderikon
- Teksten «Ingen ukeplan ennå»
- «Skann en ukeplan for å komme i gang.»
- En stor «Skann ukeplan»-knapp

#### Med plan
Når en plan finnes, vises:

##### Uke-header
- **Ukenummer**: f.eks. «Uke 17»
- **Ny skann-knapp**: Øverst til høyre med kameraikon og teksten «Ny skann».

##### Dagvelger
En horisontal rad med knapper for hver dag i uken (man–fre):
- Viser trebokstavsforkortelse (man, tir, ons, tor, fre) og datonummer.
- Valgt dag utheves med blå bakgrunn.
- Dagens dag har lyseblå bakgrunn.
- Dager med påminnelser har en liten amber-prikk under datonummeret.
- Sveip venstre/høyre for å bytte dag.

##### Informasjon (sammenleggbar)
Generell informasjon fra ukeplanen (gjelder hele uken, ikke dagsavhengig):
- Grønn bakgrunn med informasjonsikon.
- Viser antall hendelser og kan utvides/kollapses.
- Typisk: beskjeder fra lærer, generell ukeinformasjon.
- Trykk på en hendelse for å redigere.

##### Påminnelser
Dagens påminnelser fra skoleplanen vises i amber-farget boks:
- Hver påminnelse har tittel, beskrivelse og merkelapp «Påminnelse».
- Inkluderer også manuelle skolerelaterte påminnelser.
- Trykk for å redigere.

##### Lekser
Dagens lekser vises i blå boks:
- Tittel og beskrivelse.
- Mulighet for å merke som fullført (markert med ✓).
- Trykk for å redigere via bunnpanel der man kan endre tittel, beskrivelse, kategori, dag og fullføringsstatus.

##### Originalplan
Nederst kan brukeren se bildene som ble skannet:
- Miniatyrbilder av forside (ukeplan) og eventuell bakside (timeplan).
- Trykk for å åpne i fullskjerm (lightbox) med zoom-støtte.

---

### 4b. Skannmodus

#### Ukenummer
Øverst kan brukeren sette ukenummeret manuelt. Standardverdi er gjeldende ukes nummer. Teksten «Overstyrer ukenummeret AI-en finner i bildet» forklarer funksjonen.

#### Bildeopptak
Brukeren tar bilder av ukeplanen i to trinn:

**Trinn 1 – Ukeplan (forside)**:
- **Ta bilde**: Åpner enhetens kamera. I kameravisningen vises en instruksjon: «📄 Legg dokumentet flatt og ta bilde». Nederst er en stor hvit fotoknapp, og en galleri-knapp til venstre.
- **Velg fra galleri**: Alternativt kan man velge et bilde fra telefongalleriet.

**Trinn 2 – Timeplan (bakside, valgfritt)**:
- Etter at ukeplanbilde er tatt, spørres det: «Ukeplan tatt! Vil du også legge til timeplanen?»
- **Ta bilde av timeplanen**: Samme kameraflyt.
- **Velg timeplan fra galleri**: Alternativt fra galleri.
- **Hopp over**: «Hopp over – analyser kun ukeplanen» – sender kun ukeplanen til analyse.

#### Forhåndsvisning
Miniatyrbilder av tatte bilder vises (ukeplan og eventuelt timeplan). Hvert bilde har en rød «✕»-knapp for å fjerne og ta nytt bilde.

#### Analysering
Etter at bildene er klare, trykker brukeren «Analyser planene»:
- En fullskjerm-overlegg vises med:
  - Miniatyrbilder av bildene
  - Animert spinner
  - Teksten «Analyserer ukeplan...» og «AI-en leser planen din»
  - En fremdriftslinje
- AI-en (Groq med bildemodell) analyserer bildene og returnerer strukturerte hendelser.

#### Feilhåndtering
Hvis analysen feiler, vises en rød feilmelding under bildeopptaket.

---

### 4c. Gjennomgang

Etter AI-analyse kommer brukeren til gjennomgangssiden:

#### Metadata
Viser uke, år og eventuelt trinn fra den analyserte planen.

#### Fanebasert sortering
Fire faner for å filtrere hendelser:
- **Info**: Generell informasjon fra læreren
- **Beskjeder**: Påminnelser (ting som «husk gymtøy», «ta med penger»)
- **Lekser**: Oppgaver med frister
- **Fag**: Skoletimer

Hver fane viser antall hendelser i parentes.

#### Redigering av hendelser
Hver hendelse kan redigeres direkte:
- **Kategori**: Dropdown for å endre type (Informasjon, Påminnelse, Lekse, Fag)
- **Dato**: Datovelger
- **Tittel**: Redigerbart tekstfelt
- **Beskrivelse**: Redigerbart tekstområde
- **Slett**: Rød søppelkasse-knapp for å fjerne hendelsen

#### Feilsøking
Under hendelsene finnes en feilsøkingsseksjon:
- **Bilder sendt til AI**: Miniatyrbilder av bildene (klikkbare for fullvisning)
- **Rå OCR-tekst**: Vis/skjul hva AI-en leste fra bildet
- **Rå JSON-respons**: Vis/skjul hva AI-en returnerte

#### Lagring
- **Lagre ukeplan**: Lagrer planen for det valgte barnet. Hvis flere barn er registrert, åpnes en overlay der brukeren velger hvilket barn planen gjelder for.
- **Skann på nytt**: Går tilbake til skannmodus.
- Etter lagring vises grønn bekreftelse: «Ukeplanen er lagret!»

---

## 5. Lister (`/lister`)

### Hva brukeren ser
Listefunksjonaliteten gir brukeren sjekklister for familiebruk: faste lister og egendefinerte pakkelister.

### Faste lister
To forhåndsopprettede lister:

#### Bytte hus-listen
- **Ikon**: Lilahus-ikon med lilla bakgrunn
- **Formål**: Sjekkliste for ting barna trenger når de bytter hus (ved delt omsorg)
- **Fremhevet kobling**: Fra byttedagsvarselet på Hjem-siden
- Viser fremdrift (f.eks. «4 av 12 fullført»)

#### Handlelisten
- **Ikon**: Handlepose-ikon med grønn bakgrunn
- **Formål**: Felles handleliste for familien
- Viser fremdrift

### Pakkelister
Egendefinerte lister som brukeren oppretter selv:

#### Opprett ny pakkeliste
- Trykk «+ Ny pakkeliste» øverst til høyre.
- Et bunnpanel åpnes med et tekstfelt for navn og knappene «Opprett» og «Avbryt».
- Etter opprettelse navigeres man direkte til den nye listen.

#### Oversiktsliste
- Hver pakkeliste vises med oransje koffert-ikon, navn og fremdriftstekst.
- Til høyre er en rød søppelkasse-knapp for å slette listen (med bekreftelsesdialog: «Slett "[navn]"? Dette kan ikke angres.»).
- Trykk på listen for å åpne den.

#### Tom tilstand
Hvis ingen pakkelister er opprettet: «Ingen pakkelister ennå. Trykk "+ Ny pakkeliste" for å komme i gang.»

---

### 5a. Listedetalj (`/lister/:id`)

#### Header
- Tilbake-pil (navigerer til listeoversikten)
- Listenavn og fremdrift (f.eks. «3 av 8 fullført»)
- Listeikon (varierer etter type: lilla hus, grønn pose, eller oransje koffert)
- **Nullstill-knapp**: Synlig når minst ett punkt er avhuket. Rotasjonspil-ikon som åpner en bekreftelsesmodal.

#### Aktive punkter
- Hvert punkt vises som et kort med en rund avhukingsknapp til venstre og en «✕»-knapp til høyre for sletting.
- **Avhuking med forsinkelse**: Når brukeren trykker avhuk, vises en kort animasjon (1 sekund) der elementet markeres som gjennomstreket. Trykk igjen innen 1 sekund for å angre. Etter 1 sekund flyttes elementet til fullført-listen.
- Avhukede elementer vises med blå sirkel med hvitt hakemerke og gjennomstreket tekst.

#### Fullførte punkter
- Sammenleggbar seksjon med teksten «X fullført».
- Hvert fullført punkt kan gjenåpnes ved å trykke på den blå avhukingsknappen.
- «Fjern alle fullførte»-knapp (synlig når det er mer enn ett fullført punkt).

#### Legg til
Nederst er et fastlåst inputfelt:
- Tekstfelt med «Legg til nytt punkt...» som placeholder.
- En blå «+»-knapp til høyre.
- Støtter Enter-tast for rask tillegging.

#### Nullstilling
- Nullstill-knappen åpner en bekreftelsesmodal: «Nullstille listen? Dette vil fjerne avhukingen på alle elementene slik at listen er klar til neste gang. Er du sikker?»
- «Avbryt» og «Nullstill»-knapper.
- Nullstilling fjerner kun avhukingene – elementene forblir i listen.

#### Tom liste
Viser: «Listen er tom. Legg til punkter nedenfor.»

#### Liste ikke funnet
Hvis URL-en peker til en ugyldig liste: «Listen ble ikke funnet» med «Tilbake til lister»-lenke.

---

## 6. Innstillinger (`/innstillinger`)

### Hva brukeren ser
En side med flere konfigurasjonsblokker. Noen seksjoner er kun synlige for admin-brukere (merket med et «Admin»-merke).

---

### 6a. Google Kalender (kun admin)

#### Ikke tilkoblet
- Beskrivelse: «Koble til én gang – alle familiemedlemmer ser hendelsene automatisk.»
- Knapp: «Koble til Google Kalender» med Google-logo.
- Etter trykk sendes brukeren til Google for å godkjenne tilgangen, og returnerer automatisk tilbake.

#### Tilkoblet
- Grønt statusmerke: «Familiekalender tilkoblet – delt med alle»
- **Velg kalender**: Dropdown med brukerens Google-kalendere. Admin velger hvilken kalender som skal vises for hele familien.
- **Last inn kalenderliste**: Knapp for å hente listen over kalendere (vises hvis kalenderlisten ikke er lastet ennå).
- **Koble fra kalender**: Rød lenke for å fjerne tilkoblingen.

#### Feilhåndtering
Feilmelding vises hvis tilkoblingen feiler.

---

### 6b. Husstand

Familieportalen bruker et «husstand»-konsept for å dele data mellom familiemedlemmer.

#### Invitasjonskode
- En stor, tydelig invitasjonskode vises (tall/bokstaver i monospace-skrift).
- Trykk for å kopiere koden til utklippstavlen. Knappen viser «✓ Kopiert» etter kopiering.
- Instruksjon: «Del denne koden med familiemedlemmer.»

#### Medlemsliste
For hvert medlem vises:
- Profilbilde (eller initial i sirkel)
- Navn
- Rolle: «Admin» eller «Medlem»
- **Mamma/Pappa-knapper** (kun synlig for admin): Tilordne foreldrerenrolle til hvert medlem. Brukes for å knytte samværsplanen til riktig forelder. Roller kan fjernes med «✕».
- **Gjør admin** (kun admin, for andre medlemmer): Oppgraderer et medlem til admin.
- **Fjern** (kun admin, for andre medlemmer): Fjerner medlemmet fra husstanden.

#### Bli med i annen husstand
En lenke «Bli med i en annen husstand» lar brukeren taste inn en invitasjonskode for å bytte husstand.

---

### 6c. Push-varsler

#### Støttet
- Beskrivelse: «Få beskjed om byttedager og viktige hendelser direkte på telefonen.»
- Knapp: «Aktiver Push-varsler» med bjelle-ikon.
- Etter aktivering: Grønt merke «Push-varsler er aktivert på denne enheten».

#### Ikke støttet
- Melding: «Push-varsler støttes ikke av denne nettleseren.»

#### Blokkert
- Rød melding: «Varsler er blokkert. Gå til nettleserinnstillingene for å tillate varsler fra denne siden.»

#### iOS – ikke installert som PWA
- Amber varselsboks med instruksjoner: «For å aktivere push-varsler på iOS må du legge til appen på hjemskjermen. Trykk på Del-ikonet i Safari og velg «Legg til på hjemskjerm».»

---

### 6d. Admin – Test varsler (kun admin)

- Beskrivelse: «Send et test-varsel til alle dine registrerte enheter.»
- Knapp: «Send test-varsel» (indigo-farget)
- Etter sending vises resultat (grønn suksess eller rød feilmelding).

---

### 6e. Samværsplan

#### Rotasjonsstatus
- **Aktiv rotasjon**: Grønn boks med teksten «Rotasjon aktiv – annenhver uke», startdato, og hvem som starter. Lenker for «Endre» og «Fjern».
- **Ingen rotasjon**: Amber boks med «Ingen fast rotasjon satt opp ennå» og lenke «Sett opp».

#### Oppsett av rotasjon
Et skjema som åpnes ved trykk:
- **Startdato**: Datovelger (typisk en fredag)
- **Hvem starter**: Mamma eller Pappa
- **Lagre rotasjon** / **Avbryt**

#### Månedskalender
En visuell kalender for gjeldende måned:
- Navigering: Piler for forrige/neste måned.
- Hver dag er fargekodet:
  - **Rosa**: Hos Mamma
  - **Blå**: Hos Pappa
  - **Ring rundt dagens dato**: Mørk ring
  - **Oransje prikk**: Dager som er manuelt overstyrt
- **Trykk på en dag** for å overstyre samværet (bytter til motsatt forelder). Trykk igjen for å fjerne overstyrden og gå tilbake til rotasjonen.

#### Fargeoversikt
Under kalenderen:
- Rosa = Mamma, Blå = Pappa, Oransje prikk = Overstyrt dag
- Instruksjon: «Trykk på en dag for å overstyre hvem som har barna den dagen.»

#### Manuelt valg (uten rotasjon)
Hvis ingen fast rotasjon er satt opp, vises to knapper for å manuelt velge «Hos Mamma» eller «Hos Pappa» for i dag.

---

### 6f. Barn (kun admin)

#### Barneliste
Hvert barn vises med:
- Farget sirkel med barnets initial
- Navn og trinn (f.eks. «3. trinn»)
- Trykk for å redigere

#### Legg til barn
- Knapp «+ Legg til» øverst til høyre.
- Et bunnpanel åpnes med felter for:
  - **Navn**: Tekstfelt
  - **Trinn**: Tekstfelt (f.eks. «3. trinn»)
  - **Farge**: 7 forhåndsvalgte farger (blå, lilla, rosa, gul, grønn, rød, cyan)
- Forhåndsvisning av barnets «avatar» (initial med valgt farge).
- **Legg til**-knapp

#### Rediger barn
- Samme bunnpanel som for tillegging, men med forhåndsutfylte verdier.
- **Lagre endringer** erstatter «Legg til»-knappen.
- **Fjern [barnets navn]**: Rød knapp for å slette barnet (med bekreftelsesdialog).

---

### 6g. Data (kun admin)

- Viser antall barn registrert.
- **Slett all data**: Rød lenke som åpner en bekreftelsesdialog for å slette alle familiens data.

---

## 7. Redigering av skole-hendelser (delt komponent)

Når man trykker på en skolehendelse fra Hjem, Kalender eller Skole, åpnes et bunnpanel med:

- **Tittel**: Redigerbart tekstfelt
- **Beskrivelse**: Redigerbart tekstområde
- **Kategori**: Dropdown (Skoletime, Lekse, Påminnelse, Informasjon)
- **Dag**: Dropdown med ukens dager (kun på Skole-siden)
- **Fullfør-knapp** (kun for lekser): Merker leksen som fullført eller ufullført
- **Lagre endringer**: Blå knapp
- **Slett hendelse**: Rød knapp
- **Avbryt**: Grå knapp

---

## 8. Google Callback (`/google-callback`)

### Hva brukeren ser
En kort mellomside som vises mens Google-tilkoblingen fullføres:
- Animert spinner
- Teksten «Kobler til Google...»

Brukeren sendes automatisk videre til Innstillinger etter et par sekunder – enten med en suksessindikasjon eller en feilindikasjon.

---

## 9. Generelle funksjoner

### Sanntidssynkronisering
All data synkroniseres i sanntid via Firestore. Endringer gjort på én enhet (telefon, nettbrett, PC) vises umiddelbart på alle andre enheter som er innlogget i samme husstand.

### PWA-støtte
Appen kan installeres som en webapp på telefonen:
- Fungerer offline (grunnleggende visning)
- Push-varsler (på støttede enheter)
- Automatisk oppdatering med varselsbanner

### Mobiloptimalisert
- Hele appen er designet for mobilbruk først (iPhone/Android).
- Touch-vennlige knapper og sveipebevegelser.
- Sikre avstander for sikkert område (notch, hjemindikator).
- Bunn-navigasjon tar hensyn til safe-area-inset.

### Autentisering
- Firebase Authentication med Google-innlogging.
- ID-token sendes automatisk med alle API-forespørsler.
- Automatisk redirect til innloggingssiden hvis token utløper.

### Språk
Hele brukergrensesnittet er på norsk (bokmål), inkludert alle feilmeldinger, knappetekster og tomme tilstander.

### Datoformat
- Internt: ISO-format (YYYY-MM-DD)
- Visning til bruker: Norsk format (DD.MM.ÅÅÅÅ) og dagnavn (mandag, tirsdag osv.)
