import { Button, makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import {
  ArrowReply20Regular,
  ArrowRight16Regular,
  ArrowRight20Regular,
  ArrowForward20Regular,
  CalendarLtr20Regular,
  Chat20Regular,
  CheckmarkCircle16Filled,
  ClipboardPulse20Regular,
  Clock20Regular,
  Document20Regular,
  DocumentEdit20Regular,
  Form20Regular,
  Mail20Regular,
  Map16Regular,
  PeopleTeam20Regular,
  Pill20Regular,
  Video20Regular,
  WeatherMoon20Regular,
} from '@fluentui/react-icons';
import { useEffect, useId, useState, type ReactNode } from 'react';
import type { CoreCaseId, DayTodo, Role, Upcoming } from '../content/types';
import { cases, ordinary, pattern, shared, startDay, vocab } from '../content';
import { capitalFirst, formatDateWithWeekday, formatDayMonth, formatMonthShort, formatWeekdayDayMonth, numberWord, useLang } from '../i18n/i18n';
import { DPS_TODAY, GP_TODAY } from '../engine/clock';
import { navigate, useRoute } from '../router/router';
import { useStudy } from '../state/study';
import { GuideImage, SheenButton, SrOnly, StudyNameMark, guideCardSurface, srOnly } from '../patterns/basics';
import { guide, neutralBar } from '../theme/constants';
import { PageHeading } from '../shell/PageHeading';
import { TourStepDialog } from '../tour/Tour';
import { focusAfterOverlay } from '../patterns/announce';
import { useWidth } from '../patterns/useWidth';
import { HOME_PATH, LIST_PATH, useStudyController } from './controller';
import { CORE, caseInProgress, casesDone, currentCase } from './parts';
import { DeadlineStrip, Deadlines, ExampleGroup, HomeCard, NewBadge } from './homeParts';
import { StudyCases, StudyMeta, useStudyStep } from './StudyCard';
import { TourStartDialog } from './TourStart';

/**
 * The start page (3.4, built from board 12a; 3.5 brings back the rest of 12a): where the participant arrives after Om
 * deg, after the tour, after a pause and after the three cases. The greeting holds the study's next step and its one
 * sheen, which leads to the list where every case starts. Under it, the day around the study, as a working system
 * shows it: the key figures, the day as a time line with the day's tasks, what came in, the referrals with their
 * deadlines, the GP's own pattern, Delt oversikt and what is coming up; for DPS the intake, its deadlines, the messages,
 * the day and what is coming up. Nothing here opens a case, and nothing here hints at one: DPS's reply about Astrid is a
 * reply, never its outcome, and the parts that show outcomes (the GP's own pattern, Delt oversikt) open when the three
 * cases are done. What only shows an ordinary day sits in grey groups labelled as examples.
 */
const useStyles = makeStyles({
  page: { marginBlockStart: '8px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 },
  // The greeting: text on the card's own warm colour, the role's wave in a cell of its own beside it (wide), or in a
  // band above it (narrow), so no text ever sits on the artwork. The three cases run along its foot.
  hero: { ...guideCardSurface, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateAreas: '"text" "foot"', boxShadow: tokens.shadow4 },
  heroWide: { gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 42%)', gridTemplateAreas: '"text art" "foot foot"' },
  // The band ends above the text: text never sits on the artwork (G-35).
  heroBand: { height: '72px' },
  heroText: {
    gridArea: 'text',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '10px',
    minWidth: 0,
    paddingInline: '20px',
    paddingBlockStart: '76px',
    paddingBlockEnd: '20px',
    '@media (min-width: 640px)': { paddingInline: '28px' },
  },
  heroTextWide: { paddingBlockStart: '28px', paddingBlockEnd: '24px' },
  heroArt: { gridArea: 'art', position: 'relative', isolation: 'isolate', minHeight: '200px' },
  greet: { display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 },
  greetText: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  greeting: { ...typographyStyles.body1Strong, margin: 0, color: guide.ink },
  title: { ...typographyStyles.title2, '@media (max-width: 479px)': { ...typographyStyles.subtitle1 } },
  lead: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2, maxWidth: '64ch' },
  actions: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: '20px', rowGap: '8px', marginBlockStart: '6px' },
  start: { maxWidth: '100%', height: 'auto', minHeight: '40px', whiteSpace: 'normal', textAlign: 'start' },
  tourLink: {
    minWidth: 0,
    height: 'auto',
    minHeight: '24px',
    paddingInline: 0,
    ...typographyStyles.body1Strong,
    color: guide.ink,
    ':hover': { color: guide.ink, textDecoration: 'underline' },
    ':hover:active': { color: guide.ink },
  },
  heroFoot: {
    gridArea: 'foot',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: '20px',
    rowGap: '8px',
    paddingInline: '20px',
    paddingBlock: '12px',
    borderTop: `1px solid ${guide.track}`,
    backgroundColor: 'rgba(255,255,255,0.62)',
    '@media (min-width: 640px)': { paddingInline: '28px' },
    '@media (forced-colors: active)': { borderTop: '1px solid CanvasText' },
  },
  casesLabel: { ...typographyStyles.caption1Strong, color: guide.ink },
  pause: { ...typographyStyles.caption1, margin: 0, marginInlineStart: 'auto', color: tokens.colorNeutralForeground2 },
  // The parts under the greeting (3.5): a twelve-column grid, the parts in rows as board 12a lays them out, more of them
  // side by side as the page widens. The page measures its own width, never the window's, so an open form panel beside
  // it counts. The parts in a row are as tall as the row, so the row reads as one band.
  parts: { display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '16px', alignItems: 'stretch', minWidth: 0 },
  cell: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    '& > section': { flexGrow: 1 },
  },
  lockedPair: { flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px', '& > section': { flexGrow: 1, flexBasis: 0 } },
  // Rows inside a part: a picture (an icon or initials), what and who, and a date or a tag at the end.
  rows: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  row: {
    display: 'grid',
    gridTemplateColumns: '32px minmax(0, 1fr) auto',
    alignItems: 'center',
    columnGap: '12px',
    paddingBlock: '8px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    ':first-child': { borderTop: 'none', paddingBlockStart: 0 },
  },
  rowQuiet: { gridTemplateColumns: '24px minmax(0, 1fr) auto', paddingBlock: '6px', borderTop: `1px solid ${tokens.colorNeutralStroke2}`, color: tokens.colorNeutralForeground2 },
  rowIcon: {
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...typographyStyles.caption1Strong,
  },
  rowIconQuiet: { width: '24px', height: '24px', backgroundColor: 'transparent', color: tokens.colorNeutralForeground3 },
  rowText: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  rowName: { ...typographyStyles.body1, color: tokens.colorNeutralForeground1, overflowWrap: 'anywhere', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  rowNameNew: { ...typographyStyles.body1Strong },
  rowWhat: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2, overflowWrap: 'anywhere' },
  rowEnd: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2, whiteSpace: 'nowrap', textAlign: 'end' },
  dot: {
    flex: '0 0 8px',
    width: '8px',
    height: '8px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground,
    '@media (forced-colors: active)': { backgroundColor: 'CanvasText' },
  },
  // «Sak 3» at a row's end: plain text, never a bordered tag that reads as a small button.
  tag: { ...typographyStyles.caption1Strong, color: tokens.colorNeutralForeground2, whiteSpace: 'nowrap' },
  exList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  exLine: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  quiet: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground2 },
  subHead: { ...typographyStyles.body1Strong, margin: 0 },
  // The key figures (12a, part 2): four counts as plain text in one band, a rule between them. No tile, no hover,
  // nothing that looks like a control (Meridian: counts are plain text).
  figCard: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    paddingInline: '20px',
    paddingBlock: '16px',
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow4,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  figs: { margin: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', rowGap: '16px' },
  figs4: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
  fig: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, paddingInline: '16px', ':first-child': { paddingInlineStart: 0 } },
  // Two by two: a rule between the columns. Four across: a rule before every figure but the first.
  figRule2: { ':nth-child(even)': { borderLeft: `1px solid ${tokens.colorNeutralStroke2}` }, ':nth-child(odd)': { paddingInlineStart: 0 } },
  figRule4: { ':not(:first-child)': { borderLeft: `1px solid ${tokens.colorNeutralStroke2}` } },
  figLabel: { ...typographyStyles.caption1Strong, margin: 0, display: 'flex', alignItems: 'center', gap: '6px', color: tokens.colorNeutralForeground2 },
  figIcon: { display: 'inline-flex', color: tokens.colorNeutralForeground3, flex: '0 0 auto' },
  figValue: { margin: 0, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: '6px' },
  figNum: { ...typographyStyles.title3, fontVariantNumeric: 'tabular-nums', color: tokens.colorNeutralForeground1 },
  figUnit: { ...typographyStyles.body1, color: tokens.colorNeutralForeground2 },
  figSub: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground2, overflowWrap: 'anywhere' },
  figNote: { ...typographyStyles.caption1, margin: 0, marginBlockStart: '12px', color: tokens.colorNeutralForeground2 },
  // The day's tasks and what is coming up: examples, side by side where there is room.
  todoList: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', columnGap: '20px', rowGap: '10px' },
  todo: { display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr)', columnGap: '10px', alignItems: 'start', minWidth: 0 },
  todoIcon: { display: 'inline-flex', color: tokens.colorNeutralForeground3, paddingBlockStart: '1px' },
  todoWhat: { ...typographyStyles.caption1Strong, color: tokens.colorNeutralForeground2, overflowWrap: 'anywhere' },
  upList: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', columnGap: '20px', rowGap: '14px' },
  upWhen: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  upTitle: { ...typographyStyles.body1Strong, color: tokens.colorNeutralForeground2, overflowWrap: 'anywhere' },
  // «Henvisningene mine» as a table (12a, part 5): the study's referral first, then the examples in a grey group of rows
  // under their label. Where each referral is goes in words beside four small steps, so the steps never carry the
  // meaning alone.
  table: { width: '100%', borderCollapse: 'collapse', ...typographyStyles.body1 },
  th: { ...typographyStyles.caption1Strong, color: tokens.colorNeutralForeground2, textAlign: 'start', paddingBlock: '0 8px', paddingInlineEnd: '12px', borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, whiteSpace: 'nowrap' },
  td: { paddingBlock: '10px', paddingInlineEnd: '12px', verticalAlign: 'top', borderBottom: `1px solid ${tokens.colorNeutralStroke3}` },
  tdName: { fontWeight: tokens.fontWeightRegular, textAlign: 'start' },
  tdDate: { whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  tdLast: { paddingInlineEnd: 0 },
  exBody: { color: tokens.colorNeutralForeground2, ...typographyStyles.caption1 },
  exCell: { backgroundColor: tokens.colorNeutralBackground2, paddingBlock: '7px', borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, ':first-child': { paddingInlineStart: '12px' } },
  exHead: {
    ...typographyStyles.caption1Strong,
    textAlign: 'start',
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground2,
    paddingBlock: '8px',
    paddingInline: '12px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    '@media (forced-colors: active)': { borderTop: '1px dashed CanvasText' },
  },
  where: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', minWidth: 0 },
  whereText: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  stages: { position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '8px', paddingBlock: '2px' },
  stagesLine: {
    position: 'absolute',
    left: '5px',
    right: '5px',
    top: '50%',
    height: '1px',
    backgroundColor: tokens.colorNeutralStroke1,
    '@media (forced-colors: active)': { forcedColorAdjust: 'none', backgroundColor: 'CanvasText' },
  },
  stage: {
    position: 'relative',
    width: '10px',
    height: '10px',
    boxSizing: 'border-box',
    borderRadius: tokens.borderRadiusCircular,
    border: `1px solid ${tokens.colorNeutralStrokeAccessible}`,
    backgroundColor: tokens.colorNeutralBackground1,
    '@media (forced-colors: active)': { forcedColorAdjust: 'none', border: '1px solid CanvasText', backgroundColor: 'Canvas' },
  },
  stageDone: {
    backgroundColor: tokens.colorNeutralForeground2,
    border: `1px solid ${tokens.colorNeutralForeground2}`,
    '@media (forced-colors: active)': { backgroundColor: 'CanvasText' },
  },
  stageAsked: {
    width: '14px',
    height: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    lineHeight: '10px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  deadlines: { display: 'flex', flexDirection: 'column', gap: '8px', paddingBlockStart: '4px' },
  refLayout: { display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 },
  refSide: { display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(400px, 2fr)', columnGap: '32px', alignItems: 'start' },
  // Part 3: the GP's own pattern, as the tour showed it, with the referrals per quarter as 12a drew them. The greys are
  // the information, so forced colours keep them.
  patternTotal: { ...typographyStyles.body1, margin: 0 },
  patternNum: { ...typographyStyles.subtitle1, marginInlineEnd: '4px' },
  quarters: { margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' },
  // Every quarter's track starts at the same height, so the bars stand on one line whatever the label under them.
  qBars: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', columnGap: '8px', alignItems: 'start' },
  qItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: 0 },
  qNum: { ...typographyStyles.caption1Strong, fontVariantNumeric: 'tabular-nums' },
  qTrack: { height: '64px', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  // The quarters in one fill that no outcome in the legend below uses: a count per quarter, never an outcome.
  qBar: {
    width: 'min(28px, 70%)',
    borderTopLeftRadius: '3px',
    borderTopRightRadius: '3px',
    backgroundColor: tokens.colorNeutralStroke1Pressed,
    boxSizing: 'border-box',
    '@media (forced-colors: active)': { forcedColorAdjust: 'none', backgroundColor: 'Canvas', border: '1px solid CanvasText' },
  },
  qLabel: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2, whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  qSoFar: { ...typographyStyles.caption2, color: tokens.colorNeutralForeground2 },
  bar: {
    display: 'flex',
    height: '10px',
    borderRadius: '5px',
    overflow: 'hidden',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    '@media (forced-colors: active)': { forcedColorAdjust: 'none', border: '1px solid CanvasText' },
  },
  legend: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' },
  legendRow: { display: 'grid', gridTemplateColumns: '10px minmax(0, 1fr) auto', alignItems: 'center', columnGap: '8px', ...typographyStyles.caption1 },
  swatch: {
    width: '10px',
    height: '10px',
    borderRadius: '2px',
    border: `1px solid ${tokens.colorNeutralStrokeAccessible}`,
    boxSizing: 'border-box',
    '@media (forced-colors: active)': { forcedColorAdjust: 'none', border: '1px solid CanvasText' },
  },
  legendNum: { ...typographyStyles.caption1Strong, fontVariantNumeric: 'tabular-nums' },
  openBtn: { alignSelf: 'flex-start', minWidth: 0, paddingInline: 0, height: '28px', ...typographyStyles.body1Strong, marginBlockStart: 'auto' },
  sharedBlock: { display: 'flex', flexDirection: 'column', gap: '4px' },
  sharedHead: { ...typographyStyles.body1Strong, margin: 0 },
  sharedText: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  // Delt oversikt's changes to the criteria on a short line, oldest to latest, the latest filled.
  changesWrap: { position: 'relative', paddingBlockStart: '2px' },
  changes: { position: 'relative', listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
  changesLine: {
    position: 'absolute',
    left: '5px',
    right: '5px',
    top: '7px',
    height: '1px',
    backgroundColor: tokens.colorNeutralStroke1,
    '@media (forced-colors: active)': { forcedColorAdjust: 'none', backgroundColor: 'CanvasText' },
  },
  change: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: 0 },
  changeFirst: { alignItems: 'flex-start' },
  changeLast: { alignItems: 'flex-end' },
  changeDot: {
    width: '12px',
    height: '12px',
    boxSizing: 'border-box',
    borderRadius: tokens.borderRadiusCircular,
    border: `2px solid ${tokens.colorNeutralForeground2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    marginBlockStart: '1px',
    '@media (forced-colors: active)': { forcedColorAdjust: 'none', border: '2px solid CanvasText', backgroundColor: 'Canvas' },
  },
  changeDotLatest: { backgroundColor: tokens.colorNeutralForeground1, border: `2px solid ${tokens.colorNeutralForeground1}`, '@media (forced-colors: active)': { backgroundColor: 'CanvasText' } },
  changeLabel: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2, whiteSpace: 'nowrap' },
  changeLabelLatest: { ...typographyStyles.caption1Strong, color: tokens.colorNeutralForeground1 },
  // The day: a time strip from 08 to 16 (3.5: the whole day, as 12a drew it), or a plain list when the part is narrow.
  stripWrap: { display: 'flex', flexDirection: 'column', gap: '8px' },
  srLine: { margin: 0, height: 0 },
  strip: { position: 'relative', height: '100px', marginInline: '2px' },
  hour: {
    position: 'absolute',
    top: '80px',
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: 'tabular-nums',
    transform: 'translateX(-50%)',
  },
  hourFirst: { transform: 'none' },
  hourLast: { transform: 'translateX(-100%)' },
  tick: { position: 'absolute', top: '74px', width: '1px', height: '4px', backgroundColor: tokens.colorNeutralStroke1 },
  // The blocks sit over the «Nå» line, so it never crosses a label; the «Nå» pill sits over both.
  blocks: { listStyle: 'none', margin: 0, padding: 0, position: 'absolute', left: 0, right: 0, top: '24px', height: '46px', zIndex: 1 },
  block: {
    position: 'absolute',
    top: 0,
    height: '46px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingInline: '3px',
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    ...typographyStyles.caption1,
    whiteSpace: 'nowrap',
  },
  blockCase: { backgroundColor: tokens.colorNeutralBackground1, border: `1px solid ${tokens.colorNeutralStrokeAccessible}`, color: tokens.colorNeutralForeground1 },
  blockNow: { border: `2px solid ${tokens.colorBrandStroke1}`, backgroundColor: tokens.colorBrandBackground2, '@media (forced-colors: active)': { border: '2px solid Highlight' } },
  // A case that is done steps back: quiet fill, quiet edge, a tick. Never a box with a mark in it (that reads as a
  // checkbox).
  blockDone: { backgroundColor: tokens.colorNeutralBackground2, border: `1px solid ${tokens.colorNeutralStroke2}`, color: tokens.colorNeutralForeground3 },
  blockRoutine: {
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground2,
    '@media (forced-colors: active)': { border: '1px dashed CanvasText' },
  },
  blockOther: {
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    color: tokens.colorNeutralForeground2,
    '@media (forced-colors: active)': { border: '1px dotted CanvasText' },
  },
  blockTick: { display: 'block', color: tokens.colorNeutralForeground3 },
  blockInner: { display: 'inline-flex', alignItems: 'center', gap: '4px', maxWidth: '100%', minWidth: 0 },
  blockStack: { display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '14px' },
  blockTime: { ...typographyStyles.caption2, color: tokens.colorNeutralForeground2, fontVariantNumeric: 'tabular-nums' },
  blockWho: { ...typographyStyles.caption1Strong, display: 'inline-flex', alignItems: 'center', gap: '2px' },
  blockLabel: { maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' },
  blockWhoSlot: { paddingInline: 0 },
  // A stretch of the day: its label on one line, or two, or in the smaller type, as measured for its width.
  fitTwo: { whiteSpace: 'normal', textAlign: 'center', lineHeight: '14px', overflowWrap: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  fitSmall: { ...typographyStyles.caption2 },
  now: {
    position: 'absolute',
    top: 0,
    zIndex: 2,
    transform: 'translateX(-50%)',
    display: 'inline-flex',
    alignItems: 'center',
    height: '20px',
    paddingInline: '8px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    ...typographyStyles.caption1Strong,
    whiteSpace: 'nowrap',
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  nowLine: { position: 'absolute', top: '20px', zIndex: 0, height: '54px', marginLeft: '-1px', borderLeft: `2px solid ${tokens.colorBrandStroke1}` },
  legendLine: { display: 'flex', flexWrap: 'wrap', columnGap: '16px', rowGap: '4px', margin: 0, ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: '6px' },
  legendSwatch: { width: '16px', height: '10px', borderRadius: '3px', boxSizing: 'border-box' },
  legendSwatchQuiet: { border: `1px solid ${tokens.colorNeutralStroke1}` },
  dayList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  dayRow: {
    display: 'grid',
    gridTemplateColumns: '92px minmax(0, 1fr) auto',
    alignItems: 'center',
    columnGap: '12px',
    paddingBlock: '7px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    ...typographyStyles.body1,
    ':first-child': { borderTop: 'none' },
  },
  dayRowQuiet: { color: tokens.colorNeutralForeground2 },
  dayRowNow: { boxShadow: `inset 3px 0 0 ${tokens.colorBrandStroke1}`, paddingInlineStart: '8px' },
  dayTime: { fontVariantNumeric: 'tabular-nums', ...typographyStyles.body1Strong },
  dayTimeQuiet: { fontWeight: tokens.fontWeightRegular },
  dayState: { ...typographyStyles.caption1Strong, color: guide.ink, display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' },
  dayStateDone: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
});

/** The strip's text measured in the page's own font, so a slot shows only what fits in it. */
let measureCtx: CanvasRenderingContext2D | null | undefined;
function textWidth(text: string, size: number, weight = 400): number {
  if (measureCtx === undefined) measureCtx = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * size * 0.56;
  measureCtx.font = `${weight} ${size}px ${getComputedStyle(document.body).fontFamily}`;
  return measureCtx.measureText(text).width;
}

/** Whether a text breaks into two lines of `room` at most, between its words. */
function fitsInTwo(text: string, size: number, room: number): boolean {
  const words = text.split(' ');
  if (words.length < 2) return false;
  for (let i = 1; i < words.length; i++) {
    if (textWidth(words.slice(0, i).join(' '), size) <= room && textWidth(words.slice(i).join(' '), size) <= room) return true;
  }
  return false;
}

type Fit = 'one' | 'two' | 'small' | 'smallTwo' | 'clip';

/** How a stretch's label fits its slot: one line, two, the smaller type on one line or two, or cut with an ellipsis. */
function fitLabel(label: string, room: number): Fit {
  if (textWidth(label, 12) <= room) return 'one';
  if (fitsInTwo(label, 12, room)) return 'two';
  if (textWidth(label, 10) <= room) return 'small';
  if (fitsInTwo(label, 10, room)) return 'smallTwo';
  return 'clip';
}

/** «09:30» → minutes since midnight. */
function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** «Kari Nordli, 34 år»: the age never breaks from its «år» at a line's end. */
function keepAge(name: string): string {
  return name.replace(/ (år)$/, ' $1');
}

/** «a, b og c» / «a, b and c». */
function listOf(items: string[], lang: 'nb' | 'en'): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${lang === 'nb' ? 'og' : 'and'} ${items[items.length - 1]}`;
}

/** «9. mars», «19 March»: the day and its month on one line. */
function keepDate(text: string): string {
  return text.replace(/(\d{1,2}\.?) (?=\p{L})/gu, '$1\u00a0');
}

function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** The three cases are done: part 3, where the parts that show outcomes open. */
function useCasesDone(): boolean {
  const study = useStudy();
  return casesDone(study.state) === CORE.length;
}

/* ---------- The layout ---------- */

type PartKey = 'tall' | 'dag' | 'innboks' | 'henvisninger' | 'monster' | 'delt' | 'lukket' | 'kommende' | 'inntak' | 'frister' | 'meldinger';
type Cols = 1 | 2 | 3 | 4;

/**
 * Where each part goes, by role and by how many columns the page has room for: each part with its span of twelve, in
 * reading order. Three columns is board 12a at a laptop's width: the key figures, then the day beside the inbox, the
 * referrals beside the pattern and Delt oversikt, and what is coming up across the foot. Four, on a big screen, lifts
 * «Kommende» into the first row, so two rows hold the whole day. «Frister» always keeps 400 px or more (G-39).
 */
const LAYOUT: Record<Role, Record<Cols, [PartKey, number][]>> = {
  gp: {
    4: [['tall', 12], ['dag', 6], ['innboks', 3], ['kommende', 3], ['henvisninger', 6], ['monster', 3], ['delt', 3]],
    3: [['tall', 12], ['dag', 8], ['innboks', 4], ['henvisninger', 6], ['monster', 3], ['delt', 3], ['kommende', 12]],
    2: [['tall', 12], ['dag', 12], ['innboks', 6], ['kommende', 6], ['henvisninger', 12], ['monster', 6], ['delt', 6]],
    1: [['tall', 12], ['dag', 12], ['innboks', 12], ['henvisninger', 12], ['monster', 12], ['delt', 12], ['kommende', 12]],
  },
  dps: {
    4: [['tall', 12], ['inntak', 6], ['frister', 3], ['meldinger', 3], ['dag', 6], ['kommende', 3], ['delt', 3]],
    3: [['tall', 12], ['inntak', 7], ['frister', 5], ['dag', 8], ['meldinger', 4], ['kommende', 8], ['delt', 4]],
    2: [['tall', 12], ['inntak', 12], ['frister', 12], ['dag', 12], ['meldinger', 6], ['delt', 6], ['kommende', 12]],
    1: [['tall', 12], ['inntak', 12], ['frister', 12], ['dag', 12], ['meldinger', 12], ['delt', 12], ['kommende', 12]],
  },
};

/**
 * Before part 3 the GP's pattern and Delt oversikt are locked, and a locked part has nothing to show but its lock. So
 * on a laptop and a big screen the two share one column beside the referrals, one above the other, and the referrals
 * take the room they leave (their deadlines go beside the table on a big screen).
 */
const GP_LOCKED: Partial<Record<Cols, [PartKey, number][]>> = {
  4: [['tall', 12], ['dag', 6], ['innboks', 3], ['kommende', 3], ['henvisninger', 9], ['lukket', 3]],
  3: [['tall', 12], ['dag', 8], ['innboks', 4], ['henvisninger', 8], ['lukket', 4], ['kommende', 12]],
};

export function HomePage() {
  const cls = useStyles();
  const study = useStudy();
  const route = useRoute();
  const role: Role = study.role ?? 'gp';
  const st = study.state;
  // «Start omvisningen» opens the card before the tour; an address that asked for the tour opens it too.
  const [tourCard, setTourCard] = useState(() => route.query.has('omvisning') && !st.tour.started && !st.tour.done);
  const [stepDialog, setStepDialog] = useState<string | null>(null);
  useEffect(() => {
    if (route.query.has('omvisning')) navigate(HOME_PATH, { replace: true });
  }, [route.query]);
  const [gridRef, width] = useWidth<HTMLDivElement>();
  const cols: Cols = width >= 1800 ? 4 : width >= 1080 ? 3 : width >= 640 ? 2 : 1;
  const open = useCasesDone();
  const part = (key: PartKey): ReactNode => {
    switch (key) {
      case 'tall':
        return role === 'gp' ? <GpFigures /> : <DpsFigures />;
      case 'dag':
        return role === 'gp' ? <DayPart /> : <DpsDayPart />;
      case 'innboks':
        return <GpInbox />;
      case 'henvisninger':
        return <GpReferrals />;
      case 'monster':
        return <GpPattern locked={!open} onOpen={() => setStepDialog('gp-monster')} />;
      case 'delt':
        return <SharedPart role={role} locked={!open} onOpen={() => setStepDialog(role === 'gp' ? 'gp-kalibrering' : 'dps-kalibrering')} />;
      case 'lukket':
        return (
          <div className={cls.lockedPair}>
            <GpPattern locked onOpen={() => setStepDialog('gp-monster')} />
            <SharedPart role={role} locked onOpen={() => setStepDialog('gp-kalibrering')} />
          </div>
        );
      case 'kommende':
        return <UpcomingPart items={role === 'gp' ? startDay.upcoming : startDay.dpsUpcoming} today={role === 'gp' ? GP_TODAY : DPS_TODAY} />;
      case 'inntak':
        return <DpsIntake />;
      case 'frister':
        return <Deadlines framed />;
      case 'meldinger':
        return <DpsMessages />;
    }
  };
  return (
    <div className={cls.page} data-start-page="">
      <Hero onStartTour={() => setTourCard(true)} />
      <div ref={gridRef} className={cls.parts} data-columns={cols}>
        {((role === 'gp' && !open && GP_LOCKED[cols]) || LAYOUT[role][cols]).map(([key, span]) => (
          <div key={key} className={cls.cell} style={{ gridColumn: `span ${span} / span ${span}` }} data-cell={key}>
            {part(key)}
          </div>
        ))}
      </div>
      <TourStartDialog
        open={tourCard}
        onClose={() => {
          setTourCard(false);
          focusAfterOverlay(() => document.querySelector<HTMLElement>('[data-start-tour]') ?? document.querySelector<HTMLElement>('main h1'));
        }}
      />
      <TourStepDialog
        role={role}
        stepId={stepDialog}
        onClose={() => {
          const id = stepDialog;
          setStepDialog(null);
          focusAfterOverlay(() => document.querySelector<HTMLElement>(`[data-open-step="${id}"]`));
        }}
      />
    </div>
  );
}

/* ---------- The greeting ---------- */

function Hero({ onStartTour }: { onStartTour: () => void }) {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const step = useStudyStep();
  const casesId = useId();
  const [ref, width] = useWidth<HTMLElement>();
  const wide = width >= 960;
  const role: Role = study.role ?? 'gp';
  const st = study.state;
  const current = currentCase(st);
  const name = st.studienavn;
  let action: ReactNode;
  if (step.kind === 'tour') {
    action = (
      <SheenButton className={cls.start} icon={<ArrowRight20Regular />} iconPosition="after" onClick={onStartTour} data-start-tour="">
        {s('studyCardStartTour')}
      </SheenButton>
    );
  } else if (step.kind === 'tourGoOn') {
    action = (
      <SheenButton className={cls.start} icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => navigate('/studie/omvisning')}>
        {s('studyCardTourGoOn')}
      </SheenButton>
    );
  } else if (step.kind === 'case' && current && caseInProgress(st, current)) {
    // A case left in the middle goes on where it was; every new case starts from the list.
    action = (
      <SheenButton className={cls.start} icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => navigate(`/studie/sak/${current}`)} data-open-case={current}>
        {s('continueCase')}
      </SheenButton>
    );
  } else if (step.kind === 'case') {
    action = (
      <SheenButton className={cls.start} icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => navigate(LIST_PATH)} data-to-list="">
        {s(role === 'gp' ? 'startToListGp' : 'startToListDps')}
      </SheenButton>
    );
  } else {
    const atHelhet = st.furthest === 'helhet';
    action = (
      <SheenButton className={cls.start} icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => (atHelhet ? ctl.goToStep('helhet') : navigate(ctl.currentPath()))}>
        {atHelhet ? s('studyCardToEnd') : s('continue')}
      </SheenButton>
    );
  }
  return (
    <section ref={ref} className={mergeClasses(cls.hero, wide && cls.heroWide)} aria-labelledby="start-title" data-start-hero="" data-guide-surface="">
      {!wide && <GuideImage variant="band" className={cls.heroBand} />}
      <div className={mergeClasses(cls.heroText, wide && cls.heroTextWide)}>
        <div className={cls.greet}>
          {name && <StudyNameMark name={name} size={width >= 480 ? 56 : 40} />}
          <div className={cls.greetText}>
            <p className={cls.greeting} data-start-greeting="">
              {name ? (
                <>
                  {s('startGreetingLead')}{' '}
                  <span lang="nb" data-studienavn-value="">
                    {name}
                  </span>
                </>
              ) : (
                step.eyebrow
              )}
            </p>
            <div id="start-title">
              <PageHeading title={s('navHome')} className={cls.title}>
                {step.title}
              </PageHeading>
            </div>
          </div>
        </div>
        {step.kind === 'case' && <StudyMeta meta={step.meta} />}
        {step.text && <p className={cls.lead}>{step.text}</p>}
        {step.kind !== 'case' && <StudyMeta meta={step.meta} />}
        {step.kind === 'end' && <p className={cls.lead}>{s(role === 'gp' ? 'startEndLookGp' : 'startEndLookDps')}</p>}
        <div className={cls.actions}>
          {action}
          {st.tour.done && (
            <Button appearance="transparent" className={cls.tourLink} icon={<Map16Regular />} onClick={() => navigate('/studie/omvisning?igjen')}>
              {s('guideTourAgain')}
            </Button>
          )}
        </div>
      </div>
      {wide && (
        <div className={cls.heroArt}>
          <GuideImage variant="home" />
        </div>
      )}
      <div className={cls.heroFoot}>
        <span className={cls.casesLabel} id={casesId}>
          {s('guideCasesLabel')}
        </span>
        <StudyCases row labelledBy={casesId} />
        <p className={cls.pause}>{s('homePause')}</p>
      </div>
    </section>
  );
}

