import { Button, makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowRight20Regular, CheckmarkCircle20Regular, Circle20Regular, Delete20Regular, Form20Regular, RecordStop20Regular } from '@fluentui/react-icons';
import { useRef, useState, type ReactNode } from 'react';
import type { CaseId, CoreCaseId } from '../content/types';
import { cases, tour, tourParts, v5 } from '../content';
import { useLang } from '../i18n/i18n';
import { previewFlag } from '../engine/forms';
import { navigate } from '../router/router';
import { stepIndex, useStudy } from '../state/study';
import { STEP_ORDER, type FormStep, type StepId } from '../state/types';
import { Panel } from '../patterns/basics';
import { focusAfterOverlay } from '../patterns/announce';
import { Actions, Body, Card, IntroPage, Lead, Muted, PageCard } from '../patterns/layout';
import { FOCUS_HEADING_ON_LOAD, PageHeading } from '../shell/PageHeading';
import { ConfirmDialog } from '../shell/HeaderParts';
import { V5View } from '../overview/V5View';
import { STEP_FORM, STEP_PATH, stepReachable, useStudyController } from './controller';
import { FormStepCard, FormWaiting } from './FormStepCard';
import { TourStepDialog } from '../tour/Tour';
import { CORE, casesDone, partOf, partTwoLabel } from './parts';

const useStyles = makeStyles({
  h2: { ...typographyStyles.subtitle1, margin: 0 },
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  steps: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  // «Studien» by the study's three parts, side by side where there is room, so the page fits one laptop screen.
  stepParts: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))', gap: tokens.spacingHorizontalL, alignItems: 'start' },
  stepPart: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, minWidth: 0 },
  partTitle: { ...typographyStyles.subtitle2, margin: 0 },
  stepRow: {
    display: 'grid',
    gridTemplateColumns: '24px minmax(0, 1fr) auto',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalXS,
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    '@media only screen and (max-width: 479px)': { gridTemplateColumns: '24px minmax(0, 1fr)' },
  },
  stepNow: { border: `2px solid ${tokens.colorBrandStroke1}`, paddingInline: `calc(${tokens.spacingHorizontalL} - 1px)` },
  stepName: { ...typographyStyles.body1Strong },
  stepMeta: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  stepActions: { display: 'flex', gap: tokens.spacingHorizontalS, flexWrap: 'wrap', '@media only screen and (max-width: 479px)': { gridColumn: '2 / 3' } },
  icon: { color: tokens.colorNeutralForeground2, display: 'inline-flex' },
  extraGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: tokens.spacingHorizontalL },
  extraCard: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  reasons: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  reasonItem: { display: 'flex', flexDirection: 'column', gap: '2px', paddingBlockEnd: tokens.spacingVerticalS, borderBottom: `1px solid ${tokens.colorNeutralStroke3}` },
  reasonTitle: { ...typographyStyles.body1Strong },
  reasonText: { ...typographyStyles.body1, margin: 0, maxWidth: '72ch' },
  seeAgain: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  seeAgainItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ...typographyStyles.body1,
  },
});

export { OmDegPage, VelkommenPage } from './WelcomePages';

/* ---------- Helhetsinntrykk: after the three cases (v3.1) ---------- */

