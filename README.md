# ATLAS v3 on Meridian

ATLAS is a concept prototype of decision support for referrals from GPs (fastleger) to specialist mental health services (DPS) in Norway. Version 3 is built on Meridian, ATLAS's design language on Fluent 2, for a formative evaluation with GPs and DPS clinicians in a PhD project at the University of Agder.

All patients, clinicians and figures in ATLAS are fictional. ATLAS is an evaluation prototype and must not be used for clinical decisions.

## The study

The study starts at **https://siouxchieftain-jpg.github.io/atlas-meridian/**. It runs in Norwegian, with English one click away, and works best on a laptop. Taking part is voluntary and anonymous: the answers go to anonymous Nettskjema forms, and ATLAS keeps only the participant's progress, in their own browser.

Review mode, for supervisors and pilot testers, has its own address, which goes to reviewers directly while data collection runs.

## What is here

| Path | What it holds |
|---|---|
| `app/` | The app: Vite, React 19, TypeScript and Fluent UI React v9 (`src/`, `public/`, `tests/`, `scripts/`) |
| `app/public/atlas-config.json` | The Nettskjema addresses, the information letter's address and the contact lines |
| `app/src/content/` | Every text, case and form, in Norwegian and English |
| `meridian/` | The Meridian design language as exported from the design tool, unchanged; on the site at `meridian/` |
| `docs/` | [Build note](docs/BUILD-NOTE.md), [plan](docs/PLAN.md), [Nettskjema build sheet](docs/NETTSKJEMA-BUILD-SHEET.md), [Meridian 1.1](docs/MERIDIAN-1.1.md), [clinician check](docs/CLINICIAN-CHECK.md) and [traceability](docs/TRACEABILITY.md) |
| `.github/workflows/pages.yml` | Runs every check, builds the site and publishes it |

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
npm run site                        # assemble the site in site/ (after npm run build)
```

The end-to-end tests never contact Nettskjema: a mock stands in for every form.

## Connect the Nettskjema forms

1. Make the 13 forms in Nettskjema from [docs/NETTSKJEMA-BUILD-SHEET.md](docs/NETTSKJEMA-BUILD-SHEET.md): S1 to S8, with a GP and a DPS version of S2, S4 and S5, and R1 and R2 for review mode. The sheet gives each form's settings, pages, items, codebook names, locked fields and receipt text.
2. When a form is open for answers, copy its address from «Innhent svar» (it looks like `https://nettskjema.no/a/123456`) into `app/public/atlas-config.json` under the form's key. Put the information letter's address in `informationLetter` and the contact lines in `contact`.
3. Commit the file to `main`, or edit it on GitHub. The workflow runs every check and publishes the site again. No code changes.

Until a study form has an address, its step shows «Dette skjemaet er ikke klart ennå.» and cannot be passed.

## Release check, before the first invitation

1. On the live site, open each form's step in the panel and in a new tab, without sending. Confirm that every study address is set and that every locked field shows its value.
2. Send one test answer per form through the panel and one through a new tab. In «Se resultater», check that each locked value sits in its own column.
3. Delete every test answer with «Slett alle svar». Anonymous answers cannot be told apart later.
4. Invite participants with the study link above, and nothing else.

## Privacy

- ATLAS collects nothing itself. Answers go only to anonymous Nettskjema forms; there is no participant code, login or name.
- The browser keeps the participant's progress, settings and the two «Om deg» answers. These leave the browser only as locked fields in the forms.
- The site loads no analytics, trackers, fonts or scripts from third parties.
- This repository holds no participant data.
