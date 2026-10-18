# Meridian 1.1

Meridian 1.0 is the ATLAS design language as exported from the design tool on 2026-10-11 (`meridian/`, unchanged). Building ATLAS v3 on it needed rules that the pages do not yet state. This file gives them as rules for the next version, with how ATLAS v3 applies each, and lists two inconsistencies in the 1.0 pages for the next export.

## Settled and unchanged

- Brand ramp with brand 80 `#7160E8`; links and brand text use brand 60.
- The dawn gradient on guide surfaces only.
- The uncertainty band in option C: grey ends `#D1D1D1`, a sand grey zone `#D6C8A0`, no number and no ticks; the viewer's own marker 3 px `#242424` with a 1 px white keyline, the other clinician's marker white with a `#616161` outline, the system marker 4 px `#7160E8`; the caption «Viser usikkerhet, anbefaler ikke» on every instance; the band never animates.
- Segoe UI; Consolas for codes.
- Status colours for system feedback only, never for a clinical outcome or for urgency.
- Sentence case.

## Rules

| ID | Rule | In ATLAS v3 |
|---|---|---|
| G-01 | Layout by size class: one column below 640 px, with the navigation as a drawer; a 48 px rail from 640 px; the ATLAS side panel inline from 1024 px and an end overlay below that; Meridian's 260 px navigation from 1366 px. Where the ATLAS panel is an overlay, a compact band sits at the top of the content. | As stated. No screen scrolls sideways at 320 px. |
| G-02 | Targets are at least 24 × 24 px for a fine pointer and 44 × 44 px for touch. | Every target is at least 24 × 24 px, quiet ones too («Hopp over skjemaet», «Ikke svar nå» are small transparent buttons since 3.2); the study recommends a laptop, and the touch sizes are not set. |
| G-03 | Tabs, toolbars, breadcrumbs and tables keep their order when narrow and never make the page scroll sideways. | As stated. |
| G-04 | Every view has a title («`<view>` · ATLAS»), one `h1` and the landmarks header, navigation, main and the ATLAS aside; on a route change focus moves to the `h1`. No patient name in a title. | As stated, in both languages. |
| G-05 | Fluent components keep their own focus indicators; ATLAS's own parts take a 2 px outside ring (`colorStrokeFocus2`); a selected state never uses black; scroll padding keeps a focused element clear of the sticky header. | As stated. |
| G-06 | In forced colours the band keeps its meaning: a `GrayText` track, a bordered grey zone, the own marker in `CanvasText`, the other clinician hollow, the system marker in `Highlight`; the caption and the sentence stay text. | As stated. |
| G-07 | Reduced motion turns ATLAS's own transitions off; no blanket `animation: none`. | As stated. |
| G-08 | Motion map: clinical views change without a transition; a guide step cross-fades its text column in 400 ms; the band, the dawn and the sheen never move. | As stated. |
| G-09 | Light only; `color-scheme: light`. Forced colours stay fully supported. | As stated. |
| G-10 | Links and brand text use brand 60, hover brand 50, pressed brand 40. | As stated (theme overrides, checked by a unit test). |
| G-11 | Where Meridian follows the design site (radius, shadows, Subtitle 1), the theme overrides Fluent's code values, and each Meridian name is written next to its code token. | As stated (theme overrides, checked by a unit test). |
| G-12 | Loading: nothing at first; a delayed spinner with a label after that. | The form panel shows a labelled spinner after one second, and review mode's first load after 300 ms. |
| G-13 | Errors sit with what failed and offer the next step. | A form that does not load says so in the panel and offers a new tab: «Skjemaet lastet ikke her. Åpne det i en ny fane.» |
| G-14 | Every view that depends on data has an empty state: one sentence and at most one secondary action, never the sheen or a gradient. | Mitt henvisningsmønster and Kalibrering have a «no data yet» state; an empty section reads «Tom». |
| G-15 | Toasts confirm system events only, and never carry a needed action. | ATLAS v3 uses no toasts: a confirmation sits where the action led. |
| G-16 | Message bars sit under the page or panel title, informative for clinical notices, and an action bar returns until resolved. | As stated; since 3.2 the study's «Uten ATLAS» notice, the task line with ATLAS and the held lines on «Sendt» and «Din plan» are message bars under the case header. |
| G-17 | A tooltip only names an icon-only control (or adds a short extra); a definition opens in a popover, never a tooltip; one tooltip appearance everywhere. | The rail's items and the review tab when it shows its icon only; tag definitions open as notes. The review tab's tooltip still draws Fluent's arrow, which the rail's do not; it goes in the next build. |
| G-18 | A control that cannot be used yet stays in the tab order (`disabledFocusable`) with its reason shown and linked. | As stated (for example «Vis ATLAS» and «Send»). |
| G-19 | Validation on blur and submit, never per keystroke; only for missing or malformed data, never on a clinical field. | The preview forms. |
| G-20 | Decision controls are one choice group on native radios: equal size, fixed order, nothing pre-selected; selected is a brand outline and tint. | Behold and Henvis, the DPS outcomes, the plan, the reviewer's role, and «Din trygghet nå» as a scale in one row (3.2). |
| G-21 | The 48 px rail: icon links with `aria-current`, a 4 px brand indicator, a tooltip with the item's name and arrow-key movement. | As stated. |
| G-22 | Fixed icon meanings, with no clashes: «Rett til helsehjelp» uses `arrow_enter`; «Fiktiv pasient» uses `beaker`; status icons mean system state only. | As stated. |
| G-23 | Print shows the content without the shell, panels, the feedback tab or the dawn; the band prints with its caption and sentence. | As stated. |
| G-24 | Text on the dawn uses Foreground 1, Foreground 2 or brand 60 only. | As stated. |
| G-25 | The band is an `aria-hidden` SVG beside its sentence; the other clinician's outline is `#616161`. | As stated. |
| G-26 | Clinical content is third person and describes; interface mechanics may use short imperatives; guide surfaces may say «du» to describe options, never to advise. | As stated. |
| G-27 | Fluent's English strings are replaced in Norwegian; dates and numbers use `nb-NO` formats; English lines carry `lang="en"`. | As stated; every text also exists in English, and the language toggle switches all of it. |
| G-28 | A confirmation that follows typing is said only after typing pauses. | The guide's count is said once the writer pauses. |
| G-29 | A tour is short parts of at most four steps, can be skipped, and opens again from Hjelp. | As stated. |
| G-30 | Guidance never traps focus or blocks clinical work. | ATLAS v3 has no coachmarks; the tour's live frames never trap focus. |
| G-31 | A live framed window runs the real component in a sandbox, on a solid white card. | The tour's frames: nothing done in a frame is saved. |
| G-32 | One announcer at the root; one announcement per user event; nothing said on a revisit or a language switch. | As stated. |
| G-33 | A text area grows with its content up to 60 % of the window, then scrolls. | As stated. |
| G-34 | Role avatars show a role icon on brand tint with a 1 px tint border, never initials. | As stated. |

## Two inconsistencies in the 1.0 pages, for the next export

1. **Link colour.** The Components page and the token table show links at brand 70 at rest. The settled rule is brand 60 (G-10).
2. **The band.** The workspace sample in Clinical patterns still draws the band in option A («Band shown with option A until the scale decision below is made»), and the band section still asks for a decision between A, B and C. Option C is settled.

## Sample names, for the next export

The patient list in `ATLAS App.dc.html` uses «Ingrid Moe» and «Jonas Lie». ATLAS v3 renamed them «Ingrid Myhre» and «Jonas Brekke»; the next export should use the same names.
