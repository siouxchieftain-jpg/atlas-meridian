import { describe, expect, it } from 'vitest';
import { caseStatus, gpHeld, gpLocked, gpOwnDone, viewAllowed, type CaseStatusInput } from '../../src/engine/flow';
import { DPS_TODAY, GP_TODAY } from '../../src/engine/clock';
import { cases } from '../../src/content';
import type { CaseId } from '../../src/content/types';
import { emptyDps, emptyGp, type CasePhase, type DpsWork, type GpWork } from '../../src/state/types';

type Over = Partial<Omit<CaseStatusInput, 'gp' | 'dps'>> & { gp?: Partial<GpWork>; dps?: Partial<DpsWork> };
function st(caseId: CaseId, over: Over = {}) {
  const { gp, dps, ...rest } = over;
  const full: CaseStatusInput = {
    caseId,
    content: cases[caseId],
    viewer: 'gp',
    mode: 'study',
    gpPlayed: true,
    dpsPlayed: false,
    held: false,
    phase: 'atlas',
    withoutAtlas: false,
    ...rest,
    gp: { ...emptyGp(), ...gp },
    dps: { ...emptyDps(), ...dps },
  };
  return { status: caseStatus(full), input: full };
}
const next = (caseId: CaseId, over: Over = {}) => st(caseId, over).status.next;
const reply = { id: 'm1', from: 'gp' as const, date: '2026-03-23', text: 'Bedre.', kind: 'reply' as const };
const question = { id: 'q1', from: 'gp' as const, date: GP_TODAY, text: 'Hva manglet?', kind: 'question' as const };

