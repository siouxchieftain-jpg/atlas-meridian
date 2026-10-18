import { Button, Popover, PopoverSurface, PopoverTrigger, SearchBox, makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import {
  ArrowRight16Regular,
  ArrowRight20Regular,
  CheckmarkCircle16Filled,
  Clock16Regular,
  LockClosed16Regular,
  Map16Regular,
  PeopleCommunity20Regular,
} from '@fluentui/react-icons';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { CoreCaseId, Role } from '../content/types';
import { cases, ordinary, pattern, vocab } from '../content';
import { formatDateWithWeekday, formatDayMonth, useLang } from '../i18n/i18n';
import { DPS_TODAY, GP_TODAY, isWeekday } from '../engine/clock';
import { navigate, useRoute } from '../router/router';
import { useStudy } from '../state/study';
import { GuideImage, SheenButton, SrOnly, StatusChip, StudyNameMark, guideCardSurface } from '../patterns/basics';
import { guide, neutralBar } from '../theme/constants';
import { PageHeading } from '../shell/PageHeading';
import { TourStepDialog } from '../tour/Tour';
import { focusAfterOverlay, useAtlasAnnounce } from '../patterns/announce';
import { HOME_PATH, useStudyController } from './controller';
import { CORE, caseInProgress, casesDone, currentCase, partTwoLabel } from './parts';
import { TourStartDialog } from './TourStart';

const useStyles = makeStyles({
  page: { marginBlockStart: '8px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 },
  // The title, the day and its counts on the left; the patient search on the right (board 4a), under them when narrow.
  head: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', columnGap: '24px', rowGap: '10px' },
  headText: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 },
  titleRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '14px', rowGap: '2px', minWidth: 0 },
  day: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  search: { flex: '0 1 360px', minWidth: '240px', maxWidth: '100%' },
  // The day's counts as one line of plain text («6 timer · 3 med henvisningssak · 2 nye i innboksen»): facts, not buttons.
  counts: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', columnGap: '8px', rowGap: '2px' },
  count: {
    ...typographyStyles.body1,
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '4px',
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'nowrap',
    // The dot is decoration: its alternative text is empty, so screen readers read the list items only.
    ':not(:first-child)::before': { content: '"·" / ""', color: tokens.colorNeutralForeground3, marginInlineEnd: '4px' },
  },
  countNum: { ...typographyStyles.body1Strong, color: tokens.colorNeutralForeground1 },
  // Three columns where the overview has the room: the study card, the day's list and the side column, each the height
  // of its content. The page scrolls down when the day needs it; it never scrolls sideways. With less room (a narrower
  // window, or a form panel open beside the overview) the side column moves under the list and lays its cards out side
  // by side; with less still, everything stacks. The overview measures its own width (useColumns), never the window's.
  cols: { display: 'grid', gap: '16px', alignItems: 'start', minWidth: 0, gridTemplateColumns: 'minmax(0, 1fr)' },
  cols2: { gridTemplateColumns: '272px minmax(0, 1fr)' },
  cols3: { gridTemplateColumns: '272px minmax(0, 1fr) 320px' },
  cols3Dps: { gridTemplateColumns: '272px minmax(0, 1fr) 360px' },
  // With the room of a laptop window, the side column splits in two, as board 8b draws «Min dag»: the inbox and the
  // referrals beside the pattern and Delt oversikt, so the day fits one screen more often.
  cols4: { gridTemplateColumns: '272px minmax(440px, 1fr) 240px 240px' },
  cols4Dps: { gridTemplateColumns: '272px minmax(440px, 1fr) 360px 240px' },
  colStudy: { display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 },
  colMain: { minWidth: 0 },
  colSide: {
    display: 'grid',
    gap: '12px',
    alignItems: 'start',
    minWidth: 0,
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
  },
  colSideUnder: { gridColumn: '1 / -1' },
  colSideBeside: { gridTemplateColumns: 'minmax(0, 1fr)' },
  // Four columns: the side column's two groups take a grid column each.
  colSideSplit: { display: 'contents' },
  sideGroup: { display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    minWidth: 0,
    boxSizing: 'border-box',
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    paddingInline: '16px',
    paddingBlockStart: '14px',
    paddingBlockEnd: '10px',
  },
  h2: { ...typographyStyles.subtitle2, margin: 0 },
  // A count badge in brand 80, as Meridian draws it; black is kept for «Frist i dag».
  newBadge: {
    ...typographyStyles.caption1Strong,
    paddingInline: '8px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    whiteSpace: 'nowrap',
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  nextLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingInline: '16px',
    paddingBlockEnd: '8px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground2,
  },
  rows: { listStyle: 'none', margin: 0, padding: 0 },
  row: {
    display: 'grid',
    gridTemplateColumns: '48px 32px minmax(0, 1fr) auto',
    alignItems: 'center',
    columnGap: '10px',
    paddingInline: '16px',
    paddingBlock: '10px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  rowDps: { gridTemplateColumns: '64px 32px minmax(0, 1fr) auto' },
  rowCurrent: { backgroundColor: tokens.colorBrandBackground2, boxShadow: `inset 3px 0 0 ${tokens.colorBrandStroke1}` },
  time: { ...typographyStyles.body1Strong, fontVariantNumeric: 'tabular-nums' },
  received: { display: 'flex', flexDirection: 'column', ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  receivedDate: { ...typographyStyles.body1Strong, color: tokens.colorNeutralForeground1 },
  avatar: {
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
  who: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  name: { ...typographyStyles.body1Strong, overflowWrap: 'anywhere' },
  nameQuiet: { ...typographyStyles.body1, overflowWrap: 'anywhere' },
  visit: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, overflowWrap: 'anywhere' },
  chipLine: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBlockStart: '2px' },
  status: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '4px' },
  tag: {
    ...typographyStyles.caption1Strong,
    paddingInline: '6px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
  },
  tagNow: { color: tokens.colorBrandForeground1, border: `1px solid ${tokens.colorBrandStroke1}`, backgroundColor: tokens.colorNeutralBackground1 },
  later: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' },
  doneMark: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2, display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' },
  doneIcon: { color: tokens.colorNeutralForeground2, display: 'inline-flex' },
  foot: { ...typographyStyles.caption1, margin: 0, paddingInline: '16px', paddingBlock: '10px', color: tokens.colorNeutralForeground3 },
  empty: { ...typographyStyles.body1, margin: 0, paddingInline: '16px', paddingBlock: '16px', color: tokens.colorNeutralForeground2, borderBottom: `1px solid ${tokens.colorNeutralStroke3}` },
  items: { listStyle: 'none', margin: 0, padding: 0 },
  item: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    paddingInlineStart: '28px',
    paddingInlineEnd: '16px',
    paddingBlock: '8px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  dot: {
    position: 'absolute',
    left: '14px',
    top: '15px',
    width: '6px',
    height: '6px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralForeground1,
    '@media (forced-colors: active)': { backgroundColor: 'CanvasText' },
  },
  itemKind: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  itemNote: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  refRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    paddingInline: '16px',
    paddingBlock: '8px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    ...typographyStyles.body1,
  },
  refWho: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  refCount: { ...typographyStyles.body1Strong },
  pattern: { display: 'flex', flexDirection: 'column', gap: '8px', paddingInline: '16px', paddingBlockEnd: '12px' },
  patternSub: { ...typographyStyles.caption1, margin: 0, marginBlockStart: '-6px', color: tokens.colorNeutralForeground2 },
  patternTotal: { ...typographyStyles.body1, margin: 0 },
  patternNum: { ...typographyStyles.subtitle1, marginInlineEnd: '2px' },
  // The greys are the information, so forced colours keep them (as the review mode's proportion bar does).
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
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    boxSizing: 'border-box',
    '@media (forced-colors: active)': { forcedColorAdjust: 'none', border: '1px solid CanvasText' },
  },
  legendNum: { ...typographyStyles.caption1Strong, fontVariantNumeric: 'tabular-nums' },
  quiet: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground3 },
  linkBtn: { alignSelf: 'flex-start', minWidth: 0, paddingInline: 0, height: 'auto' },
  shared: {
    display: 'grid',
    gridTemplateColumns: '36px minmax(0, 1fr) auto',
    alignItems: 'center',
    columnGap: '12px',
    paddingInline: '16px',
    paddingBlock: '12px',
    width: '100%',
    textAlign: 'start',
    font: 'inherit',
    color: tokens.colorNeutralForeground1,
    background: 'none',
    border: 'none',
  },
  sharedBtn: {
    cursor: 'pointer',
    borderRadius: tokens.borderRadiusLarge,
    ':hover': { backgroundColor: tokens.colorSubtleBackgroundHover },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
  },
  sharedIcon: {
    width: '36px',
    height: '36px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke2}`,
    color: tokens.colorBrandForeground2,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  sharedText: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  pause: { ...typographyStyles.caption1, margin: 0, paddingInline: '4px', color: tokens.colorNeutralForeground2 },
  // Frister: the ten working days to the deadline, as a strip of dates, today outlined. A date, never a countdown.
  days: { listStyle: 'none', margin: 0, paddingInline: '16px', display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gap: '4px' },
  dayCell: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBlock: '4px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    ...typographyStyles.caption2,
    color: tokens.colorNeutralForeground2,
  },
  dayNum: { ...typographyStyles.body1Strong, color: tokens.colorNeutralForeground1 },
  dayToday: { border: `1px solid ${tokens.colorBrandStroke1}`, backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorBrandForeground1 },
  dayDue: { backgroundColor: tokens.colorNeutralForeground1, color: tokens.colorNeutralForegroundInverted },
  dayNumDue: { color: tokens.colorNeutralForegroundInverted },
  dayBadge: {
    position: 'absolute',
    top: '-7px',
    right: '-5px',
    minWidth: '16px',
    height: '16px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralForeground1}`,
    color: tokens.colorNeutralForeground1,
    ...typographyStyles.caption2Strong,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  dl: { margin: 0, paddingInline: '16px', paddingBlock: '10px', display: 'flex', flexDirection: 'column', gap: '8px' },
  dlList: { margin: 0 },
  dt: { ...typographyStyles.body1Strong },
  dd: { margin: 0, ...typographyStyles.body1 },
  // The study card: a guide card (boards 4a and 8b), the artwork fading in from the top, the study's next step with its
  // one sheen action, the three cases with «Nå», and the study name. The study around the work, beside the day.
  study: {
    ...guideCardSurface,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingInline: '20px',
    paddingBlockStart: '64px',
    paddingBlockEnd: '20px',
    boxShadow: tokens.shadow2,
  },
  studyBand: { height: '84px' },
  eyebrow: { ...typographyStyles.caption1Strong, margin: 0, color: guide.ink },
  studyTitle: { ...typographyStyles.subtitle1, margin: 0, color: tokens.colorNeutralForeground1 },
  studyText: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  studyMeta: { display: 'flex', alignItems: 'flex-start', gap: '6px', ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  studyMetaIcon: { flexShrink: 0, marginTop: '2px', color: guide.ink, display: 'inline-flex' },
  start: { alignSelf: 'flex-start', maxWidth: '100%', height: 'auto', minHeight: '40px', whiteSpace: 'normal', textAlign: 'start' },
  tourLink: {
    alignSelf: 'flex-start',
    minWidth: 0,
    height: 'auto',
    minHeight: '24px',
    paddingInline: 0,
    ...typographyStyles.body1Strong,
    color: guide.ink,
    ':hover': { color: guide.ink, textDecoration: 'underline' },
    ':hover:active': { color: guide.ink },
  },
  // The three cases (board 4a): an empty ring to come, a coral dot and «Nå» for the current one, a tick when done.
  cases: {
    listStyle: 'none',
    margin: 0,
    paddingBlockStart: '12px',
    paddingInline: 0,
    borderTop: `1px solid ${guide.track}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  caseRow: { display: 'flex', alignItems: 'center', gap: '10px', ...typographyStyles.body1, color: tokens.colorNeutralForeground2 },
  caseNow: { ...typographyStyles.body1Strong, color: tokens.colorNeutralForeground1 },
  caseDot: {
    flex: '0 0 12px',
    width: '12px',
    height: '12px',
    borderRadius: tokens.borderRadiusCircular,
    boxSizing: 'border-box',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  caseDotNow: { border: 'none', backgroundColor: guide.coral, '@media (forced-colors: active)': { backgroundColor: 'Highlight' } },
  caseDone: { flex: '0 0 16px', color: guide.ink, display: 'inline-flex', marginInline: '-2px' },
  caseName: { flex: '1 1 auto', minWidth: 0 },
  caseStatus: { ...typographyStyles.caption1Strong, color: guide.ink },
  caseStatusDone: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  // «Studienavnet ditt»: the name's mark, the label with a small «Hva er dette?» beside it, and the name below.
  nameBox: {
    display: 'grid',
    gridTemplateColumns: '32px minmax(0, 1fr)',
    alignItems: 'start',
    columnGap: '10px',
    marginBlockStart: '4px',
    paddingInlineStart: '10px',
    paddingInlineEnd: '6px',
    paddingBlock: '8px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${guide.cardEdge}`,
    backgroundColor: 'rgba(255,255,255,0.86)',
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  nameStack: { display: 'flex', flexDirection: 'column', gap: '0', minWidth: 0 },
  nameLabel: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  nameValue: { ...typographyStyles.body1Strong, overflowWrap: 'anywhere' },
  nameWhat: {
    alignSelf: 'flex-start',
    minWidth: 0,
    height: '24px',
    paddingInline: 0,
    marginBlockStart: '2px',
    ...typographyStyles.caption1Strong,
    color: guide.ink,
    ':hover': { color: guide.ink, textDecoration: 'underline' },
    ':hover:active': { color: guide.ink },
  },
  namePop: { maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '8px' },
  namePopTitle: { ...typographyStyles.body1Strong, margin: 0 },
  namePopText: { ...typographyStyles.body1, margin: 0 },
});

/** The least widths of the overview's grid for two, three and four columns: the study card 272 px, the day's list 472
 * or 480 px (440 px beside two side columns), the side column 320 px (360 px for DPS, whose deadline strip needs it) or
 * two of 240 px (as board 8b at 1366 px), and 16 px gaps. */
const TWO_COLUMNS = 760;
const THREE_COLUMNS: Record<Role, number> = { gp: 1104, dps: 1144 };
const FOUR_COLUMNS: Record<Role, number> = { gp: 1240, dps: 1360 };

/** How many columns the overview has room for, from its own measured width. */
function useColumns(role: Role): [RefObject<HTMLDivElement | null>, 1 | 2 | 3 | 4] {
  const ref = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState<1 | 2 | 3 | 4>(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      setCols(w >= FOUR_COLUMNS[role] ? 4 : w >= THREE_COLUMNS[role] ? 3 : w >= TWO_COLUMNS ? 2 : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [role]);
  return [ref, cols];
}

const WEEKDAY: Record<'nb' | 'en', string[]> = {
  nb: ['sø', 'ma', 'ti', 'on', 'to', 'fr', 'lø'],
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
};

/** The overview: «Min dag» for the GP, «Inntaket i dag» for DPS (decision 1, boards 8b and 8c). */
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
  const openStep = (id: string) => setStepDialog(id);
  const [colsRef, ncols] = useColumns(role);
  const side = mergeClasses(cls.colSide, ncols === 2 && cls.colSideUnder, ncols === 3 && cls.colSideBeside, ncols === 4 && cls.colSideSplit);
  // The patient search filters the day's list (board 4a); the rest of the day stays as it is.
  const [query, setQuery] = useState('');
  return (
    <div className={cls.page}>
      <HomeHead role={role} query={query} onQuery={setQuery} />
      <div
        ref={colsRef}
        className={mergeClasses(
          cls.cols,
          ncols === 2 && cls.cols2,
          ncols === 3 && (role === 'dps' ? cls.cols3Dps : cls.cols3),
          ncols === 4 && (role === 'dps' ? cls.cols4Dps : cls.cols4),
        )}
        data-columns={ncols}
      >
        <div className={cls.colStudy}>
          <StudyCard onStartTour={() => setTourCard(true)} />
        </div>
        {role === 'gp' ? (
          <>
            <div className={cls.colMain}>
              <Timeliste query={query} />
            </div>
            <div className={side}>
              <div className={cls.sideGroup}>
                <GpInbox />
                <GpReferrals />
              </div>
              <div className={cls.sideGroup}>
                <GpPattern onOpen={st.tour.done ? () => openStep('gp-monster') : undefined} />
                <SharedCard role="gp" onOpen={st.tour.done ? () => openStep('gp-kalibrering') : undefined} />
                <Pause />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={cls.colMain}>
              <Queue query={query} />
            </div>
            <div className={side}>
              <div className={cls.sideGroup}>
                <Deadlines />
                <DpsMessages />
              </div>
              <div className={cls.sideGroup}>
                <SharedCard role="dps" onOpen={st.tour.done ? () => openStep('dps-kalibrering') : undefined} />
                <Pause />
              </div>
            </div>
          </>
        )}
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

/** A patient matches the search by name, or by the start of the national identity number (board 4a, as review mode). */
function matches(query: string, name: string, fnr: string): boolean {
  const needle = query.trim().toLocaleLowerCase('nb');
  if (!needle) return true;
  const digits = needle.replace(/\D/g, '');
  return name.toLocaleLowerCase('nb').includes(needle) || (digits !== '' && fnr.replace(/\D/g, '').startsWith(digits));
}

function HomeHead({ role, query, onQuery }: { role: Role; query: string; onQuery: (q: string) => void }) {
  const cls = useStyles();
  const { s, lang } = useLang();
  const study = useStudy();
  const announce = useAtlasAnnounce();
  const st = study.state;
  // How many patients match is said once typing pauses (G-28), through the app's one announcer (G-32).
  const all = role === 'gp' ? [...CORE.map((c) => cases[c].patient), ...ordinary] : CORE.map((c) => cases[c].patient);
  const found = all.filter((p) => matches(query, p.name, p.fnr)).length;
  useEffect(() => {
    if (!query.trim()) return;
    const id = window.setTimeout(() => announce(found ? s('homeSearchFound', { n: found, m: all.length }) : s('noMatches')), 1000);
    return () => window.clearTimeout(id);
  }, [query, found, all.length, announce, s]);
  const day = formatDateWithWeekday(role === 'gp' ? GP_TODAY : DPS_TODAY, lang);
  const counts: { n: string; text: string }[] = [];
  if (role === 'gp') {
    counts.push({ n: String(CORE.length + ordinary.length), text: s('homeCountAppointments') });
    counts.push({ n: String(CORE.length), text: s('homeCountCases') });
    const fresh = gpInboxItems(st.phase).filter((x) => x.isNew).length;
    counts.push(fresh ? { n: String(fresh), text: s(fresh === 1 ? 'homeCountInboxOne' : 'homeCountInbox') } : { n: '', text: s('homeCountInboxNone') });
  } else {
    counts.push({ n: String(CORE.length), text: s('homeCountReferrals') });
    const fresh = st.phase.astrid !== 'done' ? 1 : 0;
    counts.push(fresh ? { n: String(fresh), text: s('homeCountMessageOne') } : { n: '', text: s('homeCountMessageNone') });
    counts.push({ n: '', text: s('homeNextDeadline', { date: formatDayMonth(cases.kari.dps!.queue.deadline, lang) }) });
  }
  return (
    <div className={cls.head}>
      <div className={cls.headText}>
        <div className={cls.titleRow}>
          <PageHeading title={s(role === 'gp' ? 'homeGpTitle' : 'homeDpsTitle')}>{s(role === 'gp' ? 'homeGpTitle' : 'homeDpsTitle')}</PageHeading>
          <p className={cls.day}>{s('homeDayLabel', { date: day })}</p>
        </div>
        <ul className={cls.counts} aria-label={s('homeCountsLabel')}>
          {counts.map((c) => (
            <li key={c.text} className={cls.count}>
              {c.n && <span className={cls.countNum}>{c.n}</span>}
              {c.text}
            </li>
          ))}
        </ul>
      </div>
      <SearchBox
        className={cls.search}
        value={query}
        onChange={(_, d) => onQuery(d.value)}
        placeholder={s('searchPatients')}
        aria-label={s('searchPatients')}
        dismiss={{ 'aria-label': s('clearSearch') }}
        data-home-search=""
      />
    </div>
  );
}

/* ---------- The study card ---------- */

function StudyCard({ onStartTour }: { onStartTour: () => void }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const titleId = useId();
  const role: Role = study.role ?? 'gp';
  const st = study.state;
  const current = currentCase(st);
  const done = casesDone(st);
  let eyebrow: string;
  let title: string;
  let body: ReactNode;
  let action: ReactNode;
  if (!st.tour.done) {
    eyebrow = s('studyCardEyebrow', { n: 1, title: s('partIntro') });
    title = st.tour.started ? s('studyCardTourGoOnTitle') : s('studyCardTourTitle');
    body = (
      <>
        <p className={cls.studyText}>{s(role === 'gp' ? 'studyCardTourTextGp' : 'studyCardTourTextDps')}</p>
        <p className={cls.studyMeta}>
          <span className={cls.studyMetaIcon} aria-hidden="true">
            <LockClosed16Regular />
          </span>
          {s(role === 'gp' ? 'studyCardLockedGp' : 'studyCardLockedDps')}
        </p>
      </>
    );
    action = st.tour.started ? (
      <SheenButton className={cls.start} icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => navigate('/studie/omvisning')}>
        {s('studyCardTourGoOn')}
      </SheenButton>
    ) : (
      <SheenButton className={cls.start} icon={<ArrowRight20Regular />} iconPosition="after" onClick={onStartTour} data-start-tour="">
        {s('studyCardStartTour')}
      </SheenButton>
    );
  } else if (current) {
    const n = CORE.indexOf(current) + 1;
    const c = cases[current];
    const name = c.patient.name;
    const inProgress = caseInProgress(st, current);
    eyebrow = s('studyCardEyebrow', { n: 2, title: s(partTwoLabel(role)) });
    title = inProgress
      ? s('studyCardResumeTitle', { n, name })
      : done === 0
        ? s('studyCardReady', { name })
        : s('guideCaseOf', { n, name });
    const briefing = role === 'gp' ? c.gp.briefing : c.dps!.briefing;
    const meta =
      role === 'gp'
        ? s('studyCardMetaGp', { time: c.gp.timeliste.time, visit: t(c.gp.timeliste.visit), duration: t(briefing.time) })
        : s('studyCardMetaDps', { date: formatDayMonth(c.dps!.queue.received, lang), duration: t(briefing.time) });
    body = (
      <>
        <p className={cls.studyMeta}>
          <span className={cls.studyMetaIcon} aria-hidden="true">
            <Clock16Regular />
          </span>
          {meta}
        </p>
        <p className={cls.studyText}>{s('guideTwoViews')}</p>
      </>
    );
    action = (
      <SheenButton className={cls.start} icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => navigate(`/studie/sak/${current}`)} data-open-case={current}>
        {inProgress ? s('continueCase') : role === 'gp' ? s('listOpenCase') : s('listOpenReferral')}
      </SheenButton>
    );
  } else {
    eyebrow = s('studyCardEyebrow', { n: 3, title: s('partEnd') });
    title = s('guideAllDoneTitle');
    body = <p className={cls.studyText}>{s('studyCardDoneText')}</p>;
    const atHelhet = st.furthest === 'helhet';
    action = (
      <SheenButton className={cls.start} icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => (atHelhet ? ctl.goToStep('helhet') : navigate(ctl.currentPath()))}>
        {atHelhet ? s('studyCardToEnd') : s('continue')}
      </SheenButton>
    );
  }
  return (
    <section className={cls.study} aria-labelledby={titleId} data-study-card="" data-guide-card="">
      <GuideImage variant="band" className={cls.studyBand} />
      <p className={cls.eyebrow}>{eyebrow}</p>
      <h2 id={titleId} className={cls.studyTitle}>
        {title}
      </h2>
      {body}
      {action}
      <StudyCases />
      {/* After the tour, the tour again from where the cases are (board 4a). */}
      {st.tour.done && (
        <Button appearance="transparent" className={cls.tourLink} icon={<Map16Regular />} onClick={() => navigate('/studie/omvisning?igjen')}>
          {s('guideTourAgain')}
        </Button>
      )}
      <StudyName />
    </section>
  );
}