/* ---------- The key figures ---------- */

interface Figure {
  key: string;
  icon: ReactNode;
  label: string;
  /** A count and its unit («6 timer»), or a value said in words («23. mars», «Ingen nye»). */
  num?: string;
  unit?: string;
  text?: string;
  sub: string;
}

/**
 * The key figures (12a, part 2): the day in four counts, as plain text in one band. A summary of the parts under it,
 * never a way into them: no figure is a tile, a link or a button, and none lifts a case. Two by two where the band is
 * narrow.
 */
function Figures({ items }: { items: Figure[] }) {
  const cls = useStyles();
  const { s } = useLang();
  const id = useId();
  const [ref, width] = useWidth<HTMLElement>();
  const four = width >= 760;
  return (
    <section ref={ref} className={cls.figCard} aria-labelledby={id} data-home-part="tall">
      <h2 id={id} style={srOnly}>
        {s('figuresTitle')}
      </h2>
      <dl className={mergeClasses(cls.figs, four && cls.figs4)}>
        {items.map((f) => (
          <div key={f.key} className={mergeClasses(cls.fig, four ? cls.figRule4 : cls.figRule2)} data-figure={f.key}>
            <dt className={cls.figLabel}>
              <span className={cls.figIcon} aria-hidden="true">
                {f.icon}
              </span>
              {f.label}
            </dt>
            <dd className={cls.figValue}>
              <span className={cls.figNum}>{f.num ?? f.text}</span>
              {f.num && f.unit && <span className={cls.figUnit}>{f.unit}</span>}
            </dd>
            <dd className={cls.figSub}>{f.sub}</dd>
          </div>
        ))}
      </dl>
      <p className={cls.figNote}>{s('figuresNote')}</p>
    </section>
  );
}

