# Build note

ATLAS v3 is a research prototype for referrals from GPs (fastleger) to specialist mental health services (DPS) in Norway, built for a formative evaluation. All patients, clinicians and figures in it are fictional. This note says what was built and how. [PLAN.md](PLAN.md) lists the screens, the steps and the forms; [MERIDIAN-1.1.md](MERIDIAN-1.1.md) gives the design rules the build added to Meridian.

## What the site holds

- **The app** at the site's address. Study mode opens there. Review mode has its own address, which goes to reviewers directly; study mode never links to it.
- **`sendt.html`**, the page Nettskjema's receipt button leads to when a form was answered in a new tab. It records in the browser that the step was sent and leads back to the study.
- **`meridian/`**, the Meridian design language as exported from the design tool, linked from review mode only. On the site its two React files are served from the site itself and checked against the integrity hashes the export pins (`app/scripts/assemble-site.mjs`); the copy in the repository is unchanged.

## Stack

- React 19.2.8, TypeScript 5.9.3 in strict mode, Vite 7.3.7 with a relative base, so the site works under any path.
- Fluent UI React v9: `@fluentui/react-components` 9.74.9 and `@fluentui/react-icons` 2.0.344, pinned exactly. Styles are Griffel `makeStyles` with Fluent tokens; the Meridian values that have no Fluent token (the band, the dawn and a few sizes) live in one module, `app/src/theme/constants.ts`.
- A small hash router of the project's own. No CSS framework, no other UI library, no runtime CDN, no analytics, and no fonts or scripts from third parties.
- Vitest 4.1.11 for unit tests; Playwright 1.56.0 with axe-core for end-to-end tests on the built site.

## How the app is organised

