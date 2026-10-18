import { Button, Link, MessageBar, MessageBarActions, MessageBarBody, MessageBarTitle, makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import {
  ArrowRight20Regular,
  CheckmarkCircle16Regular,
  CheckmarkCircle20Filled,
  Circle20Regular,
  Clock16Regular,
  DocumentArrowDown16Regular,
  Info16Regular,
  Info24Regular,
  LockClosed16Regular,
  People20Regular,
  RecordStop20Regular,
  Stethoscope20Regular,
} from '@fluentui/react-icons';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { cases } from '../content';
import { formatDate, useLang } from '../i18n/i18n';
import { getConfig, studyClosed } from '../engine/forms';
import { Redirect, RouterLink, navigate, useRoute } from '../router/router';
import { readSession, writeSession } from '../state/persist';
import { useStudy } from '../state/study';
import type { Intervju, RoleChoice } from '../state/types';
import { ChoiceGroup } from '../patterns/ChoiceGroup';
import { GuideImage, SheenButton } from '../patterns/basics';
import { focusAfterOverlay } from '../patterns/announce';
import { Actions, Body, Eyebrow, Lead, Muted } from '../patterns/layout';
import { atlasDawn, guide, size } from '../theme/constants';
import { FOCUS_HEADING_ON_LOAD, PageHeading } from '../shell/PageHeading';
import { ConfirmDialog } from '../shell/HeaderParts';
import { HOME_PATH, useStudyController } from './controller';
import { FormStepCard, FormWaiting } from './FormStepCard';
import { PREVIEW_ANSWERS_KEY } from './PreviewForm';
import { CORE, caseInProgress, casesDone, currentCase, partOf, partTwoLabel } from './parts';

/* ---------- 1 Velkommen ---------- */

const useVelkommen = makeStyles({
  wrap: { marginBlockStart: `${size.panelInset}px`, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  // A guide surface (B6): the dawn, with the guide layer's image on top of it. One screen tall on a laptop (decision 13).
  hero: {
    position: 'relative',
    isolation: 'isolate',
    overflow: 'hidden',
    background: atlasDawn,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
    paddingInline: 'clamp(16px, 3.4vw, 40px)',
    paddingBlock: 'clamp(16px, 2.2vw, 24px)',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: '48px',
    rowGap: '18px',
    '@media (max-height: 640px)': { paddingBlock: '12px', rowGap: '12px' },
    boxSizing: 'border-box',
    '& [data-muted]': { color: tokens.colorNeutralForeground2 },
    '@media print': { background: '#FFFFFF', boxShadow: 'none' },
    '@media (forced-colors: active)': { background: 'Canvas', border: '1px solid CanvasText' },
  },
  text: { flex: '1 1 420px', minWidth: 0, maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '12px' },
  side: { flex: '1 1 460px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px' },
  h2: { ...typographyStyles.subtitle1, margin: 0 },
  chips: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '8px' },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    paddingInline: '10px',
    paddingBlock: '3px',
    borderRadius: tokens.borderRadiusCircular,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: 'rgba(255,255,255,0.86)',
    ...typographyStyles.body1,
    whiteSpace: 'nowrap',
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  chipIcon: { display: 'inline-flex', color: tokens.colorNeutralForeground2 },
  small: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground2 },
  pilot: {
    ...typographyStyles.caption1,
    margin: 0,
    alignSelf: 'flex-start',
    paddingInline: '10px',
    paddingBlock: '4px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px dashed ${tokens.colorBrandStroke1}`,
    backgroundColor: 'rgba(255,255,255,0.86)',
    color: tokens.colorNeutralForeground1,
  },
  letterRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: '16px', rowGap: '4px' },
  letter: { display: 'inline-flex', alignItems: 'center', gap: '6px', ...typographyStyles.body1Strong },
  missing: {
    ...typographyStyles.caption1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalS,
    paddingBlock: '2px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px dashed ${tokens.colorNeutralStroke1}`,
    backgroundColor: 'rgba(255,255,255,0.86)',
    color: tokens.colorNeutralForeground1,
  },
  cards: { display: 'flex', flexWrap: 'wrap', gap: '16px' },
  card: {
    flex: '1 1 220px',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px 18px',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
    boxSizing: 'border-box',
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  // The role already chosen, before S1 is sent: a brand edge, as a selected item has (G-20).
  cardChosen: { border: `2px solid ${tokens.colorBrandStroke1}`, padding: '15px 17px' },
  cardIcon: {
    width: '40px',
    height: '40px',
    flexShrink: 0,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke2}`,
    color: tokens.colorBrandForeground2,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  cardHead: { display: 'flex', alignItems: 'center', gap: '12px' },
  cardTitle: { ...typographyStyles.subtitle1, margin: 0 },
  cardText: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  cardNote: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground2 },
  cardStart: { marginBlockStart: 'auto', alignSelf: 'flex-start', maxWidth: '100%', height: 'auto', whiteSpace: 'normal', textAlign: 'start' },
  // Over the image: a white backing keeps the caption readable wherever the fabric is darker.
  caption: {
    ...typographyStyles.caption1,
    margin: 0,
    alignSelf: 'flex-start',
    paddingInline: tokens.spacingHorizontalS,
    paddingBlock: '2px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'rgba(255,255,255,0.88)',
    color: tokens.colorNeutralForeground2,
  },
  // «Slik foregår det»: the five steps under both columns.
  steps: { flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 },
  stepsHead: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '12px', rowGap: '2px' },
  stepList: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: '10px' },
  step: {
    display: 'grid',
    gridTemplateColumns: '28px minmax(0, 1fr)',
    columnGap: '10px',
    alignItems: 'center',
    paddingInline: '12px',
    paddingBlock: '8px',
    borderRadius: '10px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  stepNum: {
    width: '28px',
    height: '28px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...typographyStyles.caption1Strong,
  },
  // The tour is the participant's own step: the guide's warm mark (board 10b).
  stepNumTour: { background: guide.mark, color: tokens.colorNeutralForeground1, border: `1px solid ${guide.cardEdge}` },
  stepTitle: { ...typographyStyles.body1Strong, display: 'block' },
  stepText: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2, display: 'block' },
  // Welcome back: where the participant is, in the three parts.
  progress: {
    listStyle: 'none',
    margin: 0,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: 'rgba(255,255,255,0.9)',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: tokens.shadow4,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  progRow: { display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr)', columnGap: '12px', alignItems: 'start' },
  progIcon: { display: 'inline-flex', color: tokens.colorNeutralForeground2, marginTop: '1px' },
  progIconNow: { color: guide.ink },
  progTitle: { ...typographyStyles.body1Strong, display: 'block' },
  progText: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2, display: 'block' },
  nameChip: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    paddingInline: '12px',
    paddingBlock: '4px',
    borderRadius: tokens.borderRadiusCircular,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: 'rgba(255,255,255,0.9)',
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground2,
  },
  nameDot: { width: '8px', height: '8px', borderRadius: tokens.borderRadiusCircular, backgroundColor: guide.coral },
  nameValue: { ...typographyStyles.body1Strong, color: tokens.colorNeutralForeground1 },
  backEyebrow: { ...typographyStyles.caption1Strong, margin: 0, color: guide.ink },
  notYou: { minWidth: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'start' },
  closed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '24px',
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: tokens.shadow4,
  },
  closedHead: { display: 'flex', alignItems: 'center', gap: '10px' },
});

const SMALL_OK = 'atlas.smallScreenOk';

/** True below 1024 px: ATLAS is made for a laptop or desktop screen (board 10b, the small-screen state). */
function useSmallScreen(): boolean {
  const [small, setSmall] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const on = () => setSmall(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return small;
}

function SmallScreenBar() {
  const { s } = useLang();
  const small = useSmallScreen();
  const [ok, setOk] = useState(() => readSession<boolean>(SMALL_OK) === true);
  if (!small || ok) return null;
  return (
    <MessageBar intent="info" layout="multiline" data-small-screen="">
      <MessageBarBody>
        <MessageBarTitle>{s('smallScreenTitle')}</MessageBarTitle> {s('smallScreenText')}
      </MessageBarBody>
      <MessageBarActions>
        <Button
          size="small"
          onClick={() => {
            writeSession(SMALL_OK, true);
            setOk(true);
          }}
        >
          {s('smallScreenGoOn')}
        </Button>
      </MessageBarActions>
    </MessageBar>
  );
}

function IntroText({ withContact }: { withContact: boolean }) {
  const v = useVelkommen();
  const { s, t } = useLang();
  const cfg = getConfig();
  const chips: { icon: ReactNode; text: string }[] = [
    { icon: <Clock16Regular />, text: s('velkommenTimeTitle') },
    { icon: <LockClosed16Regular />, text: s('velkommenChipAnon') },
    { icon: <CheckmarkCircle16Regular />, text: s('velkommenChipNoRight') },
  ];
  return (
    <>
      <Eyebrow>{s('velkommenEyebrow')}</Eyebrow>
      <PageHeading title={s('stepVelkommen')} guide>
        {s('velkommenTitle')}
      </PageHeading>
      <Lead>{s('velkommenStudy')}</Lead>
      <Body>
        {s('velkommenPrototype')} {s('velkommenImagine')}
      </Body>
      <ul className={v.chips} aria-label={s('velkommenGoodTitle')}>
        {chips.map((c) => (
          <li key={c.text} className={v.chip}>
            <span className={v.chipIcon} aria-hidden="true">
              {c.icon}
            </span>
            {c.text}
          </li>
        ))}
      </ul>
      {cfg.round === 'pilot' && <p className={v.pilot}>{s('velkommenPilot')}</p>}
      <div className={v.letterRow}>
        {/* A missing letter or contact is said, never hidden: the release check confirms both are set. */}
        {cfg.informationLetter ? (
          <Link href={cfg.informationLetter} target="_blank" rel="noopener noreferrer" className={v.letter}>
            <DocumentArrowDown16Regular aria-hidden="true" />
            {s('velkommenLetter')}
          </Link>
        ) : (
          <p className={v.missing}>{s('velkommenLetterMissing')}</p>
        )}
        {withContact &&
          (cfg.contact ? (
            <span className={v.small}>
              {s('velkommenContact')} {t(cfg.contact)}
            </span>
          ) : (
            <p className={v.missing}>{s('velkommenContactMissing')}</p>
          ))}
      </div>
    </>
  );
}

function RoleCards() {
  const v = useVelkommen();
  const { s } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const roleCards: { choice: RoleChoice; role: 'gp' | 'dps'; title: string; text: string; note: string; start: string }[] = [
    { choice: 'fastlege', role: 'gp', title: s('velkommenRoleGpTitle'), text: s('velkommenRoleGpText'), note: s('velkommenRoleGpNote'), start: s('velkommenRoleGpStart') },
    { choice: 'dps-kliniker', role: 'dps', title: s('velkommenRoleDpsTitle'), text: s('velkommenRoleDpsText'), note: s('velkommenRoleDpsNote'), start: s('velkommenRoleDpsStart') },
  ];
  return (
    <>
      <h2 className={v.h2}>{s('velkommenRolesTitle')}</h2>
      <div className={v.cards}>
        {roleCards.map((c) => (
          <article key={c.choice} className={mergeClasses(v.card, study.role === c.role && v.cardChosen)} aria-labelledby={`rolle-${c.role}`} data-role-card={c.role}>
            <span className={v.cardHead}>
              <span className={v.cardIcon} aria-hidden="true">
                {c.role === 'gp' ? <Stethoscope20Regular /> : <People20Regular />}
              </span>
              <h3 id={`rolle-${c.role}`} className={v.cardTitle}>
                {c.title}
              </h3>
            </span>
            <p className={v.cardText}>{c.text}</p>
            <p className={v.cardNote}>{c.note}</p>
            <SheenButton
              className={v.cardStart}
              icon={<ArrowRight20Regular />}
              iconPosition="after"
              onClick={() => {
                study.chooseRole(c.choice);
                ctl.goToStep('om-deg');
              }}
            >
              {c.start}
            </SheenButton>
          </article>
        ))}
      </div>
      <p className={v.caption}>{s('velkommenRoleCaption')}</p>
    </>
  );
}

function FiveSteps() {
  const v = useVelkommen();
  const { s } = useLang();
  const titleId = useId();
  const steps: [string, string][] = [
    [s('vStep1Title'), s('vStep1Text')],
    [s('vStep2Title'), s('vStep2Text')],
    [s('vStep3Title'), s('vStep3Text')],
    [s('vStep4Title'), s('vStep4Text')],
    [s('vStep5Title'), s('vStep5Text')],
  ];
  return (
    <section className={v.steps} aria-labelledby={titleId}>
      <div className={v.stepsHead}>
        <h2 id={titleId} className={v.h2}>
          {s('velkommenHowTitle')}
        </h2>
        <span className={v.small}>{s('velkommenStepsLead')}</span>
      </div>
      <ol className={v.stepList}>
        {steps.map(([title, text], i) => (
          <li key={title} className={v.step}>
            <span className={mergeClasses(v.stepNum, i === 2 && v.stepNumTour)} aria-hidden="true">
              {i + 1}
            </span>
            <span>
              <span className={v.stepTitle}>{title}</span>
              <span className={v.stepText}>{text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** «Du var i sak 2, Erlend Bakken.»: where a returning participant left off. */
function whereLine(study: ReturnType<typeof useStudy>, s: ReturnType<typeof useLang>['s']): string {
  const st = study.state;
  const part = partOf(st.furthest);
  if (!st.ledger.S1) return s('velkommenWhereOmDeg');
  if (st.furthest === 'takk') return s('velkommenWhereDone');
  if (part === 1) return st.tour.started ? s('velkommenWhereTourStarted') : s('velkommenWhereTour');
  if (part === 3) return s('velkommenWhereEnd');
  const c = currentCase(st);
  if (!c) return s('velkommenWhereEnd');
  const n = CORE.indexOf(c) + 1;
  return caseInProgress(st, c) ? s('velkommenWhereCase', { n, name: cases[c].patient.name }) : s('velkommenWhereNextCase', { n, name: cases[c].patient.name });
}

function WelcomeBack() {
  const v = useVelkommen();
  const { s } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const [ask, setAsk] = useState(false);
  return (
    <>
      <p className={v.backEyebrow}>{s('velkommenBackEyebrow')}</p>
      <PageHeading title={s('stepVelkommen')} guide>
        {s('velkommenResume')}
      </PageHeading>
      <Lead>
        {whereLine(study, s)} {s('velkommenBackSaved')}
      </Lead>
      {study.state.studienavn && (
        <span className={v.nameChip}>
          <span className={v.nameDot} aria-hidden="true" />
          {s('omDegNameTitle')}
          <span className={v.nameValue} lang="nb">
            {study.state.studienavn}
          </span>
        </span>
      )}
      <Actions>
        <SheenButton icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => navigate(ctl.currentPath())}>
          {s('velkommenResume')}
        </SheenButton>
        <Button appearance="transparent" className={v.notYou} onClick={() => setAsk(true)} data-new-participant="">
          {s('velkommenNotYou')}
        </Button>
      </Actions>
      <p className={v.small}>{s('velkommenNotYouNote')}</p>
      <ConfirmDialog
        open={ask}
        title={s('newParticipantTitle')}
        body={s('newParticipantBody')}
        confirmLabel={s('newParticipantConfirm')}
        onCancel={() => {
          setAsk(false);
          focusAfterOverlay(() => document.querySelector<HTMLElement>('[data-new-participant]'));
        }}
        onConfirm={() => {
          // This browser's study session goes (and a preview's answers); the language, a preview flag and the forms in
          // Nettskjema stay (decision 11).
          for (const store of [window.localStorage, window.sessionStorage]) {
            try {
              Object.keys(store)
                .filter((k) => k.startsWith('atlas.study') || k === PREVIEW_ANSWERS_KEY)
                .forEach((k) => store.removeItem(k));
            } catch {
              // Storage may be blocked; nothing was kept then.
            }
          }
          window.history.replaceState({ [FOCUS_HEADING_ON_LOAD]: true }, '', `${window.location.pathname}#/studie/velkommen`);
          window.location.reload();
        }}
      />
    </>
  );
}