/** The GP's day in four counts: the appointments, what is new in the inbox, the referrals waiting, the next deadline. */
function GpFigures() {
  const { s, lang } = useLang();
  const study = useStudy();
  const phase = study.state.phase;
  const times = [...CORE.map((c) => cases[c].gp.timeliste.time), ...ordinary.map((o) => o.time)].sort();
  // The inbox's two study items, new as the inbox says: Kari's self-report until her case opens, DPS's reply about
  // Astrid until her case is done.
  const selfNew = (phase.kari ?? 'briefing') === 'briefing';
  const replyNew = phase.astrid !== 'done';
  const fresh = (selfNew ? 1 : 0) + (replyNew ? 1 : 0);
  const waiting = startDay.referralsWaiting;
  const next = waiting.filter((r) => r.deadline).sort((a, b) => a.deadline!.localeCompare(b.deadline!))[0];
  const items: Figure[] = [
    {
      key: 'timer',
      icon: <CalendarLtr20Regular />,
      label: s('figHoursLabel'),
      num: String(CORE.length + ordinary.length),
      unit: s('figHoursUnit'),
      sub: s('figHoursSub', { m: CORE.length, time: times[0] }),
    },
    {
      key: 'innboks',
      icon: <Mail20Regular />,
      label: s('homeInboxTitle'),
      ...(fresh > 0 ? { num: String(fresh), unit: s(fresh === 1 ? 'figNewUnitOne' : 'figNewUnitMany') } : { text: s('figNoneNew') }),
      sub: selfNew ? s('figInboxSubBoth') : replyNew ? s('figInboxSubReply') : s('figAllRead'),
    },
    {
      key: 'henvisninger',
      icon: <ArrowForward20Regular />,
      label: s('figRefLabel'),
      num: String(waiting.length),
      unit: s('figRefUnit'),
      sub: waiting.some((r) => r.asked) ? s('figRefSubAsked') : s('refMineSub'),
    },
    {
      key: 'frist',
      icon: <Clock20Regular />,
      label: s('figDeadlineLabel'),
      text: keepDate(formatDayMonth(next.deadline!, lang)),
      sub: s('figDeadlineSub', { name: next.name, date: keepDate(formatDayMonth(next.received, lang)) }),
    },
  ];
  return <Figures items={items} />;
}

