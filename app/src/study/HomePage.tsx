import { Button, makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import {
  ArrowReply20Regular,
  ArrowRight16Regular,
  ArrowRight20Regular,
  Chat20Regular,
  CheckmarkCircle16Filled,
  ClipboardPulse20Regular,
  Document20Regular,
  Form20Regular,
  Map16Regular,
} from '@fluentui/react-icons';
import { useEffect, useId, useState, type ReactNode } from 'react';
import type { CoreCaseId, Role } from '../content/types';
import { cases, ordinary, pattern, shared, startDay } from '../content';
import { formatDateWithWeekday, formatDayMonth, useLang } from '../i18n/i18n';
import { DPS_TODAY, GP_TODAY } from '../engine/clock';
import { navigate, useRoute } from '../router/router';
import { useStudy } from '../state/study';
import { GuideImage, SheenButton, SrOnly, StudyNameMark, guideCardSurface } from '../patterns/basics';
import { guide, neutralBar } from '../theme/constants';
import { PageHeading } from '../shell/PageHeading';
import { TourStepDialog } from '../tour/Tour';
import { focusAfterOverlay } from '../patterns/announce';
import { useWidth } from '../patterns/useWidth';
import { HOME_PATH, LIST_PATH, useStudyController } from './controller';
import { CORE, caseInProgress, casesDone, currentCase } from './parts';
import { ExampleGroup, HomeCard, NewBadge } from './homeParts';
import { StudyCases, StudyMeta, useStudyStep } from './StudyCard';
import { TourStartDialog } from './TourStart';

/**
 * The start page (3.4, boards 12a and 12c): where the participant arrives after Om deg, after the tour, after a pause and
 * after the three cases. The greeting holds the study's next step and its one sheen, which leads to the list where every
 * case starts; under it, the day around the study. Nothing here opens a case, and nothing here hints at one: the parts
 * that show outcomes (the GP's own pattern, Delt oversikt) open when the three cases are done.
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
  // The parts under the greeting. With the room of a laptop window, two stacks side by side: the day's work on the
  // left (two thirds), what came in on the right; every part as tall as its content, so no part is padded out. With
  // less room, two columns, then one. The page measures its own width, never the window's, so an open form panel beside
  // it counts.
  parts: { minWidth: 0 },
  split: { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '16px', alignItems: 'start' },
  // A big screen (3.4.1): the day's work keeps its half, and what came in and Delt oversikt take a column each, so the
  // width goes to more parts side by side rather than wider ones.
  split4: { gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)' },
  stack: { display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 },
  pair: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', alignItems: 'start' },
  grid: { display: 'grid', gap: '16px', alignItems: 'start', minWidth: 0, gridTemplateColumns: 'minmax(0, 1fr)' },
  grid2: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  grid3: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
  spanAll: { gridColumn: '1 / -1' },
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
  // Part 3: the GP's own pattern, as the tour showed it. The greys are the information, so forced colours keep them.
  patternTotal: { ...typographyStyles.body1, margin: 0 },
  patternNum: { ...typographyStyles.subtitle1, marginInlineEnd: '4px' },
  quiet: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground2 },
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
  sharedBlock: { display: 'flex', flexDirection: 'column', gap: '2px' },
  sharedHead: { ...typographyStyles.body1Strong, margin: 0 },
  sharedText: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  // The day: a time strip from 08 to 16 (the start page's «Timeliste i dag»), or a plain list when the part is narrow.
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
  tick: { position: 'absolute', top: '74px', width: '1px', height: '4px', backgroundColor: tokens.colorNeutralStroke1 },
  blocks: { listStyle: 'none', margin: 0, padding: 0, position: 'absolute', left: 0, right: 0, top: '24px', height: '46px' },
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
  blockRoutine: { backgroundColor: tokens.colorNeutralBackground3, border: `1px solid ${tokens.colorNeutralStroke2}`, color: tokens.colorNeutralForeground2 },
  blockOther: { backgroundColor: tokens.colorNeutralBackground2, border: `1px solid ${tokens.colorNeutralStroke3}`, color: tokens.colorNeutralForeground2 },
  blockTick: { display: 'block', color: tokens.colorNeutralForeground3 },
  blockWho: { ...typographyStyles.caption1Strong, display: 'inline-flex', alignItems: 'center', gap: '2px' },
  blockLabel: { maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' },
  now: {
    position: 'absolute',
    top: 0,
    zIndex: 1,
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
  nowLine: { position: 'absolute', top: '20px', zIndex: 1, height: '54px', marginLeft: '-1px', borderLeft: `2px solid ${tokens.colorBrandStroke1}` },
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

/** «09:30» → minutes since midnight. */
function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** «Kari Nordli, 34 år»: the age never breaks from its «år» at a line's end. */
function keepAge(name: string): string {
  return name.replace(/ (år)$/, '\u00a0$1');
}

/** «a, b og c» / «a, b and c». */
function listOf(items: string[], lang: 'nb' | 'en'): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${lang === 'nb' ? 'og' : 'and'} ${items[items.length - 1]}`;
}

function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** The three cases are done: part 3, where the parts that show outcomes open. */
function useCasesDone(): boolean {
  const study = useStudy();
  return casesDone(study.state) === CORE.length;
}

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
  const cols = width >= 1800 ? 4 : width >= 1080 ? 3 : width >= 640 ? 2 : 1;
  const open = useCasesDone();
  return (
    <div className={cls.page} data-start-page="">
      <Hero onStartTour={() => setTourCard(true)} />
      <div ref={gridRef} className={cls.parts} data-columns={cols}>
        {role === 'gp' ? (
          cols >= 3 ? (
            <div className={mergeClasses(cls.split, cols === 4 && cls.split4)}>
              <div className={cls.stack}>
                <DayPart />
                <div className={cls.pair}>
                  <GpReferrals />
                  <GpPattern locked={!open} onOpen={() => setStepDialog('gp-monster')} />
                </div>
              </div>
              {cols === 4 ? (
                <>
                  <GpInbox />
                  <SharedPart role="gp" locked={!open} onOpen={() => setStepDialog('gp-kalibrering')} />
                </>
              ) : (
                <div className={cls.stack}>
                  <GpInbox />
                  <SharedPart role="gp" locked={!open} onOpen={() => setStepDialog('gp-kalibrering')} />
                </div>
              )}
            </div>
          ) : (
            <div className={mergeClasses(cls.grid, cols === 2 && cls.grid2)}>
              <DayPart className={cols === 2 ? cls.spanAll : undefined} />
              <GpInbox />
              <GpReferrals />
              <GpPattern locked={!open} onOpen={() => setStepDialog('gp-monster')} />
              <SharedPart role="gp" locked={!open} onOpen={() => setStepDialog('gp-kalibrering')} />
            </div>
          )
        ) : (
          <div className={mergeClasses(cls.grid, cols === 2 && cls.grid2, cols >= 3 && cls.grid3)}>
            <DpsIntake className={cols === 2 ? cls.spanAll : undefined} />
            <DpsMessages />
            <SharedPart role="dps" locked={!open} onOpen={() => setStepDialog('dps-kalibrering')} />
          </div>
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

/* ---------- GP: the day ---------- */

interface DayItem {
  key: string;
  from: number;
  to: number;
  kind: 'case' | 'routine' | 'other';
  /** What the strip shows: a time and initials, or a label. */
  time?: string;
  initials?: string;
  label: string;
  /** What a screen reader hears, and the narrow list shows. */
  spoken: string;
  caseId?: CoreCaseId;
  n?: number;
}

function useDayItems(): DayItem[] {
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
      label: t(b.label),
      spoken: s('dayBlock', { from: b.from, to: b.to, label: t(b.label) }),
    })),
  ];
  return items.sort((a, b) => a.from - b.from);
}

/**
 * «Timeliste i dag» on the start page: the day at a glance, with «Nå» where the study's clock stands. A picture of the
 * day, never a way in: the cases open from the list. Each appointment shows its initials (a tick when its case is
 * done); its time is where it stands on the hours, and a screen reader hears the whole line. Below 720 px of its own
 * width the strip becomes a plain list.
 */
function DayPart({ className }: { className?: string }) {
  const { s, lang } = useLang();
  const study = useStudy();
  const st = study.state;
  const [ref, width] = useWidth<HTMLDivElement>();
  const items = useDayItems();
  const now = startDay.now[Math.min(casesDone(st), startDay.now.length - 1)];
  const current = st.tour.done ? currentCase(st) : undefined;
  // «Tirsdag 17. mars 2026 · 6 timer · 3 med henvisningssak»: the title already says it is the day.
  const date = formatDateWithWeekday(GP_TODAY, lang);
  const sub = s('daySub', { date: date.charAt(0).toLocaleUpperCase(lang) + date.slice(1), n: CORE.length + ordinary.length, m: CORE.length });
  return (
    <HomeCard part="dag" title={s('dayTitle')} sub={sub} foot={s('dayNote')} className={className}>
      <div ref={ref}>{width >= 720 ? <DayStrip items={items} now={now} current={current} width={width} /> : <DayList items={items} current={current} />}</div>
    </HomeCard>
  );
}

function DayStrip({ items, now, current, width }: { items: DayItem[]; now: string; current?: CoreCaseId; width: number }) {
  const cls = useStyles();
  const { s, lang } = useLang();
  const study = useStudy();
  const st = study.state;
  const start = minutes(startDay.from);
  const end = minutes(startDay.stripTo);
  const span = end - start;
  const at = (min: number) => `${((min - start) / span) * 100}%`;
  const len = (min: number) => `${(min / span) * 100}%`;
  const hours = Array.from({ length: Math.floor(span / 60) + 1 }, (_, i) => start + i * 60);
  const onStrip = items.filter((x) => x.from < end);
  const later = items.filter((x) => x.from >= end).map((x) => x.label.charAt(0).toLocaleLowerCase(lang) + x.label.slice(1));
  return (
    <div className={cls.stripWrap}>
      <p className={cls.srLine}>
        <SrOnly>{s('dayNowSpoken', { time: now })}</SrOnly>
      </p>
      <div className={cls.strip}>
        {[...hours, end].map((h) => (
          <span key={`t${h}`} className={cls.tick} style={{ left: at(h) }} aria-hidden="true" />
        ))}
        {hours.map((h, i) => (
          <span key={h} className={mergeClasses(cls.hour, i === 0 && cls.hourFirst)} style={{ left: at(h) }} aria-hidden="true">
            {hhmm(h).slice(0, 2)}
          </span>
        ))}
        <span className={cls.now} style={{ left: at(minutes(now)) }} aria-hidden="true" data-day-now={now}>
          {s('dayNow', { time: now })}
        </span>
        <span className={cls.nowLine} style={{ left: at(minutes(now)) }} aria-hidden="true" />
        <ol className={cls.blocks} aria-label={s('dayLabel')}>
          {onStrip.map((x) => {
            const done = x.caseId ? st.phase[x.caseId] === 'done' : false;
            const isNow = !!x.caseId && x.caseId === current;
            const spoken = `${x.spoken}${isNow ? `, ${s('guideNow').toLocaleLowerCase()}` : ''}${done ? `, ${s('chipDone').toLocaleLowerCase()}` : ''}`;
            // A slot too narrow for its initials shows none: what it is stays in the hidden line and the legend.
            const roomy = ((x.to - x.from) / span) * width - 4 >= 28;
            return (
              <li
                key={x.key}
                className={mergeClasses(
                  cls.block,
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
                  {x.kind === 'other' ? x.label : done ? <CheckmarkCircle16Filled className={cls.blockTick} /> : roomy && <span className={cls.blockWho}>{x.initials}</span>}
                </span>
                <SrOnly>{spoken}</SrOnly>
              </li>
            );
          })}
        </ol>
      </div>
      {later.length > 0 && <p className={cls.quiet}>{s('dayLater', { list: listOf(later, lang), to: startDay.to.slice(0, 2) })}</p>}
      <p className={cls.legendLine} aria-hidden="true">
        <span className={cls.legendItem}>
          <span className={mergeClasses(cls.legendSwatch, cls.blockCase)} />
          {s('dayLegendCase')}
        </span>
        <span className={cls.legendItem}>
          <span className={mergeClasses(cls.legendSwatch, cls.blockRoutine, cls.legendSwatchQuiet)} />
          {s('dayLegendRoutine')}
        </span>
        <span className={cls.legendItem}>
          <span className={mergeClasses(cls.legendSwatch, cls.blockOther, cls.legendSwatchQuiet)} />
          {s('dayLegendOther')}
        </span>
      </p>
    </div>
  );
}

/** The day as a list, where the part is narrow: time, who or what, and the case's state. */
function DayList({ items, current }: { items: DayItem[]; current?: CoreCaseId }) {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const st = study.state;
  return (
    <ol className={cls.dayList} aria-label={s('dayListLabel')}>
      {items.map((x) => {
        const done = x.caseId ? st.phase[x.caseId] === 'done' : false;
        const isNow = !!x.caseId && x.caseId === current;
        const time = x.kind === 'other' ? `${hhmm(x.from)}–${hhmm(x.to)}` : x.time;
        return (
          <li key={x.key} className={mergeClasses(cls.dayRow, x.kind !== 'case' && cls.dayRowQuiet, isNow && cls.dayRowNow)} data-day-item={x.key}>
            <span className={mergeClasses(cls.dayTime, x.kind !== 'case' && cls.dayTimeQuiet)}>{time}</span>
            <span>{keepAge(x.label)}</span>
            <span className={mergeClasses(cls.dayState, done && cls.dayStateDone)}>
              {x.n && s('listCaseTag', { n: x.n })}
              {isNow && ` · ${s('guideNow')}`}
              {done && ` · ${s('chipDone')}`}
              {x.kind === 'routine' && <span className={cls.dayStateDone}>{s('dayLegendRoutine')}</span>}
            </span>
          </li>
        );
      })}
    </ol>
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

/** «Henvisningene mine»: where Astrid's referral stands (a reply from DPS, never its outcome), and the others waiting. */
function GpReferrals() {
  const cls = useStyles();
  const { s, lang } = useLang();
  const astrid = cases.astrid;
  const sent = astrid.dps!.queue.received;
  const replied = astrid.gp.caseOnlyLetter!.date;
  return (
    <HomeCard part="henvisninger" title={s('refMineTitle')} sub={s('refMineSub')}>
      <ul className={cls.rows}>
        <Row
          icon={astrid.patient.initials}
          name={s('patientAge', { name: astrid.patient.name, age: astrid.patient.age })}
          what={s('refSentReplied', { sent: formatDayMonth(sent, lang), replied: formatDayMonth(replied, lang) })}
          end={<span className={cls.tag}>{s('listCaseTag', { n: CORE.indexOf('astrid') + 1 })}</span>}
        />
      </ul>
      <ExampleGroup>
        <ul className={cls.exList}>
          {startDay.referralsWaiting.map((r) => (
            <li key={r.name} className={cls.exLine}>
              {r.name} · {s('refSent', { date: formatDayMonth(r.sent, lang) })}
            </li>
          ))}
        </ul>
      </ExampleGroup>
    </HomeCard>
  );
}

/** «Mitt henvisningsmønster»: locked until the three cases are done; then the GP's own counts, as the tour showed them. */
function GpPattern({ locked, onOpen }: { locked: boolean; onOpen: () => void }) {
  const cls = useStyles();
  const { s, t } = useLang();
  return (
    <HomeCard part="monster" title={s('navPattern')} sub={s('homePatternOnlyYou')} locked={locked ? s('lockedAfterCases') : undefined}>
      <p className={cls.patternTotal}>
        <span className={cls.patternNum}>{pattern.total}</span>
        {s('homePatternReferrals')}
      </p>
      <p className={cls.quiet}>{t(pattern.period)}</p>
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
      <Button appearance="transparent" className={cls.openBtn} icon={<ArrowRight16Regular />} iconPosition="after" onClick={onOpen} data-open-step="gp-monster">
        {s('homeSeePattern')}
      </Button>
    </HomeCard>
  );
}

/**
 * «Delt oversikt»: locked until the three cases are done. Then what changed and what is being discussed, and the
 * median time to an assessment; never the area's outcome rates, which beside the GP's own counts would stage the
 * comparison the guardrails rule out. The full view opens as the tour showed it.
 */
function SharedPart({ role, locked, onOpen }: { role: Role; locked: boolean; onOpen: () => void }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const latest = shared.kalibrering.criteriaLog[0];
  const median = shared.kalibrering.catchment.find((x) => x.label.nb.startsWith('Tid fra mottak'));
  const step = role === 'gp' ? 'gp-kalibrering' : 'dps-kalibrering';
  // The change's first sentence: what changed. The rest is in the full view.
  const change = t(latest.text).split(/(?<=\.)\s/)[0];
  return (
    <HomeCard part="delt" title={s('navShared')} sub={s(role === 'gp' ? 'homeSharedGp' : 'homeSharedDps')} locked={locked ? s('lockedAfterCases') : undefined}>
      <div className={cls.sharedBlock}>
        <p className={cls.sharedHead}>{s('sharedLatestChange', { date: formatDayMonth(latest.date, lang) })}</p>
        <p className={cls.sharedText}>{change}</p>
      </div>
      <div className={cls.sharedBlock}>
        <p className={cls.sharedHead}>{s('sharedLatestDialog')}</p>
        <p className={cls.sharedText}>{t(shared.dialog.discussion.title)}</p>
      </div>
      {median && <p className={cls.sharedText}>{`${t(median.label)}: ${t(median.value)}`}</p>}
      <Button appearance="transparent" className={cls.openBtn} icon={<ArrowRight16Regular />} iconPosition="after" onClick={onOpen} data-open-step={step}>
        {s('sharedOpen')}
      </Button>
    </HomeCard>
  );
}

/* ---------- DPS: intake and messages ---------- */

/** «Inntaket i dag»: the study's three referrals with their dates (a deadline is a date, never a countdown). */
function DpsIntake({ className }: { className?: string }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const study = useStudy();
  const rows = [...CORE].sort((a, b) => cases[b].dps!.queue.received.localeCompare(cases[a].dps!.queue.received));
  const day = formatDateWithWeekday(DPS_TODAY, lang);
  return (
    <HomeCard part="inntak" title={s('homeDpsTitle')} sub={s('listSubDps', { date: day, n: CORE.length })} className={className}>
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
      <ExampleGroup>
        <ul className={cls.exList}>
          {startDay.dpsDay.map((x) => (
            <li key={x.nb} className={cls.exLine}>
              {t(x)}
            </li>
          ))}
        </ul>
      </ExampleGroup>
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
