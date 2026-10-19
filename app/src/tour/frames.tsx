import { Button, makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowLeft16Regular, ArrowCounterclockwise16Regular } from '@fluentui/react-icons';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Role } from '../content/types';
import { cases, ordinary, pattern, vocab } from '../content';
import { formatDateWithWeekday, formatDayMonth, useLang } from '../i18n/i18n';
import { mentionedCriteria } from '../engine/criteria';
import { dpsOutcomeMessage, type ThreadMessage, type ThreadOutput } from '../engine/thread';
import { DPS_TODAY, GP_TODAY } from '../engine/clock';
import { emptyDps, emptyGp, type DpsWork, type GpWork } from '../state/types';
import { SandboxWorkProvider, useWork, type WorkApi } from '../state/work';
import { ConfidenceScale, InfoGuide, UncertaintyTags } from '../patterns/clinical';
import { useAtlasAnnounce } from '../patterns/announce';
import { StatusChip } from '../patterns/basics';
import { DecisionSection } from '../case/AtlasPanelGp';
import { BandSection } from '../case/BandSection';
import { GpUnsureBlock, DpsOutcomeSection, ReferralLetter, receivedReferral } from '../case/dpsParts';
import { ProfileRail, RecordTabs } from '../case/record';
import { ReferralEditor } from '../case/ReferralEditor';
import { StructuredReturnView, ThreadView } from '../case/Thread';
import { PatternView } from '../overview/PatternView';
import { Kalibrering, SharedDialog } from '../overview/SharedView';
import { FrameStudyCase, FrameStudyMap, FrameStudyName, FrameStudyStop, isStudyFrame } from './studyFrames';

export { isStudyFrame };

/**
 * The tour's live frames: the real components on the practice patient Sofie
 * Lund, with state that lives only in the tour (nothing is saved, nothing
 * navigates). They never show Kari, Erlend, Astrid, Torbjørn or the V5 GPs.
 */
const SOFIE = 'sofie' as const;

const useStyles = makeStyles({
  stack: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: 0 },
  head: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...typographyStyles.caption1Strong,
    flexShrink: 0,
  },
  name: { ...typographyStyles.body1Strong },
  visit: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  grid: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-start' },
  profile: { flexGrow: 1, flexShrink: 1, flexBasis: '200px', minWidth: 0 },
  centre: { flexGrow: 999, flexShrink: 1, flexBasis: '0', minWidth: '55%' },
  note: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2, margin: 0 },
  placeFirst: {
    ...typographyStyles.body1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
  },
});

export interface Sandbox {
  work: WorkApi;
  reset: () => void;
}

/** One sandbox per tour run, so a placement made in one step is still there in the next. */
export function useSandbox(role: Role, notes: boolean): Sandbox {
  const [gp, setGp] = useState<GpWork>(emptyGp());
  const [dps, setDps] = useState<DpsWork>(emptyDps());
  return useMemo(() => {
    const work: WorkApi = {
      mode: 'study',
      viewer: role,
      base: '',
      casePath: () => '',
      listPath: '',
      go: () => undefined,
      sandbox: true,
      gp: () => gp,
      dps: () => dps,
      updateGp: (_, patch) => setGp((w) => ({ ...w, ...(typeof patch === 'function' ? patch(w) : patch) })),
      updateDps: (_, patch) => setDps((w) => ({ ...w, ...(typeof patch === 'function' ? patch(w) : patch) })),
      played: (r) => r === role,
      phase: () => 'atlas',
      withoutAtlas: () => false,
      // As if the form were held: the frames show no «Fortsett» that would lead nowhere in a tour (GP-15).
      held: () => true,
      notes,
      canShowAtlas: () => true,
      showAtlas: () => undefined,
      ownDecision: () => undefined,
      formSent: () => false,
      startCase: () => undefined,
      toSummary: () => undefined,
      finishCase: () => undefined,
    };
    return {
      work,
      reset: () => {
        setGp(emptyGp());
        setDps(emptyDps());
      },
    };
  }, [gp, dps, role, notes]);
}

function PlaceFirst() {
  const cls = useStyles();
  const { s } = useLang();
  return <p className={cls.placeFirst}>{s('tourPlaceFirst')}</p>;
}

function PatientLine() {
  const cls = useStyles();
  const { s, t } = useLang();
  const work = useWork();
  const c = cases.sofie;
  return (
    <div className={cls.head}>
      <span className={cls.avatar} aria-hidden="true">
        {c.patient.initials}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span className={cls.name}>{s('patientAge', { name: c.patient.name, age: c.patient.age })}</span>
        <span className={cls.visit}>
          {work.viewer === 'dps' ? s('referralWord') : t(c.gp.timeliste.visit)} · {s('practicePatient')}
        </span>
      </span>
    </div>
  );
}

