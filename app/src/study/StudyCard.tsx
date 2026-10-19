import { Button, makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowRight20Regular, CalendarLtr16Regular, CheckmarkCircle20Filled, LockClosed16Regular, Map16Regular } from '@fluentui/react-icons';
import { useId, type ReactNode } from 'react';
import type { Role } from '../content/types';
import { cases } from '../content';
import { formatDayMonth, useLang } from '../i18n/i18n';
import { navigate } from '../router/router';
import { useStudy } from '../state/study';
import { GuideImage, SheenButton, SrOnly, guideCardSurface } from '../patterns/basics';
import { guide } from '../theme/constants';
import { useStudyController } from './controller';
import { CORE, caseInProgress, currentCase, partTwoLabel } from './parts';

/**
 * Where the participant is in the study, said once for the two places that say it: the start page's greeting (with
 * «Gå til timelisten» after the tour) and the study card beside the list (with «Åpne saken»). One state, two places,
 * so the two never disagree.
 */
export interface StudyStep {
  kind: 'tour' | 'tourGoOn' | 'case' | 'end';
  eyebrow: string;
  title: string;
  /** The line with a calendar or a lock: when and what, or what opens later. */
  meta?: { icon: 'when' | 'lock'; text: string };
  text?: string;
}

export function useStudyStep(): StudyStep {
  const { s, t, lang } = useLang();
  const study = useStudy();
  const role: Role = study.role ?? 'gp';
  const st = study.state;
  const current = currentCase(st);
  if (!st.tour.done) {
    return {
      kind: st.tour.started ? 'tourGoOn' : 'tour',
      eyebrow: s('studyCardEyebrow', { n: 1, title: s('partIntro') }),
      title: st.tour.started ? s('studyCardTourGoOnTitle') : s('studyCardTourTitle'),
      text: s(role === 'gp' ? 'studyCardTourTextGp' : 'studyCardTourTextDps'),
      meta: { icon: 'lock', text: s(role === 'gp' ? 'studyCardLockedGp' : 'studyCardLockedDps') },
    };
  }
  if (current) {
    const n = CORE.indexOf(current) + 1;
    const c = cases[current];
    const name = c.patient.name;
    const briefing = role === 'gp' ? c.gp.briefing : c.dps!.briefing;
    // «Omtrent 10 minutter» inside a sentence: the case's time, said apart from the visit, so it never reads as the
    // length of the consultation.
    const duration = t(briefing.time);
    return {
      kind: 'case',
      eyebrow: s('studyCardEyebrow', { n: 2, title: s(partTwoLabel(role)) }),
      title: caseInProgress(st, current) ? s('studyCardResumeTitle', { n, name }) : s('guideCaseOf', { n, name }),
      text: caseInProgress(st, current)
        ? s('studyCardResumeText')
        : s('studyCardCaseText', { duration: duration.charAt(0).toLocaleLowerCase(lang) + duration.slice(1) }),
      meta: {
        icon: 'when',
        text:
          role === 'gp'
            ? s('studyCardMetaGp', { time: c.gp.timeliste.time, visit: t(c.gp.timeliste.visit) })
            : s('studyCardMetaDps', { date: formatDayMonth(c.dps!.queue.received, lang) }),
      },
    };
  }
  return {
    kind: 'end',
    eyebrow: s('studyCardEyebrow', { n: 3, title: s('partEnd') }),
    title: s('guideAllDoneTitle'),
    text: s('studyCardDoneText'),
  };
}