/** DPS's day in four counts: the referrals, the messages, the next deadline still open, the intake meeting. */
function DpsFigures() {
  const { s, t, lang } = useLang();
  const study = useStudy();
  const phase = study.state.phase;
  // The study's three referrals as they stand: new ones still to assess, the one with the GP's message, and those done.
  const left = CORE.filter((c) => phase[c] !== 'done');
  const fresh = left.filter((c) => !cases[c].dps!.returnSent).length;
  const withMessage = left.length - fresh;
  const finished = CORE.length - left.length;
  const standing = [
    ...(fresh ? [fresh === 1 ? s('homeNewOne') : s('homeNewCount', { n: fresh })] : []),
    ...(withMessage ? [s('figDpsWithMessage', { n: withMessage })] : []),
    ...(finished ? [finished === 1 ? s('figDpsDoneOne') : s('figDpsDoneMany', { n: finished })] : []),
  ];
  const messageNew = phase.astrid !== 'done';
  // The deadlines still open: not answered before the study's day, and not done by the participant (as «Frister»).
  const open = CORE.filter((c) => !cases[c].dps!.returnSent && phase[c] !== 'done');
  const first = open.map((c) => cases[c].dps!.queue.deadline).sort()[0];
  const meeting = startDay.dpsBlocks.find((b) => b.kind === 'other' && b.from === '11:00');
  const items: Figure[] = [
    {
      key: 'henvisninger',
      icon: <Document20Regular />,
      label: s('figDpsRefLabel'),
      num: String(CORE.length),
      unit: s('figDpsRefUnit'),
      sub: finished === CORE.length ? s('figDpsAllDone') : listOf(standing, lang),
    },
    {
      key: 'meldinger',
      icon: <Chat20Regular />,
      label: s('homeMessagesTitle'),
      ...(messageNew ? { num: '1', unit: s('figNewUnitOne') } : { text: s('figNoneNew') }),
      sub: messageNew ? s('figDpsMsgSub') : s('figAllRead'),
    },
    {
      key: 'frist',
      icon: <Clock20Regular />,
      label: s('figDeadlineLabel'),
      text: first ? keepDate(formatDayMonth(first, lang)) : s('figNoOpen'),
      sub: first
        ? listOf(
            open.filter((c) => cases[c].dps!.queue.deadline === first).map((c) => cases[c].patient.name),
            lang,
          )
        : s('figDpsDeadlineNone'),
    },
    {
      key: 'mote',
      icon: <PeopleTeam20Regular />,
      label: s('figMeetingLabel'),
      text: s('figMeetingValue', { time: meeting?.from ?? '11:00' }),
      sub: t(startDay.dpsDay[1]),
    },
  ];
  return <Figures items={items} />;
}

