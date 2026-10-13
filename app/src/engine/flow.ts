import type { CaseContent, CaseId, Role } from '../content/types';
import type { CasePhase, DpsWork, GpWork } from '../state/types';
import { deriveThread, type ThreadOutput } from './thread';

/**
 * Where a case stands, for either role, in either mode. Pure functions, so the
 * branch rules (Appendix C2) are testable without the interface.
 */
export type CaseView = 'orientering' | 'konsultasjon' | 'henvisning' | 'vurdering' | 'sendt' | 'dialog' | 'plan' | 'oppsummering';

export type PlanKind = 'both' | 'gpOnly' | null;

export interface CaseStatusInput {
  caseId: CaseId;
  content: CaseContent;
  viewer: Role;
  mode: 'study' | 'review';
  gp: GpWork;
  dps: DpsWork;
  gpPlayed: boolean;
  dpsPlayed: boolean;
  held: boolean;
  phase: CasePhase;
  withoutAtlas: boolean;
}

export interface CaseStatus {
  thread: ThreadOutput;
  /** The participant's own decision on the case is done (Appendix A (3)). */
  ownDone: boolean;
  /** «Din plan»: after «Retur med råd» both plans; after Behold or a kept draft, a plan in general practice only. */
  planKind: PlanKind;
  /** The case can go to its summary. */
  complete: boolean;
  /** The view a participant continues to. */
  next: CaseView;
  /** A referral was sent (GP side) in this case. */
  referralSent: boolean;
}

/** The GP decided to keep the patient in general practice (Behold, or a kept draft), so no referral is sent. */
export function gpHeld(caseId: CaseId, gp: GpWork): boolean {
  if (caseId === 'astrid') return false;
  if (gp.decisionSaved && gp.decision === 'behold') return true;
  return gp.referral === 'draft';
}

export function gpOwnDone(caseId: CaseId, gp: GpWork): boolean {
  switch (caseId) {
    case 'astrid':
      return gp.messages.some((m) => m.kind === 'question') || gp.skippedMessage === true;
    case 'erlend':
      return gp.referral === 'sent' || gp.referral === 'draft';
    default:
      if (gp.decisionSaved && gp.decision === 'behold') return true;
      return gp.referral === 'sent' || gp.referral === 'draft';
  }
}

/**
 * The GP's judgements become read-only once the referral is sent, or once the
 * case's form is sent after the GP's own decision. A form sent before «Vis
 * ATLAS» leaves the ATLAS work open (Appendix A (4)).
 */
export function gpLocked(caseId: CaseId, gp: GpWork, formSent: boolean): boolean {
  if (gp.referral === 'sent') return true;
  return formSent && gpOwnDone(caseId, gp);
}

export function dpsOwnDone(caseId: CaseId, dps: DpsWork): boolean {
  if (caseId === 'astrid') return dps.answerSent === true || dps.answerSkipped === true;
  return dps.sent === true;
}

/** A structured return from DPS sits in this GP thread (Astrid always; Kari and Erlend when a played DPS returned). */
function returnInThread(thread: ThreadOutput): boolean {
  return thread.messages.some((m) => m.from === 'dps' && m.outcome === 'retur');
}

