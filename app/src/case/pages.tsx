import { Button, Field, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowRight16Regular, ArrowRight20Regular, DocumentEdit20Regular, Home20Regular, Send28Regular } from '@fluentui/react-icons';
import { useEffect, useId } from 'react';
import type { StringKey } from '../i18n/strings';
import type { CaseId, Outcome, T } from '../content/types';
import { cases, vocab } from '../content';
import { formatDate, useLang } from '../i18n/i18n';
import { DPS_TODAY, GP_TODAY, laterOf } from '../engine/clock';
import { referralCriteria } from '../engine/criteria';
import { gpHeld, type CaseStatus } from '../engine/flow';
import { navigate } from '../router/router';
import type { DpsWork, GpWork } from '../state/types';
import { useWork } from '../state/work';
import { ChoiceGroup } from '../patterns/ChoiceGroup';
import { DesignNote, ProvenanceChip, GrowingTextarea, SheenButton } from '../patterns/basics';
import { useAtlasAnnounce } from '../patterns/announce';
import { Rows } from '../patterns/clinical';
import { Actions, Body, Card, Eyebrow, GuidePage, Lead, MetaChips, Muted, PageCard } from '../patterns/layout';
import { UncertaintyBand } from '../patterns/UncertaintyBand';
import { PageHeading } from '../shell/PageHeading';
import { positionKey } from '../engine/placement';
import { Responsibility } from './AtlasPanelGp';
import { OtherSideButton } from './CaseChrome';
import { receivedReferral } from './dpsParts';
import { atlasLine, draftSections } from './ReferralEditor';
import { useCaseStatus } from './useCaseStatus';

const useStyles = makeStyles({
  h2: { ...typographyStyles.subtitle1, margin: 0 },
  held: {
    ...typographyStyles.body1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px dashed ${tokens.colorNeutralStroke1}`,
    backgroundColor: 'rgba(255,255,255,0.7)',
    color: tokens.colorNeutralForeground2,
  },
  // G-22: «send» is the icon for Sendt; neutral and modest, no celebration after a clinical decision (B6).
  sentIcon: { color: tokens.colorNeutralForeground2, fontSize: '28px', width: '28px', height: '28px' },
  // Anything that shows the band stays solid white, also on the dawn (Meridian band rule).
  bandBox: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalM,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  reason: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
  status: { ...typographyStyles.body1Strong, margin: 0 },
  purpose: {
    ...typographyStyles.body1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px dashed ${tokens.colorBrandStroke2}`,
    backgroundColor: tokens.colorBrandBackground2,
  },
});

/* ---------- Briefing ---------- */

export function BriefingPage({ caseId }: { caseId: CaseId }) {
  const { s, t } = useLang();
  const work = useWork();
  const c = cases[caseId];
  const b = work.viewer === 'gp' ? c.gp.briefing : c.dps?.briefing;
  if (!b) return null;
  const index = ({ kari: 1, erlend: 2, astrid: 3 } as Partial<Record<CaseId, number>>)[caseId];
  const role = work.viewer === 'gp' ? s('roleGp') : s('roleDps');
  const eyebrow = index ? `${s('caseOf', { n: index })} · ${role}` : `${s('extraCase')} · ${role}`;
  const startLabel = work.mode === 'study' && work.phase(caseId) !== 'briefing' ? s('continueCase') : s('startCase');
  return (
    <GuidePage
      after={
        <Card aria-label={s('about')}>
          <h2 style={{ ...typographyStyles.subtitle1, margin: 0 }}>{s('about')}</h2>
          <Rows rows={b.rows.map((r) => ({ label: t(r.label), value: t(r.value) }))} />
        </Card>
      }
    >
      <OtherSideButton caseId={caseId} view="orientering" />
      <Eyebrow>{eyebrow}</Eyebrow>
      <PageHeading title={s('about')} guide>
        {s('patientAge', { name: c.patient.name, age: c.patient.age })}
      </PageHeading>
      <Lead>{t(b.task)}</Lead>
      <MetaChips time={t(b.time)} fictional={s('fictionalPatient')} />
      <Actions>
        <SheenButton icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => work.startCase(caseId)}>
          {startLabel}
        </SheenButton>
      </Actions>
    </GuidePage>
  );
}