/* ---------- The day ---------- */

interface DayItem {
  key: string;
  from: number;
  to: number;
  kind: 'case' | 'routine' | 'other';
  /** 'who': one appointment, its time and initials; 'label': what a stretch of the day is for. */
  show: 'who' | 'label';
  time?: string;
  initials?: string;
  label: string;
  /** What a screen reader hears, and the narrow list shows. */
  spoken: string;
  caseId?: CoreCaseId;
  n?: number;
  /** DPS's stretch for the study's referrals: «Nå» while they are under way, done when all three are. */
  study?: boolean;
}

interface DayLegend {
  case: string;
  routine: string;
  other: string;
}

function useGpDayItems(): DayItem[] {
  const { s, t } = useLang();
  const items: DayItem[] = [
    ...CORE.map((c, i) => {
      const x = cases[c];
      const from = minutes(x.gp.timeliste.time);
      return {
        key: c,
        from,
        to: from + (startDay.lengths[c] ?? 30),
        kind: 'case' as const,
        show: 'who' as const,
        time: x.gp.timeliste.time,
        initials: x.patient.initials,
        label: s('patientAge', { name: x.patient.name, age: x.patient.age }),
        spoken: s('dayCase', { time: x.gp.timeliste.time, name: x.patient.name, n: i + 1 }),
        caseId: c,
        n: i + 1,
      };
    }),
    ...ordinary.map((o) => {
      const from = minutes(o.time);
      return {
        key: o.id,
        from,
        to: from + (startDay.lengths[o.id] ?? 30),
        kind: 'routine' as const,
        show: 'who' as const,
        time: o.time,
        initials: o.initials,
        label: s('patientAge', { name: o.name, age: o.age }),
        spoken: s('dayRoutine', { time: o.time, name: o.name }),
      };
    }),
    ...startDay.blocks.map((b, i) => ({
      key: `block-${i}`,
      from: minutes(b.from),
      to: minutes(b.to),
      kind: 'other' as const,
      show: 'label' as const,
      label: t(b.label),
      spoken: s('dayBlock', { from: b.from, to: b.to, label: t(b.label) }),
    })),
  ];
  return items.sort((a, b) => a.from - b.from);
}

function useDpsDayItems(): DayItem[] {
  const { s, t } = useLang();
  return startDay.dpsBlocks.map((b, i) => ({
    key: b.kind === 'case' ? 'studien' : `block-${i}`,
    from: minutes(b.from),
    to: minutes(b.to),
    kind: b.kind,
    show: 'label' as const,
    label: t(b.label),
    spoken: s('dayBlock', { from: b.from, to: b.to, label: t(b.label) }),
    study: b.kind === 'case' || undefined,
  }));
}

/**
 * «Dagen» on the GP's start page: the day at a glance, from 08 to 16, with «Nå» where the study's clock stands, and the
 * day's tasks under it as examples. A picture of the day, never a way in: the cases open from the list. Each
 * appointment shows its time and initials where there is room (a tick when its case is done); a screen reader hears the
 * whole line. Below 600 px of its own width the strip becomes a plain list.
 */
function DayPart() {
  const { s, lang } = useLang();
  const study = useStudy();
  const st = study.state;
  const [ref, width] = useWidth<HTMLDivElement>();
  const items = useGpDayItems();
  const now = startDay.now[Math.min(casesDone(st), startDay.now.length - 1)];
  // «Tirsdag 17. mars 2026 · 6 timer · 3 med henvisningssak»: the title already says it is the day.
  const date = formatDateWithWeekday(GP_TODAY, lang);
  // The date only: the counts are in the key figures.
  const sub = capitalFirst(date);
  const legend = { case: s('dayLegendCase'), routine: s('dayLegendRoutine'), other: s('dayLegendOther') };
  return (
    <HomeCard part="dag" title={s('dayTitle')} sub={sub} foot={s('dayNote')}>
      <div ref={ref}>{width >= 600 ? <DayStrip items={items} now={now} width={width} legend={legend} /> : <DayList items={items} legend={legend} />}</div>
      <Todos items={startDay.todos} />
    </HomeCard>
  );
}

/**
 * «Dagen» on DPS's start page: the intake clinician's day, the study's three referrals in one stretch of the morning
 * and the rest of the day around them, with the day's tasks under it as examples.
 */
function DpsDayPart() {
  const { s, lang } = useLang();
  const study = useStudy();
  const st = study.state;
  const [ref, width] = useWidth<HTMLDivElement>();
  const items = useDpsDayItems();
  const now = startDay.dpsNow[Math.min(casesDone(st), startDay.dpsNow.length - 1)];
  const sub = capitalFirst(formatDateWithWeekday(DPS_TODAY, lang));
  const legend = { case: s('dpsLegendCase'), routine: s('dpsLegendRoutine'), other: s('dayLegendOther') };
  return (
    <HomeCard part="dag" title={s('dayTitle')} sub={sub} foot={s('dpsDayNote')}>
      <div ref={ref}>{width >= 600 ? <DayStrip items={items} now={now} width={width} legend={legend} /> : <DayList items={items} legend={legend} />}</div>
      <Todos items={startDay.dpsTodos} />
    </HomeCard>
  );
}

/** Whether a stretch of the day is done, or where the participant is now. */
function useDayState() {
  const study = useStudy();
  const st = study.state;
  const allDone = casesDone(st) === CORE.length;
  const current = st.tour.done ? currentCase(st) : undefined;
  return (x: DayItem) => ({
    done: x.caseId ? st.phase[x.caseId] === 'done' : !!x.study && allDone,
    isNow: x.caseId ? x.caseId === current : !!x.study && st.tour.done && !allDone,
  });
}