/** The three cases and where the participant is: «Nå» on the current one after the tour, a tick on each one done (4a). */
function StudyCases() {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const st = study.state;
  const current = st.tour.done ? currentCase(st) : undefined;
  return (
    <ol className={cls.cases} aria-label={s('guideCasesLabel')} data-study-cases="">
      {CORE.map((c, i) => {
        const done = st.phase[c] === 'done';
        const now = c === current;
        return (
          <li key={c} className={mergeClasses(cls.caseRow, now && cls.caseNow)} aria-current={now ? 'step' : undefined} data-study-case={c}>
            {done ? (
              <span className={cls.caseDone} aria-hidden="true">
                <CheckmarkCircle16Filled />
              </span>
            ) : (
              <span className={mergeClasses(cls.caseDot, now && cls.caseDotNow)} aria-hidden="true" />
            )}
            <span className={cls.caseName}>{s('guideCaseRow', { n: i + 1, name: cases[c].patient.name })}</span>
            {now && <span className={cls.caseStatus}>{s('guideNow')}</span>}
            {done && <span className={cls.caseStatusDone}>{s('chipDone')}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function StudyName() {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const titleId = useId();
  const labelId = useId();
  const name = study.state.studienavn;
  if (!name) return null;
  return (
    <div className={cls.nameBox} data-studienavn="">
      <StudyNameMark name={name} size={32} />
      <span className={cls.nameStack}>
        <span className={cls.nameLabel} id={labelId}>
          {s('omDegNameTitle')}
        </span>
        <span className={cls.nameValue} lang="nb" data-studienavn-value="">
          {name}
        </span>
        {/* «Hva er dette?» as a quiet link in the guide's ink (board 8b); it opens what the name is for. */}
        <Popover withArrow positioning="above" trapFocus>
          <PopoverTrigger disableButtonEnhancement>
            <Button appearance="transparent" size="small" className={cls.nameWhat} aria-describedby={labelId} data-name-what="">
              {s('studyNameWhat')}
            </Button>
          </PopoverTrigger>
          <PopoverSurface aria-labelledby={titleId} tabIndex={-1}>
            <div className={cls.namePop}>
              <p className={cls.namePopTitle} id={titleId}>
                {s('omDegNameTitle')}
              </p>
              <p className={cls.namePopText}>{s('omDegNameLead')}</p>
            </div>
          </PopoverSurface>
        </Popover>
      </span>
    </div>
  );
}

/* ---------- GP: Timeliste i dag ---------- */

/** «Sak 1» and what the case can do now: wait for the tour, open, go on, or done. */
function CaseStatus({ caseId }: { caseId: CoreCaseId }) {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const st = study.state;
  const n = CORE.indexOf(caseId) + 1;
  const current = currentCase(st);
  const isCurrent = st.tour.done && caseId === current;
  const name = cases[caseId].patient.name;
  const nameId = `home-case-${caseId}`;
  let what: ReactNode;
  if (st.phase[caseId] === 'done') {
    what = (
      <span className={cls.doneMark}>
        <span className={cls.doneIcon} aria-hidden="true">
          <CheckmarkCircle16Filled />
        </span>
        {s('chipDone')}
      </span>
    );
  } else if (!st.tour.done) {
    what =
      n === 1 ? (
        <span className={cls.later}>
          <LockClosed16Regular aria-hidden="true" />
          {s('homeAfterTour')}
        </span>
      ) : (
        <span className={cls.later}>{s('homeLater')}</span>
      );
  } else if (isCurrent) {
    what = (
      <Button size="small" aria-describedby={nameId} onClick={() => navigate(`/studie/sak/${caseId}`)}>
        {caseInProgress(st, caseId) ? s('continue') : s('stepOpen')}
      </Button>
    );
  } else {
    what = <span className={cls.later}>{s('homeLater')}</span>;
  }
  return (
    <span className={cls.status}>
      <span className={mergeClasses(cls.tag, isCurrent && cls.tagNow)}>{s('listCaseTag', { n })}</span>
      {what}
      <span id={nameId} hidden>
        {name}
      </span>
    </span>
  );
}

function Timeliste({ query }: { query: string }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const study = useStudy();
  const titleId = useId();
  const st = study.state;
  const current = st.tour.done ? currentCase(st) : undefined;
  const next = currentCase(st);
  const rows: { time: string; node: ReactNode; key: string }[] = [
    ...CORE.filter((c) => matches(query, cases[c].patient.name, cases[c].patient.fnr)).map((c) => {
      const x = cases[c];
      // The visit and the case's first status, on one line (board 8b).
      const line = [t(x.gp.timeliste.visit), ...x.gp.timeliste.chips.slice(0, 1).map((ch) => t(ch.label))].join(' · ');
      return {
        time: x.gp.timeliste.time,
        key: c,
        node: (
          <li key={c} className={mergeClasses(cls.row, c === current && cls.rowCurrent)} data-home-case={c}>
            <span className={cls.time}>{x.gp.timeliste.time}</span>
            <span className={cls.avatar} aria-hidden="true">
              {x.patient.initials}
            </span>
            <span className={cls.who}>
              <span className={cls.name}>{s('patientAge', { name: x.patient.name, age: x.patient.age })}</span>
              <span className={cls.visit}>{line}</span>
            </span>
            <CaseStatus caseId={c} />
          </li>
        ),
      };
    }),
    ...ordinary.filter((o) => matches(query, o.name, o.fnr)).map((o) => ({
      time: o.time,
      key: o.id,
      node: (
        <li key={o.id} className={cls.row}>
          <span className={cls.time} style={{ fontWeight: tokens.fontWeightRegular }}>
            {o.time}
          </span>
          <span className={cls.avatar} aria-hidden="true">
            {o.initials}
          </span>
          <span className={cls.who}>
            <span className={cls.nameQuiet}>{s('patientAge', { name: o.name, age: o.age })}</span>
            <span className={cls.visit}>{t(o.visit)}</span>
          </span>
          <span className={cls.later}>{s('listRoutineTag')}</span>
        </li>
      ),
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));
  return (
    <section className={cls.card} aria-labelledby={titleId} data-home-part="timeliste">
      <div className={cls.cardHead}>
        <h2 id={titleId} className={cls.h2}>
          {s('timelisteTitle')}
        </h2>
      </div>
      <p className={cls.nextLine}>
        <Clock16Regular aria-hidden="true" />
        {next ? s('homeNext', { name: cases[next].patient.name, time: cases[next].gp.timeliste.time }) : s('guideAllDoneTitle')}
      </p>
      {rows.length ? <ul className={cls.rows}>{rows.map((r) => r.node)}</ul> : <p className={cls.empty}>{s('noMatches')}</p>}
      <p className={cls.foot}>{s('homeRoutineNote')}</p>
    </section>
  );
}

/* ---------- GP: Innboks, Henvisninger, Mitt henvisningsmønster ---------- */

interface InboxItem {
  key: string;
  kind: string;
  name: string;
  note?: ReactNode;
  isNew: boolean;
}

/** What is new: Astrid's reply until her case is done, Kari's self-report until her case is opened. */
function gpInboxItems(phase: ReturnType<typeof useStudy>['state']['phase']): { key: string; isNew: boolean }[] {
  return [
    { key: 'astrid', isNew: phase.astrid !== 'done' },
    { key: 'kari', isNew: (phase.kari ?? 'briefing') === 'briefing' },
  ];
}

function GpInbox() {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const study = useStudy();
  const titleId = useId();
  const fresh = gpInboxItems(study.state.phase);
  const letter = cases.astrid.gp.caseOnlyLetter!;
  const items: InboxItem[] = [
    {
      key: 'astrid',
      // «DPS Skjærgården», without «, inntaksteamet»: the line stays short.
      kind: `${t(letter.title)} · ${t(letter.from).split(',')[0]} · ${formatDayMonth(letter.date, lang)}`,
      name: s('patientAge', { name: cases.astrid.patient.name, age: cases.astrid.patient.age }),
      note: <StatusChip>{t(vocab.outcomes.retur.label)}</StatusChip>,
      isNew: fresh[0].isNew,
    },
    {
      key: 'kari',
      kind: s('homeInboxSelfReport'),
      name: s('patientAge', { name: cases.kari.patient.name, age: cases.kari.patient.age }),
      note: s('homeInboxSelfReportNote', { time: cases.kari.gp.timeliste.time }),
      isNew: fresh[1].isNew,
    },
  ];
  const n = items.filter((x) => x.isNew).length;
  return (
    <section className={cls.card} aria-labelledby={titleId} data-home-part="innboks">
      <div className={cls.cardHead}>
        <h2 id={titleId} className={cls.h2}>
          {s('homeInboxTitle')}
        </h2>
        {n > 0 && <span className={cls.newBadge}>{n === 1 ? s('homeNewOne') : s('homeNewCount', { n })}</span>}
      </div>
      <ul className={cls.items}>
        {items.map((x) => (
          <li key={x.key} className={cls.item}>
            {x.isNew && <span className={cls.dot} aria-hidden="true" />}
            <span className={cls.itemKind}>
              {x.kind}
              {x.isNew && <SrOnly>{`, ${s('homeNewWord')}`}</SrOnly>}
            </span>
            <span className={cls.name}>{x.name}</span>
            {typeof x.note === 'string' ? <span className={cls.itemNote}>{x.note}</span> : x.note && <span className={cls.chipLine}>{x.note}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function GpReferrals() {
  const cls = useStyles();
  const { s, t } = useLang();
  const titleId = useId();
  const waiting = pattern.outcomes.find((o) => o.key === 'venter');
  return (
    <section className={cls.card} aria-labelledby={titleId} data-home-part="henvisninger">
      <div className={cls.cardHead}>
        <h2 id={titleId} className={cls.h2}>
          {s('homeReferralsTitle')}
        </h2>
      </div>
      <div className={cls.refRow}>
        <span className={cls.refWho}>
          <span>{cases.astrid.patient.name}</span>
          <span className={cls.chipLine}>
            <StatusChip>{t(vocab.outcomes.retur.label)}</StatusChip>
          </span>
        </span>
      </div>
      {waiting && (
        <div className={cls.refRow}>
          <span>{t(waiting.label)}</span>
          <span className={cls.refCount}>{waiting.count}</span>
        </div>
      )}
    </section>
  );
}

function GpPattern({ onOpen }: { onOpen?: () => void }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const titleId = useId();
  const total = pattern.total;
  return (
    <section className={cls.card} aria-labelledby={titleId} data-home-part="monster">
      <div className={cls.cardHead}>
        <h2 id={titleId} className={cls.h2}>
          {s('navPattern')}
        </h2>
      </div>
      <div className={cls.pattern}>
        <p className={cls.patternSub}>{s('homePatternOnlyYou')}</p>
        <p className={cls.patternTotal}>
          <span className={cls.patternNum}>{total}</span> {s('homePatternReferrals')}
        </p>
        <p className={cls.quiet} style={{ marginBlockStart: -6 }}>
          {t(pattern.period)}
        </p>
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
        <p className={cls.quiet}>{s('homePatternNote')}</p>
        {onOpen && (
          <Button appearance="transparent" className={cls.linkBtn} icon={<ArrowRight16Regular />} iconPosition="after" onClick={onOpen} data-open-step="gp-monster">
            {s('homeSeePattern')}
          </Button>
        )}
      </div>
    </section>
  );
}

/** Delt oversikt: after the tour it opens the tour's step again (the same view the tour showed). */
function SharedCard({ role, onOpen }: { role: Role; onOpen?: () => void }) {
  const cls = useStyles();
  const { s } = useLang();
  const inner = (
    <>
      <span className={cls.sharedIcon} aria-hidden="true">
        <PeopleCommunity20Regular />
      </span>
      <span className={cls.sharedText}>
        <span className={cls.name}>{s('navShared')}</span>
        <span className={cls.visit}>{s(role === 'gp' ? 'homeSharedGp' : 'homeSharedDps')}</span>
      </span>
      {onOpen ? <ArrowRight16Regular aria-hidden="true" /> : <span />}
    </>
  );
  return (
    <section className={cls.card} aria-label={s('navShared')} data-home-part="delt">
      {onOpen ? (
        <button type="button" className={mergeClasses(cls.shared, cls.sharedBtn)} onClick={onOpen} data-open-step={role === 'gp' ? 'gp-kalibrering' : 'dps-kalibrering'}>
          {inner}
        </button>
      ) : (
        <div className={cls.shared}>{inner}</div>
      )}
    </section>
  );
}

function Pause() {
  const cls = useStyles();
  const { s } = useLang();
  return <p className={cls.pause}>{s('homePause')}</p>;
}

/* ---------- DPS: Mottatte henvisninger, Frister, Meldinger ---------- */

function Queue({ query }: { query: string }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const study = useStudy();
  const titleId = useId();
  const st = study.state;
  const current = st.tour.done ? currentCase(st) : undefined;
  // Newest first; the same day keeps the study's order.
  const rows = CORE.filter((c) => matches(query, cases[c].patient.name, cases[c].patient.fnr)).sort((a, b) =>
    cases[b].dps!.queue.received.localeCompare(cases[a].dps!.queue.received),
  );
  return (
    <section className={cls.card} aria-labelledby={titleId} data-home-part="mottatte">
      <div className={cls.cardHead}>
        <h2 id={titleId} className={cls.h2}>
          {s('navQueue')}
        </h2>
      </div>
      {!rows.length && <p className={cls.empty}>{s('noMatches')}</p>}
      <ul className={cls.rows} style={{ borderTop: `1px solid ${tokens.colorNeutralStroke3}` }} hidden={!rows.length}>
        {rows.map((c) => {
          const x = cases[c];
          const q = x.dps!.queue;
          const answered = x.dps!.returnSent;
          return (
            <li key={c} className={mergeClasses(cls.row, cls.rowDps, c === current && cls.rowCurrent)} data-home-case={c}>
              <span className={cls.received}>
                {s('colReceived')}
                <span className={cls.receivedDate}>{formatDayMonth(q.received, lang)}</span>
              </span>
              <span className={cls.avatar} aria-hidden="true">
                {x.patient.initials}
              </span>
              <span className={cls.who}>
                <span className={cls.name}>{s('patientAge', { name: x.patient.name, age: x.patient.age })}</span>
                <span className={cls.visit}>
                  {answered ? s('homeAssessedMessage', { date: formatDayMonth(answered.date, lang) }) : `${s('homeFromGp')} · ${t(q.chips[0]?.label)}`}
                </span>
                {!answered && (
                  <span className={cls.chipLine}>
                    <StatusChip>{s('homeDeadlineChip', { date: formatDayMonth(q.deadline, lang) })}</StatusChip>
                  </span>
                )}
              </span>
              <CaseStatus caseId={c} />
            </li>
          );
        })}
      </ul>
      <p className={cls.foot}>{s('homeQueueNote')}</p>
    </section>
  );
}

function Deadlines() {
  const cls = useStyles();
  const { s, lang } = useLang();
  const titleId = useId();
  const open = CORE.filter((c) => !cases[c].dps!.returnSent);
  const deadline = cases[open[0]].dps!.queue.deadline;
  const due = open.filter((c) => cases[c].dps!.queue.deadline === deadline);
  // The working days from today to the deadline (no public holidays fall in March 2026).
  const days: string[] = [];
  for (let d = DPS_TODAY; d <= deadline; ) {
    if (isWeekday(d)) days.push(d);
    const next = new Date(`${d}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    d = next.toISOString().slice(0, 10);
  }
  const weekday = (iso: string) => WEEKDAY[lang][new Date(`${iso}T12:00:00Z`).getUTCDay()];
  return (
    <section className={cls.card} aria-labelledby={titleId} data-home-part="frister">
      <div className={cls.cardHead}>
        <h2 id={titleId} className={cls.h2}>
          {s('queueDeadlinesTitle')}
        </h2>
      </div>
      <ol className={cls.days} aria-label={s('homeDaysLabel')}>
        {days.map((d) => {
          const isToday = d === DPS_TODAY;
          const isDue = d === deadline;
          const label = `${formatDayMonth(d, lang)}${isToday ? `, ${s('homeToday')}` : ''}${isDue ? `, ${s('homeDueFor', { n: due.length })}` : ''}`;
          return (
            <li key={d} className={mergeClasses(cls.dayCell, isToday && cls.dayToday, isDue && cls.dayDue)} aria-label={label}>
              <span aria-hidden="true">{weekday(d)}</span>
              <span className={mergeClasses(cls.dayNum, isDue && cls.dayNumDue)} aria-hidden="true">
                {Number(d.slice(8))}
              </span>
              {isDue && (
                <span className={cls.dayBadge} aria-hidden="true">
                  {due.length}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div className={cls.dl}>
        <dl className={cls.dlList}>
          <div>
            <dt className={cls.dt}>{s('homeDeadlineLine', { date: formatDayMonth(deadline, lang) })}</dt>
            <dd className={cls.dd}>{due.map((c) => cases[c].patient.name).join(', ')}</dd>
          </div>
        </dl>
        <p className={cls.quiet}>{s('homeDeadlineNote')}</p>
      </div>
    </section>
  );
}

function DpsMessages() {
  const cls = useStyles();
  const { s, lang } = useLang();
  const study = useStudy();
  const titleId = useId();
  const isNew = study.state.phase.astrid !== 'done';
  const answered = cases.astrid.dps!.returnSent!;
  return (
    <section className={cls.card} aria-labelledby={titleId} data-home-part="meldinger">
      <div className={cls.cardHead}>
        <h2 id={titleId} className={cls.h2}>
          {s('homeMessagesTitle')}
        </h2>
        {isNew && <span className={cls.newBadge}>{s('homeNewOne')}</span>}
      </div>
      <ul className={cls.items}>
        <li className={cls.item}>
          {isNew && <span className={cls.dot} aria-hidden="true" />}
          <span className={cls.itemKind}>
            {s('homeMessageFromGp')}
            {isNew && <SrOnly>{`, ${s('homeNewWord')}`}</SrOnly>}
          </span>
          <span className={cls.name}>{s('patientAge', { name: cases.astrid.patient.name, age: cases.astrid.patient.age })}</span>
          <span className={cls.itemNote}>{s('homeMessageAstrid', { date: formatDayMonth(answered.date, lang) })}</span>
          <span className={cls.itemNote}>{s('queueMessageRule')}</span>
        </li>
      </ul>
    </section>
  );
}