/* ---------- Sendt ---------- */

export function SentPage({ caseId }: { caseId: CaseId }) {
  const cls = useStyles();
  const { s, lang } = useLang();
  const work = useWork();
  const status = useCaseStatus(caseId);
  const gp = work.gp(caseId);
  const dps = work.dps(caseId);
  let title: string;
  let body: string;
  let date: string;
  if (work.viewer === 'gp') {
    if (caseId === 'astrid' && gp.secondReferral !== 'sent') {
      title = s('sentTitleQuestion');
      body = s('sentBodyQuestion');
      date = gp.messages.find((m) => m.kind === 'question')?.date ?? GP_TODAY;
    } else if (gp.secondReferral === 'sent') {
      // The new referral after «Henvis på nytt»: no ATLAS panel goes with it, and no reply follows (Astrid; Kari and Erlend
      // in review after a played return, r9F-01).
      title = s('sentTitleGp');
      body = work.mode === 'review' ? s('sentBodyGpSecondReview') : s('sentBodyGpSecond');
      date = gp.secondReferralDate ?? laterOf(GP_TODAY, ...status.thread.messages.map((m) => m.date));
    } else {
      title = s('sentTitleGp');
      body = atlasLine(gp, s);
      date = gp.referralDate ?? GP_TODAY;
    }
  } else if (caseId === 'astrid') {
    title = s('sentTitleAnswer');
    body = s('sentBodyAnswer');
    date = dps.sentDate ?? DPS_TODAY;
  } else {
    title = s('sentTitleDps');
    // What the GP sees depends on the outcome: a request has a question, a grant only the outcome.
    body = dps.outcome === 'info' ? s('sentBodyDpsInfo') : dps.outcome === 'rett' ? s('sentBodyDpsRett') : s('sentBodyDps');
    date = dps.sentDate ?? DPS_TODAY;
  }
  const held = work.held(caseId);
  // While the form is held: a reply is promised only where one will come.
  const noReply =
    (work.viewer === 'dps' && (dps.outcome === 'rett' || caseId === 'astrid')) || (work.viewer === 'gp' && caseId === 'torbjorn');
  const heldLine = caseId === 'torbjorn' ? s('heldOnePage') : noReply ? s('heldNoReply') : s('heldReply');
  return (
    <GuidePage>
      <OtherSideButton caseId={caseId} view="sendt" />
      <Send28Regular className={cls.sentIcon} aria-hidden="true" />
      <PageHeading title={s('sentLabel')} guide>
        {title}
      </PageHeading>
      <Muted>{s('sentOn', { date: formatDate(date, lang) })}</Muted>
      <Lead>{body}</Lead>
      {held ? (
        <>
          <p className={cls.held}>{heldLine}</p>
          {work.phase(caseId) === 'page2' && <Body>{caseId === 'torbjorn' ? s('formAnswerNow') : s('formGoOn')}</Body>}
        </>
      ) : (
        <Actions>
          <SheenButton
            icon={<ArrowRight20Regular />}
            iconPosition="after"
            onClick={() =>
              status.next === 'oppsummering' ? work.toSummary(caseId) : navigate(work.casePath(caseId, status.next === 'sendt' ? 'dialog' : status.next))
            }
          >
            {s('continue')}
          </SheenButton>
        </Actions>
      )}
      <DesignNote id="sendt" show={work.notes} />
    </GuidePage>
  );
}

/* ---------- Din plan ---------- */

