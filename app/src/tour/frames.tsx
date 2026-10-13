import { Button, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowLeft16Regular, ArrowCounterclockwise16Regular } from '@fluentui/react-icons';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Role } from '../content/types';
import { cases, pattern, vocab } from '../content';
import { useLang } from '../i18n/i18n';
import { mentionedCriteria } from '../engine/criteria';
import { dpsOutcomeMessage, type ThreadMessage, type ThreadOutput } from '../engine/thread';
import { DPS_TODAY } from '../engine/clock';
import { emptyDps, emptyGp, type DpsWork, type GpWork } from '../state/types';
import { SandboxWorkProvider, useWork, type WorkApi } from '../state/work';
import { ConfidenceScale, InfoGuide, UncertaintyTags } from '../patterns/clinical';
import { useAtlasAnnounce } from '../patterns/announce';
import { DecisionSection } from '../case/AtlasPanelGp';
import { BandSection } from '../case/BandSection';
import { GpUnsureBlock, DpsOutcomeSection, ReferralLetter, receivedReferral } from '../case/dpsParts';
import { QueueView, TimelisteView } from '../case/lists';
import { ProfileRail, RecordTabs } from '../case/record';
import { ReferralEditor } from '../case/ReferralEditor';
import { StructuredReturnView, ThreadView } from '../case/Thread';
import { PatternView } from '../overview/PatternView';
import { Kalibrering, SharedDialog } from '../overview/SharedView';

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

function FrameList({ role }: { role: Role }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const [opened, setOpened] = useState(false);
  const announce = useAtlasAnnounce();
  const open = () => {
    if (!opened) announce(s('tourOpenedNote'));
    setOpened(true);
  };
  const c = cases.sofie;
  return (
    <div className={cls.stack}>
      {role === 'gp' ? (
        <TimelisteView
          title={false}
          entries={[{ caseId: SOFIE, onOpen: open, selected: opened, chips: c.gp.timeliste.chips.map((x) => ({ label: t(x.label), isNew: x.isNew })) }]}
        />
      ) : (
        <QueueView
          title={false}
          entries={[{ caseId: SOFIE, onOpen: open, selected: opened, chips: c.dps!.queue.chips.map((x) => ({ label: t(x.label), isNew: x.isNew })) }]}
        />
      )}
      {opened && (
        <p className={cls.note}>{s('tourOpenedNote')}</p>
      )}
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
    case 'pattern':
      body = <PatternView data={pattern} notes={work.notes} />;
      break;
    case 'kalibrering':
      body = <Kalibrering notes={work.notes} />;
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
      <div style={{ marginTop: 16 }}>
        <Button size="small" appearance="subtle" icon={<ArrowCounterclockwise16Regular />} onClick={sandbox.reset}>
          {s('tourResetFrame')}
        </Button>
      </div>
    </SandboxWorkProvider>
  );
}
