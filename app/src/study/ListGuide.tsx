import { makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowRight20Regular, CheckmarkCircle16Filled, Map16Regular } from '@fluentui/react-icons';
import { useId } from 'react';
import type { CaseId, CoreCaseId } from '../content/types';
import { cases } from '../content';
import { useLang } from '../i18n/i18n';
import { RouterLink, navigate } from '../router/router';
import { stepIndex, useStudy } from '../state/study';
import { GuideImage, SheenButton } from '../patterns/basics';
import { guide } from '../theme/constants';
import { stepReachable, useStudyController } from './controller';

const CORE: CoreCaseId[] = ['kari', 'erlend', 'astrid'];

const useStyles = makeStyles({
  // A guide card (B6): the dawn in a card, the image fading into it from the top.
  card: {
    position: 'relative',
    isolation: 'isolate',
    overflow: 'hidden',
    flex: '1 1 280px',
    maxWidth: '320px',
    minWidth: 0,
    alignSelf: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    paddingInline: '22px',
    paddingBlockStart: '112px',
    paddingBlockEnd: '22px',
    borderRadius: '12px',
    border: `1px solid ${guide.cardEdge}`,
    background: guide.card,
    boxSizing: 'border-box',
    '@media (max-width: 639px)': { maxWidth: 'none' },
    '@media print': { background: '#FFFFFF' },
    '@media (forced-colors: active)': { background: 'Canvas', border: '1px solid CanvasText' },
  },
  eyebrow: { ...typographyStyles.caption1Strong, margin: 0, color: guide.ink },
  title: { ...typographyStyles.subtitle1, margin: 0, color: tokens.colorNeutralForeground1 },
  text: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  start: { alignSelf: 'flex-start' },
  cases: {
    listStyle: 'none',
    margin: 0,
    paddingBlockStart: tokens.spacingVerticalM,
    paddingInline: 0,
    borderTop: `1px solid ${guide.track}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  caseRow: { display: 'flex', alignItems: 'center', gap: '10px', ...typographyStyles.body1, color: tokens.colorNeutralForeground2 },
  caseNow: { ...typographyStyles.body1Strong, color: tokens.colorNeutralForeground1 },
  dot: { flex: '0 0 12px', width: '12px', height: '12px', borderRadius: tokens.borderRadiusCircular, boxSizing: 'border-box', border: `1px solid ${tokens.colorNeutralStroke1}`, backgroundColor: tokens.colorNeutralBackground1 },
  dotNow: { border: 'none', backgroundColor: guide.coral },
  doneIcon: { flex: '0 0 16px', color: guide.ink, display: 'inline-flex', marginInline: '-2px' },
  caseName: { flex: '1 1 auto', minWidth: 0 },
  status: { ...typographyStyles.caption1Strong, color: guide.ink },
  statusDone: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  note: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground2 },
  tourLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    alignSelf: 'flex-start',
    minHeight: '32px',
    ...typographyStyles.body1Strong,
    color: guide.ink,
    textDecoration: 'none',
    borderRadius: tokens.borderRadiusSmall,
    ':hover': { textDecoration: 'underline', color: guide.ink },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
  },
});

/** «Sak 1» to «Sak 3» on the list's cards, and which one is current. */
export function useCaseTags(): (c: CaseId) => { label: string; current: boolean } | undefined {
  const { s } = useLang();
  const study = useStudy();
  const current = CORE.find((c) => study.state.phase[c] !== 'done');
  return (c) => {
    const i = CORE.indexOf(c as CoreCaseId);
    if (i >= 0) return { label: s('listCaseTag', { n: i + 1 }), current: c === current };
    return c === 'torbjorn' ? { label: s('listExtraTag'), current: false } : undefined;
  };
}

/**
 * The study's guide card beside the list: which case is next, a way into it,
 * the three cases with their status, and the tour again. Study mode only.
 */
export function ListGuide() {
  const cls = useStyles();
  const { s, t } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const titleId = useId();
  const role = study.role ?? 'gp';
  const st = study.state;
  const current = CORE.find((c) => st.phase[c] !== 'done');
  const task = current ? (role === 'gp' ? cases[current].gp.briefing.task : cases[current].dps?.briefing.task) : undefined;
  return (
    <aside className={cls.card} aria-labelledby={titleId} data-guide-card="">
      <GuideImage variant="band" />
      {current && <p className={cls.eyebrow}>{s('guideStudyStep', { n: stepIndex(current) + 1 })}</p>}
      <h2 id={titleId} className={cls.title}>
        {current ? s('guideCaseOf', { n: CORE.indexOf(current) + 1, name: cases[current].patient.name }) : s('guideAllDoneTitle')}
      </h2>
      {current ? (
        <>
          {task && <p className={cls.text}>{t(task)}</p>}
          <p className={cls.text}>{s('guideTwoViews')}</p>
          {stepReachable(st.furthest, current) && (
            <SheenButton className={cls.start} icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => navigate(`/studie/sak/${current}`)}>
              {role === 'gp' ? s('listOpenCase') : s('listOpenReferral')}
            </SheenButton>
          )}
        </>
      ) : (
        <>
          <p className={cls.text}>{s('guideAllDoneText')}</p>
          <SheenButton className={cls.start} icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => navigate(ctl.currentPath())}>
            {s('guideGoOn')}
          </SheenButton>
        </>
      )}
      <ol className={cls.cases} aria-label={s('guideCasesLabel')}>
        {CORE.map((c, i) => {
          const done = st.phase[c] === 'done';
          const now = c === current;
          return (
            <li key={c} className={mergeClasses(cls.caseRow, now && cls.caseNow)} aria-current={now ? 'step' : undefined}>
              {done ? (
                <span className={cls.doneIcon} aria-hidden="true">
                  <CheckmarkCircle16Filled />
                </span>
              ) : (
                <span className={mergeClasses(cls.dot, now && cls.dotNow)} aria-hidden="true" />
              )}
              <span className={cls.caseName}>{s('guideCaseRow', { n: i + 1, name: cases[c].patient.name })}</span>
              {now && <span className={cls.status}>{s('guideNow')}</span>}
              {done && <span className={cls.statusDone}>{s('chipDone')}</span>}
            </li>
          );
        })}
      </ol>
      {role === 'dps' && <p className={cls.note}>{s('guideDpsHidden')}</p>}
      {st.tour.done && (
        <RouterLink to="/studie/omvisning?igjen" className={cls.tourLink}>
          <Map16Regular aria-hidden="true" />
          {s('guideTourAgain')}
        </RouterLink>
      )}
    </aside>
  );
}
