# Plan: screens, steps and forms

ATLAS v3.1 is a research prototype for referrals from GPs (fastleger) to specialist mental health services (DPS) in Norway. All patients, clinicians and figures in it are fictional. It runs in two modes:

- **Study mode** (the site's address) takes a participant through three parts: «Bli kjent» (Velkommen, Om deg and a tour), the three cases in a fixed order, and «Avslutning» (the overall impression, an end page and two optional cases). Between steps the participant is on a start page for their role (the overview), which leads to the tour and then to the list where each case opens (v3.4). Each step opens one short Nettskjema form at its moment; a separate feedback form (S9) can be opened from any study page after Om deg.
- **Review mode** lets supervisors and pilot testers move freely, play both sides of a case, read the design notes («Merknader») and give feedback per part of a screen. Study mode never links to it; its address goes to reviewers directly.

This plan lists the screens, the steps, the forms and their item IDs. It carries no expectations about the answers.

## Study steps

| Step | When | Form | Items | How |
|---|---|---|---|---|
| Velkommen | First screen | none | none | What the project is, that ATLAS is a research prototype with fictional patients, five steps that say how the study runs, and a role card for each role («Start som fastlege», «Start i DPS-inntaket»; the DPS card covers every role in intake). About an hour, voluntary with no name or email asked, no right answers, and the contact; the information letter as a button in the card's top right corner (3.4.1; a link in the intro on a small screen). The five steps sit at the foot of the card. The credit line and UiA's logo in the footer, here only. When the study link is opened again in a browser that holds a session, and always once S1 is sent, Velkommen welcomes the participant back instead: where they are, the study name, «Fortsett der du slapp» and «Ikke deg? Start som ny deltaker», which clears this browser's session and leaves what was sent in Nettskjema. After the study's last day it says the study has ended, and nothing starts |
| Om deg | Before any ATLAS screen | S1 «Før du ser ATLAS» | A-01 (locked, from the role card), SAMTYKKE, A-02 to A-05 | Shows the role and the study name, and asks «Deltok du i et intervju i dette forskningsprosjektet?»; the role, the answer and the study name arrive in every form as locked fields. S1 opens with the consent tick box «Jeg har lest informasjonsskrivet og vil delta.» When S1 is sent: «Til oversikten» |
| Oversikten | Between steps, after S1: after Om deg, after the tour, after a pause and after case 3 | none | none | The start page (v3.4). Its greeting names the participant by the study name, with the name's animal, and holds the study's next step and one sheen: the tour, then «Gå til timelisten» or «Gå til mottatte henvisninger», then the overall impression; the three cases run along its foot with «Nå» and «Ferdig». Under it, the day around the study: for the GP the morning as a time strip with «Nå» (a list on a narrow window), the inbox and the referrals; for DPS the intake and the messages. What only shows an ordinary day sits in one grey group labelled «Eksempler». «Mitt henvisningsmønster» and «Delt oversikt» are locked until the three cases are done. Nothing here opens a case, and nothing names a case's outcome before it is answered without ATLAS |
| Listen | From the start page's sheen, and after cases 1 and 2 | none | none | «Timeliste i dag» for the GP (the three cases first, the ordinary appointments in a row of their own) and «Mottatte henvisninger» for DPS (with the deadlines). The study card beside it holds the same next step as the start page, with «Åpne saken». The cases stay locked until the tour is done, and each later case until its turn |
| Omvisning | From the study card, after a card that says what the tour is | none | none | The card before the tour: four tiles (the parts, practice, where things are, a case) and four questions, «Start omvisningen» or «Ikke nå». The participant's tour opens with «Slik foregår studien» (the overview, a case's path, the stop page, the study name), then the practice patient (Sofie Lund, 39) in short parts of at most four steps. Its end opens the cases and asks once, optionally, about the tour (S9); «Til oversikten». Seen again from Hjelp, it asks nothing |
| Kari | Case 1 (V1), from the list | S3, three pages | Page 1: D-V1-B1. Stop page. Last page: the check item, D-V1-B2, D-V1-DS, D-V1-01 to D-V1-04 | See «One case, step by step» |
| Erlend | Case 2 (V3), after Kari | S4, three pages, GP or DPS version | Page 1: D-V3-B1. Stop page. Last page: the check item, D-V3-B2, D-V3-01 to D-V3-03 | As Kari; the GP starts in the new referral draft |
| Astrid | Case 3 (V4), after Erlend | S5, three pages, GP or DPS version | Page 1: D-V4-B1. Stop page. Last page: the check item, D-V4-B2, D-V4-01 to D-V4-04 | As Kari; the own work ends when the GP has read the return and asked a question or chosen not to, or when DPS has answered |
| Helhetsinntrykk | After the three cases | S2, GP or DPS version | C1-01 to C1-05; C2-01 to C2-03; C3-01 to C3-03; C4-01, C4-02; C5-01 to C5-03; C-CUCF-01, C-CUCF-02 | The overall impression of ATLAS, once the participant has used it; «Se igjen» reopens any tour step |
| Avslutning | After S2 | S6 «Avslutning» | E-01 to E-06 | Then «Ekstra (valgfritt)» or «Avslutt» |
| Ekstra (valgfritt) | After S6 | S7 «Torbjørn» (GPs), S8 «To fastleger» (both roles) | D-V2-01 to D-V2-03; D-V5-01, D-V5-02 | One page each, after the case; no case-only moment |
| Takk | Last | none | none | The tour's explanations and each case's purpose open here, after every form, and ATLAS's full name (Adaptive Trust-calibration and Liaison Architecture for Specialist-referrals), which names what the forms ask about and so waits until they are sent |
| Gi tilbakemelding | Any study page after S1 | S9 «Tilbakemelding underveis» | S9-01 to S9-05, all optional | A tab on the right edge asks which part of the screen the feedback is about, then opens S9 with the screen and the part locked. Asked for at two moments only: the end of the tour and the end of each case, after its form is sent, once each. S9 never replaces a step form that is open: it then opens in a new tab |

