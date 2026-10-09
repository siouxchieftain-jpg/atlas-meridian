# Meridian

The design language for ATLAS (Adaptive Trust-calibration and Liaison Architecture for Specialist-referrals), built on Fluent 2. Version 1.0, for review.

On an atlas, a meridian is the line that joins the two poles. In ATLAS it joins the GP and the DPS clinician on one record.

All clinical content in these pages is fictional sample text.

## Pages

- **Design language**: principles, clinical guardrails, colour, typography, layout, shapes, elevation, material, motion, iconography, accessibility, content and tokens.
- **Components**: the Fluent 2 components ATLAS uses, with the ATLAS rules for each.
- **Clinical patterns**: ATLAS's own patterns, including the uncertainty band, refer or hold, the completeness guide, dialogue with DPS, tours and briefings.

`index.html` opens Design language.

## Viewing the pages

The pages load their sibling files, so they have to be served over http(s). Opening them straight from disk does not work. Use GitHub Pages (below), or start a local server in this folder:

```
python -m http.server 8000
```

Then open http://localhost:8000.

## Publishing with GitHub Pages

1. Create a new repository on github.com, for example `atlas-meridian`. On a free account, GitHub Pages needs a public repository.
2. Unzip this folder. In the new repository, select **uploading an existing file** (or **Add file → Upload files**). GitHub takes up to 100 files per upload, so upload the `assets` folder first and the remaining files second. GitHub Desktop has no such limit.
3. Open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then branch `main` and folder `/ (root)`, and save.
4. After a minute or two the site is at `https://<username>.github.io/atlas-meridian/`.

## Feedback

Every section has a **Gi tilbakemelding** button. The tab on the right edge of the window shows how many sections on the page have been reviewed. It opens an overview with a link to each section and the wrap-up questions.

- The first time, reviewers enter their name and role. Both are kept in their browser and sent with every answer.
- Until a Nettskjema address is added, the panel shows a preview form. Answers stay in the reviewer's browser and can be downloaded as CSV from the overview.
- Once a Nettskjema address is added, the form opens inside the panel with name, role, page, section and version filled in and locked. After sending, the reviewer selects **Jeg har sendt skjemaet** to mark the section as reviewed.

### Connecting Nettskjema

1. Create a new form for the design review.
2. Under **Rettigheter**, set **Hvem kan svare** to **Alle – uten innlogging**. Embedding and pre-filling need this setting; invite-only forms cannot be pre-filled.
3. Turn on the codebook.
4. Add five short text questions with these codebook names: `navn`, `rolle`, `side`, `seksjon`, `versjon`. Pre-filling works only for text and number questions.
5. Add the review questions. The drafts in `atlas-feedback-config.js` are a starting point. Once Nettskjema is connected, reviewers answer the questions in Nettskjema; the questions in the config file are used only by the preview form.
6. Add a short note saying why names are collected, who can read the answers and how long they are kept.
7. Open the form for answers. Copy its address from **Innhent svar** (it looks like `https://nettskjema.no/a/123456`) and paste it into `nettskjemaUrl` in `atlas-feedback-config.js`. On GitHub: open the file, select the pencil icon, paste the address and commit.
8. Optional: put the address of a separate wrap-up form in `wrapupUrl`.

| Codebook name | Filled with |
| --- | --- |
| `navn` | The name the reviewer entered |
| `rolle` | Fastlege, DPS-kliniker, Veileder or Ekstern fagperson |
| `side` | Design language, Components or Clinical patterns |
| `seksjon` | The section's id, for example `band` or `decision`; `avslutning` for the wrap-up |
| `versjon` | `1.0` |

## Files

- `ATLAS DS - Design language.dc.html`, `ATLAS DS - Components.dc.html`, `ATLAS DS - Clinical patterns.dc.html`: the three pages
- `ATLAS Feedback Button.dc.html`, `ATLAS Feedback Panel.dc.html`: the feedback button and side panel
- `atlas-feedback-config.js`: Nettskjema address, codebook names, roles and draft questions
- `support.js`: the runtime that renders the `.dc.html` pages
- `assets/icons/`: Fluent UI System Icons
- `index.html`: opens Design language
- `THIRD-PARTY-NOTICES.md`: licence for the icons

## Credits

Built on Fluent 2 by Microsoft. Icons are Fluent UI System Icons, MIT licence. Segoe UI is not included: Windows provides it, and other systems fall back to their own system font.
