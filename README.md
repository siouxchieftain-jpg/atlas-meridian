# ATLAS v3.5.1 on Meridian

ATLAS is a concept prototype of decision support for referrals from GPs (fastleger) to specialist mental health services (DPS) in Norway. Version 3 is built on Meridian, ATLAS's design language on Fluent 2, for a formative evaluation with GPs and DPS clinicians in a PhD project at the University of Agder. Version 3.1 reworks the participant's journey: an overview for each role, a card before the tour, the overall impression after the three cases, feedback in the moment (S9) and a pilot round that keeps its answers apart from the study's. Version 3.2 makes the work read as a working system: pages take the height they need and scroll down, every page of a case sits on Meridian's white panels under one case header, and notices are Fluent message bars. It also adds the information letter. Version 3.3 puts the study's guide layer back where the approved boards have it: the gradient start buttons, the warm study card with the three cases on the overview, the study name as a profile card with its mark, the purple feedback tab and the artwork in help; it adds a patient search to the overview, the glossary in three groups, and pages that reach the footer when they are short. Version 3.4 splits the overview in two: a start page that greets the participant with the next step and shows the day around the study, and a list (the GP's appointments, DPS's received referrals) where every case starts and where cases 1 and 2 end. The start page names no outcome before a case is answered without ATLAS, and opens the outcome parts after the three cases. Each role's guide surfaces wear their own artwork, and the study name's mark shows the name's animal. Version 3.4.1 fills the window on a laptop and a large monitor alike, as a Fluent app does: pages add columns where there is room, running text keeps a readable line, and Velkommen puts its five steps at the foot of the card and the information letter in its top right corner. Version 3.5 brings the rest of the start page's board back for both roles, as a working system's dashboard: key figures, the whole day with its tasks, the GP's referrals as a table with their deadlines, the pattern per quarter and the changes to the criteria after the three cases, and what is coming up in the week, with every example in a grey group under its label. Version 3.5.1 holds the figures back in the tour, which comes before case 1: until the three cases are done, its windows for «Mitt henvisningsmønster» and Delt oversikt's Kalibrering show their layout without the GP's own counts and reasons or the area's rates and reasons. The practice patient's example return, its reading, DPS's fixed list of reasons and the log of changes to the criteria stay, as none is about a study case. After the three cases the start page, «Se igjen» and the tour seen again show the figures.

All patients, clinicians and figures in ATLAS are fictional. ATLAS is an evaluation prototype and must not be used for clinical decisions.

## The study

The study starts at **https://siouxchieftain-jpg.github.io/atlas-meridian/**. It runs in Norwegian, with English one click away, and works best on a laptop. Taking part is voluntary, and nobody is asked for a name or contact details: the answers go to Nettskjema forms without login, and ATLAS keeps only the participant's progress, in their own browser.

Review mode, for supervisors and pilot testers, has its own address, which goes to reviewers directly while data collection runs.

The information letter is at **https://siouxchieftain-jpg.github.io/atlas-meridian/informasjonsskriv.html** (Norwegian, with English one click away), with a PDF of each language for invitations: `informasjonsskriv.pdf` and `information-letter.pdf`. Velkommen links to it.

## What is here

| Path | What it holds |
|---|---|
| `app/` | The app: Vite, React 19, TypeScript and Fluent UI React v9 (`src/`, `public/`, `tests/`, `scripts/`) |
| `app/public/atlas-config.json` | The round (`pilot` or `study`), the Nettskjema addresses for the study (`forms`) and for the pilot (`pilotForms`), the study period, the information letter's address and the contact lines |
| `app/public/informasjonsskriv.html` | The information letter, both languages; `npm run letter` prints it to the two PDFs beside it (with Microsoft Edge on Windows, where Segoe UI is) |
| `app/src/content/` | Every text, case and form, in Norwegian and English |
| `app/src/assets/animals/` | The study name's twenty animals, Fluent Emoji in their flat style (MIT licence, in the folder) |
| `meridian/` | The design language as exported from the design tool, unchanged; kept in the repository, not published (3.5.2) |
| `docs/` | [Build note](docs/BUILD-NOTE.md), [plan](docs/PLAN.md), [Nettskjema build sheet](docs/NETTSKJEMA-BUILD-SHEET.md), [Meridian 1.1](docs/MERIDIAN-1.1.md), [clinician check](docs/CLINICIAN-CHECK.md) and [traceability](docs/TRACEABILITY.md) |
| `.github/workflows/pages.yml` | Runs every check and builds the site; a push to `main` publishes it, a pull request only runs the checks |

