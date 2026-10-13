# Clinician check: new clinical content in ATLAS v3

This list holds every clinical fact written new for ATLAS v3, and every scripted counterpart message for every branch, so that a clinician can check them before the first invitation goes out. All patients, clinicians and figures are fictional. The DPS is the fictional DPS Skjærgården. Generated from the content files in `app/src/content/`, so the Norwegian text below is the text the app shows.

How to read the tables:

- **Role** is the side the text appears on. **Branch** is the path through the case that shows it; «Uten ATLAS» is the case-only state, «Med ATLAS» the ATLAS view.
- **Source**: *prototype* is the design tool's prototype (`app-data.md`), *vault* is the vault vignette bank or the old apps (`content.md`), *new* is written for v3. A reused string is listed here when it is a scripted counterpart, a reading or a briefing, or when a date in it moved; `app/src/content/sources.json` records every reused string with its exact original, and `app/scripts/check-content.mjs` checks before every build that the declared substitutions below still reproduce it.
- **Placements** are shown here in the words the band shows («Systemets lesning: midt i gråsonen.»), with the internal value in brackets.
- Placements are kept on a 0 to 100 scale in the data (0 clearly outside the DPS criteria, 100 clearly within). The app never shows the number.
- The clinician checks each row for clinical plausibility and Norwegian health-service usage, and marks what to change.

## Tables by case

### Kari Nordli (V1)