export function HelhetPage() {
  const cls = useStyles();
  const { s, t } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const role = study.role ?? 'gp';
  const [open, setOpen] = useState<string | null>(null);
  const steps = tourParts(role).flatMap((p) => p.steps);
  return (
    <PageCard narrow>
      <PageHeading title={s('helhetTitle')}>{s('helhetTitle')}</PageHeading>
      <Body>{s('helhetIntro')}</Body>
      <FormStepCard step="S2" autoOpen />
      <section className={cls.section} aria-label={t(tour.closing.seenTitle)}>
        <h2 className={cls.h2}>{t(tour.closing.seenTitle)}</h2>
        <ul className={cls.seeAgain}>
          {steps.map((st) => (
            <li key={st.id} className={cls.seeAgainItem}>
              <span id={`see-again-${st.id}`}>{t(st.title)}</span>
              {/* Described by its row, so a list of «Se igjen» still says which step (2.4.6). */}
              <Button size="small" appearance="subtle" data-see-again={st.id} aria-describedby={`see-again-${st.id}`} onClick={() => setOpen(st.id)}>
                {s('tourSeeAgain')}
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <TourStepDialog
        role={role}
        stepId={open}
        // Helhetsinntrykk comes after the three cases, so the figures show; held only if the page were reached before (G-38).
        hold={casesDone(study.state) < CORE.length ? 'study' : undefined}
        onClose={() => {
          const id = open;
          setOpen(null);
          // Back to the «Se igjen» that opened the dialog (2.4.3, R2A-03).
          focusAfterOverlay(() => document.querySelector<HTMLElement>(`[data-see-again="${id}"]`));
        }}
      />
      {ctl.stepDone('S2') ? (
        <Actions>
          <Button appearance="primary" icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => ctl.goToStep('avslutning')}>
            {s('helhetGoOn')}
          </Button>
        </Actions>
      ) : (
        <FormWaiting step="S2" />
      )}
    </PageCard>
  );
}

/* ---------- 8 Avslutning ---------- */

export function AvslutningPage() {
  const { s } = useLang();
  const ctl = useStudyController();
  return (
    <PageCard narrow>
      <PageHeading title={s('avslutningTitle')}>{s('avslutningTitle')}</PageHeading>
      <Body>{s('avslutningIntro')}</Body>
      <FormStepCard step="S6" autoOpen />
      {ctl.stepDone('S6') ? (
        // Finishing is the expected path and the primary action; the extras are optional (Meridian: primary first).
        <Actions>
          <Button appearance="primary" onClick={() => ctl.goToStep('takk')}>
            {s('finish')}
          </Button>
          <Button onClick={() => ctl.goToStep('ekstra')}>{s('toExtra')}</Button>
        </Actions>
      ) : (
        <FormWaiting step="S6" />
      )}
    </PageCard>
  );
}

/* ---------- 9 Ekstra (valgfritt) ---------- */

function ExtraStatus({ step }: { step: FormStep }) {
  const { s } = useLang();
  const ctl = useStudyController();
  const st = ctl.formStatus(step);
  if (st === 'sent') return <Muted>{s('formStepDone')}</Muted>;
  if (st === 'skipped') return <Muted>{s('formStepSkipped')}</Muted>;
  return null;
}

export function EkstraPage() {
  const cls = useStyles();
  const { s, t } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const gp = study.role === 'gp';
  return (
    <PageCard>
      <PageHeading title={s('ekstraTitle')}>{s('ekstraTitle')}</PageHeading>
      <Body>{gp ? s('ekstraIntroGp') : s('ekstraIntroDps')}</Body>
      <div className={cls.extraGrid}>
        {gp && (
          <Panel flat aria-label={cases.torbjorn.patient.name}>
            <div className={cls.extraCard}>
              <h2 className={cls.h2}>{s('patientAge', { name: cases.torbjorn.patient.name, age: cases.torbjorn.patient.age })}</h2>
              <Body>{s('extraTorbjornLine')}</Body>
              <ExtraStatus step="S7" />
              <Actions>
                <Button icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => navigate('/studie/sak/torbjorn')}>
                  {s('extraOpen')}
                </Button>
              </Actions>
            </div>
          </Panel>
        )}
        <Panel flat aria-label={t(v5.title)}>
          <div className={cls.extraCard}>
            <h2 className={cls.h2}>{t(v5.title)}</h2>
            <Body>{s('extraV5Line')}</Body>
            <ExtraStatus step="S8" />
            <Actions>
              <Button icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => navigate('/studie/ekstra/to-fastleger')}>
                {s('extraOpen')}
              </Button>
            </Actions>
          </div>
        </Panel>
      </div>
      <Actions>
        <Button appearance="primary" onClick={() => ctl.goToStep('takk')}>
          {s('finish')}
        </Button>
      </Actions>
    </PageCard>
  );
}

export function V5Page() {
  const { s, t } = useLang();
  const ctl = useStudyController();
  const status = ctl.formStatus('S8');
  return (
    <PageCard>
      <PageHeading title={t(v5.title)}>{t(v5.title)}</PageHeading>
      <V5View />
      {status === 'closed' ? (
        <Actions>
          <Button appearance="primary" icon={<Form20Regular />} onClick={() => ctl.openStepForm('S8', { show: true })}>
            {s('v5AnswerButton')}
          </Button>
        </Actions>
      ) : (
        <FormStepCard step="S8" />
      )}
      <Actions>
        <Button onClick={() => navigate('/studie/ekstra')}>{s('back')}</Button>
      </Actions>
    </PageCard>
  );
}

