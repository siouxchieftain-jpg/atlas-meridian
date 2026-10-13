# Plan: screens, steps and forms

ATLAS v3 is a concept prototype for referrals from GPs (fastleger) to specialist mental health services (DPS) in Norway. All patients, clinicians and figures in it are fictional. It runs in two modes:

- **Study mode** (the site's address) takes a participant through a fixed sequence: a tour, three cases, an end page and two optional cases. Each step opens one short, anonymous Nettskjema form at its moment.
- **Review mode** lets supervisors and pilot testers move freely, play both sides of a case, read the design notes («Merknader») and give feedback per part of a screen. Study mode never links to it; its address goes to reviewers directly.

This plan lists the screens, the steps, the forms and their item IDs. It carries no expectations about the answers.

## Study steps

| Step | When | Form | Items | How |
|---|---|---|---|---|
| Velkommen | First screen | none | none | What the project is, that ATLAS is a concept prototype with fictional patients, that taking part is voluntary and anonymous, the time it takes, and the information letter |
| Om deg | Before any ATLAS screen | S1 «Før du ser ATLAS» | A-01 (locked, from the role chosen in the app), A-02 to A-05 | The app asks the role and «Deltok du i et intervju i dette forskningsprosjektet?»; both arrive in every form as locked fields |
| Omvisning | After S1 | none | B-01 is the tour | A guided tour with a practice patient (Sofie Lund, 39), in short parts of at most four steps, ending with «Dette har du sett» and a navigation question that is stored nowhere |
| Helhetsinntrykk | After the tour, before any case | S2, GP or DPS version | B-02; C1-01 to C1-05; C2-01 to C2-03; C3-01 to C3-03; C4-01, C4-02; C5-01 to C5-03; C-CUCF-01, C-CUCF-02 | «Se igjen» reopens any tour step |
| Kari | Case 1 (V1) | S3, three pages | Page 1: D-V1-B1. Stop page. Last page: the check item, D-V1-B2, D-V1-DS, D-V1-01 to D-V1-04 | See «One case, step by step» |
| Erlend | Case 2 (V3) | S4, three pages, GP or DPS version | Page 1: D-V3-B1. Stop page. Last page: the check item, D-V3-B2, D-V3-01 to D-V3-03 | As Kari; the GP starts in the new referral draft |
| Astrid | Case 3 (V4) | S5, three pages, GP or DPS version | Page 1: D-V4-B1. Stop page. Last page: the check item, D-V4-B2, D-V4-01 to D-V4-04 | As Kari; the own work ends when the GP has read the return and asked a question or chosen not to, or when DPS has answered |
| Avslutning | After the three cases | S6 «Avslutning» | E-01 to E-06 | Then «Ekstra (valgfritt)» or «Avslutt» |
| Ekstra (valgfritt) | After S6 | S7 «Torbjørn» (GPs), S8 «To fastleger» (both roles) | D-V2-01 to D-V2-03; D-V5-01, D-V5-02 | One page each, after the case; no case-only moment |
| Takk | Last | none | none | The tour's explanations and each case's purpose open here, after every form |

GPs meet 47 core items and up to 5 optional ones; DPS participants 46 or 47 core items (depending on C1-04) and up to 2 optional ones. A participant may skip a form with «Hopp over skjemaet»; a skipped case form can be answered later («Svar likevel»).

## One case, step by step

1. **Briefing.** The task in two sentences and the case rows (who, the situation, the starting point). It names no ATLAS element.
2. **Uten ATLAS.** The case as a clinician has it today: the same record or referral letter as with ATLAS, with only the ATLAS parts hidden. The form opens; page 1 asks B1.
3. **Stop page.** «Stopp her. Gå tilbake til ATLAS og trykk på Vis ATLAS. …» The participant confirms «Jeg har svart på side 1», and «Vis ATLAS» opens.
4. **Med ATLAS.** The participant works on the case with ATLAS, up to and including their own decision: for the GP, saving the decision and sending or saving the referral (Kari), sending or saving the new referral (Erlend), or asking a question or choosing not to (Astrid); for DPS, sending the assessment, or the answer (Astrid). The form panel stays hidden meanwhile.
5. **The rest of the form.** The panel opens on the last page: «Gå videre i skjemaet og svar på resten nå.» The last page opens with the check item «Har du arbeidet med denne saken i ATLAS før du svarer på denne siden?».
6. **The other side.** Only after the last page is sent does the other side's reply appear in Dialog; then the plan (GP, after a return) and the summary.

If a case form has to be opened again after «Vis ATLAS» (a reload, a closed tab, a failed send, «Svar likevel»), it opens with `steg` ending in `-etter`.

## Forms

Every form is one anonymous Nettskjema form. Locked fields, filled by ATLAS under «Fylt ut automatisk av ATLAS», in Norwegian whatever language the app shows: `rolle` (Fastlege, DPS-inntak), `intervju` (Ja, Nei, Vil ikke svare), `steg` (S1 to S8, with `-etter`), `vignett` (V1 to V5 on case forms) and `versjon` (the build). The full sheet, with every item's text, type, scale and codebook name, is [NETTSKJEMA-BUILD-SHEET.md](NETTSKJEMA-BUILD-SHEET.md).

| Form | Step | Versions | Pages |
|---|---|---|---|
| S1 «Før du ser ATLAS» | Om deg | one | 1 |
| S2 «Helhetsinntrykk» | Helhetsinntrykk | GP, DPS | 1 |
| S3 «Kari» | Kari | one | 3 |
| S4 «Erlend» | Erlend | GP, DPS | 3 |
| S5 «Astrid» | Astrid | GP, DPS | 3 |
| S6 «Avslutning» | Avslutning | one | 1 |
| S7 «Torbjørn» | Ekstra | GP | 1 |
| S8 «To fastleger» | Ekstra | one | 1 |
| R1 «Gjennomgang» | Review mode, per part of a screen | one | 1 |
| R2 «Samlet inntrykk» | Review mode, wrap-up | one | 1 |

S1 decides the route: if S1 was sent from the panel inside ATLAS, later forms open there; otherwise they open in a new tab. Safari starts on the new tab.

R1 asks how clear the part is (1 to 5), what works, what should change, how important that is (Lite, Middels, Svært viktig) and «Leste du noe her som et råd om hva klinikeren skal gjøre?», with locked `rolle` (Fastlege, DPS-kliniker, Veileder, Ekstern fagperson), `side`, `seksjon` and `versjon`. R2 is the wrap-up, with locked `rolle` and `versjon`. R1 and R2 are review questions, not part of the questionnaire.

## Declared deviations from the questionnaire skeleton

Proposed, for the project owner to rule on. The preview forms and the build sheet implement them.

1. A-02 and A-03 in bands: years in the role (under 5, 5 to 14, 15 or more); referrals per month (0 to 4, 5 to 9, 10 to 19, 20 to 49, 50 or more).
2. A-01 arrives as a locked text field from the role chosen in the app, with two values: Fastlege and DPS-inntak.
3. A new locked field `intervju`: «Deltok du i et intervju i dette forskningsprosjektet?» (Ja, Nei, Vil ikke svare).
4. Anchors for the helpfulness items (1 «Ikke nyttig» to 7 «Svært nyttig») and for E-05 (0 «Svært lite sannsynlig» to 10 «Svært sannsynlig»).
5. DPS wording for C1-04, D-V3-01, D-V3-02, D-V4-01 and D-V4-02, drafted for approval, so S2, S4 and S5 have a GP and a DPS version.
6. D-V1-DS for both roles.
7. Velkommen says «omtrent en time» until the pilot measures the time.
8. «Ikke skriv opplysninger om pasienter eller andre personer.» above every open question.
9. B-02 in two parts: a navigation question in the app at the end of the tour, then B-02 as written at the top of S2.
10. The optional cases come after Section E.
11. A required check item opens the last page of each case form: «Har du arbeidet med denne saken i ATLAS før du svarer på denne siden?» (Ja, Nei).

## Screens

**Shell (both modes):** header with the ATLAS wordmark and «Prototype»; the role badge and step counter (study) or the role switch (review); Hjelp; the language toggle «Norsk | English»; Merknader and restart in review mode only. A quiet footer on every screen: «ATLAS er en formativ evalueringsprototype og skal ikke brukes til kliniske beslutninger. Ingen reelle pasientopplysninger eller opplysninger om helsepersonell inngår.»

**GP:** Timeliste; the briefing; Konsultasjon (profile, note, self-report, medicines, history, and the ATLAS panel: Usikkerhetsvisning with Systemets lesning after the GP's own placement, Hva er uklart, Informasjonsguiden, Din trygghet nå, Din beslutning); Ny henvisning (five sections, each with «Hva DPS ser etter»; «Fra ATLAS-panelet»); Sendt; Dialog; Din plan; Oppsummering; Mitt henvisningsmønster; Delt oversikt (Kalibrering, Dialog).

**DPS:** Mottatte henvisninger; the briefing; Vurdering (the referral as the GP sent it, the note as an attachment, «Hva fastlegen var usikker på», the ATLAS panel with the DPS clinician's own placement first, Informasjonsguiden as received, and the outcome: Be om mer informasjon, Rett til helsehjelp or Retur med råd); Sendt; Dialog; Oppsummering; Delt oversikt.

**Study:** Velkommen, Om deg, the stepper, the form panel (inline beside the case where the screen is wide enough, otherwise over it), the case-only state «Uten ATLAS» per case, Ekstra, Takk.

**Review:** the role picker, free navigation, «Se fra den andre siden» on every case, Merknader (off by default), «Gi tilbakemelding» per part of a screen with a tab on the right edge and an overview, and links to the Meridian pages. Where a side has not been played, the scripted reply stands in and says «Eksempel» or «Eksempelsvar».

## Cases

- **V1 Kari Nordli, 34:** a grey-zone referral.
- **V3 Erlend Bakken, 42:** a new referral after a refusal with one sentence.
- **V4 Astrid Holm, 28:** a dialogue after a return with reasons and advice.
- **V2 Torbjørn Viken, 52** (optional, GPs): a clear-cut referral.
- **V5 Two GPs, one patient** (optional, both roles): Kari as two GPs with different experience see her.
- **Sofie Lund, 39:** the practice patient for the tours.

The fictional clock: the GP works on Tuesday 2026-03-17, DPS on Wednesday 2026-03-18. Every clinical fact written new for v3 is listed for a clinician's check in [CLINICIAN-CHECK.md](CLINICIAN-CHECK.md).