## Run it

With Node.js 22 or later:

```sh
cd app
npm ci
npm run dev                         # the app at http://localhost:5173
npm run build                       # content checks, type check, build into app/dist
npm test                            # unit tests
npx playwright install chromium     # once, for the end-to-end tests
npm run e2e                         # end-to-end and accessibility tests on the built site
npm run docs                        # write the build sheet and the traceability table again
npm run letter                      # print the information letter to its two PDFs (after changing it)
npm run site                        # assemble the site in site/ (after npm run build)
```

The end-to-end tests never contact Nettskjema: a mock stands in for every form.

## Connect the Nettskjema forms

1. Make the 14 forms in Nettskjema from [docs/NETTSKJEMA-BUILD-SHEET.md](docs/NETTSKJEMA-BUILD-SHEET.md): S1 to S9, with a GP and a DPS version of S2, S4 and S5, S7 for GPs, and R1 and R2 for review mode. The sheet gives each form's settings, pages, items, codebook names, locked fields and receipt text. `node scripts/nettskjema.mjs create` (in `app/`) makes them through the Nettskjema API and writes their addresses into `atlas-config.json`.
2. A form made by hand: when it is open for answers, copy its address from «Innhent svar» (it looks like `https://nettskjema.no/a/123456`) into `app/public/atlas-config.json` under the form's key. Put the information letter's address in `informationLetter` and the contact lines in `contact`.
3. Commit the file to `main`, or edit it on GitHub. The workflow runs every check and publishes the site again. No code changes.

Until a study form has an address, its step shows «Dette skjemaet er ikke klart ennå.» and cannot be passed.

### The pilot round

The pilot runs on the live site with forms of its own, so no pilot answer ever lands in a study form.

1. `node scripts/nettskjema.mjs create --round pilot` makes a copy of the twelve study forms (S1 to S9, titled «(pilot)») and writes their addresses under `pilotForms`.
2. With `"round": "pilot"` in `atlas-config.json`, the study forms come from `pilotForms`; the header shows a «Pilot» chip, Velkommen says the answers are kept out of the study's data, and the `versjon` of every study form ends in `-pilot` (R1 and R2, the review forms, keep theirs).
3. Before the study round, bring the study forms in line (done on 18 October 2026): `node scripts/nettskjema.mjs update`, then `node scripts/nettskjema.mjs verify`. Forms made before v3.1 still have S2 before the cases, «dashbordet» in S2 and S8, B-02, and receipts that do not name their form; `update` leaves any form that has answers alone.
4. Open the pilot forms for answers: `node scripts/nettskjema.mjs open --round pilot --until YYYY-MM-DD` (through that day, Norwegian time). `close --round pilot` closes them; `status --round pilot` shows answers and whether each is open.
5. When the pilot is over, close the pilot forms, set `"round"` to `"study"` and fill `studyPeriod` with the first and last day (`YYYY-MM-DD`). Open the study forms the same way, with `--study` added (the script refuses to open the study set without it). After the last day (Norwegian time), Velkommen says the study has ended and nothing starts. The pilot forms and their answers stay in Nettskjema, apart from the study's. A session begun in the pilot is not carried into the study round: in that browser the study link starts afresh, with a new study name.

## Release check, before the first invitation

1. Run `node scripts/nettskjema.mjs verify` (in `app/`): every study form matches the instrument, and every receipt names its form (`sendt.html?skjema=S3`).
2. On the live site, open each form's step in the panel and in a new tab, without sending. Confirm that every study address is set, that `round` is `study`, and that every locked field shows its value.
3. Send one test answer per form through the panel and one through a new tab. In «Se resultater», check that each locked value sits in its own column.
4. Delete every test answer with «Slett alle svar». Test answers cannot be told apart from participants' answers later.
5. Invite participants with the study link above, and nothing else.

## Privacy

- ATLAS collects nothing itself. Answers go only to Nettskjema forms without login; nobody gives a name, and the random study name is the only code.
- The browser keeps the participant's progress, settings, the role, the «Om deg» answer and the study name. Only the role, the answer and the study name leave it, as locked fields in the forms.
- Opening the study link again in a browser that holds a session shows «Velkommen tilbake» first, with «Ikke deg? Start som ny deltaker» for a shared computer, so the next person starts afresh with a study name of their own.
- The site loads no analytics, trackers, fonts or scripts from third parties.
- This repository holds no participant data.