function DayStrip({ items, now, width, legend }: { items: DayItem[]; now: string; width: number; legend: DayLegend }) {
  const cls = useStyles();
  const { s } = useLang();
  const state = useDayState();
  const start = minutes(startDay.from);
  const end = minutes(startDay.to);
  const span = end - start;
  const at = (min: number) => `${((min - start) / span) * 100}%`;
  const len = (min: number) => `${(min / span) * 100}%`;
  const hours = Array.from({ length: Math.floor(span / 60) + 1 }, (_, i) => start + i * 60);
  return (
    <div className={cls.stripWrap}>
      <p className={cls.srLine}>
        <SrOnly>{s('dayNowSpoken', { time: now })}</SrOnly>
      </p>
      <div className={cls.strip}>
        {hours.map((h) => (
          <span key={`t${h}`} className={cls.tick} style={{ left: at(h) }} aria-hidden="true" />
        ))}
        {hours.map((h, i) => (
          <span key={h} className={mergeClasses(cls.hour, i === 0 && cls.hourFirst, i === hours.length - 1 && cls.hourLast)} style={{ left: at(h) }} aria-hidden="true">
            {hhmm(h).slice(0, 2)}
          </span>
        ))}
        <span className={cls.now} style={{ left: at(minutes(now)) }} aria-hidden="true" data-day-now={now}>
          {s('dayNow', { time: now })}
        </span>
        <span className={cls.nowLine} style={{ left: at(minutes(now)) }} aria-hidden="true" />
        <ol className={cls.blocks} aria-label={s('dayLabel')}>
          {items.map((x) => {
            const { done, isNow } = state(x);
            const spoken = `${x.spoken}${isNow ? `, ${s('guideNow').toLocaleLowerCase()}` : ''}${done ? `, ${s('chipDone').toLocaleLowerCase()}` : ''}`;
            // What fits in a slot, measured: the slot's width less the gap between slots and the border, and for a
            // stretch of the day its padding. An appointment shows its time over its initials, or its initials, or
            // nothing (what it is stays in the hidden line and the legend); a stretch shows its label on one line or
            // two, in the smaller type if it must.
            const slot = ((x.to - x.from) / span) * width - 4 - 2;
            let shown: ReactNode = null;
            if (x.show === 'label') {
              const room = slot - 6 - (done ? 20 : 0);
              const fit = fitLabel(x.label, room);
              const label = (
                <span
                  className={mergeClasses(
                    cls.blockLabel,
                    (fit === 'two' || fit === 'smallTwo') && cls.fitTwo,
                    (fit === 'small' || fit === 'smallTwo' || fit === 'clip') && cls.fitSmall,
                  )}
                >
                  {x.label}
                </span>
              );
              shown = done ? (
                <span className={cls.blockInner}>
                  <CheckmarkCircle16Filled className={cls.blockTick} />
                  {label}
                </span>
              ) : (
                label
              );
            } else if (done) shown = <CheckmarkCircle16Filled className={cls.blockTick} />;
            // The time is measured as «00:00», the widest a time can be in tabular figures, so every slot of a length
            // shows the same.
            else if (textWidth('00:00', 10) <= slot && textWidth(x.initials ?? '', 12, 600) <= slot)
              shown = (
                <span className={cls.blockStack}>
                  <span className={cls.blockTime}>{x.time}</span>
                  <span className={cls.blockWho}>{x.initials}</span>
                </span>
              );
            else if (textWidth(x.initials ?? '', 12, 600) <= slot) shown = <span className={cls.blockWho}>{x.initials}</span>;
            return (
              <li
                key={x.key}
                className={mergeClasses(
                  cls.block,
                  x.show === 'who' && cls.blockWhoSlot,
                  x.kind === 'case' && cls.blockCase,
                  isNow && cls.blockNow,
                  done && cls.blockDone,
                  x.kind === 'routine' && cls.blockRoutine,
                  x.kind === 'other' && cls.blockOther,
                )}
                style={{ left: `calc(${at(x.from)} + 2px)`, width: `calc(${len(Math.min(x.to, end) - x.from)} - 4px)` }}
                data-day-item={x.key}
              >
                <span aria-hidden="true" className={cls.blockLabel}>
                  {shown}
                </span>
                <SrOnly>{spoken}</SrOnly>
              </li>
            );
          })}
        </ol>
      </div>
      <p className={cls.legendLine} aria-hidden="true">
        <span className={cls.legendItem}>
          <span className={mergeClasses(cls.legendSwatch, cls.blockCase)} />
          {legend.case}
        </span>
        <span className={cls.legendItem}>
          <span className={mergeClasses(cls.legendSwatch, cls.blockRoutine, cls.legendSwatchQuiet)} />
          {legend.routine}
        </span>
        <span className={cls.legendItem}>
          <span className={mergeClasses(cls.legendSwatch, cls.blockOther, cls.legendSwatchQuiet)} />
          {legend.other}
        </span>
      </p>
    </div>
  );
}

