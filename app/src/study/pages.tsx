import {
  Button,
  Link,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  makeStyles,
  mergeClasses,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import {
  ArrowRight20Regular,
  CheckmarkCircle20Regular,
  Circle20Regular,
  Delete20Regular,
  Form20Regular,
  RecordStop20Regular,
} from '@fluentui/react-icons';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { CaseId, CoreCaseId } from '../content/types';
import { cases, tour, v5 } from '../content';
import { useLang } from '../i18n/i18n';
import { getConfig, previewFlag } from '../engine/forms';
import { navigate } from '../router/router';
import { stepIndex, useStudy } from '../state/study';
import { STEP_ORDER, type FormStep, type Intervju, type RoleChoice, type StepId } from '../state/types';
import { ChoiceGroup } from '../patterns/ChoiceGroup';
import { Panel, SheenButton } from '../patterns/basics';
import { focusAfterOverlay, Silent } from '../patterns/announce';
import { Actions, Body, Card, Eyebrow, GuidePage, Lead, Muted, PageCard } from '../patterns/layout';
import { FOCUS_HEADING_ON_LOAD, PageHeading } from '../shell/PageHeading';
import { ConfirmDialog } from '../shell/HeaderParts';
import { V5View } from '../overview/V5View';
import { useFormHost } from './formHost';
import { FormNotReadyBar } from './FormPanel';
import { STEP_FORM, STEP_PATH, stepReachable, useStudyController } from './controller';
import { TourStepDialog } from '../tour/Tour';

const useStyles = makeStyles({
  list: { margin: 0, paddingInlineStart: '20px', display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, ...typographyStyles.body1 },
  h2: { ...typographyStyles.subtitle1, margin: 0 },
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  formCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  formHead: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, ...typographyStyles.body1Strong },
  steps: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
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
  reasonText: { ...typographyStyles.body1, margin: 0 },
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
  missing: {
    ...typographyStyles.body1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalS,
    paddingBlock: tokens.spacingVerticalXS,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px dashed ${tokens.colorNeutralStroke1}`,
    color: tokens.colorNeutralForeground1,
  },
});

/* ---------- The form block on a step page ---------- */

export function FormStepCard({ step, autoOpen, intro }: { step: FormStep; autoOpen?: boolean; intro?: string }) {
  const cls = useStyles();
  const { s } = useLang();
  const ctl = useStudyController();
  const host = useFormHost();
  const status = ctl.formStatus(step);
  useEffect(() => {
    if (autoOpen && status === 'closed') ctl.openStepForm(step);
  }, [autoOpen, status, step, ctl]);
  return (
    <section className={cls.formCard} aria-label={s('formStatusTitle')} data-form-step={step}>
      <span className={cls.formHead}>
        <Form20Regular aria-hidden="true" />
        {s('formStatusTitle')}
      </span>
      {intro && status !== 'sent' && <Body>{intro}</Body>}
      {/* States that last: said once when the form is sent or skipped, not again on every visit (G-32, R3A-04). */}
      <Silent>
        {status === 'sent' && (
          <MessageBar intent="success">
            <MessageBarBody>{s('formStepDone')}</MessageBarBody>
          </MessageBar>
        )}
        {status === 'skipped' && (
          <MessageBar intent="info">
            <MessageBarBody>{s('formStepSkipped')}</MessageBarBody>
            <MessageBarActions>
              <Button size="small" onClick={() => ctl.answerAnyway(step)}>
                {s('formAnswerAnyway')}
              </Button>
            </MessageBarActions>
          </MessageBar>
        )}
        {/* Once only: while the panel shows this form, the panel says it is not ready (R2A-11). */}
        {status === 'notready' && !(host.form?.step === step && host.visible) && <FormNotReadyBar />}
      </Silent>
      {status === 'open' && (
        <Actions>
          <Body>{host.form?.route === 'tab' ? s('formIsOpenTab') : s('formIsOpenPanel')}</Body>
          {!host.visible && <Button onClick={host.show}>{s('formShow')}</Button>}
        </Actions>
      )}
      {status === 'closed' && (
        <Actions>
          <Button appearance="primary" icon={<Form20Regular />} onClick={() => ctl.openStepForm(step, { show: true })}>
            {s('formOpenButton')}
          </Button>
        </Actions>
      )}
    </section>
  );
}

/** «Send eller hopp over skjemaet …», except for a form that is not ready, which can be neither (r4A-05). */
function FormWaiting({ step }: { step: FormStep }) {
  const { s } = useLang();
  const ctl = useStudyController();
  return ctl.formStatus(step) === 'notready' ? null : <Muted>{s('formWaiting')}</Muted>;
}

/* ---------- 1 Velkommen ---------- */

export function VelkommenPage() {
  const cls = useStyles();
  const { s, t } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const cfg = getConfig();
  const started = stepIndex(study.state.furthest) > stepIndex('velkommen');
  return (
    <GuidePage
      after={
        <Card aria-label={s('velkommenRightsTitle')}>
          <h2 className={cls.h2}>{s('velkommenRightsTitle')}</h2>
          <Body>{s('velkommenVoluntary')}</Body>
          <Body>{s('velkommenAnon')}</Body>
          <Body>{s('velkommenConsent')}</Body>
          <Body>{s('velkommenData')}</Body>
          <Body>{s('velkommenGithub')}</Body>
          {/* A missing letter or contact is said, never hidden: the release check (S9) confirms both are set. */}
          {cfg.informationLetter ? (
            <p style={{ margin: 0 }}>
              <Link href={cfg.informationLetter} target="_blank" rel="noopener noreferrer">
                {s('velkommenLetter')}
              </Link>
            </p>
          ) : (
            <p className={cls.missing}>{s('velkommenLetterMissing')}</p>
          )}
          {cfg.contact ? (
            <Body>
              <strong>{s('velkommenContact')}:</strong> {t(cfg.contact)}
            </Body>
          ) : (
            <p className={cls.missing}>{s('velkommenContactMissing')}</p>
          )}
          {/* «Start» comes after the consent facts, in reading order and on screen. */}
          <Actions>
            {started ? (
              <SheenButton icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => navigate(ctl.currentPath())}>
                {s('velkommenResume')}
              </SheenButton>
            ) : (
              <SheenButton icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => ctl.goToStep('om-deg')}>
                {s('start')}
              </SheenButton>
            )}
          </Actions>
        </Card>
      }
    >
      <Eyebrow>{s('velkommenEyebrow')}</Eyebrow>
      <PageHeading title={s('stepVelkommen')} guide>
        {s('velkommenTitle')}
      </PageHeading>
      <Lead>{s('velkommenStudy')}</Lead>
      <Body>{s('velkommenPrototype')}</Body>
      <Body>{s('velkommenImagine')}</Body>
      <div className={cls.section}>
        <h2 className={cls.h2}>{s('velkommenHowTitle')}</h2>
        <ol className={cls.list}>
          <li>{s('velkommenHow1')}</li>
          <li>{s('velkommenHow2')}</li>
          <li>{s('velkommenHow3')}</li>
          <li>{s('velkommenHow4')}</li>
        </ol>
      </div>
      <Body>{s('velkommenTime')}</Body>
      <Body>{s('velkommenDevice')}</Body>
      <Body>
        <strong>{s('velkommenNoRight')}</strong>
      </Body>
    </GuidePage>
  );
}

/* ---------- 2 Om deg ---------- */

export function OmDegPage() {
  const { s } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const reasonId = useId();
  const st = study.state;
  const locked = !!st.ledger.S1;
  const [role, setRole] = useState<RoleChoice | undefined>(st.roleChoice);
  const [intervju, setIntervju] = useState<Intervju | undefined>(st.intervju);
  const [pendingOpen, setPendingOpen] = useState(false);
  const saved = !!st.roleChoice && !!st.intervju;
  const changed = role !== st.roleChoice || intervju !== st.intervju;
  // Open (or re-create) S1 once the stored answers carry the new values, so its locked fields are right.
  useEffect(() => {
    if (pendingOpen && st.roleChoice === role && st.intervju === intervju) {
      setPendingOpen(false);
      ctl.openStepForm('S1', { force: true, show: true });
    }
  }, [pendingOpen, st.roleChoice, st.intervju, role, intervju, ctl]);
  const s1Done = ctl.stepDone('S1');
  return (
    <PageCard narrow>
      <PageHeading title={s('omDegTitle')}>{s('omDegTitle')}</PageHeading>
      <Body>{s('omDegIntro')}</Body>
      <ChoiceGroup<RoleChoice>
        legend={s('roleQuestion')}
        layout="column"
        value={role}
        disabled={locked}
        onChange={setRole}
        choices={[
          { value: 'fastlege', label: s('roleOptFastlege') },
          { value: 'dps-kliniker', label: s('roleOptDps') },
          { value: 'annen', label: s('roleOptAnnen') },
        ]}
      />
      <Muted>{s('roleLockedNote')}</Muted>
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
          <div>
            <Button
              appearance={role && intervju ? 'primary' : 'secondary'}
              disabledFocusable={!role || !intervju}
              aria-describedby={!role || !intervju ? reasonId : undefined}
              onClick={() => {
                if (!role || !intervju) return;
                study.setRole(role, intervju);
                setPendingOpen(true);
              }}
            >
              {s('omDegSave')}
            </Button>
            {(!role || !intervju) && (
              <p id={reasonId} style={{ ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: '8px 0 0' }}>
                {s('omDegSaveReason')}
              </p>
            )}
          </div>
        )
      )}
      {saved && !changed && <FormStepCard step="S1" intro={s('s1Intro')} />}
      {s1Done ? (
        <Actions>
          <Button appearance="primary" icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => ctl.goToStep('omvisning')}>
            {s('goToTour')}
          </Button>
        </Actions>
      ) : (
        saved && <FormWaiting step="S1" />
      )}
    </PageCard>
  );
}

/* ---------- 4 Helhetsinntrykk ---------- */

export function HelhetPage() {
  const cls = useStyles();
  const { s, t } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const role = study.role ?? 'gp';
  const [open, setOpen] = useState<string | null>(null);
  const steps = tour[role].parts.flatMap((p) => p.steps);
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
        onClose={() => {
          const id = open;
          setOpen(null);
          // Back to the «Se igjen» that opened the dialog (2.4.3, R2A-03).
          focusAfterOverlay(() => document.querySelector<HTMLElement>(`[data-see-again="${id}"]`));
        }}
      />
      {ctl.stepDone('S2') ? (
        <Actions>
          <Button appearance="primary" icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => ctl.goToStep('kari')}>
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
        <Actions>
          <Button appearance="primary" onClick={() => ctl.goToStep('ekstra')}>
            {s('toExtra')}
          </Button>
          <Button onClick={() => ctl.goToStep('takk')}>{s('finish')}</Button>
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
  const steps = tour[role].parts.flatMap((p) => p.steps);
  const caseIds: CaseId[] = ['kari', 'erlend', 'astrid'];
  if (role === 'gp' && study.state.ledger.S7) caseIds.push('torbjorn');
  return (
    <GuidePage
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
      <ClearBrowserData />
    </GuidePage>
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
  const [ask, setAsk] = useState(false);
  const askBtn = useRef<HTMLButtonElement>(null);
  // In a preview nothing went to Nettskjema, and removing the data removes the preview answers too (R2DPS-03).
  const preview = previewFlag();
  return (
    <div className={cls.section}>
      <h2 className={cls.h2}>{s('takkClearTitle')}</h2>
      <Body>{preview ? s('takkClearBodyPreview') : s('takkClearBody')}</Body>
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
  const rows: ReactNode[] = STEP_ORDER.map((step) => {
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
  });
  return (
    <PageCard narrow>
      <PageHeading title={s('stepperTitle')}>{s('stepperTitle')}</PageHeading>
      <ol className={cls.steps}>{rows}</ol>
    </PageCard>
  );
}