/* The overview's list in miniature, drawn as Min dag draws it: one row per patient, time, initials, name and visit,
   and what can be done now. Sofie Lund is the one row that opens; the GP's ordinary appointments make the day. */
const useList = makeStyles({
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    boxShadow: tokens.shadow2,
    minWidth: 0,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  headBox: { display: 'flex', flexDirection: 'column', gap: '2px', paddingInline: '16px', paddingBlockStart: '14px', paddingBlockEnd: '10px' },
  head: { ...typographyStyles.subtitle2, margin: 0 },
  summary: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground3 },
  rows: { listStyle: 'none', margin: 0, padding: 0, borderTop: `1px solid ${tokens.colorNeutralStroke3}` },
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
  rowOpen: { backgroundColor: tokens.colorBrandBackground2, boxShadow: `inset 3px 0 0 ${tokens.colorBrandStroke1}` },
  time: { ...typographyStyles.body1Strong, fontVariantNumeric: 'tabular-nums' },
  timeQuiet: { ...typographyStyles.body1, fontVariantNumeric: 'tabular-nums' },
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
  later: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, whiteSpace: 'nowrap' },
  foot: { ...typographyStyles.caption1, margin: 0, paddingInline: '16px', paddingBlock: '10px', color: tokens.colorNeutralForeground3 },
});

const capital = (x: string) => (x ? x.charAt(0).toUpperCase() + x.slice(1) : x);

function FrameList({ role }: { role: Role }) {
  const cls = useStyles();
  const list = useList();
  const { s, t, lang } = useLang();
  const [opened, setOpened] = useState(false);
  const announce = useAtlasAnnounce();
  const titleId = useId();
  const nameId = useId();
  const open = () => {
    if (!opened) announce(s('tourOpenedNote'));
    setOpened(true);
  };
  const c = cases.sofie;
  const openButton = (
    <Button size="small" aria-describedby={nameId} onClick={open}>
      {s('stepOpen')}
    </Button>
  );
  const name = (
    <span className={list.name} id={nameId}>
      {s('patientAge', { name: c.patient.name, age: c.patient.age })}
    </span>
  );
  let rows: ReactNode;
  if (role === 'gp') {
    const line = [t(c.gp.timeliste.visit), ...c.gp.timeliste.chips.slice(0, 1).map((ch) => t(ch.label))].join(' · ');
    const day = [
      {
        time: c.gp.timeliste.time,
        node: (
          <li key={SOFIE} className={mergeClasses(list.row, opened && list.rowOpen)}>
            <span className={list.time}>{c.gp.timeliste.time}</span>
            <span className={list.avatar} aria-hidden="true">
              {c.patient.initials}
            </span>
            <span className={list.who}>
              {name}
              <span className={list.visit}>{line}</span>
            </span>
            {openButton}
          </li>
        ),
      },
      ...ordinary.map((o) => ({
        time: o.time,
        node: (
          <li key={o.id} className={list.row}>
            <span className={list.timeQuiet}>{o.time}</span>
            <span className={list.avatar} aria-hidden="true">
              {o.initials}
            </span>
            <span className={list.who}>
              <span className={list.nameQuiet}>{s('patientAge', { name: o.name, age: o.age })}</span>
              <span className={list.visit}>{t(o.visit)}</span>
            </span>
            <span className={list.later}>{s('listRoutineTag')}</span>
          </li>
        ),
      })),
    ].sort((a, b) => a.time.localeCompare(b.time));
    rows = day.map((r) => r.node);
  } else {
    const q = c.dps!.queue;
    rows = (
      <li className={mergeClasses(list.row, list.rowDps, opened && list.rowOpen)}>
        <span className={list.received}>
          {s('colReceived')}
          <span className={list.receivedDate}>{formatDayMonth(q.received, lang)}</span>
        </span>
        <span className={list.avatar} aria-hidden="true">
          {c.patient.initials}
        </span>
        <span className={list.who}>
          {name}
          <span className={list.visit}>{`${s('homeFromGp')} · ${t(q.chips[0]?.label)}`}</span>
          <span className={list.chipLine}>
            <StatusChip>{s('homeDeadlineChip', { date: formatDayMonth(q.deadline, lang) })}</StatusChip>
          </span>
        </span>
        {openButton}
      </li>
    );
  }
  return (
    <div className={cls.stack}>
      <section className={list.card} aria-labelledby={titleId}>
        <div className={list.headBox}>
          <h3 id={titleId} className={list.head}>
            {role === 'gp' ? s('timelisteTitle') : s('navQueue')}
          </h3>
          {/* The practice day in one line; «1 referral case», never «1 referral cases» (r6F-07). */}
          <p className={list.summary}>
            {role === 'gp'
              ? s('timelisteSummaryOneCase', { date: capital(formatDateWithWeekday(GP_TODAY, lang)), n: 1 + ordinary.length })
              : s('queueSummaryOne', { date: capital(formatDateWithWeekday(DPS_TODAY, lang)) })}
          </p>
        </div>
        <ul className={list.rows}>{rows}</ul>
        <p className={list.foot}>{role === 'gp' ? s('homeRoutineNote') : s('homeQueueNote')}</p>
      </section>
      {opened && <p className={cls.note}>{s('tourOpenedNote')}</p>}
    </div>
  );
}