| Folder in `app/src` | What it holds |
|---|---|
| `shell/` | The header, the navigation (a drawer, the 48 px rail or the full navigation, by window width), the footer, and page headings that take focus on a route change |
| `router/` | The hash router |
| `i18n/` | The language toggle and text lookup; the page's `lang` follows the toggle |
| `theme/` | The Meridian theme (Fluent's brand ramp with brand 80 `#7160E8`, and the overrides) and the constants module |
| `state/` | The stores kept in the browser, one per mode, each with a schema version |
| `study/` | Study mode: the steps, the stepper, the form panel, the new-tab route and the preview forms |
| `review/` | Review mode: free navigation, both sides of a case, the design notes («Merknader»: a pill that slides out a drawer and numbers the parts) and feedback per part of a screen |
| `case/` | The clinical screens both modes share, for the GP and the DPS side |
| `patterns/` | Clinical patterns: the uncertainty band and placement, the uncertainty tags, the confidence scale, Informasjonsguiden, choice groups and the announcer |
| `overview/` | Mitt henvisningsmønster and Delt oversikt |
| `tour/` | The guided tours and their live frames |
| `engine/` | Pure functions: the fictional clock, the branch rules, the dialogue threads, form addresses and locked fields, placement, and the guide's reader |
| `content/` | Every text, case and form, as JSON |

## Content

- Every text the app shows is in `app/src/content/`, in Norwegian (`nb`) and English (`en`): the interface strings (`strings.json`), the cases (`cases/*.json` and `v5.json`), the tours, the ordliste, the design notes and the instrument (`instrument.json`: each item's wording, scale and codebook name). A vignette sentence, an English string or an item's wording changes in one file.
- `sources.json` lists the 303 texts reused from the earlier ATLAS prototype and the project's own documents, with where each came from and any declared substitution (for example a changed fictional name). The content check confirms that each still reproduces the text the app shows.
- Every clinical fact written new for v3 is listed for a clinician's check in [CLINICIAN-CHECK.md](CLINICIAN-CHECK.md).
- `app/public/atlas-config.json` holds the Nettskjema addresses, the information letter's address and the contact lines. The app reads it at run time.
- `app/scripts/nettskjema.mjs` makes the 13 Nettskjema forms from `instrument.json` through the Nettskjema API (`plan`, `create`, `update`, `verify`, `status`), writes their addresses into `atlas-config.json` and reads each form back to check it against the instrument. The API client's ID and secret, and the editor's Nettskjema username, stay in a file outside the repo. The forms are made closed; the owner opens them in Nettskjema when the study starts.

## Study mode and the forms

- Each study step opens one anonymous Nettskjema form, in a panel beside the case where the window is wide enough (an embedded form, `embed=1`), over the case where it is not, or in a new tab. ATLAS fills and locks the context fields through the form's address (`CB<codebook>=<value>&LCK<codebook>=true`), with every value encoded by `encodeURIComponent`. No name or free text is ever sent as a locked field. The one code is the study name (`studienavn`, for example «Rolig elg 27»): random, made in the browser when the role is chosen, kept only in that browser, and sent locked in every study form so one person's forms can be sorted together. Nobody holds a key to who has which name.
- From an embedded form, ATLAS acts only on messages from `https://nettskjema.no`: the form's height, `scrollToStart`, `submitFinished` and `submitFailed`. A form answered in a new tab returns through `sendt.html`; where the browser keeps no storage, the participant confirms with «Jeg har sendt skjemaet».
- A step whose form address is empty shows «Dette skjemaet er ikke klart ennå.», offers no skip and cannot be passed.
- Preview forms are built from `instrument.json`, so they ask what the Nettskjema forms ask. They keep answers in the browser, say so on screen and export CSV. In study mode they run only when the address carries the preview flag, which no participant link carries; in review mode the feedback forms (R1, R2) are the Nettskjema forms once they have addresses, and preview forms before that.
- The end-to-end checks never reach Nettskjema: they answer a stand-in form, or run with no form addresses.
- In study mode the browser's storage holds progress, settings, the role, the «Om deg» answer and the study name; these leave the browser only as locked form fields. Nothing else is collected.
- The locked field `versjon` carries the package version and the short commit the workflow built (for example `3.0.0-98254ec`), so each answer can be traced to the build that collected it.

## The guide's reader

Informasjonsguiden and the margin «Hva DPS ser etter» read the referral text as it is written, section by section, for the five criteria a GP can document. The reader is a set of Norwegian and English word patterns in `app/src/engine/criteria.ts`. It runs in the browser, sends nothing anywhere and has no model behind it. It says «Omtalt» or «Ikke funnet ennå», never that something is missing or that what is written is enough, and it never blocks sending.

Its tests include phrase sets that agents wrote without seeing the reader. Each set was measured once, then added as a test that bounds the reader's error count on that set, so a later change cannot make it worse unnoticed.

## Checks

| Command (in `app/`) | What it checks |
|---|---|
| `npm run check:content` | The content files against their schema; every text in both languages; the copy rules (no em dash, no advice in ATLAS's own voice, no «vi», retired sentences and names); the instrument and the configuration; the reused texts |
| `npm run typecheck` | TypeScript, strict |
| `npm test` | 122 unit tests: the reader, the branch rules, the threads, the forms and locked fields, the theme overrides, the clock, placement and the configuration |
| `npm run e2e` | 174 end-to-end tests on the built site in Chromium: both study flows, review mode, keyboard paths, layouts from 320 px to 1920 px wide, forced colours, failure modes, and axe (WCAG 2.0, 2.1 and 2.2, A and AA; no serious or critical violation in ATLAS's own markup). A mock stands in for every form, so Nettskjema is never contacted |
| `npm run docs` | Writes the build sheet and the traceability table from their sources |

The Pages workflow runs all of them on every push to `main` and deploys only when every step passes. It also fails when the generated documents are out of date.

Before release the build went through eleven review rounds by reviewers who had not built it, each round covering function and accessibility; the last round found nothing critical or important. The review records are kept with the project's private records.

## Size

No script chunk is above 400 kB gzipped. At 3.0.0 the main chunk is about 375 kB gzipped and review mode loads as its own chunk of about 10 kB.

## Known limits

- Light theme only (forced colours are supported).
- Every target is at least 24 × 24 px; the study recommends a laptop, and touch sizes are not set.
- 2B-4 in the specification (patient trajectory input) is not built: no case reaches a treatment checkpoint ([TRACEABILITY.md](TRACEABILITY.md)).
- Two Nettskjema behaviours are checked in the pilot: whether a page with text only is allowed (the stop page of the case forms) and whether the receipt page keeps the button back to ATLAS.