describe('GP: where a case continues', () => {
  it('opens on the briefing, then the case only, then the ATLAS view', () => {
    expect(next('kari', { phase: 'briefing' })).toBe('orientering');
    expect(next('kari', { phase: 'uten', withoutAtlas: true })).toBe('konsultasjon');
    expect(next('kari')).toBe('konsultasjon');
    expect(next('erlend')).toBe('henvisning');
    expect(next('kari', { gp: { decision: 'henvis', decisionSaved: true } })).toBe('henvisning');
  });

  it('waits on the sent page while the reply is held (page 2 not yet sent)', () => {
    expect(next('kari', { phase: 'page2', held: true, gp: { decision: 'henvis', decisionSaved: true, referral: 'sent' } })).toBe('sendt');
    expect(next('kari', { phase: 'page2', held: true, gp: { decision: 'behold', decisionSaved: true } })).toBe('konsultasjon');
    expect(next('erlend', { phase: 'page2', held: true, gp: { referral: 'draft' } })).toBe('henvisning');
    expect(next('astrid', { phase: 'page2', held: true, gp: { messages: [question] } })).toBe('sendt');
    expect(next('astrid', { phase: 'page2', held: true, gp: { skippedMessage: true } })).toBe('konsultasjon');
  });

  it('reads the reply in the dialogue, then goes to the summary at debrief', () => {
    const sent = { decision: 'henvis' as const, decisionSaved: true, referral: 'sent' as const };
    expect(next('kari', { phase: 'reply', gp: sent })).toBe('dialog');
    expect(next('kari', { phase: 'reply', gp: { ...sent, messages: [reply] } })).toBe('dialog');
    const done = st('kari', { phase: 'reply', gp: { ...sent, messages: [reply] } }).status;
    expect(done.complete).toBe(true);
    expect(next('kari', { phase: 'debrief', gp: { ...sent, messages: [reply] } })).toBe('oppsummering');
  });

  it('asks for «Din plan» after Behold or a kept draft, in general practice only', () => {
    const behold = st('kari', { phase: 'reply', gp: { decision: 'behold', decisionSaved: true } }).status;
    expect(behold.planKind).toBe('gpOnly');
    expect(behold.next).toBe('plan');
    expect(behold.referralSent).toBe(false);
    const draft = st('erlend', { phase: 'reply', gp: { referral: 'draft' } }).status;
    expect(draft.planKind).toBe('gpOnly');
    expect(draft.next).toBe('plan');
    const planned = st('erlend', { phase: 'reply', gp: { referral: 'draft', plan: 'folgOpp', planSaved: true } }).status;
    expect(planned.complete).toBe(true);
    expect(planned.next).toBe('oppsummering');
  });

  it('Astrid: both plans after the return, read in the dialogue; «Henvis på nytt» needs the second referral', () => {
    const asked = st('astrid', { phase: 'reply', gp: { messages: [question] } }).status;
    expect(asked.planKind).toBe('both');
    expect(asked.next).toBe('dialog');
    expect(asked.complete).toBe(false);
    const again = { messages: [question], plan: 'henvisPaNytt' as const, planSaved: true };
    expect(next('astrid', { phase: 'debrief', gp: again })).toBe('henvisning');
    expect(st('astrid', { phase: 'debrief', gp: { ...again, secondReferral: 'draft' } }).status.complete).toBe(true);
    expect(next('astrid', { phase: 'debrief', gp: { ...again, secondReferral: 'sent' } })).toBe('oppsummering');
    // In the phase the participant is actually in (reply), the new referral also leads to the summary (R2GP-01).
    for (const secondReferral of ['sent', 'draft'] as const) {
      const s = st('astrid', { phase: 'reply', gp: { ...again, secondReferral } }).status;
      expect(s.next, secondReferral).toBe('oppsummering');
      expect(s.complete, secondReferral).toBe(true);
    }
    const noQuestion = st('astrid', { phase: 'reply', gp: { skippedMessage: true, plan: 'henvisPaNytt', planSaved: true, secondReferral: 'sent' } }).status;
    expect(noQuestion.next).toBe('oppsummering');
  });

  it('review: a played DPS return turns Kari into a two-plan case read in the dialogue', () => {
    const s = st('kari', {
      mode: 'review',
      phase: 'reply',
      dpsPlayed: true,
      gp: { decision: 'henvis', decisionSaved: true, referral: 'sent' },
      dps: { sent: true, outcome: 'retur', reasons: ['kortVarighet'], explanation: 'Kort varighet', advice: 'Følg opp', sentDate: DPS_TODAY },
    }).status;
    expect(s.planKind).toBe('both');
    expect(s.next).toBe('dialog');
  });

  it('review: a sent or saved new referral leads Kari and Erlend to the summary, as it does Astrid (G-07, r10A-07)', () => {
    for (const caseId of ['kari', 'erlend'] as const)
      for (const secondReferral of ['sent', 'draft'] as const) {
        const s = st(caseId, {
          mode: 'review',
          phase: 'reply',
          dpsPlayed: true,
          gp: { decision: 'henvis', decisionSaved: true, referral: 'sent', plan: 'henvisPaNytt', planSaved: true, secondReferral },
          dps: { sent: true, outcome: 'retur', reasons: ['kortVarighet'], explanation: 'Kort varighet', advice: 'Følg opp', sentDate: DPS_TODAY },
        }).status;
        expect(s.next, `${caseId} ${secondReferral}`).toBe('oppsummering');
      }
  });
});

describe('DPS: where a case continues', () => {
  const dps = (over: Over = {}) => next('kari', { viewer: 'dps', ...over });
  it('assesses first, waits while held, then the dialogue and the summary', () => {
    expect(dps({ phase: 'briefing' })).toBe('orientering');
    expect(dps({ phase: 'atlas' })).toBe('vurdering');
    expect(dps({ phase: 'page2', held: true, dps: { sent: true, outcome: 'info', question: 'Søvn?' } })).toBe('sendt');
    expect(dps({ phase: 'reply', dps: { sent: true, outcome: 'info', question: 'Søvn?' } })).toBe('dialog');
    const finalDone = { sent: true, outcome: 'info' as const, question: 'Søvn?', finalSent: true, finalOutcome: 'rett' as const };
    expect(dps({ phase: 'reply', dps: finalDone })).toBe('dialog');
    expect(dps({ phase: 'debrief', dps: finalDone })).toBe('oppsummering');
    expect(dps({ phase: 'reply', dps: { sent: true, outcome: 'rett' } })).toBe('oppsummering');
  });

  it('Astrid: stays on the assessment until the answer is sent or skipped', () => {
    expect(next('astrid', { viewer: 'dps', phase: 'page2', held: true })).toBe('vurdering');
    expect(next('astrid', { viewer: 'dps', phase: 'page2', held: true, dps: { answerSent: true, answer: 'Ja.' } })).toBe('sendt');
    expect(next('astrid', { viewer: 'dps', phase: 'reply', dps: { answerSkipped: true } })).toBe('oppsummering');
  });
});