function FrameProfil() {
  const cls = useStyles();
  const c = cases.sofie;
  return (
    <div className={cls.stack}>
      <PatientLine />
      <div className={cls.grid}>
        <div className={cls.profile}>
          <ProfileRail content={c} />
        </div>
        <div className={cls.centre}>
          <RecordTabs content={c} />
        </div>
      </div>
    </div>
  );
}

/**
 * The tour's example thread. Its reply is written for the prototype and says
 * so, for both roles: it is never signed «Deg». A DPS participant who tried an
 * assessment in the tour sees that practice message instead, as their own.
 */
function demoThread(role: Role, dps: DpsWork): ThreadOutput {
  const c = cases.sofie;
  const ret = c.gp.dpsScript.return!;
  const referral: ThreadMessage = { id: 'referral', from: 'gp', date: c.dps!.referral.sent, outcome: 'referral', text: { nb: '', en: '' } };
  if (role === 'dps' && dps.sent && dps.outcome) {
    const own = dpsOutcomeMessage('dps-1', dps.outcome, dps.sentDate ?? DPS_TODAY, dps.question, dps.reasons, dps.explanation, dps.advice);
    return { messages: [referral, own], awaiting: null, heldReply: false, ended: true };
  }
  // For DPS, «today» is the day after the referral arrived, so the example carries that date.
  const date = role === 'dps' ? DPS_TODAY : ret.date;
  const example: ThreadMessage = { id: 'dps-return', from: 'dps', date, outcome: 'retur', text: ret.explanation, reasons: ret.reasons, structured: ret, scripted: true };
  return { messages: [referral, example], awaiting: null, heldReply: false, ended: true };
}

function FrameDialog({ role }: { role: Role }) {
  const { s, t } = useLang();
  const work = useWork();
  const dps = work.dps(SOFIE);
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const moved = useRef(false);
  // Opening the thread and going back each replace the focused button: focus follows (2.4.3, R2A-03).
  useEffect(() => {
    if (!moved.current) return;
    window.requestAnimationFrame(() => (open ? back.current : opener.current?.querySelector<HTMLElement>('button'))?.focus());
  }, [open]);
  const toggle = (v: boolean) => {
    moved.current = true;
    setOpen(v);
  };
  // The list says what the thread holds: the participant's own practice outcome, or the example return.
  const outcome = role === 'dps' && dps.sent && dps.outcome ? dps.outcome : 'retur';
  if (open) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <Button ref={back} size="small" appearance="subtle" icon={<ArrowLeft16Regular />} onClick={() => toggle(false)}>
            {s('tourBackToDialog')}
          </Button>
        </div>
        <ThreadView thread={demoThread(role, dps)} />
      </div>
    );
  }
  return (
    <div ref={opener}>
      <SharedDialog
        notes={work.notes}
        threads={[{ caseId: SOFIE, to: '', status: t(vocab.outcomes[outcome].label) }]}
        onOpenThread={() => toggle(true)}
      />
    </div>
  );
}

function FrameGpUncertainty() {
  const { t } = useLang();
  const work = useWork();
  const received = receivedReferral(SOFIE, work, t);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PatientLine />
      <ReferralLetter caseId={SOFIE} received={received} />
      <GpUnsureBlock received={received} />
    </div>
  );
}

function FrameDpsBand({ reading }: { reading?: boolean }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const work = useWork();
  const received = receivedReferral(SOFIE, work, t);
  const dps = work.dps(SOFIE);
  return (
    <div className={cls.stack}>
      {/* The reading step works whether or not the case was placed in the step before (comparable exposure). */}
      {reading && dps.placement === undefined && <p className={cls.placeFirst}>{s('tourPlaceFirstDps')}</p>}
      <BandSection
        viewer="dps"
        own={dps.placement}
        onPlace={(v) => work.updateDps(SOFIE, { placement: v })}
        other={received.placement !== undefined ? { role: 'gp', value: received.placement } : undefined}
        reading={cases.sofie.dps!.systemReading}
        notes={work.notes}
      />
    </div>
  );
}

/** After a practice send, focus moves to the sent assessment that replaced the button (2.4.3, R2A-03). */
function focusSentAssessment() {
  window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-tour-frame] [data-sent-assessment]')?.focus());
}