function ProgressCard() {
  const v = useVelkommen();
  const { s } = useLang();
  const study = useStudy();
  const st = study.state;
  const role = study.role ?? 'gp';
  const now = partOf(st.furthest);
  const done = casesDone(st);
  const c = currentCase(st);
  const rows: { n: 1 | 2 | 3; title: string; text: string }[] = [
    { n: 1, title: s('partIntro'), text: now > 1 ? s('stepStatusDone') : s('stepStatusNow') },
    {
      n: 2,
      title: s(partTwoLabel(role)),
      text: now > 2 ? s('stepStatusDone') : now < 2 ? s('stepStatusLater') : c ? s('velkommenCasesDetail', { n: done, m: CORE.indexOf(c) + 1 }) : s('stepStatusDone'),
    },
    { n: 3, title: s('partEnd'), text: st.furthest === 'takk' ? s('stepStatusDone') : now === 3 ? s('stepStatusNow') : s('stepStatusLater') },
  ];
  return (
    <ol className={v.progress} aria-label={s('velkommenProgressLabel')}>
      {rows.map((r) => {
        const isDone = r.n < now || st.furthest === 'takk';
        const isNow = r.n === now && !isDone;
        return (
          <li key={r.n} className={v.progRow} aria-current={isNow ? 'step' : undefined}>
            <span className={mergeClasses(v.progIcon, isNow && v.progIconNow)} aria-hidden="true">
              {isDone ? <CheckmarkCircle20Filled /> : isNow ? <RecordStop20Regular /> : <Circle20Regular />}
            </span>
            <span>
              <span className={v.progTitle}>{r.title}</span>
              <span className={v.progText}>{r.text}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ClosedCard() {
  const v = useVelkommen();
  const { s, t, lang } = useLang();
  const cfg = getConfig();
  const titleId = useId();
  return (
    <section className={v.closed} aria-labelledby={titleId} data-study-closed="">
      <div className={v.closedHead}>
        <Info24Regular aria-hidden="true" />
        <h2 id={titleId} className={v.h2}>
          {s('velkommenClosedTitle')}
        </h2>
      </div>
      <Body>
        {cfg.opens && cfg.closes ? `${s('velkommenClosedPeriod', { from: formatDate(cfg.opens, lang), to: formatDate(cfg.closes, lang) })} ` : ''}
        {s('velkommenClosedBody')}
      </Body>
      <Body>{s('velkommenClosedThanks')}</Body>
      {cfg.contact ? (
        <Muted>
          {s('velkommenContact')} {t(cfg.contact)}
        </Muted>
      ) : (
        <p className={v.missing}>{s('velkommenContactMissing')}</p>
      )}
    </section>
  );
}

/**
 * Velkommen in four states (decisions 11 and 12, board 10b): the first visit with the role cards and the five steps,
 * the way back for a participant who has started, the closed study, and a note on a small screen.
 */
export function VelkommenPage() {
  const v = useVelkommen();
  const { s } = useLang();
  const study = useStudy();
  const closed = studyClosed();
  const route = useRoute();
  // Once S1 is in the ledger the role is fixed: Velkommen offers the way back instead of the role cards. The study link
  // opened again in a browser that holds a role (?tilbake) asks the same before S1, so a new person starts afresh.
  const back = !closed && (!!study.state.ledger.S1 || (!!study.state.roleChoice && route.query.has('tilbake')));
  return (
    <div className={v.wrap}>
      {!closed && <SmallScreenBar />}
      <section className={v.hero} aria-label={s('velkommenTitle')} data-guide-surface="" data-welcome={closed ? 'closed' : back ? 'back' : 'first'}>
        <GuideImage variant="hero" />
        <div className={v.text}>{back ? <WelcomeBack /> : <IntroText withContact={!closed} />}</div>
        <div className={v.side}>{closed ? <ClosedCard /> : back ? <ProgressCard /> : <RoleCards />}</div>
        {!closed && !back && <FiveSteps />}
      </section>
    </div>
  );
}

/* ---------- 2 Om deg ---------- */

const useOmDeg = makeStyles({
  wrap: { marginBlockStart: `${size.panelInset}px`, display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: '16px' },
  // The two panels fit side by side beside an open form panel too (776 px of content on a 1280 px laptop).
  main: {
    flex: '1 1 460px',
    maxWidth: '640px',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '12px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
    paddingInline: 'clamp(16px, 2vw, 28px)',
    paddingBlock: 'clamp(16px, 2vw, 22px)',
    boxSizing: 'border-box',
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  roleRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px',
    paddingInline: '14px',
    paddingBlock: '10px',
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  roleIcon: {
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke2}`,
    color: tokens.colorBrandForeground2,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    flexShrink: 0,
  },
  roleText: { ...typographyStyles.body1, margin: 0, flexGrow: 1 },
  next: {
    display: 'grid',
    gridTemplateColumns: '16px minmax(0, 1fr)',
    columnGap: '8px',
    ...typographyStyles.body1,
    margin: 0,
    paddingBlockStart: '12px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  nextIcon: { marginTop: '2px', color: tokens.colorNeutralForeground2, display: 'inline-flex' },
  reason: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: '8px 0 0' },
  // The study name: a guide card beside the form (B6), the name large, what it is for, and three short facts.
  name: {
    position: 'relative',
    isolation: 'isolate',
    overflow: 'hidden',
    flex: '1 1 260px',
    maxWidth: '440px',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '12px',
    paddingInline: 'clamp(20px, 2.2vw, 28px)',
    paddingBlock: '28px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${guide.cardEdge}`,
    background: guide.card,
    boxSizing: 'border-box',
    '@media (forced-colors: active)': { background: 'Canvas', border: '1px solid CanvasText' },
  },
  nameEyebrow: { ...typographyStyles.caption1Strong, margin: 0, color: guide.ink },
  nameValue: { ...typographyStyles.title2, margin: 0, color: tokens.colorNeutralForeground1, overflowWrap: 'anywhere' },
  nameText: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground1 },
  facts: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' },
  fact: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    paddingInline: '10px',
    paddingBlock: '3px',
    borderRadius: tokens.borderRadiusCircular,
    border: `1px solid ${guide.cardEdge}`,
    backgroundColor: 'rgba(255,255,255,0.9)',
    ...typographyStyles.body1,
  },
  factIcon: { color: guide.ink, display: 'inline-flex' },
});

export function OmDegPage() {
  const o = useOmDeg();
  const { s } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const reasonId = useId();
  const nameId = useId();
  const st = study.state;
  const locked = !!st.ledger.S1;
  const role = st.roleChoice;
  const [intervju, setIntervju] = useState<Intervju | undefined>(st.intervju);
  const [pendingOpen, setPendingOpen] = useState(false);
  const saved = !!role && !!st.intervju;
  const changed = intervju !== st.intervju;
  // Open (or re-create) S1 once the stored answer carries the new value, so its locked fields are right.
  useEffect(() => {
    if (pendingOpen && st.intervju === intervju) {
      setPendingOpen(false);
      ctl.openStepForm('S1', { force: true, show: true });
    }
  }, [pendingOpen, st.intervju, intervju, ctl]);
  // The role is chosen on Velkommen; without one, that is where the study starts.
  if (!role) return <Redirect to="/studie/velkommen" />;
  const s1Done = ctl.stepDone('S1');
  const gp = role === 'fastlege';
  return (
    <div className={o.wrap}>
      <div className={o.main}>
        <PageHeading title={s('omDegTitle')}>{s('omDegTitle')}</PageHeading>
        <Lead>{s('omDegLead')}</Lead>
        <div className={o.roleRow}>
          <span className={o.roleIcon} aria-hidden="true">
            {gp ? <Stethoscope20Regular /> : <People20Regular />}
          </span>
          <p className={o.roleText}>{s(gp ? 'omDegAsGp' : 'omDegAsDps')}</p>
          {!locked && <RouterLink to="/studie/velkommen">{s('omDegRoleChange')}</RouterLink>}
        </div>
        <ChoiceGroup<Intervju>
          legend={s('interviewQuestion')}
          layout="row"
          value={intervju}
          disabled={locked}
          onChange={setIntervju}
          choices={[
            { value: 'Ja', label: s('intervjuJa') },
            { value: 'Nei', label: s('intervjuNei') },
            { value: 'Vil ikke svare', label: s('intervjuVilIkke') },
          ]}
        />
        {locked ? (
          <Muted>{s('omDegLocked')}</Muted>
        ) : (
          (!saved || changed) && (
            <>
              <p className={o.next}>
                <span className={o.nextIcon} aria-hidden="true">
                  <Info16Regular />
                </span>
                <span>
                  <strong>{s('omDegNext')}</strong> {s('omDegNextText')}
                </span>
              </p>
              <div>
                <Button
                  appearance={intervju ? 'primary' : 'secondary'}
                  disabledFocusable={!intervju}
                  aria-describedby={!intervju ? reasonId : undefined}
                  onClick={() => {
                    if (!intervju) return;
                    study.setRole(role, intervju);
                    setPendingOpen(true);
                  }}
                >
                  {s('omDegSave')}
                </Button>
                <p id={reasonId} className={o.reason}>
                  {!intervju ? s('omDegSaveReason') : s('omDegLockNote')}
                </p>
              </div>
            </>
          )
        )}
        {saved && !changed && <FormStepCard step="S1" intro={s('s1Intro')} />}
        {s1Done ? (
          <Actions>
            <Button
              appearance="primary"
              icon={<ArrowRight20Regular />}
              iconPosition="after"
              onClick={() => {
                study.advanceTo('omvisning');
                navigate(HOME_PATH);
              }}
            >
              {s('toHome')}
            </Button>
          </Actions>
        ) : (
          saved && !changed && <FormWaiting step="S1" />
        )}
      </div>
      {st.studienavn && (
        <aside className={o.name} aria-labelledby={nameId} data-studienavn="">
          <GuideImage variant="band" />
          <p className={o.nameEyebrow} id={nameId}>
            {s('omDegNameTitle')}
          </p>
          <p className={o.nameValue} lang="nb" data-studienavn-value="">
            {st.studienavn}
          </p>
          <p className={o.nameText}>{s('omDegNameLead')}</p>
          <ul className={o.facts}>
            {(['omDegNameFact1', 'omDegNameFact2', 'omDegNameFact3'] as const).map((k) => (
              <li key={k} className={o.fact}>
                <span className={o.factIcon} aria-hidden="true">
                  <CheckmarkCircle16Regular />
                </span>
                {s(k)}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