export function PlanPanel({ caseId, status }: { caseId: CaseId; status: CaseStatus }) {
  const cls = useStyles();
  const { s } = useLang();
  const work = useWork();
  const gp = work.gp(caseId);
  const reasonId = useId();
  const announce = useAtlasAnnounce();
  if (!status.planKind) return null;
  const planLine = s('planSavedAs', { v: gp.plan === 'henvisPaNytt' ? s('planReferAgain') : s('planFollowUp') });
  // Once the new referral is written, the plan is what happened; it no longer changes (R2GP-01).
  const lockedBySecond = !!gp.secondReferral;
  const locked = lockedBySecond || (work.mode === 'study' && (work.phase(caseId) === 'debrief' || work.phase(caseId) === 'done'));
  const choices =
    status.planKind === 'both'
      ? [
          { value: 'folgOpp' as const, label: s('planFollowUp'), icon: <Home20Regular /> },
          { value: 'henvisPaNytt' as const, label: s('planReferAgain'), icon: <DocumentEdit20Regular /> },
        ]
      : [{ value: 'folgOpp' as const, label: s('planFollowUp'), icon: <Home20Regular /> }];
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-label={s('planTitle')} data-section="plan">
      {status.planKind === 'gpOnly' && <Body>{s('planGpOnly')}</Body>}
      {locked && <p className={cls.held}>{lockedBySecond ? s('lockedPlanSecond') : s('lockedPlan')}</p>}
      <ChoiceGroup<'folgOpp' | 'henvisPaNytt'>
        legend={s('planTitle')}
        chip={<ProvenanceChip source="own" />}
        value={gp.plan}
        disabled={locked}
        onChange={(v) => work.updateGp(caseId, { plan: v, planSaved: false })}
        choices={choices}
      />
      <Field label={s('planReason')}>
        <GrowingTextarea value={gp.planReason} rows={2} disabled={locked} onChange={(_, d) => work.updateGp(caseId, { planReason: d.value })} />
      </Field>
      {lockedBySecond && (
        <Actions>
          <Button appearance="primary" icon={<ArrowRight16Regular />} iconPosition="after" onClick={() => work.toSummary(caseId)}>
            {s('toSummary')}
          </Button>
        </Actions>
      )}
      {!locked && (
        <Actions>
          <Button
            appearance={gp.plan && !gp.planSaved ? 'primary' : 'secondary'}
            disabledFocusable={!gp.plan || gp.planSaved === true}
            aria-describedby={!gp.plan ? reasonId : undefined}
            onClick={() => {
              if (!gp.plan) return;
              work.updateGp(caseId, { planSaved: true });
              announce(planLine);
            }}
          >
            {s('planSave')}
          </Button>
          {gp.planSaved && gp.plan === 'henvisPaNytt' && !gp.secondReferral && (
            <Button appearance="primary" icon={<ArrowRight16Regular />} iconPosition="after" onClick={() => navigate(work.casePath(caseId, 'henvisning'))}>
              {s('writeNewReferral')}
            </Button>
          )}
          {gp.planSaved && gp.plan === 'folgOpp' && (
            <Button appearance="primary" icon={<ArrowRight16Regular />} iconPosition="after" onClick={() => work.toSummary(caseId)}>
              {s('toSummary')}
            </Button>
          )}
        </Actions>
      )}
      {!gp.plan && !locked && (
        <p className={cls.reason} id={reasonId} data-muted="">
          {s('planSaveReason')}
        </p>
      )}
      {gp.planSaved && <p className={cls.status}>{planLine}</p>}
      <Responsibility />
      <DesignNote id="plan" show={work.notes} />
    </section>
  );
}

export function PlanPage({ caseId }: { caseId: CaseId }) {
  const { s } = useLang();
  const status = useCaseStatus(caseId);
  const c = cases[caseId];
  return (
    <PageCard narrow>
      <OtherSideButton caseId={caseId} view="plan" />
      <PageHeading title={s('planTitle')} sub={s('patientAge', { name: c.patient.name, age: c.patient.age })}>
        {s('planTitle')}
      </PageHeading>
      <PlanPanel caseId={caseId} status={status} />
    </PageCard>
  );
}