/**
 * The structured return to try. An assessment sent in the step before with
 * another outcome is cleared once, when the step opens, so the return can be
 * tried; a return already sent here stays, and so does the one just sent
 * (R2DPS-01, R2DPS-04).
 */
function FrameOutcomeReturn() {
  const work = useWork();
  const dps = work.dps(SOFIE);
  const clearAtOpen = useRef(dps.sent === true && dps.outcome !== 'retur');
  const [ready, setReady] = useState(!clearAtOpen.current);
  useEffect(() => {
    if (clearAtOpen.current) work.updateDps(SOFIE, { sent: false, sentDate: undefined, outcome: undefined, reasons: [], explanation: '', advice: '', question: '' });
    setReady(true);
    // Only when the step opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!ready) return null;
  return <DpsOutcomeSection caseId={SOFIE} onSent={focusSentAssessment} />;
}

/** The live component for a tour step's frame key. */
export function TourFrame({ frame, role }: { frame: string; role: Role }) {
  const { t } = useLang();
  const work = useWork();
  const c = cases.sofie;
  const gp = work.gp(SOFIE);
  let body: ReactNode;
  switch (frame) {
    case 'timeliste':
    case 'queue':
      body = <FrameList role={role} />;
      break;
    case 'profil':
      body = <FrameProfil />;
      break;
    case 'band':
    case 'bandReading':
      body = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {frame === 'bandReading' && gp.placement === undefined && <PlaceFirst />}
          <BandSection viewer="gp" own={gp.placement} onPlace={(v) => work.updateGp(SOFIE, { placement: v })} reading={c.gp.systemReading} notes={work.notes} />
        </div>
      );
      break;
    case 'tags':
      body = (
        <UncertaintyTags
          tags={gp.tags}
          description={gp.description}
          onTags={(tags) => work.updateGp(SOFIE, { tags })}
          onDescription={(description) => work.updateGp(SOFIE, { description })}
        />
      );
      break;
    case 'guide':
      body = <InfoGuide mentioned={mentionedCriteria(t(c.gp.note.text))} mode="note" defaultOpen />;
      break;
    case 'confidence':
      body = <ConfidenceScale value={gp.confidence} onChange={(confidence) => work.updateGp(SOFIE, { confidence })} />;
      break;
    case 'decision':
      body = <DecisionSection caseId={SOFIE} />;
      break;
    case 'referral':
      body = <ReferralEditor caseId={SOFIE} />;
      break;
    case 'return':
      body = <StructuredReturnView ret={c.gp.dpsScript.return!} unmetOpen={false} withOutcome />;
      break;
    // The tour comes before case 1: the pattern and the area's figures show their layout only, so no rate or
    // return reason reaches a participant before their answers without ATLAS (G-38, flow review B1, 3.5.1).
    case 'pattern':
      body = <PatternView data={pattern} held notes={work.notes} />;
      break;
    case 'kalibrering':
      body = <Kalibrering held notes={work.notes} />;
      break;
    case 'dialog':
      body = <FrameDialog role={role} />;
      break;
    case 'gpUncertainty':
      body = <FrameGpUncertainty />;
      break;
    case 'dpsBand':
      body = <FrameDpsBand />;
      break;
    case 'dpsBandReading':
      body = <FrameDpsBand reading />;
      break;
    case 'dpsGuide':
      body = <InfoGuide mentioned={c.dps!.guideAsReceived} mode="received" defaultOpen />;
      break;
    case 'outcome':
      body = <DpsOutcomeSection caseId={SOFIE} onSent={focusSentAssessment} />;
      break;
    case 'outcomeReturn':
      body = <FrameOutcomeReturn />;
      break;
    case 'studyMap':
      body = <FrameStudyMap role={role} />;
      break;
    case 'studyCase':
      body = <FrameStudyCase />;
      break;
    case 'studyStop':
      body = <FrameStudyStop />;
      break;
    case 'studyName':
      body = <FrameStudyName role={role} />;
      break;
    default:
      body = null;
  }
  return <>{body}</>;
}

export function SandboxFrame({ sandbox, frame, role }: { sandbox: Sandbox; frame: string; role: Role }) {
  const { s } = useLang();
  return (
    <SandboxWorkProvider value={sandbox.work}>
      <TourFrame frame={frame} role={role} />
      {/* A drawing of the study has nothing to reset. */}
      {!isStudyFrame(frame) && (
        <div style={{ marginTop: 16 }}>
          <Button size="small" appearance="subtle" icon={<ArrowCounterclockwise16Regular />} onClick={sandbox.reset}>
            {s('tourResetFrame')}
          </Button>
        </div>
      )}
    </SandboxWorkProvider>
  );
}