/* ---------- Takk: the reasons open here ---------- */

export function TakkPage() {
  const cls = useStyles();
  const { s, t } = useLang();
  const study = useStudy();
  const role = study.role ?? 'gp';
  const steps = tourParts(role).flatMap((p) => p.steps);
  const caseIds: CaseId[] = ['kari', 'erlend', 'astrid'];
  if (role === 'gp' && study.state.ledger.S7) caseIds.push('torbjorn');
  return (
    <IntroPage
      wide
      after={
        <Card aria-label={s('takkReasonsTitle')}>
          <h2 className={cls.h2}>{s('takkReasonsTitle')}</h2>
          <Body>{s('takkReasonsIntro')}</Body>
          <h3 style={{ ...typographyStyles.subtitle2, margin: 0 }}>{s('takkCasesTitle')}</h3>
          <ul className={cls.reasons}>
            {caseIds.map((c) => {
              const d = role === 'gp' ? cases[c].debrief.gp : cases[c].debrief.dps;
              if (!d) return null;
              return (
                <li key={c} className={cls.reasonItem}>
                  <span className={cls.reasonTitle}>{s('patientAge', { name: cases[c].patient.name, age: cases[c].patient.age })}</span>
                  <p className={cls.reasonText}>{t(d.purpose)}</p>
                </li>
              );
            })}
            {study.state.ledger.S8 && (
              <li className={cls.reasonItem}>
                <span className={cls.reasonTitle}>{t(v5.title)}</span>
                <p className={cls.reasonText}>{t(v5.purpose)}</p>
              </li>
            )}
          </ul>
          <h3 style={{ ...typographyStyles.subtitle2, margin: 0 }}>{s('takkTourTitle')}</h3>
          <ul className={cls.reasons}>
            {steps.map((st) => (
              <li key={st.id} className={cls.reasonItem}>
                <span className={cls.reasonTitle}>{t(st.title)}</span>
                <p className={cls.reasonText}>{t(st.reason)}</p>
              </li>
            ))}
          </ul>
        </Card>
      }
    >
      <PageHeading title={s('stepTakk')} guide>
        {s('takkTitle')}
      </PageHeading>
      <Lead>{previewFlag() ? s('takkBodyPreview') : s('takkBody')}</Lead>
      {/* The full name only now, after the last form: it names what the forms ask about. */}
      <Body>{s('takkAtlasName')}</Body>
      <ClearBrowserData />
    </IntroPage>
  );
}

/**
 * On a shared clinic computer, «intervju» = Ja in this browser could tell
 * someone that the user took part in an interview. Everything ATLAS stored
 * here can be removed at the end (the forms in Nettskjema are untouched).
 */
function ClearBrowserData() {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const [ask, setAsk] = useState(false);
  const askBtn = useRef<HTMLButtonElement>(null);
  // In a preview nothing went to Nettskjema, and removing the data removes the preview answers too (R2DPS-03).
  const preview = previewFlag();
  const name = study.state.studienavn;
  return (
    <div className={cls.section}>
      <h2 className={cls.h2}>{s('takkClearTitle')}</h2>
      <Body>{preview ? s('takkClearBodyPreview') : s('takkClearBody')}</Body>
      {/* The study name is the only way to withdraw sent answers (the information letter): shown before it can go. */}
      {name && !preview && (
        <Body>
          {s('takkClearNameLead')}{' '}
          <strong lang="nb" data-takk-studienavn="">
            {name}
          </strong>
          . {s('takkClearNameNote')}
        </Body>
      )}
      <div>
        <Button ref={askBtn} onClick={() => setAsk(true)}>
          {s('takkClearButton')}
        </Button>
      </div>
      <ConfirmDialog
        open={ask}
        title={s('takkClearConfirmTitle')}
        body={preview ? s('takkClearConfirmBodyPreview') : s('takkClearConfirmBody')}
        confirmLabel={s('takkClearConfirm')}
        icon={<Delete20Regular />}
        onCancel={() => {
          // Cancelled: focus goes back to the button that opened the dialog (WCAG 2.4.3, R3F-02).
          setAsk(false);
          focusAfterOverlay(() => askBtn.current);
        }}
        onConfirm={() => {
          for (const store of [window.localStorage, window.sessionStorage]) {
            try {
              Object.keys(store)
                .filter((k) => k.startsWith('atlas.'))
                .forEach((k) => store.removeItem(k));
            } catch {
              // Storage may be blocked; nothing was kept then.
            }
          }
          // The study starts again from Velkommen, whose heading takes focus after the reload (R3F-02).
          // The marker lives in the history entry, not in storage, so nothing is written back.
          window.history.replaceState({ [FOCUS_HEADING_ON_LOAD]: true }, '', `${window.location.pathname}#/studie`);
          window.location.reload();
        }}
      />
    </div>
  );
}