/* ---------- Oppsummering ---------- */

function lower(x: string): string {
  return x ? x.charAt(0).toLowerCase() + x.slice(1) : x;
}

function outcomeWords(o: Outcome, t: (x: T) => string): string {
  return lower(t(vocab.outcomes[o].label));
}

/** The words that fill {{beslutning}}, {{trygghet}} and {{utfall}}. */
export function debriefWords(
  caseId: CaseId,
  viewer: 'gp' | 'dps',
  status: CaseStatus,
  gp: GpWork,
  dps: DpsWork,
  received: { confidence?: string; gpPlaced?: boolean } | null,
  t: (x: T) => string,
  S: (k: StringKey, v?: Record<string, string | number>) => string,
) {
  const dpsMessages = status.thread.messages.filter((m) => m.from === 'dps' && (m.outcome === 'info' || m.outcome === 'rett' || m.outcome === 'retur'));
  const chain = dpsMessages.map((m) => outcomeWords(m.outcome as Outcome, t));
  const words = chain.length === 0 ? '' : chain.length === 1 ? chain[0] : S('dbThen', { a: chain[0], b: chain[chain.length - 1] });
  // Review mode: an outcome nobody played is an example reply, and the summary says so (r6F-02).
  const outcomeChain = words && dpsMessages.some((m) => m.example) ? `${words} (${S('dbExample')})` : words;
  const planWords = () => {
    if (!gp.planSaved || !gp.plan) return S('dbNoPlan');
    if (gp.plan === 'folgOpp') return S('dbPlanFollow');
    if (gp.secondReferral === 'sent') return S('dbPlanReferSent');
    if (gp.secondReferral === 'draft') return S('dbPlanReferDraft');
    return S('dbPlanRefer');
  };
  if (viewer === 'gp') {
    let beslutning: string;
    if (caseId === 'astrid') beslutning = gp.messages.some((m) => m.kind === 'question') ? S('dbAsked') : gp.skippedMessage ? S('dbNotAsked') : S('dbNone');
    else if (caseId === 'erlend') beslutning = gp.referral === 'sent' ? S('dbSent') : gp.referral === 'draft' ? S('dbDraft') : S('dbNone');
    else if (gp.referral === 'sent') beslutning = S('dbReferSent');
    else if (gp.referral === 'draft') beslutning = S('dbReferDraft');
    else if (gp.decisionSaved && gp.decision === 'behold') beslutning = S('dbHold');
    // «Henvis» is saved before the referral is written (r9F-04).
    else if (gp.decisionSaved && gp.decision === 'henvis') beslutning = S('dbReferNotSent');
    else beslutning = S('dbNone');
    const trygghet = gp.confidence ? lower(t(vocab.confidence[gp.confidence])) : S('dbNotChosen');
    const plassering =
      gp.placement === undefined ? S('dbNotPlaced') : gp.placementFirst !== undefined && gp.placementFirst !== gp.placement ? S('dbPlacedMoved') : S('dbPlacedFirst');
    // «Utfall» in the lead carries DPS's assessment and the GP's plan; the rows give each its own line, so the GP's act is
    // never read as DPS's (r10F-05).
    let vurdering: string;
    let plan = '';
    if (caseId === 'astrid') vurdering = planWords();
    else if (gpHeld(caseId, gp)) vurdering = S('dbNoReferral');
    // Nothing sent yet is not «venter på svar» (r8F-06).
    else if (gp.referral !== 'sent') vurdering = S('dbNoReferralYet');
    else if (!outcomeChain) vurdering = S('dbAwaiting');
    else {
      vurdering = outcomeChain;
      if (status.planKind === 'both') plan = planWords();
    }
    const utfall = plan ? `${vurdering}; ${plan}` : vurdering;
    return { beslutning, trygghet, utfall, vurdering, plan, plassering, svar: '' };
  }
  const own: string[] = [];
  if (dps.sent && dps.outcome) own.push(outcomeWords(dps.outcome, t));
  if (dps.finalSent && dps.finalOutcome) own.push(outcomeWords(dps.finalOutcome, t));
  // Astrid: when the GP side was played without a question, there was nothing to answer (r6F-02).
  // A question DPS has neither answered nor chosen not to answer is still pending, not «ble stående» (r8F-02).
  const astridUtfall = status.thread.gpSkipped
    ? S('dbNoQuestion')
    : dps.answerSent
      ? S('dbAnswered')
      : dps.answerSkipped
        ? S('dbNotAnswered')
        : S('dbNotYetAnswered');
  const utfall = caseId === 'astrid' ? astridUtfall : own.length === 0 ? S('dbNone') : own.length === 1 ? own[0] : S('dbThen', { a: own[0], b: own[1] });
  // A referral the GP side sent without placing the case carries no GP marker (review mode, r9F-05).
  const noGp = received?.gpPlaced === false;
  const plassering =
    dps.placement === undefined
      ? S('dbDpsNotPlaced')
      : dps.placementFirst !== undefined && dps.placementFirst !== dps.placement
        ? S(noGp ? 'dbDpsPlacedMovedNoGp' : 'dbDpsPlacedMoved')
        : S(noGp ? 'dbDpsPlacedFirstNoGp' : 'dbDpsPlacedFirst');
  const svar = dps.answerSent ? S('dbDpsAnsweredThread') : dps.answerSkipped ? S('dbDpsNotAnsweredThread') : S('dbDpsPendingThread');
  return { beslutning: '', trygghet: received?.confidence ?? '', utfall, vurdering: utfall, plan: '', plassering, svar };
}