export function caseStatus(input: CaseStatusInput): CaseStatus {
  const { caseId, content, viewer, mode, gp, dps, gpPlayed, dpsPlayed, held, phase, withoutAtlas } = input;
  const thread = deriveThread({ caseId, content, viewer, mode, gp, dps, gpPlayed, dpsPlayed, held });
  if (viewer === 'gp') {
    const ownDone = gpOwnDone(caseId, gp);
    const referralSent = caseId === 'astrid' ? true : gp.referral === 'sent';
    let planKind: PlanKind = null;
    if (ownDone) {
      if (caseId === 'astrid' || returnInThread(thread)) planKind = 'both';
      else if (gpHeld(caseId, gp)) planKind = 'gpOnly';
    }
    const planDone =
      planKind === null ||
      (gp.planSaved === true && (gp.plan !== 'henvisPaNytt' || gp.secondReferral === 'sent' || gp.secondReferral === 'draft'));
    const threadDone = !referralSent || gpHeld(caseId, gp) || thread.ended;
    const complete = ownDone && !held && threadDone && planDone;
    let next: CaseView;
    if (phase === 'briefing') next = 'orientering';
    else if (withoutAtlas) next = 'konsultasjon';
    else if (!ownDone) {
      if (caseId === 'erlend') next = 'henvisning';
      else if (caseId !== 'astrid' && gp.decisionSaved && gp.decision === 'henvis') next = 'henvisning';
      else next = 'konsultasjon';
    } else if (held) {
      if (caseId === 'astrid') next = gp.messages.some((m) => m.kind === 'question') ? 'sendt' : 'konsultasjon';
      else next = gp.referral === 'sent' ? 'sendt' : caseId === 'erlend' ? 'henvisning' : 'konsultasjon';
    } else if (gp.planSaved && gp.plan === 'henvisPaNytt' && !!gp.secondReferral) {
      // The new referral ends the case: the summary is next (R2GP-01, G-07), in every case that has one (r10A-07).
      next = 'oppsummering';
    } else if (referralSent && !gpHeld(caseId, gp) && (!thread.ended || (phase === 'reply' && thread.messages.some((m) => m.from === 'dps' && m.outcome !== 'skip')))) {
      // The reply from DPS is read in the dialogue before the plan or the summary.
      next = planKind && !gp.planSaved && caseId !== 'astrid' && !returnInThread(thread) ? 'plan' : 'dialog';
    }
    else if (planKind && !gp.planSaved) next = caseId === 'astrid' || returnInThread(thread) ? 'dialog' : 'plan';
    else if (planKind && gp.plan === 'henvisPaNytt' && !planDone) next = 'henvisning';
    else next = 'oppsummering';
    return { thread, ownDone, planKind, complete, next, referralSent };
  }
  // DPS side.
  const ownDone = dpsOwnDone(caseId, dps);
  const complete = ownDone && !held && thread.ended;
  let next: CaseView;
  if (phase === 'briefing') next = 'orientering';
  else if (withoutAtlas || !ownDone) next = 'vurdering';
  else if (held) next = caseId === 'astrid' && !dps.answerSent ? 'vurdering' : 'sendt';
  else if (!thread.ended) next = 'dialog';
  else if (phase === 'reply' && thread.messages.some((m) => m.from === 'gp' && (m.outcome === 'reply' || m.outcome === 'ack'))) next = 'dialog';
  else next = 'oppsummering';
  return { thread, ownDone, planKind: null, complete, next, referralSent: true };
}

/**
 * Which views a study participant may open in a phase. A view that is not
 * allowed redirects to the phase's own view, so an edited address cannot skip
 * ahead (Analysis check 10).
 */
export function viewAllowed(view: CaseView, viewer: Role, caseId: CaseId, phase: CasePhase, status: CaseStatus, gp: GpWork): boolean {
  if (view === 'orientering') return true;
  if (phase === 'briefing') return false;
  const order: CasePhase[] = ['briefing', 'uten', 'atlas', 'page2', 'reply', 'debrief', 'done'];
  const at = (p: CasePhase) => order.indexOf(phase) >= order.indexOf(p);
  if (viewer === 'gp') {
    switch (view) {
      case 'konsultasjon':
        return at('uten');
      case 'henvisning':
        if (!at('atlas')) return false;
        if (caseId === 'astrid') return gp.plan === 'henvisPaNytt' && gp.planSaved === true;
        if (caseId === 'erlend') return true;
        return gp.decision === 'henvis' && gp.decisionSaved === true;
      case 'sendt':
        return at('atlas') && (status.referralSent && caseId !== 'astrid' ? gp.referral === 'sent' : gp.messages.some((m) => m.kind === 'question') || gp.secondReferral === 'sent');
      case 'dialog':
        return at('reply');
      case 'plan':
        return at('reply') && status.planKind !== null;
      case 'oppsummering':
        return at('debrief') || (at('reply') && status.complete);
      default:
        return false;
    }
  }
  switch (view) {
    case 'vurdering':
      return at('uten');
    case 'sendt':
      return at('atlas') && status.ownDone;
    case 'dialog':
      return at('reply');
    case 'oppsummering':
      return at('debrief') || (at('reply') && status.complete);
    default:
      return false;
  }
}