GPs meet 46 core items and up to 5 optional ones; DPS participants 45 or 46 core items (depending on C1-04) and up to 2 optional ones. S9 comes on top, as often as the participant wants. A participant may skip a form with «Hopp over skjemaet»; a skipped case form can be answered later («Svar likevel»).

## One case, step by step

1. **Briefing.** The task in two sentences and the case rows (who, the situation, the starting point). It names no ATLAS element.
2. **Uten ATLAS.** The case as a clinician has it today: the same record or referral letter as with ATLAS, with only the ATLAS parts hidden. The form opens; page 1 asks B1.
3. **Stop page.** «Stopp her. Gå tilbake til ATLAS og trykk på Vis ATLAS. …» The participant confirms «Jeg har svart på side 1», and «Vis ATLAS» opens.
4. **Med ATLAS.** The participant works on the case with ATLAS, up to and including their own decision: for the GP, saving the decision and sending or saving the referral (Kari), sending or saving the new referral (Erlend), or asking a question or choosing not to (Astrid); for DPS, sending the assessment, or the answer (Astrid). The form panel stays hidden meanwhile.
5. **The rest of the form.** The panel opens on the last page: «Gå videre i skjemaet og svar på resten nå.» The last page opens with the check item «Har du arbeidet med denne saken i ATLAS før du svarer på denne siden?».
6. **The other side.** Only after the last page is sent does the other side's reply appear in Dialog; then the plan (GP, after a return) and the summary.
7. **The end of the case.** The summary asks once, optionally, about the case's screens (S9), outside the measurement, then leads on: to the list after cases 1 and 2 («Til timelisten», «Til mottatte henvisninger»), to the start page after case 3 («Til oversikten»), v3.4.

If a case form has to be opened again after «Vis ATLAS» (a reload, a closed tab, a failed send, «Svar likevel»), it opens with `steg` ending in `-etter`.

## Forms

Every form is one Nettskjema form without login. Locked fields, filled by ATLAS under «Fylt ut automatisk av ATLAS», in Norwegian whatever language the app shows: `rolle` (Fastlege, DPS-inntak), `intervju` (Ja, Nei, Vil ikke svare), `studienavn` (the random study name, for example «Rolig elg 27»; it sorts one person's forms together), `steg` (S1 to S8, with `-etter`), `vignett` (V1 to V5 on case forms), `side` and `seksjon` (S9: the screen and the part, for example `fastlege/kari/saken` and `hele`) and `versjon` (the build; in the pilot round the study forms' value ends in `-pilot`). The full sheet, with every item's text, type, scale and codebook name, is [NETTSKJEMA-BUILD-SHEET.md](NETTSKJEMA-BUILD-SHEET.md).

| Form | Step | Versions | Pages |
|---|---|---|---|
| S1 «Før du ser ATLAS» | Om deg | one | 1 |
| S2 «Helhetsinntrykk» | Helhetsinntrykk, after the cases | GP, DPS | 1 |
| S3 «Kari» | Kari | one | 3 |
| S4 «Erlend» | Erlend | GP, DPS | 3 |
| S5 «Astrid» | Astrid | GP, DPS | 3 |
| S6 «Avslutning» | Avslutning | one | 1 |
| S7 «Torbjørn» | Ekstra | GP | 1 |
| S8 «To fastleger» | Ekstra | one | 1 |
| S9 «Tilbakemelding underveis» | Any study page after S1 | one | 1 |
| R1 «Gjennomgang» | Review mode, per part of a screen | one | 1 |
| R2 «Samlet inntrykk» | Review mode, wrap-up | one | 1 |

S1 decides the route: if S1 was sent from the panel inside ATLAS, later forms open there; otherwise they open in a new tab. Safari starts on the new tab. S9 follows the same route, except that it never replaces a step form that is open: then it opens in a new tab, and its receipt marks no step.