describe('views a study participant may open', () => {
  const allowed = (view: Parameters<typeof viewAllowed>[0], caseId: CaseId, phase: CasePhase, over: Over = {}) => {
    const { status, input } = st(caseId, { phase, ...over });
    return viewAllowed(view, input.viewer, caseId, phase, status, input.gp);
  };

  it('allows only the briefing during the briefing', () => {
    for (const v of ['konsultasjon', 'henvisning', 'sendt', 'dialog', 'plan', 'oppsummering'] as const) expect(allowed(v, 'kari', 'briefing'), v).toBe(false);
    expect(allowed('orientering', 'kari', 'briefing')).toBe(true);
  });

  it('opens the referral only after the decision to refer (Kari), at once for Erlend, after «Henvis på nytt» for Astrid', () => {
    expect(allowed('henvisning', 'kari', 'atlas')).toBe(false);
    expect(allowed('henvisning', 'kari', 'atlas', { gp: { decision: 'henvis', decisionSaved: true } })).toBe(true);
    expect(allowed('henvisning', 'kari', 'uten', { gp: { decision: 'henvis', decisionSaved: true } })).toBe(false);
    expect(allowed('henvisning', 'erlend', 'atlas')).toBe(true);
    expect(allowed('henvisning', 'astrid', 'reply', { gp: { messages: [question] } })).toBe(false);
    expect(allowed('henvisning', 'astrid', 'reply', { gp: { messages: [question], plan: 'henvisPaNytt', planSaved: true } })).toBe(true);
  });

  it('opens the dialogue from the reply phase and the summary at debrief or when the case is complete', () => {
    const sent = { decision: 'henvis' as const, decisionSaved: true, referral: 'sent' as const };
    expect(allowed('dialog', 'kari', 'page2', { gp: sent })).toBe(false);
    expect(allowed('dialog', 'kari', 'reply', { gp: sent })).toBe(true);
    expect(allowed('oppsummering', 'kari', 'reply', { gp: sent })).toBe(false);
    expect(allowed('oppsummering', 'kari', 'reply', { gp: { ...sent, messages: [reply] } })).toBe(true);
    expect(allowed('oppsummering', 'kari', 'debrief', { gp: sent })).toBe(true);
  });

  it('DPS: the sent page only after the own assessment', () => {
    expect(allowed('sendt', 'kari', 'atlas', { viewer: 'dps' })).toBe(false);
    expect(allowed('sendt', 'kari', 'atlas', { viewer: 'dps', dps: { sent: true, outcome: 'rett' } })).toBe(true);
    expect(allowed('konsultasjon', 'kari', 'atlas', { viewer: 'dps' })).toBe(false);
  });
});

describe('own decision and locking', () => {
  it('counts the decision per case', () => {
    expect(gpOwnDone('kari', { ...emptyGp(), decision: 'behold', decisionSaved: true })).toBe(true);
    expect(gpOwnDone('kari', { ...emptyGp(), decision: 'henvis', decisionSaved: true })).toBe(false);
    expect(gpOwnDone('erlend', { ...emptyGp(), referral: 'draft' })).toBe(true);
    expect(gpOwnDone('astrid', { ...emptyGp(), skippedMessage: true })).toBe(true);
    expect(gpHeld('astrid', { ...emptyGp(), referral: 'draft' })).toBe(false);
  });

  it('locks the GP work once the referral is sent, or once the form is sent after the own decision (A(4))', () => {
    expect(gpLocked('kari', { ...emptyGp(), referral: 'sent' }, false)).toBe(true);
    expect(gpLocked('kari', { ...emptyGp(), decision: 'behold', decisionSaved: true }, true)).toBe(true);
    // A form sent before «Vis ATLAS» leaves the ATLAS work open.
    expect(gpLocked('kari', emptyGp(), true)).toBe(false);
    expect(gpLocked('erlend', { ...emptyGp(), referral: 'draft' }, false)).toBe(false);
  });
});