const useStyles = makeStyles({
  // The study card beside the list (boards 4a and 4b): a guide card, the role's wave fading in from the top, the
  // study's next step with its one sheen action, and the three cases.
  card: {
    ...guideCardSurface,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingInline: '20px',
    paddingBlockStart: '76px',
    paddingBlockEnd: '20px',
    boxShadow: tokens.shadow2,
  },
  // The band ends above the eyebrow: text never sits on the artwork (G-35).
  band: { height: '72px' },
  eyebrow: { ...typographyStyles.caption1Strong, margin: 0, color: guide.ink },
  title: { ...typographyStyles.subtitle1, margin: 0, color: tokens.colorNeutralForeground1 },
  text: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  meta: { display: 'flex', alignItems: 'flex-start', gap: '6px', ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  metaIcon: { flexShrink: 0, marginTop: '2px', color: guide.ink, display: 'inline-flex' },
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
  // The three cases, drawn as the header's steps (3.4): the number in a ring, a tick when done, the current one in coral
  // with «Nå». Words carry the state («Nå», «Ferdig»); the ring is the picture of it.
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
  // The same three cases in a row, in the start page's greeting.
  casesRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: '20px', rowGap: '8px', paddingBlockStart: 0, borderTop: 'none' },
  caseRow: { display: 'flex', alignItems: 'center', gap: '8px', ...typographyStyles.body1, color: tokens.colorNeutralForeground2 },
  caseNow: { ...typographyStyles.body1Strong, color: tokens.colorNeutralForeground1 },
  marker: {
    flex: '0 0 22px',
    width: '22px',
    height: '22px',
    borderRadius: tokens.borderRadiusCircular,
    boxSizing: 'border-box',
    border: `1px solid ${tokens.colorNeutralStrokeAccessible}`,
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...typographyStyles.caption1Strong,
    color: tokens.colorNeutralForeground2,
    fontVariantNumeric: 'tabular-nums',
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  markerNow: {
    border: `2px solid ${guide.coral}`,
    backgroundColor: guide.peach,
    color: guide.ink,
    '@media (forced-colors: active)': { border: '2px solid Highlight' },
  },
  markerDone: { border: 'none', backgroundColor: 'transparent', color: guide.ink },
  caseName: { flex: '1 1 auto', minWidth: 0 },
  caseNameRow: { flex: '0 1 auto' },
  caseStatus: { ...typographyStyles.caption1Strong, color: guide.ink },
  caseStatusDone: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
});

/** The study step's line with its calendar (when: Meridian keeps the clock for deadlines) or its lock. */
export function StudyMeta({ meta, className }: { meta: StudyStep['meta']; className?: string }) {
  const cls = useStyles();
  if (!meta) return null;
  return (
    <p className={mergeClasses(cls.meta, className)}>
      <span className={cls.metaIcon} aria-hidden="true">
        {meta.icon === 'lock' ? <LockClosed16Regular /> : <CalendarLtr16Regular />}
      </span>
      {meta.text}
    </p>
  );
}

/**
 * The study card beside the list: the next step with its one sheen action, which opens the case here (the start page's
 * greeting leads to the list instead), and the three cases.
 */
export function StudyCard({ onStartTour }: { onStartTour: () => void }) {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const step = useStudyStep();
  const titleId = useId();
  const role: Role = study.role ?? 'gp';
  const st = study.state;
  const current = currentCase(st);
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
  } else if (step.kind === 'case' && current) {
    action = (
      <SheenButton className={cls.start} icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => navigate(`/studie/sak/${current}`)} data-open-case={current}>
        {caseInProgress(st, current) ? s('continueCase') : role === 'gp' ? s('listOpenCase') : s('listOpenReferral')}
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
    <section className={cls.card} aria-labelledby={titleId} data-study-card="" data-guide-card="">
      <GuideImage variant="band" className={cls.band} />
      <p className={cls.eyebrow}>{step.eyebrow}</p>
      <h2 id={titleId} className={cls.title}>
        {step.title}
      </h2>
      {step.kind === 'case' && <StudyMeta meta={step.meta} />}
      {step.text && <p className={cls.text}>{step.text}</p>}
      {step.kind !== 'case' && <StudyMeta meta={step.meta} />}
      {action}
      <StudyCases />
      {st.tour.done && (
        <Button appearance="transparent" className={cls.tourLink} icon={<Map16Regular />} onClick={() => navigate('/studie/omvisning?igjen')}>
          {s('guideTourAgain')}
        </Button>
      )}
    </section>
  );
}

/**
 * The three cases and where the participant is: «Nå» on the current one after the tour, a tick and «Ferdig» on each one
 * done. Before the tour the rings are plain: the lock is said once, in the step's own line. `row` lays them out side by
 * side, as in the start page's greeting, where a visible label names the list (`labelledBy`).
 */
export function StudyCases({ row, labelledBy }: { row?: boolean; labelledBy?: string }) {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const st = study.state;
  const current = st.tour.done ? currentCase(st) : undefined;
  return (
    <ol
      className={mergeClasses(cls.cases, row && cls.casesRow)}
      aria-label={labelledBy ? undefined : s('guideCasesLabel')}
      aria-labelledby={labelledBy}
      data-study-cases=""
    >
      {CORE.map((c, i) => {
        const done = st.phase[c] === 'done';
        const now = c === current;
        return (
          <li key={c} className={mergeClasses(cls.caseRow, now && cls.caseNow)} aria-current={now ? 'step' : undefined} data-study-case={c}>
            <span className={mergeClasses(cls.marker, now && cls.markerNow, done && cls.markerDone)} aria-hidden="true">
              {done ? <CheckmarkCircle20Filled /> : i + 1}
            </span>
            <span className={mergeClasses(cls.caseName, row && cls.caseNameRow)}>
              <SrOnly>{`${s('listCaseTag', { n: i + 1 })}: `}</SrOnly>
              {cases[c].patient.name}
            </span>
            {now && <span className={cls.caseStatus}>{s('guideNow')}</span>}
            {done && <span className={cls.caseStatusDone}>{s('chipDone')}</span>}
          </li>
        );
      })}
    </ol>
  );
}