/* ---------- Studien: the stepper ---------- */

const STEP_LABEL: Record<StepId, Parameters<ReturnType<typeof useLang>['s']>[0]> = {
  velkommen: 'stepVelkommen',
  'om-deg': 'stepOmDeg',
  omvisning: 'stepOmvisning',
  helhet: 'stepHelhet',
  kari: 'stepKari',
  erlend: 'stepErlend',
  astrid: 'stepAstrid',
  avslutning: 'stepAvslutning',
  ekstra: 'stepEkstra',
  takk: 'stepTakk',
};

export function stepLabelKey(step: StepId) {
  return STEP_LABEL[step];
}

export function StepperPage() {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const furthest = study.state.furthest;
  const row = (step: StepId): ReactNode => {
    const idx = stepIndex(step);
    const now = step === furthest;
    const done = idx < stepIndex(furthest);
    const reachable = stepReachable(furthest, step);
    const form = STEP_FORM[step];
    const fstatus = form ? ctl.formStatus(form) : null;
    const caseDone = (step === 'kari' || step === 'erlend' || step === 'astrid') && study.state.phase[step as CoreCaseId] === 'done';
    const label = now ? s('stepStatusNow') : done || caseDone ? s('stepStatusDone') : s('stepStatusLater');
    const meta = [label, fstatus === 'sent' ? s('stepFormSent') : fstatus === 'skipped' ? s('stepFormSkipped') : null].filter(Boolean).join(' · ');
    return (
      <li key={step} className={mergeClasses(cls.stepRow, now && cls.stepNow)} aria-current={now ? 'step' : undefined}>
        <span className={cls.icon} aria-hidden="true">
          {done || caseDone ? <CheckmarkCircle20Regular /> : now ? <RecordStop20Regular /> : <Circle20Regular />}
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span className={cls.stepName} id={`step-name-${step}`}>
            {s(STEP_LABEL[step])}
          </span>
          <span className={cls.stepMeta}>{meta}</span>
        </span>
        <span className={cls.stepActions}>
          {/* Each «Åpne» is described by its step's name, so a list of buttons still says which step (2.4.6). */}
          {reachable && (
            <Button size="small" aria-describedby={`step-name-${step}`} onClick={() => navigate(STEP_PATH[step])}>
              {s('stepOpen')}
            </Button>
          )}
          {form && fstatus === 'skipped' && (step !== 'ekstra' || furthest === 'ekstra') && furthest !== 'takk' && (
            <Button
              size="small"
              appearance="primary"
              onClick={() => {
                ctl.answerAnyway(form);
                navigate(STEP_PATH[step]);
              }}
            >
              {s('formAnswerAnyway')}
            </Button>
          )}
        </span>
      </li>
    );
  };
  const role = study.role ?? 'gp';
  const parts: { n: 1 | 2 | 3; title: string; steps: StepId[] }[] = [
    { n: 1, title: s('partIntro'), steps: STEP_ORDER.filter((x) => partOf(x) === 1) },
    { n: 2, title: s(partTwoLabel(role)), steps: STEP_ORDER.filter((x) => partOf(x) === 2) },
    { n: 3, title: s('partEnd'), steps: STEP_ORDER.filter((x) => partOf(x) === 3) },
  ];
  return (
    <PageCard>
      <PageHeading title={s('stepperTitle')}>{s('stepperTitle')}</PageHeading>
      <div className={cls.stepParts}>
        {parts.map((p) => (
          <section key={p.n} className={cls.stepPart} aria-labelledby={`step-part-${p.n}`}>
            <h2 className={cls.partTitle} id={`step-part-${p.n}`}>
              {s('partCompact', { n: p.n, title: p.title })}
            </h2>
            <ol className={cls.steps}>{p.steps.map(row)}</ol>
          </section>
        ))}
      </div>
    </PageCard>
  );
}