| Vignette | Role | Branch | Where it shows | Text (Norwegian) | Source (prototype, vault or new) |
|---|---|---|---|---|---|
| V1 | GP | All | Historikk | 2026-03-17: Selvrapport mottatt før kontroll (PHQ-9 14) | prototype; date moved from 2026-03-10 |
| V1 | GP | All | Selvrapport, date | 2026-03-17 | prototype; date moved from 2026-03-10 |
| V1 | GP | All | Legemidler, period | 2020 til 2021 | prototype (dash written as «til») |
| V1 | GP | All | Profil, Tidligere behandling | Rask psykisk helsehjelp, 6 uker, uten bedring. Sertralin 2020 til 2021. | prototype (dash written as «til») |
| V1 | GP | All | Profil, Legemidler | Ingen aktive | new (from the medicines list) |
| V1 | GP | All | Ny henvisning, Risikovurdering (from the note) | (empty: the note does not mention risk) | new (the draft starts empty where the note is silent) |
| V1 | GP | Henvis, Send henvisning | Oppsummering and band, DPS marker | «DPS, inntak plasserte saken: i gråsonen, nærmest utenfor.» (44 in the data) | new (canon: the grey zone, leaning outside) |
| V1 | GP | Henvis, Send henvisning | Dialog, DPS «Be om mer informasjon», 2026-03-23 | Inntaksteamet ber om mer informasjon før henvisningen vurderes. Har Kari hatt depressive episoder tidligere? Hvordan er søvn og matlyst nå? | new |
| V1 | GP | After the GP reply, or with no reply | Dialog, DPS «Rett til helsehjelp», 2026-03-26 | Henvisningen er vurdert. Kari har rett til nødvendig helsehjelp og blir kalt inn til første samtale innen fristen. | new |
| V1 | GP | Behold, or Henvis then Lagre utkast | Din plan | (no DPS text: a plan in general practice, then the summary; no referral is sent) | canon (branch rule) |
| V1 | DPS | All | Henvisningen, Risikovurdering | Selvmordsrisikovurdering gjennomført. Ingen akutt selvmordsfare. Ingen voldsrisiko identifisert. | vault |
| V1 | DPS | All | Henvisningen, Spørsmål til DPS | Ønsker spesialistvurdering for å avklare diagnostisk bilde og behandlingsbehov. | vault |
| V1 | DPS | Med ATLAS | Hva fastlegen var usikker på | Tags: Diagnostisk, Terskel. Trygghet: Middels. «Usikker på om dette er en reaktiv tilpasningsforstyrrelse eller en begynnende moderat depressiv episode. Funksjonsfallet er til stede, men mildt. Manglende respons på kommunalt tilbud taler for spesialistvurdering, men kort varighet og tydelig reaktiv komponent taler mot.» On the band, after DPS has placed the case: «Henvisende fastlege plasserte saken: i gråsonen, nærmest utenfor.» (46 in the data) | prototype |
| V1 | DPS | All | Mottatte henvisninger, frist | Mottatt 2026-03-17, frist 2026-03-31 | prototype; date moved from 2026-03-24 |
| V1 | DPS | «Be om mer informasjon» | Dialog, fastlegens svar, 2026-03-20 | Kari hadde en depressiv episode i 2020, behandlet med sertralin 50 mg hos tidligere fastlege, med god effekt. Nå våkner hun tidlig, ofte rundt klokka fire, og har mindre matlyst enn vanlig. Hun er fortsatt 50 % sykemeldt og har ikke selvmordstanker. | new |
| V1 | DPS | «Retur med råd» (also after a request) | Dialog, fastlegens kvittering, 2026-03-20 | Takk for tilbakemeldingen. Rådene er notert, og Kari følges opp videre hos fastlegen. | new |
| V1 | DPS | «Rett til helsehjelp» (also after a request) | Oppsummering | (no GP text: the thread ends) | canon (branch rule) |
| V1 | GP | Med ATLAS, after the GP has placed the case | Systemets lesning | «Systemets lesning: midt i gråsonen.» Nær midten. Liknende henvisninger er vurdert ulikt. Resonnement: Kilder: notat, selvrapport, legemiddelliste. Varighet over tre måneder og manglende effekt av kommunalt tilbud ligger nær kriteriene. Mildt funksjonsfall og en tydelig utløsende hendelse ligger lenger fra. Risikovurdering er ikke omtalt i notatet. Setningen om liknende henvisninger er også skrevet for saken. Det finnes ingen ekte tall bak den. (50 in the data) | prototype, with a sentence added for v3: «Setningen om liknende henvisninger er også skrevet for saken. Det finnes ingen ekte tall bak den.» |
| V1 | DPS | Med ATLAS, after DPS has placed the case | Systemets lesning | «Systemets lesning: midt i gråsonen.» Nær midten. Liknende henvisninger er vurdert ulikt. Resonnement: Kilder: henvisningen og det vedlagte notatet. Varighet over tre måneder og manglende effekt av kommunalt tilbud ligger nær kriteriene. Mildt funksjonsfall og en tydelig utløsende hendelse ligger lenger fra. Setningen om liknende henvisninger er også skrevet for saken. Det finnes ingen ekte tall bak den. (50 in the data) | new (DPS sources: the referral and the attached note) |
| V1 | GP | Before the case | Briefing (GP), oppgave | Du er Karis fastlege. Hun kommer til kontroll kl. 09:00 og har fylt ut selvrapporten før timen. Les notatet og bestem om du vil henvise til DPS. | new |
| V1 | GP | Before the case | Briefing (GP), Hvem | Kari Nordli, 34 år. Nedstemt i fire måneder, PHQ-9 14. Gjennomgår skilsmisse og har nylig flyttet. | prototype |
| V1 | GP | Before the case | Briefing (GP), Situasjonen | 50 % sykemeldt i to uker. Rask psykisk helsehjelp i seks uker uten bedring. God effekt av sertralin for fem år siden. | prototype |
| V1 | GP | Before the case | Briefing (GP), Hvorfor denne saken | Kari har en tydelig utløsende hendelse, og plagene har vart i fire måneder uten bedring i det kommunale tilbudet. | new |
| V1 | GP | Before the case | Briefing (GP), Utgangspunkt | Kari fylte ut selvrapporten før timen. | new |
| V1 | DPS | Before the case | Briefing (DPS), oppgave | Du er i inntaksteamet ved DPS Skjærgården. Henvisningen for Kari har kommet inn. Les den og velg et utfall. | new |
| V1 | DPS | Before the case | Briefing (DPS), Hva du får | Henvisningen fra fastlegen, med konsultasjonsnotatet som vedlegg. | new |
| V1 | DPS | Before the case | Briefing (DPS), Hva du ikke får | Fastlegens navn eller andre henvisninger fra samme lege. | prototype |
| V1 | DPS | Before the case | Briefing (DPS), Frist | Vurderingsfristen er ti virkedager etter mottak: 31. mars 2026. | prototype (date moved from 2026-03-24, 2026-03-31) |
| V1 | GP | After the case | Oppsummering, Hva skjedde | {{plassering}} Systemets lesning lå nær midten. Fastlegens beslutning: {{beslutning}}. Fastlegens trygghet: {{trygghet}}. Utfall: {{utfall}}. | new ({{…}} is filled from the participant's own choices; the generated sentences are in the last table) |
| V1 | DPS | After the case | Oppsummering, Hva skjedde | {{plassering}} Fastlegens trygghet for henvisningen var {{trygghet}}. Utfall: {{utfall}}. | new ({{…}} is filled from the participant's own choices; the generated sentences are in the last table) |

### Erlend Bakken (V3)

| Vignette | Role | Branch | Where it shows | Text (Norwegian) | Source (prototype, vault or new) |
|---|---|---|---|---|---|
| V3 | Both | All | Patient header, fødselsnummer | 030783 ····· | new (the prototype's 030784 gives age 41 on 2026-03-17; the canon age is 42) |
| V3 | GP | All | Historikk | 2026-02-13: Rask psykisk helsehjelp avsluttet etter ti timer, begrenset effekt | prototype; date moved from 2026-02-14 |
| V3 | GP | All | Historikk | 2025-10-29: Henvisning til DPS sendt | prototype; date moved from 2025-10-28 |
| V3 | GP | All | Legemidler, period | 2025-12 til nå | prototype (open-ended dash written as «til nå») |
| V3 | GP | All | Profil, Legemidler | 1 aktivt: escitalopram 10 mg | new (from the medicines list) |
| V3 | GP | All | Profil, Henvisninger | Henvist 29. oktober 2025, avslått 12. november 2025 | new (canon dates) |
| V3 | Both | Med ATLAS | Tidligere henvisning (card) | Tidligere henvisning. Sendt 29. oktober 2025. Svar 12. november 2025. Avslått. «Pasienten kan behandles adekvat i primærhelsetjenesten.» | prototype; date moved from 2025-10-28; the prototype's added line «Ingen tilbakemelding på hva som manglet …» is removed (it read as ATLAS judging the DPS team) |
| V3 | GP | Uten ATLAS | Brev fra DPS, 2025-11-12 | Avslag på henvisning: Pasienten kan behandles adekvat i primærhelsetjenesten. | prototype (the one sentence); title new |
| V3 | GP | All | Ny henvisning, Funksjonsfall | (empty: the note does not mention function; the self-report does) | canon (the draft starts empty where the note is silent) |
| V3 | GP | Send henvisning | Dialog, DPS «Rett til helsehjelp», 2026-03-25 | Henvisningen er vurdert. Erlend har rett til nødvendig helsehjelp og blir kalt inn til første samtale innen fristen. Then a list: Varighet: angst med panikkanfall flere ganger i uken i åtte måneder. / Alvorlighet: GAD-7 17. / Tidligere behandling: kognitiv terapi i Rask psykisk helsehjelp og escitalopram, med begrenset effekt. | new |
| V3 | GP | Lagre utkast | Din plan | (no DPS text: no referral is sent; a plan in general practice, then the summary) | canon (branch rule) |
| V3 | DPS | All | Henvisningen, Funksjonsfall | 100 % sykemeldt i seks uker. Ifølge selvrapporten ønsker han hjelp til å klare å handle og kjøre bil igjen. | new |
| V3 | DPS | All | Henvisningen, Spørsmål til DPS | Ny vurdering etter avslaget 12. november 2025. Panikkanfallene vedvarer etter ti timer kognitiv terapi og escitalopram. Har Erlend rett til nødvendig helsehjelp i spesialisthelsetjenesten nå? | new |
| V3 | DPS | Uten ATLAS and Med ATLAS | Line from DPS's own record | Tidligere henvisning avslått 12. november 2025 | new (canon wording) |
| V3 | DPS | Med ATLAS | Hva fastlegen var usikker på | Tags: Terskel, Epistemisk. Trygghet: Middels. «Usikker på om DPS vil vurdere dette annerledes enn i november. Effekten av terapi og escitalopram er begrenset, men ikke fraværende. Vet ikke hva som manglet i forrige henvisning.» On the band, after DPS has placed the case: «Henvisende fastlege plasserte saken: innenfor, nær gråsonen.» (62 in the data) | prototype |
| V3 | DPS | «Be om mer informasjon» | Dialog, fastlegens svar, 2026-03-20 | Erlend har vært 100 % sykemeldt i seks uker. Panikkanfallene kommer flere ganger i uken, og han ønsker hjelp til å klare å handle og kjøre bil igjen. Selvmordstanker er avkreftet, og han bruker ikke rusmidler. | new |
| V3 | DPS | «Retur med råd» (also after a request) | Dialog, fastlegens kvittering, 2026-03-20 | Takk for tilbakemeldingen. Rådene er notert, og Erlend følges opp videre hos fastlegen. | new |
| V3 | DPS | «Rett til helsehjelp» (also after a request) | Oppsummering | (no GP text: the thread ends) | canon (branch rule) |
| V3 | GP | Med ATLAS, after the GP has placed the case | Systemets lesning | «Systemets lesning: i gråsonen, nærmest innenfor.» Til høyre for midten. Liknende henvisninger er oftere tatt inn. Resonnement: Kilder: notat, selvrapport, legemiddelliste, tidligere henvisning. Varighet på åtte måneder og to behandlingsforsøk med begrenset effekt ligger nær kriteriene. Funksjonsfall er ikke beskrevet i notatet, bare i selvrapporten. Setningen om liknende henvisninger er også skrevet for saken. Det finnes ingen ekte tall bak den. (56 in the data) | prototype, with a sentence added for v3: «Setningen om liknende henvisninger er også skrevet for saken. Det finnes ingen ekte tall bak den.» |
| V3 | DPS | Med ATLAS, after DPS has placed the case | Systemets lesning | «Systemets lesning: i gråsonen, nærmest innenfor.» Til høyre for midten. Liknende henvisninger er oftere tatt inn. Resonnement: Kilder: henvisningen, det vedlagte notatet og den tidligere henvisningen. Varighet på åtte måneder og to behandlingsforsøk med begrenset effekt ligger nær kriteriene. Setningen om liknende henvisninger er også skrevet for saken. Det finnes ingen ekte tall bak den. (56 in the data) | new (DPS sources: the referral, the attached note and the earlier referral) |
| V3 | GP | Before the case | Briefing (GP), oppgave | Du er Erlends fastlege og skal skrive en ny henvisning til DPS. Den forrige ble avslått i november. Les notatet og bestem om du vil sende en ny henvisning. | new |
| V3 | GP | Before the case | Briefing (GP), Hvem | Erlend Bakken, 42 år. Angst med panikkanfall i åtte måneder. 100 % sykemeldt. | prototype |
| V3 | GP | Before the case | Briefing (GP), Situasjonen | Henvist i oktober og avslått i november med én setning. Siden har han fått kognitiv terapi og escitalopram, med begrenset effekt. | prototype |
| V3 | GP | Before the case | Briefing (GP), Hvorfor denne saken | Det forrige avslaget sa ikke hva som manglet, og plagene har vart siden. | new |
| V3 | GP | Before the case | Briefing (GP), Utgangspunkt | Erlend fylte ut selvrapporten før timen. | new |
| V3 | GP | Before the case | Briefing (GP), Merk | Kliniske detaljer for Erlend er utkast skrevet for prototypen og må kvalitetssikres av klinikere. | prototype |
| V3 | DPS | Before the case | Briefing (DPS), oppgave | Du er i inntaksteamet ved DPS Skjærgården. Erlend er henvist på nytt etter et avslag i november. Les henvisningen og velg et utfall. | new |
| V3 | DPS | Before the case | Briefing (DPS), Hva du får | Den nye henvisningen fra fastlegen, med konsultasjonsnotatet som vedlegg. Fra egen journal: en linje om at en tidligere henvisning ble avslått 12. november 2025. | new |
| V3 | DPS | Before the case | Briefing (DPS), Hva du ikke får | Fastlegens navn eller andre henvisninger fra samme lege. | prototype |
| V3 | DPS | Before the case | Briefing (DPS), Frist | Vurderingsfristen er ti virkedager etter mottak: 31. mars 2026. | prototype (date moved from 2026-03-24, 2026-03-31) |
| V3 | DPS | Before the case | Briefing (DPS), Merk | Kliniske detaljer for Erlend er utkast skrevet for prototypen og må kvalitetssikres av klinikere. | prototype |
| V3 | GP | After the case | Oppsummering, Hva skjedde | Fastlegen skrev en ny henvisning etter avslaget 12. november 2025. {{plassering}} Fastlegens beslutning: {{beslutning}}. Fastlegens trygghet: {{trygghet}}. Utfall: {{utfall}}. | new ({{…}} is filled from the participant's own choices; the generated sentences are in the last table) |
| V3 | DPS | After the case | Oppsummering, Hva skjedde | {{plassering}} Den forrige henvisningen ble avslått 12. november 2025 med én setning. Utfall: {{utfall}}. | new ({{…}} is filled from the participant's own choices; the generated sentences are in the last table) |

### Astrid Holm (V4)

| Vignette | Role | Branch | Where it shows | Text (Norwegian) | Source (prototype, vault or new) |
|---|---|---|---|---|---|
| V4 | GP | All | Notat, 2026-03-02 | Konsultasjon. Astrid kommer tre uker etter et samlivsbrudd. Siden da sover hun dårlig, gråter mye og har raske svingninger i humøret. PHQ-9 i dag: 12.<br><br>Har hatt flere liknende kriser i nære relasjoner de siste årene. Funksjonsfall de siste tre ukene, med konsentrasjonsvansker og flere fraværsdager på jobb. Har trukket seg fra venner. Ingen tidligere behandling i spesialisthelsetjenesten, og kommunale tilbud er ikke prøvd.<br><br>Selvmordsrisiko vurdert. Ingen aktuelle selvmordstanker eller planer. Henvises til DPS med spørsmål om emosjonelt ustabile personlighetstrekk. | new |
| V4 | GP | All | Selvrapport, 2026-03-02 | PHQ-9, sum 12. Hvor lenge har du hatt det slik? Tre uker, siden bruddet. Klarer du arbeidet som før? Delvis, flere fraværsdager. Har du hatt tanker om å skade deg selv? Nei. Hva ønsker du hjelp til? Å slutte å havne i de samme krisene. | new answers (questions from the prototype) |
| V4 | GP | All | Legemidler | Ingen faste legemidler. | new |
| V4 | GP | All | Historikk | 2026-03-16: Svar fra DPS: henvisningen er avslått. | new |
| V4 | GP | All | Historikk | 2026-03-02: Konsultasjon: krise etter samlivsbrudd. Henvist til DPS. | new |
| V4 | GP | All | Historikk | 2026-03-02: Selvrapport mottatt før konsultasjon (PHQ-9 12) | new |
| V4 | GP | All | Historikk | 2024-09-17: Konsultasjon: krise etter konflikt i nær relasjon. Samtaler hos fastlegen i to uker. | new |
| V4 | GP | All | Historikk | 2022-11-08: Konsultasjon: krise etter samlivsbrudd. Kort oppfølging hos fastlegen. | new |
| V4 | GP | All | Profil, Henvisninger | Henvist 2. mars 2026, svar 16. mars 2026: avslått | new |
| V4 | GP | Uten ATLAS | Brev fra DPS, 2026-03-16 | Svar på henvisning: Henvisningen for Astrid Holm, mottatt 2. mars 2026, er vurdert.<br><br>Henvisningen er avslått og returneres til henvisende fastlege. | new |
| V4 | Both | Med ATLAS | Retur med råd, 2026-03-16: årsaker | Situasjonell krise, Funksjonsnedgang for kort varighet, Kommunalt tilbud ikke utprøvd | prototype (date moved from 2026-03-15) |
| V4 | Both | Med ATLAS | Retur med råd: forklaring | Henvisningen er avslått og returneres til henvisende fastlege. Presentasjonen er forenlig med emosjonelt ustabile personlighetstrekk, men den nåværende krisen er primært situasjonell (samlivsbrudd). Funksjonsnedgangen er av nylig dato (tre uker) og møter ikke varighetskriteriet for spesialistbehandling ved denne presentasjonstypen. | prototype, with a new first sentence (the plain letter's decision) |
| V4 | Both | Med ATLAS | Retur med råd: råd | Forslag til oppfølging: kommunal psykolog med strukturert kriseoppfølging. Ny henvisning dersom funksjonen ikke bedres innen tre måneder, eller straks hvis risikofaktorer øker. | prototype |
| V4 | Both | Med ATLAS | Kriterier DPS vurderte som ikke oppfylt | Funksjonsnivå: Funksjonsfall til stede, men av kort varighet (3 uker). | prototype |
| V4 | Both | Med ATLAS | Kriterier DPS vurderte som ikke oppfylt | Varighet: For kort til å skille mellom tilpasningsreaksjon og vedvarende lidelse. | prototype |
| V4 | Both | Med ATLAS | Kriterier DPS vurderte som ikke oppfylt | Behandlingsnytte: Kommunalt kriseoppfølgingstilbud er ikke forsøkt. | prototype |
| V4 | GP | The GP sends a question | Dialog, DPS svar, 2026-03-19 | Godt spørsmål. Det kroniske mønsteret er relevant og ville styrket henvisningen. For denne typen presentasjoner er det nyttig å skille mellom aktuell krise (situasjonell, kort varighet) og underliggende mønster (gjentakende interpersonlige kriser). Med konkrete eksempler over tid kunne vurderingen blitt en annen. En tidslinje over tidligere kriser er nyttig i en eventuell ny henvisning. | prototype; date new (canon) |
| V4 | GP | No question sent | Din plan | (no DPS text: the plan follows) | canon (branch rule) |
| V4 | GP and DPS | GP: «Henvis på nytt» (carried into the new draft). DPS: all | Henvisningen sendt 2026-03-02, Aktuelt og problemstilling | Krise etter samlivsbrudd for tre uker siden, med søvnvansker, gråt og raske svingninger i humøret. PHQ-9: 12. Har hatt flere liknende kriser i nære relasjoner de siste årene. Spørsmål om emosjonelt ustabile personlighetstrekk. | new |
| V4 | GP and DPS | GP: «Henvis på nytt» (carried into the new draft). DPS: all | Henvisningen sendt 2026-03-02, Tidligere behandling | Ingen tidligere behandling i spesialisthelsetjenesten. Kommunale tilbud er ikke prøvd. | new |
| V4 | GP and DPS | GP: «Henvis på nytt» (carried into the new draft). DPS: all | Henvisningen sendt 2026-03-02, Funksjonsfall | Funksjonsfall de siste tre ukene, med konsentrasjonsvansker og flere fraværsdager på jobb. Har trukket seg fra venner. | new |
| V4 | GP and DPS | GP: «Henvis på nytt» (carried into the new draft). DPS: all | Henvisningen sendt 2026-03-02, Risikovurdering | Selvmordsrisiko er vurdert. Ingen aktuelle selvmordstanker eller planer. | new |
| V4 | GP and DPS | GP: «Henvis på nytt» (carried into the new draft). DPS: all | Henvisningen sendt 2026-03-02, Spørsmål til DPS | Ønsker vurdering og eventuell utredning av mulige emosjonelt ustabile personlighetstrekk, med tanke på behandling i spesialisthelsetjenesten. | new |
| V4 | DPS | Uten ATLAS | Brev: Henvisning og svar, 2026-03-16 | (the referral sections above, then the reply part, identical to the GP's plain letter: «Henvisningen for Astrid Holm, mottatt 2. mars 2026, er vurdert.<br><br>Henvisningen er avslått og returneres til henvisende fastlege.») | new |
| V4 | DPS | Uten ATLAS | Spørsmål fra fastlegen, 2026-03-17 | Gjelder svaret på henvisningen for Astrid Holm. Brevet sier at henvisningen er avslått, men ikke hva vurderingen bygger på. Pasienten har hatt gjentakende kriser i nære relasjoner over flere år. Hva skal til for at en ny henvisning blir vurdert annerledes? | new |
| V4 | DPS | Med ATLAS | Dialog, spørsmål fra fastlegen, 2026-03-17 | Takk for tilbakemeldingen. Jeg forstår vurderingen om at funksjonsnedgangen er av kort varighet. Mitt spørsmål: pasienten har et mønster med gjentakende interpersonlige kriser over flere år, selv om det nåværende funksjonsfallet er nylig. Bør dette kroniske mønsteret ha vært dokumentert annerledes i henvisningen for at det skulle vektes i vurderingen? | prototype |
| V4 | GP | Before the case | Briefing (GP), oppgave | Du er Astrids fastlege. DPS har svart på henvisningen du sendte 2. mars 2026, og Astrid har telefontime kl. 10:15. Les svaret og bestem hva du gjør videre. | new |
| V4 | GP | Before the case | Briefing (GP), Hvem | Astrid Holm, 28 år. Henvist etter samlivsbrudd og tre uker med funksjonsfall. | prototype |
| V4 | GP | Before the case | Briefing (GP), Situasjonen | DPS svarte 16. mars 2026 at henvisningen er avslått. | new |
| V4 | GP | Before the case | Briefing (GP), Hvorfor denne saken | Henvisningen gjaldt gjentakende kriser i nære relasjoner over flere år, og den aktuelle krisen etter et samlivsbrudd. | new |
| V4 | GP | Before the case | Briefing (GP), Utgangspunkt | Saken starter etter at svaret fra DPS er mottatt. | prototype (date moved from Vignetten) |
| V4 | DPS | Before the case | Briefing (DPS), oppgave | Du er i inntaksteamet ved DPS Skjærgården. Fastlegen har sendt et spørsmål om svaret på Astrids henvisning. Les spørsmålet og svar fastlegen. | new |
| V4 | DPS | Before the case | Briefing (DPS), Hva du får | Henvisningen fra fastlegen, svaret inntaksteamet sendte 16. mars 2026, og et spørsmål fra fastlegen om svaret. | new |
| V4 | DPS | Before the case | Briefing (DPS), Hva du ikke får | Fastlegens navn eller andre henvisninger fra samme lege. | prototype |
| V4 | DPS | Before the case | Briefing (DPS), Svartid | Svar forventes innen 5 til 10 virkedager. Alle meldinger lagres i henvisningshistorikken. | prototype (dash written as «til») |
| V4 | GP | After the case | Oppsummering, Hva skjedde | DPS avslo henvisningen 16. mars 2026 og returnerte den med tre årsaker, en forklaring og råd. Fastlegen leste returen. Fastlegens beslutning: {{beslutning}}. Plan: {{utfall}}. | new ({{…}} is filled from the participant's own choices; the generated sentences are in the last table) |
| V4 | DPS | After the case | Oppsummering, Hva skjedde | Inntaksteamet returnerte henvisningen 16. mars 2026 med tre årsaker, en forklaring og råd. {{sporsmal}} {{svar}} | new ({{…}} is filled from the participant's own choices; the generated sentences are in the last table) |

### Torbjørn Viken (V2, optional, GP only)

| Vignette | Role | Branch | Where it shows | Text (Norwegian) | Source (prototype, vault or new) |
|---|---|---|---|---|---|
| V2 | GP | Before the case | Briefing (GP), oppgave | Du er Torbjørns fastlege. Han kommer til en time som øyeblikkelig hjelp kl. 11:45. Les notatet og bestem om du vil henvise til DPS. | new |
| V2 | GP | Before the case | Briefing (GP), Hvem | Torbjørn Viken, 52 år. Akutte psykotiske symptomer i to uker. | new |
| V2 | GP | Before the case | Briefing (GP), Situasjonen | Hører stemmer som sier at han må forlate hjemmet, og tror at naboene tar opp det han gjør. Klarer ikke å ivareta seg selv. Ingen kjent psykisk lidelse og ingen rusmiddelbruk. | new |
| V2 | GP | Before the case | Briefing (GP), Hvorfor denne saken | Symptomene har kommet i løpet av to uker, og notatet beskriver dem og risikovurderingen. | new |
| V2 | GP | Before the case | Briefing (GP), Utgangspunkt | Notatet er skrevet i timen. Det finnes ingen selvrapport. | new |
| V2 | GP | All | Timeliste, 11:45 | Øyeblikkelig hjelp | new |
| V2 | GP | All | Notat, 2026-03-17 | Øyeblikkelig hjelp. Torbjørn har de siste to ukene hørt stemmer som sier at han må forlate hjemmet sitt. Han tror at naboene tar opp det han gjør. Talen er usammenhengende i konsultasjonen.<br><br>Markert funksjonsfall de siste to ukene. Ingen kjent psykisk lidelse og ingen tidligere behandling. Ingen rusmiddelbruk.<br><br>Selvmords- og voldsrisikovurdering gjennomført: ingen umiddelbar fare for selvskading, men klarer ikke å ivareta seg selv. | new (facts from vault V2) |
| V2 | GP | All | Selvrapport | Ingen selvrapport. Timen ble satt opp som øyeblikkelig hjelp samme dag. | new |
| V2 | GP | All | Legemidler | Ingen faste legemidler. | new |
| V2 | GP | All | Historikk | 2026-03-17: Time som øyeblikkelig hjelp, satt opp samme dag | new |
| V2 | GP | All | Historikk | 2025-09-16: Konsultasjon: ryggsmerter. Ingen psykiske plager beskrevet. | new |
| V2 | GP | All | Profil, Tidligere behandling | Ingen kjent psykisk lidelse eller behandling | new (facts from vault V2) |
| V2 | GP | Med ATLAS, after the GP has placed the case | Systemets lesning | «Systemets lesning: klart innenfor kriteriene.» Klart innenfor. Liknende henvisninger er nesten alltid tatt inn. Resonnement: Kilder: notat, legemiddelliste. Akutte psykotiske symptomer, markert funksjonsfall og at pasienten ikke klarer å ivareta seg selv ligger nær kriteriene. Ingen opplysninger i notatet ligger langt fra dem. Setningen om liknende henvisninger er også skrevet for saken. Det finnes ingen ekte tall bak den. (92 in the data) | new (vault: "should show clearly within criteria") |
| V2 | GP | Henvis | Ny henvisning, Aktuelt og problemstilling (from the note) | Akutte psykotiske symptomer i to uker: hører stemmer som sier at han må forlate hjemmet sitt, tror at naboene tar opp det han gjør, og har usammenhengende tale. Ingen rusmiddelbruk. | new (facts from vault V2) |
| V2 | GP | Henvis | Ny henvisning, Tidligere behandling (from the note) | Ingen kjent psykisk lidelse og ingen tidligere behandling. | new (facts from vault V2) |
| V2 | GP | Henvis | Ny henvisning, Funksjonsfall (from the note) | Markert funksjonsfall de siste to ukene. Klarer ikke å ivareta seg selv. | new (facts from vault V2) |
| V2 | GP | Henvis | Ny henvisning, Risikovurdering (from the note) | Selvmords- og voldsrisikovurdering gjennomført: ingen umiddelbar fare for selvskading, men klarer ikke å ivareta seg selv. | new (facts from vault V2) |
| V2 | GP | Henvis, Send henvisning | Dialog | (no scripted DPS reply: the canon gives none) | canon |
| V2 | GP | After the case | Oppsummering, Hva skjedde | {{plassering}} Systemets lesning lå klart innenfor kriteriene. Fastlegens beslutning: {{beslutning}}. Fastlegens trygghet: {{trygghet}}. | new ({{…}} is filled from the participant's own choices; the generated sentences are in the last table) |

### To fastleger, Kari (V5, optional, both roles)

| Vignette | Role | Branch | Where it shows | Text (Norwegian) | Source (prototype, vault or new) |
|---|---|---|---|---|---|
| V5 | Both (GP-side view) | All | Fastlege A, erfaring | To års erfaring som fastlege. | new (facts from vault V5) |
| V5 | Both (GP-side view) | All | Fastlege A, merknad | Begrenset erfaring med gråsonesaker. Henviser for å være på den sikre siden når hun er usikker på egen vurdering. | new (facts from vault V5) |
| V5 | Both (GP-side view) | All | Fastlege A, Mitt henvisningsmønster | 1. april 2024 til 17. mars 2026: 8 henvisninger; Rett til helsehjelp 5, Retur med råd 3, avslått uten begrunnelse 0, venter 0. Returårsaker per gang de er oppgitt: Funksjonsnedgang for kort varighet 2, Kommunalt tilbud ikke utprøvd 2, Utilstrekkelig informasjon 1. Per kvartal: 1, 0, 1, 1, 1, 2, 1, 1. | new (vault V5: A 8 referrals, 5 accepted, 3 refused; B over 200 referrals, declining rate) |
| V5 | Both (GP-side view) | All | Fastlege B, erfaring | 22 års erfaring som fastlege, 15 av dem i samme kommune. Over 200 henvisninger til DPS i alt. | new (facts from vault V5) |
| V5 | Both (GP-side view) | All | Fastlege B, merknad | Kjenner flere spesialister personlig. Har blitt mer frustrert over systemet, har redusert henvisningsraten de siste fem årene og behandler oftere pasientene selv. | new (facts from vault V5) |
| V5 | Both (GP-side view) | All | Fastlege B, Mitt henvisningsmønster | 1. april 2024 til 17. mars 2026: 14 henvisninger; Rett til helsehjelp 12, Retur med råd 1, avslått uten begrunnelse 0, venter 1. Returårsaker per gang de er oppgitt: Utilstrekkelig informasjon 1. Per kvartal: 3, 2, 2, 2, 2, 1, 1, 1. | new (vault V5: A 8 referrals, 5 accepted, 3 refused; B over 200 referrals, declining rate) |

### Sofie Lund (practice patient for the tours)

| Vignette | Role | Branch | Where it shows | Text (Norwegian) | Source (prototype, vault or new) |
|---|---|---|---|---|---|
| Practice | GP | Before the case | Briefing (GP), oppgave | Du er Sofies fastlege. Hun kommer til konsultasjon kl. 09:30 og har fylt ut selvrapporten før timen. Les notatet og bestem om du vil henvise til DPS. | new |
| Practice | GP | Before the case | Briefing (GP), Hvem | Sofie Lund, 39 år. Søvnvansker og stress i tre måneder, etter en omorganisering på jobben. | new |
| Practice | GP | Before the case | Briefing (GP), Situasjonen | PHQ-9 8 og GAD-7 9. I full stilling. Ingen tidligere behandling. | new |
| Practice | GP | Before the case | Briefing (GP), Hvorfor denne saken | Sofie er øvingspasient og brukes bare i omvisningen. | new |
| Practice | GP | Before the case | Briefing (GP), Utgangspunkt | Sofie fylte ut selvrapporten før timen. | new |
| Practice | DPS | Before the case | Briefing (DPS), oppgave | Du er i inntaksteamet ved DPS Skjærgården. Henvisningen for Sofie har kommet inn. Les den og velg et utfall. | new |
| Practice | DPS | Before the case | Briefing (DPS), Hva du får | Henvisningen fra fastlegen, med konsultasjonsnotatet som vedlegg. | new |
| Practice | DPS | Before the case | Briefing (DPS), Hva du ikke får | Fastlegens navn eller andre henvisninger fra samme lege. | prototype |
| Practice | DPS | Before the case | Briefing (DPS), Frist | Vurderingsfristen er ti virkedager etter mottak: 31. mars 2026. | prototype (date moved from 2026-03-24, 2026-03-31) |
| Practice | GP | Tour | Notat, 2026-03-17 | Konsultasjon. Sofie beskriver innsovningsvansker og oppvåkninger om natten i tre måneder, etter en omorganisering på jobben i desember. Hun kjenner seg stresset og anspent og grubler over arbeidsoppgavene om kvelden. PHQ-9 i dag: 8, GAD-7: 9.<br><br>I full stilling. Har sluttet å trene og orker mindre sammen med familien om kveldene.<br><br>Ingen tidligere psykiske plager eller behandling. Bruker ingen legemidler. | new |
| Practice | GP | Tour | Selvrapport, 2026-03-17 | PHQ-9, sum 8. GAD-7, sum 9. Hvor lenge har du hatt det slik? Omtrent tre måneder. Klarer du arbeidet som før? Ja, men det koster mer enn før. Har du hatt tanker om å skade deg selv? Nei. Hva ønsker du hjelp til? Å sove bedre. | new answers (questions from the prototype) |
| Practice | GP | Tour | Legemidler | Ingen legemidler. | new |
| Practice | GP | Tour | Historikk | 2026-03-17: Selvrapport mottatt før konsultasjon (PHQ-9 8, GAD-7 9) | new |
| Practice | GP | Tour | Systemets lesning | «Systemets lesning: i gråsonen, nærmest utenfor.» Til venstre for midten. Liknende henvisninger er oftere returnert med råd. Resonnement: Kilder: notat, selvrapport, legemiddelliste. Plager i tre måneder ligger nær kriteriet for varighet. Lette plager (PHQ-9 8, GAD-7 9), full stilling og ingen behandlingsforsøk ligger lenger fra kriteriene. Setningen om liknende henvisninger er også skrevet for saken. Det finnes ingen ekte tall bak den. (46 in the data) | new |
| Practice | DPS | Tour | Systemets lesning | «Systemets lesning: i gråsonen, nærmest utenfor.» Til venstre for midten. Liknende henvisninger er oftere returnert med råd. Resonnement: Kilder: henvisningen og det vedlagte notatet. Plager i tre måneder ligger nær kriteriet for varighet. Lette plager (PHQ-9 8, GAD-7 9), full stilling og ingen behandlingsforsøk ligger lenger fra kriteriene. Setningen om liknende henvisninger er også skrevet for saken. Det finnes ingen ekte tall bak den. (46 in the data) | new (DPS sources) |
| Practice | GP | Tour | Ny henvisning, Aktuelt og problemstilling (from the note) | Innsovningsvansker og oppvåkninger om natten i tre måneder, etter en omorganisering på jobben. Stress, anspenthet og grubling om kvelden. PHQ-9: 8, GAD-7: 9. | new |
| Practice | GP | Tour | Ny henvisning, Tidligere behandling (from the note) | Ingen tidligere psykiske plager eller behandling. | new |
| Practice | GP | Tour | Ny henvisning, Funksjonsfall (from the note) | I full stilling. Har sluttet å trene og orker mindre sammen med familien om kveldene. | new |
| Practice | GP | Tour | Ny henvisning, Risikovurdering | (empty: the note does not mention risk) | new (the draft starts empty where the note is silent) |
| Practice | GP | Tour (example of a structured return) | Retur med råd, 2026-03-24: årsaker | Kommunalt tilbud ikke utprøvd, Annen årsak | new |
| Practice | GP | Tour (example of a structured return) | Retur med råd: forklaring | Plagene er lette (PHQ-9 8, GAD-7 9), og Sofie er i full stilling. Ingen behandling er prøvd hos fastlegen eller i kommunen. | new |
| Practice | GP | Tour (example of a structured return) | Retur med råd: råd | Det kan være nyttig å prøve Rask psykisk helsehjelp, med vekt på søvn og stressmestring. En ny henvisning kan vurderes hvis plagene vedvarer etter et behandlingsforsøk. | new |
| Practice | GP | Tour (example of a structured return) | Kriterier DPS vurderte som ikke oppfylt | Symptomenes alvorlighetsgrad: PHQ-9 8 og GAD-7 9 tilsvarer lette plager. | new |
| Practice | GP | Tour (example of a structured return) | Kriterier DPS vurderte som ikke oppfylt | Tidligere behandling: Ingen behandlingsforsøk hos fastlegen eller i kommunen. | new |
| Practice | DPS | Tour | Henvisningen, Risikovurdering | Spurt om selvmordstanker: ingen. Selvmordsrisiko vurdert som lav. | new |
| Practice | DPS | Tour | Henvisningen, Spørsmål til DPS | Ønsker vurdering av om plagene gir rett til helsehjelp i spesialisthelsetjenesten, eller om videre oppfølging hos fastlegen er tilstrekkelig. | new |
| Practice | DPS | Tour | Hva fastlegen var usikker på | Tags: Terskel. Trygghet: Nokså lav. «Usikker på om plagene når terskelen for spesialistvurdering. Plagene har vart i tre måneder, men symptomtrykket er lett, og ingen behandling er prøvd.» On the band, after DPS has placed the case: «Henvisende fastlege plasserte saken: i gråsonen, nærmest utenfor.» (41 in the data) | new |
| Practice | DPS | Tour, «Be om mer informasjon» | Dialog, fastlegens svar, 2026-03-20 | Sofie sover i snitt fem timer per natt og har ingen selvmordstanker. Hun har ikke prøvd sovemedisiner eller kommunale tilbud. | new |
| Practice | DPS | Tour, «Retur med råd» | Dialog, fastlegens kvittering, 2026-03-20 | Takk for tilbakemeldingen. Sofie følges opp videre hos fastlegen. | new |

### Mitt henvisningsmønster and Delt oversikt (fictional figures, no vignette)

| Vignette | Role | Branch | Where it shows | Text (Norwegian) | Source (prototype, vault or new) |
|---|---|---|---|---|---|
| None | GP | All | Mitt henvisningsmønster | 1. april 2025 til 17. mars 2026: 24 henvisninger; Rett til helsehjelp 15, Retur med råd 5, avslått uten begrunnelse 1, venter 3. Returårsaker per gang de er oppgitt: Funksjonsnedgang for kort varighet 3, Utilstrekkelig informasjon 3, Kommunalt tilbud ikke utprøvd 2, Situasjonell krise 1, Annen årsak 1. Per kvartal: 6, 5, 7, 6. | canon |
| None | Both | All | Delt oversikt, Kalibrering | Mottatte henvisninger: 1 182; Rett til helsehjelp: 64 %; Retur med råd: 36 %; Henvisninger der DPS ba om mer informasjon: 14 %; Tid fra mottak til vurdering, median: 8 virkedager; Fastlegekontor i opptaksområdet: 27. Vanlige returårsaker: Utilstrekkelig informasjon 29 %, Kommunalt tilbud ikke utprøvd 26 %, Funksjonsnedgang for kort varighet 21 %, Situasjonell krise 14 %, Annen årsak 10 %. | new |
| None | Both | All | Delt oversikt, kriterieendringer, 2026-02-16 | Ved spørsmål om ADHD hos voksne ser inntaket nå etter opplysninger om symptomer før 12 års alder. Henvisninger uten slike opplysninger får oftere en forespørsel om mer informasjon. | new |
| None | Both | All | Delt oversikt, kriterieendringer, 2025-11-03 | Pasienter over 65 år med nyoppståtte psykiske plager vurderes etter de samme kriteriene som andre, i samarbeid med alderspsykiatrisk poliklinikk. | new |
| None | Both | All | Delt oversikt, kriterieendringer, 2025-06-10 | Ingen endringer i kriteriene. Inntaksteamet oppgir nå hvilket punkt i prioriteringsveilederen en retur bygger på. | new |
| None | Both | All | Delt oversikt, Dialog (DPS, inntak), 2026-02-18 | Etter endringen 16. februar 2026 får inntaksteamet fortsatt mange henvisninger om ADHD hos voksne som beskriver dagens vansker godt, men sier lite om barndommen. Opplysninger om symptomer før 12 års alder gjør vurderingen tryggere. | new |
| None | Both | All | Delt oversikt, Dialog (Fastlege), 2026-02-20 | Holder det med pasientens egen beskrivelse av barndommen, eller trengs opplysninger fra foreldre eller skole? Slike opplysninger er ofte vanskelige å skaffe. | new |
| None | Both | All | Delt oversikt, Dialog (DPS, inntak), 2026-02-25 | Pasientens egen beskrivelse er et godt utgangspunkt. Opplysninger fra andre gjør bildet tydeligere, men henvisningen vurderes også uten dem. Det kan være nyttig å legge ved et utfylt ASRS-skjema. | new |

### Generated sentences in the summaries (all cases)

| Vignette | Role | Branch | Where it shows | Text (Norwegian) | Source (prototype, vault or new) |
|---|---|---|---|---|---|
| V1, V2, V3 | GP | GP placed the case and did not move the marker | Oppsummering, Hva skjedde | Fastlegen plasserte saken før systemets lesning ble vist. | new |
| V1, V2, V3 | GP | GP moved the marker after the reading was shown | Oppsummering, Hva skjedde | Fastlegen plasserte saken før systemets lesning ble vist, og flyttet markøren etter at lesningen var vist. | new |
| V1, V2, V3 | GP | GP never placed the case | Oppsummering, Hva skjedde | Fastlegen plasserte ikke saken på båndet. | new |
| V1, V3 | DPS | DPS placed the case and did not move the marker | Oppsummering, Hva skjedde | Fastlegen og DPS plasserte saken hver for seg. Systemets lesning ble vist først etter at hver av dem hadde plassert saken. | new |
| V1, V3 | DPS | DPS moved the marker after the other markers were shown | Oppsummering, Hva skjedde | Fastlegen og DPS plasserte saken hver for seg. Systemets lesning ble vist først etter at hver av dem hadde plassert saken. DPS flyttet markøren etter at fastlegens markør og systemets lesning var vist. | new |
| V1, V3 | DPS | DPS never placed the case | Oppsummering, Hva skjedde | DPS plasserte ikke saken på båndet, så fastlegens markør og systemets lesning ble ikke vist. | new |
| V4 | DPS | The GP side asked about the return | Oppsummering, Hva skjedde | Fastlegen spurte om returen {{date}}. | new |
| V4 | DPS | DPS answered the GP's question | Oppsummering, Hva skjedde | DPS svarte i samme tråd. | new |
| V4 | DPS | DPS chose «Ikke svar nå» | Oppsummering, Hva skjedde | DPS svarte ikke på spørsmålet. | new |
| V4 | DPS | DPS chose «Ikke svar nå» | Oppsummering, title | Et spørsmål som ble stående | new |
| V4 | GP | GP saved the plan «Følg opp i allmennpraksis» | Oppsummering, Hva skjedde | følg opp i allmennpraksis | new |
| V4 | GP | GP saved «Henvis på nytt» and wrote no new referral | Oppsummering, Hva skjedde | henvis på nytt | new |
| V4 | GP | GP chose «Henvis på nytt» and sent the new referral | Oppsummering, Hva skjedde | henvis på nytt, og den nye henvisningen ble sendt | new |
| V4 | GP | GP chose «Henvis på nytt» and saved the new referral as a draft | Oppsummering, Hva skjedde | henvis på nytt, og det nye utkastet ble lagret | new |
| V4 | GP | GP sent the new referral after «Henvis på nytt» | Sendt | Den nye henvisningen er sendt. Saken slutter her i studien, uten svar fra DPS. | new |
| V1 | GP | GP replied to DPS's request (row «Svar til DPS») | Oppsummering, rows | Svarte i tråden | new |
| V1 | GP | GP chose «Ikke svar nå» (row «Svar til DPS») | Oppsummering, rows | Svarte ikke | new |
| V4 | GP | DPS answered the GP's question (row «Svar fra DPS») | Oppsummering, rows | Svarte i tråden | new |
| V4 | GP | DPS side chose «Ikke svar nå», review mode (row «Svar fra DPS») | Oppsummering, rows | Svarte ikke | new |
| V4 | DPS | GP side chose «Ikke spør nå», review mode | Oppsummering, DPS-vurdering | fastlegen spurte ikke om returen | new |
| V4 | DPS | GP side chose «Ikke spør nå», review mode | Oppsummering, title | En retur uten spørsmål | new |
| V1 | DPS | GP side chose «Ikke svar nå», review mode | Dialog med fastlegen | Fastlegen svarte ikke på forespørselen. | new |
| V1 | DPS | GP side chose «Ikke svar nå», review mode | Dialog med fastlegen, the final choice | Endelig vurdering | new |
| V1 | GP | GP chose «Ikke svar nå» (a divider in the thread) | Dialog med DPS | Du svarte ikke på forespørselen. | new |
| V4 | GP | DPS side chose «Ikke svar nå», review mode (a divider in the thread) | Dialog med DPS | DPS svarte ikke på spørsmålet. | new |
| V1 | DPS | GP side chose «Ikke svar nå», review mode; DPS's final choice is due | Mottatte henvisninger, chip | Fastlegen svarte ikke | new |
| V4 | DPS | Row label: the GP's question about the return | Oppsummering, rows | Spørsmål fra fastlegen | new |
| V4 | DPS | GP side chose «Ikke spør nå», review mode (row «Spørsmål fra fastlegen») | Oppsummering, rows | Ingen | new |
| V4 | DPS | Row label: DPS's answer to the GP's question | Oppsummering, rows | Svar til fastlegen | new |
| V4 | DPS | Review mode: the GP side is not played, the question is the example | Oppsummering, rows | eksempelspørsmål | new |
| V1, V3, V4 | GP | Review mode: the DPS side is not played | Oppsummering, under the title | DPS-siden er ikke spilt ennå, så det som står om DPS her, er eksempelsvar. | new |
| V1, V3, V4 | DPS | Review mode: the GP side is not played | Oppsummering, under the title | Fastlegesiden er ikke spilt ennå, så det som står om fastlegen her, er eksempelsvar. | new |
| V1, V3 | DPS | Review mode: the GP side kept the referral, so DPS read the example one | Oppsummering, under the title | Fastlegesiden har ikke sendt henvisningen, så henvisningen og det som står om fastlegen her, er eksempler. | new |
| V1, V3 | GP | No referral sent yet (row «DPS-vurdering») | Oppsummering, rows | ingen henvisning sendt ennå | new |
| V4 | GP | Row label: the GP's plan | Oppsummering, rows | Fastlegens plan | new |
| V4 | DPS | The GP asked and DPS has not answered yet | Oppsummering, title | Et spørsmål som venter på svar | new |
| V4 | DPS | The GP asked and DPS has not answered yet | Oppsummering, Hva skjedde | DPS har ikke svart på spørsmålet ennå. | new |
| V4 | DPS | The GP asked and DPS has not answered yet (row «Svar til fastlegen») | Oppsummering, rows | Ikke besvart ennå | new |
| V1, V3 | GP | Review mode: the DPS side is played and has not made its final choice | Dialog med DPS | DPS har ikke tatt det endelige valget ennå. Svaret vises her når DPS har tatt det. | new |
| V1, V3 | DPS | Review mode: the GP side sent the referral and has not replied | Dialog med fastlegen | Fastlegen har ikke svart ennå. Svaret vises her når fastlegesiden har svart. | new |
| V1, V3 | GP | Review mode: the GP side sends a referral after DPS began on the example one | Ny henvisning, confirmation title | Fjerne DPS-vurderingen? | new |
| V1, V3 | GP | Review mode: the GP side sends a referral after DPS began on the example one | Ny henvisning, confirmation text | DPS-siden har allerede begynt å vurdere eksempelhenvisningen i denne saken. Sender du din egen henvisning, fjernes den vurderingen, slik at DPS-siden kan vurdere henvisningen du sender. | new |
| V1, V3 | GP | Review mode: the GP side sends a referral after DPS began on the example one | Ny henvisning, confirmation button | Fjern vurderingen og send | new |
| V1 | GP | «Henvis» saved, no referral sent yet (row «Fastlegens beslutning») | Oppsummering, rows | henvis, men henvisningen er ikke sendt ennå | new |
| V1, V3 | DPS | Review mode: the GP side sent without placing; DPS placed and did not move the marker | Oppsummering, Hva skjedde | Fastlegen plasserte ikke saken. DPS plasserte den før systemets lesning ble vist. | new |
| V1, V3 | DPS | Review mode: the GP side sent without placing; DPS moved the marker after the reading | Oppsummering, Hva skjedde | Fastlegen plasserte ikke saken. DPS plasserte den før systemets lesning ble vist, og flyttet markøren etter at lesningen var vist. | new |
| V1, V3, V4 | GP | Review mode: the new referral after «Henvis på nytt» is sent | Sendt | Den nye henvisningen er sendt. Saken slutter her, uten svar fra DPS. | new |
| V1, V3, V4 | GP | The new referral after «Henvis på nytt» is sent (V1, V3 in review mode) | Ny henvisning, above DPS's advice | Den nye henvisningen bygde på den første henvisningen og rådene fra DPS. | new |
| V1, V3, V4 | DPS | Review mode: the played GP side sent a new referral after «Henvis på nytt» | Dialog med fastlegen, a divider | Fastlegen sendte en ny henvisning {{date}}. Prototypen følger ikke den nye henvisningen videre. | new |
| V1, V3 | GP | Review mode: a new referral exists (row label for the first referral's count) | Oppsummering, rows | Omtalt i den første henvisningen | new |
| V1, V3 | GP | Review mode: the new referral is sent (row label for its count) | Oppsummering, rows | Omtalt i den nye henvisningen | new |
| V1, V3 | DPS | Review mode: the GP side is not played, so the confidence and the count are the example referral's | Oppsummering, rows | eksempel | new |
| V1 | DPS | Review mode: DPS made its final choice after the GP's example reply | Oppsummering, row «DPS-vurdering» | etter fastlegens eksempelsvar | new |
| V1, V3, V4 | DPS | Review mode: the example referral, or the GP's example question | Henvisning and Spørsmål fra fastlegen, chip | Eksempel | new |
| V4 | GP | Review mode: the GP side asks, or chooses not to ask, after DPS dealt with the example question | Konsultasjon, confirmation title | Fjerne DPS-svaret? | new |
| V4 | GP | Review mode: the GP side asks, or chooses not to ask, after DPS dealt with the example question | Konsultasjon, confirmation text | DPS-siden har allerede tatt stilling til eksempelspørsmålet i denne saken. Spørsmålet ditt, eller valget om ikke å spørre, er nytt for DPS, så det DPS-siden gjorde, fjernes, slik at DPS-siden kan ta stilling på nytt. | new |
| V1 | GP | Review mode: the GP side replies, or chooses not to, after DPS's final choice on the example reply | Dialog med DPS, confirmation text | DPS-siden har allerede gjort sitt endelige valg etter eksempelsvaret i denne saken. Svaret ditt, eller valget om ikke å svare, er nytt for DPS, så det valget fjernes, slik at DPS-siden kan velge på nytt. | new |
| V1, V4 | GP | Review mode: the two confirmations above | Confirmation button | Fjern og fortsett | new |

## Declared substitutions

Each entry in `sources.json` lists its own substitutions. They are applied to that entry's original in the order the entry lists them, as plain string replacements; this table is not one rule set applied to every string. A sentence written for v3 after a reused text is declared in the entry as `appended` and listed in the tables above. No other change is allowed for a string to count as reused; anything else is new text and appears in the tables above when it is clinical. `app/scripts/check-content.mjs` fails the build when an entry no longer reproduces the app text.

| From | To | Kind | Strings that use it |
|---|---|---|---|
| «2026-03-10» | «2026-03-17» | Date moved to the canon: the prototype clock (Tuesday 2026-03-10) becomes Tuesday 2026-03-17 | 10 |
| « %» | «%» | English typography: no space before the per cent sign | 1 |
| en dash (U+2013) | « til » | En dash in a range replaced by «til» | 3 |
| «2026-03-24» | «2026-03-31» | Date moved to the canon: vurderingsfrist, ten working days after receipt on 2026-03-17 | 10 |
| «2026-02-14» | «2026-02-13» | Date moved to the canon: 2026-02-14 is a Saturday | 1 |
| «2025-10-28» | «2025-10-29» | Date moved to the canon: Erlend's earlier referral, so the refusal of 2025-11-12 falls on its frist | 3 |
| en dash (U+2013) | « til nå» | En dash closing an open-ended period replaced by «til nå» | 1 |
| «"The patient can be adequately treated in primary care."» | «“The patient can be adequately treated in primary care.”» | English typography: a quotation in straight double quotes set in curly ones, the words unchanged (r7F-07) | 2 |
| «Vignetten» | «Saken» | Research word replaced on a clinical screen (SV-13) | 1 |
| «vignette» | «case» | Research word replaced on a clinical screen, English (SV-13) | 1 |
| «2026-03-01» | «2026-03-02» | Date moved to the canon: Astrid's referral (2026-03-01 is a Sunday) | 4 |
| «2026-03-15» | «2026-03-16» | Date moved to the canon: Astrid's return (2026-03-15 is a Sunday), on the frist | 2 |
| en dash (U+2013) | « to » | En dash in a range replaced by "to" (English) | 1 |
| an ISO date | the same date in words («31. mars 2026», "31 March 2026", «desember 2025») | An ISO date in running text written in words, the same date (G-27); `check-content.mjs` checks that the words name the same date | 7 |

4 reused strings carry a declared `appended` sentence (the system readings of Kari and Erlend on the GP side, both languages).

303 reused strings are recorded in `sources.json`; 41 of them use a substitution.

## Questions from the gate review

The engineering reviewers (S5 to S8, role-played, not evaluation evidence) raised these points for the clinician. Each names the rows above it concerns.

- Torbjørn (V2): new psychosis, unable to care for himself, sent through the ordinary referral with no urgency. The time slot reads «Øyeblikkelig hjelp». Is the path plausible, or should the case name the emergency route (akutteam, innleggelse) and keep the referral question?
- Kari (V1): DPS places the case in the grey zone, leaning outside, and grants the right to health care after a request for more information, also when the GP sends no reply. Plausible? The grant says «innen fristen» without a date.
- Kari (V1): the referral DPS receives carries a risk section from the vault («Selvmordsrisikovurdering gjennomført …»), while the GP note does not mention risk and the GP's own draft starts empty there.
- Erlend (V3): the referral DPS receives adds a «Spørsmål til DPS» that is not drawn from the note.
- Astrid (V4): DPS answers that the chronic pattern «ville styrket henvisningen», though the first referral already says «Har hatt flere liknende kriser i nære relasjoner de siste årene». Does the answer read as plausible?
- Astrid (V4): «Behandlingsnytte» is listed as not met because the municipal crisis service was not tried. Does that read as expected benefit, or as previous treatment?
- Return reasons: is a common DPS return reason missing from the five categories (Situasjonell krise, Funksjonsnedgang for kort varighet, Kommunalt tilbud ikke utprøvd, Utilstrekkelig informasjon, Annen årsak)?
- All scripted referrals reach DPS with all five sections filled («5 av 5» in the guide as received). Too complete to be realistic?
- To fastleger (V5): Fastlege A has 8 referrals in the period and Fastlege B 14; A's note now reads «Henviser for å være på den sikre siden når hun er usikker på egen vurdering.» Do the two sketches and their figures read as plausible?
- Erlend (V3): the clinical details carry the marker «Kliniske detaljer for Erlend er utkast …» on four screens. Clear it when the rows above are checked.