/** The day as a list, where the part is narrow: time, who or what, and the case's state. */
function DayList({ items, legend }: { items: DayItem[]; legend: DayLegend }) {
  const cls = useStyles();
  const { s } = useLang();
  const state = useDayState();
  return (
    <ol className={cls.dayList} aria-label={s('dayListLabel')}>
      {items.map((x) => {
        const { done, isNow } = state(x);
        const time = x.show === 'label' ? `${hhmm(x.from)}–${hhmm(x.to)}` : x.time;
        return (
          <li key={x.key} className={mergeClasses(cls.dayRow, x.kind !== 'case' && cls.dayRowQuiet, isNow && cls.dayRowNow)} data-day-item={x.key}>
            <span className={mergeClasses(cls.dayTime, x.kind !== 'case' && cls.dayTimeQuiet)}>{time}</span>
            <span>{keepAge(x.label)}</span>
            <span className={mergeClasses(cls.dayState, done && cls.dayStateDone)}>
              {x.n && s('listCaseTag', { n: x.n })}
              {isNow && `${x.n ? ' · ' : ''}${s('guideNow')}`}
              {done && `${x.n ? ' · ' : ''}${s('chipDone')}`}
              {x.kind === 'routine' && x.show === 'who' && <span className={cls.dayStateDone}>{legend.routine}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const TODO_ICON: Record<DayTodo['icon'], ReactNode> = {
  pill: <Pill20Regular />,
  certificate: <DocumentEdit20Regular />,
  calendar: <CalendarLtr20Regular />,
  letter: <Document20Regular />,
  chat: <Chat20Regular />,
  people: <PeopleTeam20Regular />,
};

/**
 * «Gjøremål i dag» (12a, part 3): the day's tasks, all examples, in one grey group under its label. No tick boxes and no
 * circles that look like them: a task here is something to see, not to do.
 */
function Todos({ items }: { items: DayTodo[] }) {
  const cls = useStyles();
  const { s, t } = useLang();
  return (
    <ExampleGroup label={s('todosLabel')}>
      <ul className={cls.todoList}>
        {items.map((x) => (
          <li key={x.what.nb} className={cls.todo}>
            <span className={cls.todoIcon} aria-hidden="true">
              {TODO_ICON[x.icon]}
            </span>
            <span className={cls.rowText}>
              <span className={cls.todoWhat}>{x.who ? `${t(x.what)} · ${x.who}` : t(x.what)}</span>
              <span className={cls.rowWhat}>{t(x.when)}</span>
            </span>
          </li>
        ))}
      </ul>
    </ExampleGroup>
  );
}

/* ---------- GP: inbox and referrals ---------- */

const INBOX_ICON = { lab: <ClipboardPulse20Regular />, chat: <Chat20Regular />, letter: <Document20Regular /> } as const;

function Row({ icon, name, what, end, isNew }: { icon: ReactNode; name: string; what: string; end?: ReactNode; isNew?: boolean }) {
  const cls = useStyles();
  const { s } = useLang();
  return (
    <li className={cls.row}>
      <span className={cls.rowIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={cls.rowText}>
        <span className={mergeClasses(cls.rowName, isNew && cls.rowNameNew)}>
          {isNew && <span className={cls.dot} aria-hidden="true" />}
          {keepAge(name)}
          {isNew && <SrOnly>{`, ${s('homeNewWord')}`}</SrOnly>}
        </span>
        <span className={cls.rowWhat}>{what}</span>
      </span>
      {end && <span className={cls.rowEnd}>{end}</span>}
    </li>
  );
}

function ExampleRow({ icon, name, what, end }: { icon: ReactNode; name: string; what: string; end?: string }) {
  const cls = useStyles();
  return (
    <li className={mergeClasses(cls.row, cls.rowQuiet)}>
      <span className={mergeClasses(cls.rowIcon, cls.rowIconQuiet)} aria-hidden="true">
        {icon}
      </span>
      <span className={cls.rowText}>
        <span className={cls.rowWhat}>{keepAge(name)}</span>
        <span className={cls.rowWhat}>{what}</span>
      </span>
      {end && <span className={cls.rowEnd}>{end}</span>}
    </li>
  );
}

/**
 * The GP's inbox: Kari's self-report (new until her case opens) and DPS's reply about Astrid (new until her case is
 * done), newest first; the rest of an ordinary inbox under «Eksempler». The dot means new, nothing else; no row opens
 * anything, so the briefing stays the only way into a case. DPS's reply is named as a reply, never by its outcome: the
 * case shows the letter first without ATLAS.
 */
function GpInbox() {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const study = useStudy();
  const phase = study.state.phase;
  const letter = cases.astrid.gp.caseOnlyLetter!;
  const items = [
    {
      key: 'kari',
      date: GP_TODAY,
      icon: <Form20Regular />,
      name: s('patientAge', { name: cases.kari.patient.name, age: cases.kari.patient.age }),
      what: s('inboxSelfReport', { time: cases.kari.gp.timeliste.time }),
      isNew: (phase.kari ?? 'briefing') === 'briefing',
    },
    {
      key: 'astrid',
      date: letter.date,
      icon: <ArrowReply20Regular />,
      name: s('patientAge', { name: cases.astrid.patient.name, age: cases.astrid.patient.age }),
      // «DPS Skjærgården», without «, inntaksteamet»: the line stays short.
      what: s('inboxDpsReply', { from: t(letter.from).split(',')[0] }),
      isNew: phase.astrid !== 'done',
    },
  ].sort((a, b) => b.date.localeCompare(a.date));
  const n = items.filter((x) => x.isNew).length;
  const examples = [...startDay.inbox].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <HomeCard
      part="innboks"
      title={s('homeInboxTitle')}
      badge={n > 0 ? <NewBadge>{n === 1 ? s('homeNewOne') : s('homeNewCount', { n })}</NewBadge> : undefined}
      sub={s('inboxNewest')}
    >
      <ul className={cls.rows}>
        {items.map((x) => (
          <Row key={x.key} icon={x.icon} name={x.name} what={x.what} end={formatDayMonth(x.date, lang)} isNew={x.isNew} />
        ))}
      </ul>
      <ExampleGroup>
        <ul className={cls.exList}>
          {examples.map((x) => (
            <ExampleRow key={x.id} icon={INBOX_ICON[x.icon]} name={s('patientAge', { name: x.name, age: x.age })} what={t(x.what)} end={formatDayMonth(x.date, lang)} />
          ))}
        </ul>
      </ExampleGroup>
    </HomeCard>
  );
}

/** Four small steps: sent, received, assessed, answered. DPS's question shows as a ring with a question mark. */
function Stages({ done, asked }: { done: number; asked?: boolean }) {
  const cls = useStyles();
  return (
    <span className={cls.stages} aria-hidden="true">
      <span className={cls.stagesLine} />
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={mergeClasses(cls.stage, i < done && cls.stageDone, asked && i === done && cls.stageAsked)}>
          {asked && i === done ? '?' : null}
        </span>
      ))}
    </span>
  );
}

interface RefRow {
  key: string;
  name: string;
  sent: string;
  done: number;
  asked?: boolean;
  where: string;
  status: string;
  tag?: string;
}

/**
 * «Henvisningene mine» (12a, part 5): where each referral to DPS stands. Astrid's, the study's, says that DPS has
 * answered and when, never what: the case shows the letter first without ATLAS. The others are examples, in a grey
 * group of rows under their label. Under the table, the deadlines of the next ten working days, as dates.
 */
function GpReferrals() {
  const cls = useStyles();
  const { s, lang } = useLang();
  const [ref, width] = useWidth<HTMLDivElement>();
  const astrid = cases.astrid;
  const day = (iso: string) => keepDate(formatDayMonth(iso, lang));
  const study: RefRow = {
    key: 'astrid',
    name: s('patientAge', { name: astrid.patient.name, age: astrid.patient.age }),
    sent: astrid.dps!.queue.received,
    done: 4,
    where: s('refWhereAssessed', { date: day(astrid.gp.caseOnlyLetter!.date) }),
    status: s('refStatusReply'),
    tag: s('listCaseTag', { n: CORE.indexOf('astrid') + 1 }),
  };
  const examples: RefRow[] = startDay.referralsWaiting.map((r) => ({
    key: r.name,
    name: s('patientAge', { name: r.name, age: r.age }),
    sent: r.sent,
    done: 2,
    asked: !!r.asked,
    where: r.asked ? s('refWhereAsked', { received: day(r.received), asked: day(r.asked) }) : s('refWhereReceived', { date: day(r.received) }),
    status: r.asked ? s('refStatusAsked') : s('refStatusDeadline', { date: day(r.deadline!) }),
  }));
  const byDate = new Map<string, string[]>();
  for (const r of startDay.referralsWaiting) if (r.deadline) byDate.set(r.deadline, [...(byDate.get(r.deadline) ?? []), r.name]);
  const due = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, names]) => ({ date, names }));
  const cell = (r: RefRow, quiet: boolean) => (
    <tr key={r.key} data-ref-row={r.key}>
      <th scope="row" className={mergeClasses(cls.td, cls.tdName, quiet && cls.exCell)}>
        {keepAge(r.name)}
      </th>
      <td className={mergeClasses(cls.td, cls.tdDate, quiet && cls.exCell)}>{day(r.sent)}</td>
      <td className={mergeClasses(cls.td, quiet && cls.exCell)}>
        <span className={cls.where}>
          <Stages done={r.done} asked={r.asked} />
          <span className={cls.whereText}>{r.where}</span>
        </span>
      </td>
      <td className={mergeClasses(cls.td, cls.tdLast, quiet && cls.exCell)}>
        {r.status}
        {r.tag && (
          <>
            {' · '}
            <span className={cls.tag}>{r.tag}</span>
          </>
        )}
      </td>
    </tr>
  );
  const exId = useId();
  // With a big screen's room, the deadlines go beside the table rather than under it.
  const side = width >= 1100;
  return (
    <HomeCard part="henvisninger" title={s('refMineTitle')} sub={s('refMineSub')}>
      <div ref={ref} className={mergeClasses(cls.refLayout, side && cls.refSide)}>
        <div>
          {(side ? width * 0.6 : width) >= 520 ? (
            <table className={cls.table} aria-label={s('refMineTitle')}>
              <thead>
                <tr>
                  <th scope="col" className={cls.th}>
                    {s('refColPatient')}
                  </th>
                  <th scope="col" className={cls.th}>
                    {s('refColSent')}
                  </th>
                  <th scope="col" className={cls.th}>
                    {s('refColWhere')}
                  </th>
                  <th scope="col" className={cls.th}>
                    {s('refColStatus')}
                  </th>
                </tr>
              </thead>
              <tbody>{cell(study, false)}</tbody>
              <tbody className={cls.exBody} aria-labelledby={exId} data-examples="">
                <tr>
                  <th scope="rowgroup" colSpan={4} className={cls.exHead} id={exId}>
                    {s('examplesLabel')}
                  </th>
                </tr>
                {examples.map((r) => cell(r, true))}
              </tbody>
            </table>
          ) : (
            <>
              <ul className={cls.rows}>
                <Row
                  icon={astrid.patient.initials}
                  name={study.name}
                  what={`${s('refSentOn', { date: day(study.sent) })} · ${study.where} · ${study.status}`}
                  end={<span className={cls.tag}>{study.tag}</span>}
                />
              </ul>
              <ExampleGroup>
                <ul className={cls.exList}>
                  {examples.map((r) => (
                    <li key={r.key} className={cls.exLine}>
                      {keepAge(r.name)} · {s('refSentOn', { date: day(r.sent) })} · {r.status}
                    </li>
                  ))}
                </ul>
              </ExampleGroup>
            </>
          )}
        </div>
        <div className={cls.deadlines}>
          <h3 className={cls.subHead}>{s('refDeadlinesTitle')}</h3>
          <DeadlineStrip today={GP_TODAY} due={due} empty={s('deadlinesNone')} />
          <p className={cls.quiet}>{s('refDeadlinesNote')}</p>
        </div>
      </div>
    </HomeCard>
  );
}

/**
 * «Mitt henvisningsmønster»: locked until the three cases are done; then the GP's own counts, as the tour showed them,
 * with the referrals per quarter (12a, part 6) and the reasons given most often for a return. The GP's own history,
 * never a comparison with others.
 */
function GpPattern({ locked, onOpen }: { locked: boolean; onOpen: () => void }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const max = Math.max(...pattern.quarters.map((q) => q.count));
  const returns = pattern.outcomes.find((o) => o.key === 'retur')?.count ?? 0;
  const top = Math.max(...pattern.returnReasons.map((r) => r.count));
  const topReasons = pattern.returnReasons.filter((r) => r.count === top).map((r) => t(vocab.reasons[r.reason]).toLocaleLowerCase(lang));
  const mostReturned = s(topReasons.length > 1 ? 'patternMostReturnedMany' : 'patternMostReturnedOne', {
    reasons: listOf(topReasons, lang),
    n: numberWord(top, lang),
    total: numberWord(returns, lang),
  });
  const captionId = useId();
  return (
    <HomeCard part="monster" title={s('navPattern')} sub={s('homePatternOnlyYou')} locked={locked ? s('lockedAfterCases') : undefined} lockedNote={s('lockedNotePattern')}>
      <p className={cls.patternTotal}>
        <span className={cls.patternNum}>{pattern.total}</span>
        {s('homePatternReferrals')}
      </p>
      <p className={cls.quiet}>{t(pattern.period)}</p>
      <figure className={cls.quarters} aria-labelledby={captionId}>
        <figcaption id={captionId} className={cls.quiet}>
          {s('patternQuarters')}
        </figcaption>
        <ol className={cls.qBars}>
          {pattern.quarters.map((q, i) => (
            <li key={q.label.nb} className={cls.qItem}>
              <span className={cls.qNum} aria-hidden="true">
                {q.count}
              </span>
              <span className={cls.qTrack} aria-hidden="true">
                <span className={cls.qBar} style={{ height: `${(q.count / max) * 100}%` }} />
              </span>
              <span className={cls.qLabel} aria-hidden="true">
                {t(q.short ?? q.label)}
                {i === pattern.quarters.length - 1 && <span className={cls.qSoFar}>{s('quarterSoFar')}</span>}
              </span>
              <SrOnly>{s('quarterSpoken', { label: t(q.label), n: q.count })}</SrOnly>
            </li>
          ))}
        </ol>
      </figure>
      <p className={cls.quiet}>{s('patternOutcomes')}</p>
      <div className={cls.bar} aria-hidden="true">
        {pattern.outcomes.map((o, i) => (
          <span key={o.key} style={{ flex: `${o.count} 1 0`, backgroundColor: neutralBar[i] ?? neutralBar[3] }} />
        ))}
      </div>
      <ul className={cls.legend}>
        {pattern.outcomes.map((o, i) => (
          <li key={o.key} className={cls.legendRow}>
            <span className={cls.swatch} style={{ backgroundColor: neutralBar[i] ?? neutralBar[3] }} aria-hidden="true" />
            <span>{t(o.label)}</span>
            <span className={cls.legendNum}>{o.count}</span>
          </li>
        ))}
      </ul>
      <p className={cls.quiet}>{mostReturned}</p>
      <p className={cls.quiet}>{s('homePatternNote')}</p>
      <Button appearance="transparent" className={cls.openBtn} icon={<ArrowRight16Regular />} iconPosition="after" onClick={onOpen} data-open-step="gp-monster">
        {s('homeSeePattern')}
      </Button>
    </HomeCard>
  );
}

/**
 * «Delt oversikt»: locked until the three cases are done. Then what changed in the criteria, on a short line from the
 * oldest change to the latest (12a, part 7), what is being discussed, and the median time to an assessment; never the
 * area's outcome rates, which beside the GP's own counts would stage the comparison the guardrails rule out. The full
 * view opens as the tour showed it.
 */
function SharedPart({ role, locked, onOpen }: { role: Role; locked: boolean; onOpen: () => void }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const log = [...shared.kalibrering.criteriaLog].sort((a, b) => a.date.localeCompare(b.date));
  const latest = log[log.length - 1];
  const median = shared.kalibrering.catchment.find((x) => x.label.nb.startsWith('Tid fra mottak'));
  const posts = shared.dialog.discussion.posts;
  const lastPost = posts[posts.length - 1];
  const step = role === 'gp' ? 'gp-kalibrering' : 'dps-kalibrering';
  // The change's first sentence: what changed. The rest is in the full view.
  const change = t(latest.text).split(/(?<=\.)\s/)[0];
  return (
    <HomeCard
      part="delt"
      title={s('navShared')}
      sub={s(role === 'gp' ? 'homeSharedGp' : 'homeSharedDps')}
      locked={locked ? s('lockedAfterCases') : undefined}
      lockedNote={s(role === 'gp' ? 'lockedNoteSharedGp' : 'lockedNoteSharedDps')}
    >
      <div className={cls.sharedBlock}>
        <p className={cls.sharedHead}>{s('sharedChanges')}</p>
        <div className={cls.changesWrap}>
          <span className={cls.changesLine} aria-hidden="true" />
          <ol className={cls.changes} aria-label={s('sharedChanges')}>
            {log.map((c, i) => (
              <li key={c.date} className={mergeClasses(cls.change, i === 0 && cls.changeFirst, i === log.length - 1 && cls.changeLast)}>
                <span className={mergeClasses(cls.changeDot, i === log.length - 1 && cls.changeDotLatest)} aria-hidden="true" />
                <span className={mergeClasses(cls.changeLabel, i === log.length - 1 && cls.changeLabelLatest)}>{formatMonthShort(c.date, lang)}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className={cls.sharedText}>{`${formatDayMonth(latest.date, lang)}: ${change}`}</p>
      </div>
      <div className={cls.sharedBlock}>
        <p className={cls.sharedHead}>{s('sharedLatestDialog')}</p>
        <p className={cls.sharedText}>{t(shared.dialog.discussion.title)}</p>
        <p className={cls.quiet}>{`${t(lastPost.role === 'gp' ? vocab.roles.gpTeam : vocab.roles.dps)} · ${formatDayMonth(lastPost.date, lang)}`}</p>
      </div>
      {median && <p className={cls.sharedText}>{`${t(median.label)}: ${t(median.value)}`}</p>}
      {role === 'gp' && <p className={cls.quiet}>{s('sharedNoGps')}</p>}
      <Button appearance="transparent" className={cls.openBtn} icon={<ArrowRight16Regular />} iconPosition="after" onClick={onOpen} data-open-step={step}>
        {s('sharedOpen')}
      </Button>
    </HomeCard>
  );
}

/* ---------- Coming up ---------- */

const UPCOMING_ICON: Record<Upcoming['icon'], ReactNode> = {
  video: <Video20Regular />,
  people: <PeopleTeam20Regular />,
  evening: <WeatherMoon20Regular />,
};

/**
 * «Kommende» (12a, part 8): the rest of the week and the next, all examples, in one grey group under its label. Nothing
 * here belongs to the study, and nothing opens.
 */
function UpcomingPart({ items, today }: { items: Upcoming[]; today: string }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const [ref, width] = useWidth<HTMLDivElement>();
  // Four across, or two by two, or one under the other: never three and one.
  const across = width >= 860 ? 4 : width >= 420 ? 2 : 1;
  const shown = items.filter((x) => x.date > today).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  return (
    <HomeCard part="kommende" title={s('upcomingTitle')} sub={s('upcomingSub')}>
      <div ref={ref}>
        <ExampleGroup label={s('upcomingExamples')}>
          <ul className={cls.upList} style={{ gridTemplateColumns: `repeat(${across}, minmax(0, 1fr))` }}>
            {shown.map((x) => {
              const day = keepDate(capitalFirst(formatWeekdayDayMonth(x.date, lang)));
              return (
                <li key={`${x.date}${x.time}`} className={cls.todo}>
                  <span className={cls.todoIcon} aria-hidden="true">
                    {UPCOMING_ICON[x.icon]}
                  </span>
                  <span className={cls.rowText}>
                    <span className={cls.upWhen}>{x.time ? s('upcomingWhen', { day, time: x.time }) : day}</span>
                    <span className={cls.upTitle}>{t(x.title)}</span>
                    <span className={cls.rowWhat}>{t(x.where)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </ExampleGroup>
      </div>
    </HomeCard>
  );
}

/* ---------- DPS: intake and messages ---------- */

/**
 * «Inntaket i dag»: the study's three referrals with their dates (a deadline is a date, never a countdown). The rest of
 * the intake's day is in the key figures, «Dagen» and its tasks.
 */
function DpsIntake() {
  const cls = useStyles();
  const { s, lang } = useLang();
  const study = useStudy();
  const rows = [...CORE].sort((a, b) => cases[b].dps!.queue.received.localeCompare(cases[a].dps!.queue.received));
  return (
    <HomeCard part="inntak" title={s('homeDpsTitle')} sub={s('inboxNewest')}>
      <ul className={cls.rows}>
        {rows.map((c) => {
          const x = cases[c];
          const q = x.dps!.queue;
          const answered = x.dps!.returnSent;
          // A case the participant has done reads as done: no deadline left to watch.
          const done = study.state.phase[c] === 'done';
          return (
            <Row
              key={c}
              icon={x.patient.initials}
              name={s('patientAge', { name: x.patient.name, age: x.patient.age })}
              what={
                done
                  ? s('intakeDone', { received: formatDayMonth(q.received, lang) })
                  : answered
                    ? s('intakeAnswered', { date: formatDayMonth(answered.date, lang) })
                    : s('intakeReceived', { received: formatDayMonth(q.received, lang), deadline: formatDayMonth(q.deadline, lang) })
              }
              end={<span className={cls.tag}>{s('listCaseTag', { n: CORE.indexOf(c) + 1 })}</span>}
            />
          );
        })}
      </ul>
    </HomeCard>
  );
}

/** «Meldinger»: the GP's question about Astrid (new until her case is done), and an ordinary inbox's other messages. */
function DpsMessages() {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const study = useStudy();
  const isNew = study.state.phase.astrid !== 'done';
  const answered = cases.astrid.dps!.returnSent!;
  return (
    <HomeCard part="meldinger" title={s('homeMessagesTitle')} badge={isNew ? <NewBadge>{s('homeNewOne')}</NewBadge> : undefined} sub={s('inboxNewest')}>
      <ul className={cls.rows}>
        <Row
          icon={<Chat20Regular />}
          name={s('patientAge', { name: cases.astrid.patient.name, age: cases.astrid.patient.age })}
          what={`${s('homeMessageFromGp')}. ${s('homeMessageAstrid', { date: formatDayMonth(answered.date, lang) })}. ${s('queueMessageRule')}`}
          end={formatDayMonth(cases.astrid.dps!.gpScript?.question?.date ?? DPS_TODAY, lang)}
          isNew={isNew}
        />
      </ul>
      <ExampleGroup>
        <ul className={cls.exList}>
          {[...startDay.dpsMessages]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((x) => (
              <ExampleRow key={x.id} icon={INBOX_ICON[x.icon]} name={s('patientAge', { name: x.name, age: x.age })} what={t(x.what)} end={formatDayMonth(x.date, lang)} />
            ))}
        </ul>
      </ExampleGroup>
    </HomeCard>
  );
}