function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '');
}

export function DebriefPage({ caseId }: { caseId: CaseId }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const work = useWork();
  const status = useCaseStatus(caseId);
  const c = cases[caseId];
  const gp = work.gp(caseId);
  const dps = work.dps(caseId);
  const viewer = work.viewer;
  const debrief = viewer === 'gp' ? c.debrief.gp : c.debrief.dps;
  const phase = work.phase(caseId);
  useEffect(() => {
    // Study: arriving at the summary of a finished case moves the case to its summary phase.
    if (work.mode === 'study' && phase === 'reply') work.toSummary(caseId);
  }, [work, phase, caseId]);
  if (!debrief) return null;
  const received = viewer === 'dps' && c.dps ? receivedReferral(caseId, work, t) : null;
  const words: Record<string, string> = {
    ...debriefWords(
      caseId,
      viewer,
      status,
      gp,
      dps,
      received ? { confidence: received.confidence ? lower(t(vocab.confidence[received.confidence])) : s('dbNotChosen'), gpPlaced: received.placement !== undefined } : null,
      t,
      s,
    ),
  };
  if (viewer === 'dps' && caseId === 'astrid') {
    // The question the GP side asked: the played one in review mode, otherwise the scripted one.
    const gpPlayed = work.mode === 'review' && work.played('gp', caseId);
    const playedQ = gpPlayed ? gp.messages.find((m) => m.kind === 'question') : undefined;
    const date = playedQ?.date ?? c.dps?.gpScript.question?.date;
    words.sporsmal = gpPlayed && !playedQ ? s('gpAskedNothing') : date ? s('dbGpAsked', { date: formatDate(date, lang) }) : '';
    if (gpPlayed && !playedQ) words.svar = '';
  }
  const reading = viewer === 'gp' ? c.gp.systemReading : c.dps?.systemReading;
  const own = viewer === 'gp' ? gp.placement : dps.placement;
  let other: { role: 'gp' | 'dps'; value: number } | undefined;
  if (viewer === 'gp' && status.referralSent && !gpHeld(caseId, gp) && caseId !== 'astrid') {
    const dpsValue = work.mode === 'review' && work.played('dps', caseId) ? dps.placement : c.gp.dpsScript.placement;
    if (dpsValue !== undefined && !work.held(caseId)) other = { role: 'dps', value: dpsValue };
  }
  if (viewer === 'dps' && received?.placement !== undefined) other = { role: 'gp', value: received.placement };
  const showBand = !!reading && (own !== undefined || other !== undefined);
  // The caption shows only where a row rests on an example (r8F-06): on the GP side, an example in the thread; on the
  // DPS side, a GP side nobody played, or a referral the GP side kept, so that DPS reads the example one (r8F-03).
  let caption: StringKey | null = null;
  if (work.mode === 'review' && c.dps) {
    if (viewer === 'gp') caption = status.thread.messages.some((m) => m.example) ? 'dbOtherUnplayedDps' : null;
    else if (!work.played('gp', caseId)) caption = 'dbOtherUnplayedGp';
    else if (caseId !== 'astrid' && gp.referral !== 'sent') caption = 'dbGpKeptReferral';
  }
  const pos = (v: number) => s(positionKey(v));
  const mentioned =
    viewer === 'gp'
      ? caseId === 'astrid'
        ? null
        : gp.referral === 'sent'
          ? referralCriteria(draftSections(caseId, gp, t)).length
          : null
      : received?.mentioned.length ?? null;
  const rows: { label: string; value: string }[] = [];
  if (viewer === 'gp') {
    rows.push({ label: s('gpDecision'), value: capital(words.beslutning) });
    if (caseId !== 'astrid') rows.push({ label: s('gpConfidence'), value: capital(words.trygghet) });
    rows.push({ label: caseId === 'astrid' ? s('dbRowGpPlan') : s('dpsAssessment'), value: capital(words.vurdering) });
    // The thread is part of what happened: the GP's reply to DPS's request, or DPS's answer to Astrid's question
    // (r5F-04), as the thread shows it; an answer nobody played is an example reply (r6F-02).
    const thread = status.thread;
    const own = (m: { from: string; scripted?: boolean; example?: boolean }) => m.from === 'gp' && !m.scripted && !m.example;
    if (caseId === 'astrid' && thread.messages.some((m) => own(m) && m.outcome === 'question')) {
      const answer = thread.messages.find((m) => m.from === 'dps' && m.outcome === 'answer');
      if (answer) rows.push({ label: s('dbRowDpsAnswer'), value: answer.example ? `${s('dbRowAnswered')} (${s('dbExample')})` : s('dbRowAnswered') });
      else if (thread.dpsSkipped) rows.push({ label: s('dbRowDpsAnswer'), value: s('dbRowNotAnswered') });
    } else if (caseId !== 'astrid' && thread.messages.some((m) => m.from === 'dps' && m.outcome === 'info')) {
      const replied = thread.messages.some((m) => own(m) && m.outcome === 'reply');
      if (replied || thread.gpSkipped) rows.push({ label: s('dbRowGpReply'), value: replied ? s('dbRowReplied') : s('dbRowNotReplied') });
    }
    if (caseId !== 'astrid' && words.plan) rows.push({ label: s('dbRowGpPlan'), value: capital(words.plan) });
  } else if (caseId === 'astrid') {
    // V4 never had a GP confidence: the referral came before ATLAS (no row rather than «Ikke valgt»). The GP's question
    // and DPS's answer are a fact about each side, each in its own row, not a DPS assessment (r7F-02, r7A-11).
    const q = status.thread.messages.find((m) => m.from === 'gp' && m.outcome === 'question');
    const sent = q ? s('sentOn', { date: formatDate(q.date, lang) }) : '';
    rows.push({ label: s('dbRowGpQuestion'), value: !q ? s('dbRowNone') : q.example ? `${sent} (${s('dbExampleQuestion')})` : sent });
    if (q) rows.push({ label: s('dbRowAnswerToGp'), value: dps.answerSent ? s('dbRowAnswered') : dps.answerSkipped ? s('dbRowNotAnswered') : s('dbRowNotYet') });
  } else {
    // What rests on an example says so in its row: the example referral's confidence, and a choice made after the GP's
    // example reply (G-12, r10F-07).
    const exampleMark = received?.example ? ` (${s('dbExampleMark')})` : '';
    const afterExample = dps.finalSent && status.thread.messages.some((m) => m.from === 'gp' && m.example && m.outcome === 'reply');
    rows.push({ label: s('gpConfidence'), value: `${capital(words.trygghet)}${exampleMark}` });
    rows.push({ label: s('dpsAssessment'), value: `${capital(words.utfall)}${afterExample ? ` (${s('dbAfterExampleReply')})` : ''}` });
  }
  // After «Henvis på nytt» there are two referrals: each count says which it is (r10F-05, r10A-04).
  const hasSecond = viewer === 'gp' && caseId !== 'astrid' && !!gp.secondReferral;
  if (mentioned !== null) {
    rows.push({
      label: s(hasSecond ? 'dbMentionedFirst' : 'mentionedInReferral'),
      value: `${s('guideCount', { n: mentioned })}${viewer === 'dps' && received?.example ? ` (${s('dbExampleMark')})` : ''}`,
    });
    if (hasSecond && gp.secondReferral === 'sent')
      rows.push({ label: s('dbMentionedNew'), value: s('guideCount', { n: referralCriteria(draftSections(caseId, gp, t, true)).length }) });
  }
  const sentence = (
    <span>
      {own !== undefined ? s('bandOwnSentence', { pos: pos(own) }) : s('bandNotPlaced')}
      {other ? ` ${s(other.role === 'gp' ? 'bandOtherSentenceGp' : 'bandOtherSentenceDps', { pos: pos(other.value) })}` : ''}
      {reading ? ` ${s('bandSystemSentence', { pos: pos(reading.placement) })}` : ''}
    </span>
  );
  return (
    <GuidePage>
      <OtherSideButton caseId={caseId} view="oppsummering" />
      <Eyebrow>
        {s('debrief')} · {s('patientAge', { name: c.patient.name, age: c.patient.age })}
      </Eyebrow>
      <PageHeading title={s('debrief')} guide>
        {/* The title follows the same state as the text below it: no answer sent, no «svar» in the title (R2V-07, r4F-06);
            «Tre plasseringer» only when all three markers are there (r5F-06). */}
        {viewer === 'dps' && caseId === 'astrid' && !dps.answerSent
          ? status.thread.gpSkipped
            ? s('dbDpsAstridNoQuestionTitle')
            : dps.answerSkipped
              ? s('dbDpsAstridSkippedTitle')
              : s('dbDpsAstridPendingTitle')
          : viewer === 'dps' && caseId !== 'astrid' && (own === undefined || other === undefined || !reading)
            ? s('dbTitlePlacements')
            : t(debrief.title)}
      </PageHeading>
      {/* Review mode: what rests on the other side's example is marked once, under the title (r7F-04). */}
      {caption && (
        <p className={cls.reason} data-muted="">
          {s(caption)}
        </p>
      )}
      <Lead>{fill(t(debrief.whatHappened), words)}</Lead>
      {showBand && (
        <div className={cls.bandBox}>
          <h2 className={cls.h2} style={{ marginBottom: 8 }}>
            {s('placements')}
          </h2>
          <UncertaintyBand own={own} other={other} system={reading!.placement} legend sentence={sentence} />
        </div>
      )}
      <div className={cls.bandBox}>
        <Rows rows={rows} />
      </div>
      {work.mode === 'review' && work.notes && (
        <p className={cls.purpose}>
          <strong>{s('casePurpose')}:</strong> {t(debrief.purpose)}
        </p>
      )}
      <DesignNote id="oppsummering" show={work.notes} />
      <Actions>
        <SheenButton icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => work.finishCase(caseId)}>
          {work.mode === 'study' ? s('goToNextStep') : s('backToList')}
        </SheenButton>
      </Actions>
    </GuidePage>
  );
}

function capital(x: string): string {
  return x ? x.charAt(0).toUpperCase() + x.slice(1) : x;
}
