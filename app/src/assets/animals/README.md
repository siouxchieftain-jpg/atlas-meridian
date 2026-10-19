# The study name's animals

The study name's mark (`StudyNameMark` in `src/patterns/basics.tsx`) shows the animal in the participant's study name
(«Rolig elg 27» → a moose) on the guide's warm gradient. The pictures are Fluent Emoji in their flat style, Microsoft's
open emoji set: https://github.com/microsoft/fluentui-emoji (MIT licence, `LICENSE.txt` in this folder).

One file per animal in `DYR` (`src/engine/studienavn.ts`), named by the animal with «æ», «ø» and «å» written «ae»,
«o» and «a». Exact animals only: a name never wears another animal's picture.

| Animal | Fluent Emoji |
|---|---|
| elg | Moose |
| ugle | Owl |
| bever | Beaver |
| rev | Fox |
| ulv | Wolf |
| oter | Otter |
| ekorn | Chipmunk |
| hare | Rabbit |
| ørn | Eagle |
| gås | Goose |
| sel | Seal |
| frosk | Frog |
| hjort | Deer |
| grevling | Badger |
| bjørn | Bear |
| svane | Swan |
| mus | Mouse |
| hval | Whale |
| bie | Honeybee |
| piggsvin | Hedgehog |

Until 3.3 the names also used gaupe, lunde, rein, trane and laks, which Unicode has no emoji for (lynx, puffin,
reindeer, crane, salmon). 3.4 no longer makes them. A name already given keeps working (`DYR_TIDLIGERE`) and keeps its
initials as its mark.

The only change from the originals: the fixed `width` and `height` are removed, so each picture scales from its
`viewBox`.