In the pilot round (`"round": "pilot"` in `atlas-config.json`) every study form comes from a pilot copy made for the purpose (`pilotForms`), so no pilot answer lands in a study form, and their `versjon` ends in `-pilot`.

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
9. B-02 («Har du sett gjennom alle skjermbildene i ATLAS-dashbordet?») is dropped (v3.1), with the navigation question at the end of the tour that led to it; S2 now comes after the three cases.
10. The optional cases come after Section E.
11. A required check item opens the last page of each case form: «Har du arbeidet med denne saken i ATLAS før du svarer på denne siden?» (Ja, Nei).
12. S2 comes after the three cases, not before them (v3.1), so the overall impression rests on use, not on the tour alone.
13. S2 and S8 say «ATLAS» where they said «dashbordet» (v3.1).
14. S9 «Tilbakemelding underveis» is added (v3.1): optional feedback on one part of one screen, like R1 in review mode. It is feedback on the prototype, not part of the questionnaire.

## Screens

**Shell (both modes):** header with the ATLAS wordmark and «Forskningsprototype» (and «Pilot» in the pilot round); the role badge and the three parts (study) or the role switch (review); Hjelp; the language toggle «Norsk | English»; restart in review mode only. A quiet footer on every screen: «ATLAS er en forskningsprototype og skal ikke brukes til kliniske beslutninger. Ingen reelle pasientopplysninger eller opplysninger om helsepersonell inngår.»

**GP:** Timeliste; the briefing; Konsultasjon (profile, note, self-report, medicines, history, and the ATLAS panel: Usikkerhetsvisning with Systemets lesning after the GP's own placement, Hva er uklart, Informasjonsguiden, Din trygghet nå, Din beslutning); Ny henvisning (five sections, each with «Hva DPS ser etter»; «Fra ATLAS-panelet»); Sendt; Dialog; Din plan; Oppsummering; Mitt henvisningsmønster; Delt oversikt (Kalibrering, Dialog).

**DPS:** Mottatte henvisninger; the briefing; Vurdering (the referral as the GP sent it, the note as an attachment, «Hva fastlegen var usikker på», the ATLAS panel with the DPS clinician's own placement first, Informasjonsguiden as received, and the outcome: Be om mer informasjon, Rett til helsehjelp or Retur med råd); Sendt; Dialog; Oppsummering; Delt oversikt.

**Study:** Velkommen (first visit, welcome back, ended), Om deg, the start page and the list (v3.4: «Timeliste i dag», «Mottatte henvisninger»), the card before the tour, «Studien» (the steps by the three parts), the form panel (inline beside the case where the screen is wide enough, otherwise over it), the case-only state «Uten ATLAS» per case, the question at the end of the tour and of each case, the «Gi tilbakemelding» tab, Helhetsinntrykk, Ekstra, Takk. Every page takes the height its content needs and scrolls down when it must, never sideways (v3.2), and a short page reaches down to the footer (v3.3). The work sits on Meridian's white panels, every page of a case under the same case header, with notices as message bars under it; the study around it is a guide surface with the dawn, the artwork and one sheen start action: Velkommen, the study name on Om deg (a profile card with the name's mark, also at the end of the header), the start page's greeting and the list's study card (the next step, the three cases with «Nå», «Se omvisningen igjen»), the card before the tour, the tour, the briefing's task, help (the glossary in three groups, with a search), the end of a case and Takk (v3.3). The list has a patient search that filters it (v3.3). Each role's guide surfaces wear their own artwork, the coral-led wave for the GP and the lavender-led wave for DPS, and Velkommen, where the role is chosen, the organza (v3.4). Velkommen links to the information letter (`informasjonsskriv.html`, with a PDF in each language).

**Review:** the role picker, free navigation, «Se fra den andre siden» on every case, Merknader (off by default: a pill in the lower left slides out a drawer over the navigation, numbers the parts on the screen and rings them, so nothing on the screen moves), «Gi tilbakemelding» per part of a screen with a tab on the right edge and an overview, and links to the Meridian pages. Where a side has not been played, the scripted reply stands in and says «Eksempel» or «Eksempelsvar».

## Cases

- **V1 Kari Nordli, 34:** a grey-zone referral.
- **V3 Erlend Bakken, 42:** a new referral after a refusal with one sentence.
- **V4 Astrid Holm, 28:** a dialogue after a return with reasons and advice.
- **V2 Torbjørn Viken, 52** (optional, GPs): a clear-cut referral.
- **V5 Two GPs, one patient** (optional, both roles): Kari as two GPs with different experience see her.
- **Sofie Lund, 39:** the practice patient for the tours.

The fictional clock: the GP works on Tuesday 2026-03-17, DPS on Wednesday 2026-03-18. Every clinical fact written new for v3 is listed for a clinician's check in [CLINICIAN-CHECK.md](CLINICIAN-CHECK.md).
