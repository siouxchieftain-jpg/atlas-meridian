import { describe, expect, it } from 'vitest';
import { deriveThread, nextMessageDate, type ThreadInput } from '../../src/engine/thread';
import { DPS_TODAY, GP_TODAY } from '../../src/engine/clock';
import { cases } from '../../src/content';
import type { CaseId } from '../../src/content/types';
import { clearedDps, dpsHasWork, emptyDps, emptyGp, type DpsWork, type GpWork } from '../../src/state/types';

function input(caseId: CaseId, over: Partial<Omit<ThreadInput, 'gp' | 'dps'>> & { gp?: Partial<GpWork>; dps?: Partial<DpsWork> } = {}): ThreadInput {
  const { gp, dps, ...rest } = over;
  return {
    caseId,
    content: cases[caseId],
    viewer: 'gp',
    mode: 'study',
    gpPlayed: false,
    dpsPlayed: false,
    held: false,
    ...rest,
    gp: { ...emptyGp(), ...gp },
    dps: { ...emptyDps(), ...dps },
  };
}
const ids = (t: ReturnType<typeof deriveThread>) => t.messages.map((m) => m.id);
const reply = (text: string) => ({ id: 'm1', from: 'gp' as const, date: '2026-03-23', text, kind: 'reply' as const });
const question = (text: string) => ({ id: 'q1', from: 'gp' as const, date: GP_TODAY, text, kind: 'question' as const });

describe('Kari and Erlend, the GP viewer (study)', () => {
  it('has no thread before the referral is sent', () => {
    const t = deriveThread(input('kari'));
    expect(t.messages).toEqual([]);
    expect(t.ended).toBe(false);
  });

  it('holds the reply from DPS until the last form page is sent', () => {
    const t = deriveThread(input('kari', { held: true, gp: { referral: 'sent' } }));
    expect(ids(t)).toEqual(['referral']);
    expect(t.heldReply).toBe(true);
  });

  it('shows the scripted request and waits for the GP, then the grant after a reply or a skip', () => {
    const waiting = deriveThread(input('kari', { gp: { referral: 'sent' } }));
    expect(ids(waiting)).toEqual(['referral', 'dps-request']);
    expect(waiting.awaiting).toBe('gpReply');
    expect(waiting.messages[1]).toMatchObject({ scripted: true, example: false, outcome: 'info' });

    const replied = deriveThread(input('kari', { gp: { referral: 'sent', messages: [reply('Søvnen er bedre.')] } }));
    expect(ids(replied)).toEqual(['referral', 'dps-request', 'm1', 'dps-grant']);
    expect(replied.ended).toBe(true);

    // «Ikke svar nå» is an event in the thread, where it happened (r7F-03, r7A-08).
    const skipped = deriveThread(input('kari', { gp: { referral: 'sent', skippedMessage: true } }));
    expect(ids(skipped)).toEqual(['referral', 'dps-request', 'gp-skip-reply', 'dps-grant']);
    expect(skipped.messages[2]).toMatchObject({ outcome: 'skip', from: 'gp' });
  });

  it('gives Erlend the grant straight away, with its structured reasons', () => {
    const t = deriveThread(input('erlend', { gp: { referral: 'sent' } }));
    expect(ids(t)).toEqual(['referral', 'dps-grant']);
    expect(t.messages[1].reasonLines?.length).toBeGreaterThan(0);
    expect(t.ended).toBe(true);
  });
});

describe('Kari, the GP viewer (review)', () => {
  it('marks the scripted DPS side as an example when nobody has played it', () => {
    const t = deriveThread(input('kari', { mode: 'review', gpPlayed: true, gp: { referral: 'sent', skippedMessage: true } }));
    const dps = t.messages.filter((m) => m.from === 'dps');
    expect(dps.length).toBe(2);
    for (const m of dps) expect(m).toMatchObject({ example: true, scripted: false });
  });

  it('shows the played DPS question, then waits for the played DPS side instead of an example grant (SV-12)', () => {
    const dps = { sent: true, outcome: 'info' as const, question: 'Hvordan er søvnen nå?', sentDate: DPS_TODAY };
    const waiting = deriveThread(input('kari', { mode: 'review', gpPlayed: true, dpsPlayed: true, gp: { referral: 'sent' }, dps }));
    expect(ids(waiting)).toEqual(['referral', 'dps-1']);
    expect(waiting.messages[1]).toMatchObject({ text: 'Hvordan er søvnen nå?', example: false });
    expect(waiting.awaiting).toBe('gpReply');

    // DPS has been played but has not made its final choice: no scripted voice joins the played thread.
    const replied = deriveThread(input('kari', { mode: 'review', gpPlayed: true, dpsPlayed: true, gp: { referral: 'sent', messages: [reply('Bedre.')] }, dps }));
    expect(ids(replied)).toEqual(['referral', 'dps-1', 'm1']);
    expect(replied.waitingOther).toBe(true);
    expect(replied.messages.some((m) => m.example)).toBe(false);
  });
});

describe('Kari, the DPS viewer', () => {
  it('starts with the scripted referral and nothing else until the assessment is sent', () => {
    const t = deriveThread(input('kari', { viewer: 'dps' }));
    expect(ids(t)).toEqual(['referral']);
    expect(t.messages[0].scripted).toBe(true);
  });

  it('after «Be om mer informasjon»: the GP reply (held, then shown), and the final choice is awaited', () => {
    const dps = { sent: true, outcome: 'info' as const, question: 'Hvordan er søvnen?' };
    const held = deriveThread(input('kari', { viewer: 'dps', held: true, dps }));
    expect(ids(held)).toEqual(['referral', 'dps-1']);
    expect(held.heldReply).toBe(true);

    const open = deriveThread(input('kari', { viewer: 'dps', dps }));
    expect(ids(open)).toEqual(['referral', 'dps-1', 'gp-reply-script']);
    expect(open.awaiting).toBe('dpsFinal');

    const final = deriveThread(input('kari', { viewer: 'dps', dps: { ...dps, finalSent: true, finalOutcome: 'rett' } }));
    expect(ids(final)).toEqual(['referral', 'dps-1', 'gp-reply-script', 'dps-2']);
    expect(final.ended).toBe(true);
  });

  it('after «Retur med råd»: the GP acknowledges; after «Rett til helsehjelp»: the loop ends', () => {
    const retur = deriveThread(input('kari', { viewer: 'dps', dps: { sent: true, outcome: 'retur', reasons: ['utilstrekkeligInfo'], explanation: 'Mangler', advice: 'Beskriv' } }));
    expect(ids(retur)).toEqual(['referral', 'dps-1', 'gp-ack-script']);
    expect(retur.messages[1]).toMatchObject({ outcome: 'retur', explanation: 'Mangler', advice: 'Beskriv' });
    expect(retur.ended).toBe(true);

    const rett = deriveThread(input('kari', { viewer: 'dps', dps: { sent: true, outcome: 'rett' } }));
    expect(ids(rett)).toEqual(['referral', 'dps-1']);
    expect(rett.ended).toBe(true);
  });
});

describe('Astrid', () => {
  it('GP: the structured return, then the question (or a skip), then the answer held until the form is sent', () => {
    const waiting = deriveThread(input('astrid'));
    expect(ids(waiting)).toEqual(['referral', 'dps-return']);
    expect(waiting.messages[1].structured).toBeDefined();
    expect(waiting.awaiting).toBe('gpQuestion');

    const held = deriveThread(input('astrid', { held: true, gp: { messages: [question('Hva manglet?')] } }));
    expect(ids(held)).toEqual(['referral', 'dps-return', 'q1']);
    expect(held.heldReply).toBe(true);

    const answered = deriveThread(input('astrid', { gp: { messages: [question('Hva manglet?')] } }));
    expect(ids(answered)).toEqual(['referral', 'dps-return', 'q1', 'dps-answer-script']);

    const skipped = deriveThread(input('astrid', { gp: { skippedMessage: true } }));
    expect(ids(skipped)).toEqual(['referral', 'dps-return', 'gp-skip-question']);
    expect(skipped.ended).toBe(true);
  });

  it('DPS: the scripted question is answered or skipped', () => {
    const waiting = deriveThread(input('astrid', { viewer: 'dps' }));
    expect(ids(waiting)).toEqual(['referral', 'dps-return', 'gp-question-script']);
    expect(waiting.awaiting).toBe('dpsAnswer');

    const answered = deriveThread(input('astrid', { viewer: 'dps', dps: { answer: 'Mønsteret over tid.', answerSent: true } }));
    expect(ids(answered)).toEqual(['referral', 'dps-return', 'gp-question-script', 'dps-answer']);

    const skipped = deriveThread(input('astrid', { viewer: 'dps', dps: { answerSkipped: true } }));
    expect(skipped.ended).toBe(true);
    expect(ids(skipped)).toEqual(['referral', 'dps-return', 'gp-question-script', 'dps-skip-answer']);
  });

  it('DPS, review: the GP side played «Ikke spør nå», so the thread says so where it happened and asks DPS nothing (r7F-02)', () => {
    const t = deriveThread(input('astrid', { viewer: 'dps', mode: 'review', gpPlayed: true, gp: { skippedMessage: true } }));
    expect(ids(t)).toEqual(['referral', 'dps-return', 'gp-skip-question']);
    expect(t.gpSkipped).toBe(true);
    expect(t.awaiting).toBeNull();
  });
});

describe('a skip stays where it happened, and a played side is never mixed with an example (r7F-03)', () => {
  const request = { sent: true, outcome: 'info' as const, question: 'Hvordan er søvnen?', sentDate: '2026-03-18' };

  it('DPS reads «Fastlegen svarte ikke» under its own request, before its later choice', () => {
    const t = deriveThread(
      input('kari', {
        viewer: 'dps',
        mode: 'review',
        gpPlayed: true,
        dpsPlayed: true,
        gp: { referral: 'sent', skippedMessage: true },
        dps: { ...request, finalSent: true, finalOutcome: 'retur', finalDate: '2026-03-20', finalReasons: [], finalExplanation: 'x', finalAdvice: 'y' },
      }),
    );
    expect(ids(t)).toEqual(['referral', 'dps-1', 'gp-skip-reply', 'dps-2']);
  });

  it('shows no example receipt once the GP side is played', () => {
    const base = {
      viewer: 'dps' as const,
      mode: 'review' as const,
      dpsPlayed: true,
      gp: { referral: 'sent' as const },
      dps: { sent: true, outcome: 'retur' as const, sentDate: '2026-03-18', reasons: [], explanation: 'x', advice: 'y' },
    };
    expect(ids(deriveThread(input('kari', { ...base, gpPlayed: false })))).toContain('gp-ack-script');
    expect(ids(deriveThread(input('kari', { ...base, gpPlayed: true })))).not.toContain('gp-ack-script');
  });
});

describe('review: DPS never answers a played GP side with an example, and DPS work on the example referral goes (r8F-01)', () => {
  const request = { sent: true, outcome: 'info' as const, question: 'Bruker hun alkohol?', sentDate: '2026-03-18' };

  it('shows DPS no example reply and no final choice while the played GP side has not replied', () => {
    for (const caseId of ['kari', 'erlend'] as const) {
      const t = deriveThread(input(caseId, { viewer: 'dps', mode: 'review', gpPlayed: true, dpsPlayed: true, gp: { referral: 'sent' }, dps: request }));
      expect(ids(t), caseId).toEqual(['referral', 'dps-1']);
      expect(t.awaiting, caseId).toBeNull();
      expect(t.waitingOther, caseId).toBe(true);
      expect(t.messages.some((m) => m.example), caseId).toBe(false);
    }
  });

  it('lets the example reply stand in when the GP side kept the referral, so DPS read the example one', () => {
    const t = deriveThread(input('kari', { viewer: 'dps', mode: 'review', gpPlayed: true, dpsPlayed: true, gp: { decisionSaved: true, decision: 'behold' }, dps: request }));
    expect(ids(t)).toEqual(['referral', 'dps-1', 'gp-reply-script']);
    expect(t.messages[2].example).toBe(true);
    expect(t.awaiting).toBe('dpsFinal');
  });

  it('clears every DPS field, so an update that merges leaves no assessment behind', () => {
    const worked: DpsWork = { ...emptyDps(), ...request, placement: 4, placementFirst: 3, reasons: ['r1' as never], finalSent: true, finalOutcome: 'rett', finalDate: '2026-03-20' };
    expect(dpsHasWork(worked)).toBe(true);
    expect(dpsHasWork({ ...emptyDps(), placement: 2 })).toBe(true);
    expect(dpsHasWork(emptyDps())).toBe(false);
    const merged = { ...worked, ...clearedDps() };
    expect(dpsHasWork(merged)).toBe(false);
    expect(merged.placement).toBeUndefined();
    expect(merged.placementFirst).toBeUndefined();
    expect(merged.finalOutcome).toBeUndefined();
  });
});

describe('review: the DPS thread says that the played GP side sent a new referral, which the prototype does not follow (r10F-06)', () => {
  const ret = { sent: true, outcome: 'retur' as const, reasons: ['kortVarighet' as const], explanation: 'Kort varighet', advice: 'Følg opp', sentDate: DPS_TODAY };
  it('adds the event after the return, dated when the GP side sent it', () => {
    const t = deriveThread(
      input('kari', {
        viewer: 'dps',
        mode: 'review',
        gpPlayed: true,
        dpsPlayed: true,
        gp: { referral: 'sent', plan: 'henvisPaNytt', planSaved: true, secondReferral: 'sent', secondReferralDate: '2026-03-21' },
        dps: ret,
      }),
    );
    expect(ids(t).at(-1)).toBe('gp-new-referral');
    expect(t.messages.at(-1)).toMatchObject({ outcome: 'newReferral', from: 'gp', date: '2026-03-21' });
  });

  it('adds nothing to a draft, to the GP side’s own thread, or in the study', () => {
    const base = { gpPlayed: true, dpsPlayed: true, dps: ret };
    const gp = { referral: 'sent' as const, plan: 'henvisPaNytt' as const, planSaved: true };
    const none = (t: ReturnType<typeof deriveThread>) => expect(ids(t)).not.toContain('gp-new-referral');
    none(deriveThread(input('kari', { ...base, viewer: 'dps', mode: 'review', gp: { ...gp, secondReferral: 'draft' } })));
    none(deriveThread(input('kari', { ...base, viewer: 'gp', mode: 'review', gp: { ...gp, secondReferral: 'sent' } })));
    none(deriveThread(input('kari', { ...base, viewer: 'dps', mode: 'study', gp: { ...gp, secondReferral: 'sent' } })));
  });
});

describe('cases without a thread', () => {
  it('has none for Torbjørn and the practice case', () => {
    for (const id of ['torbjorn', 'sofie'] as const) {
      const t = deriveThread(input(id, { gp: { referral: 'sent' } }));
      expect(t.messages).toEqual([]);
      expect(t.ended).toBe(true);
    }
  });
});

describe('the date of a new message', () => {
  it('is today for the role, or later if the thread already runs later', () => {
    expect(nextMessageDate('gp', [])).toBe(GP_TODAY);
    expect(nextMessageDate('dps', [])).toBe(DPS_TODAY);
    const later = deriveThread(input('kari', { gp: { referral: 'sent' } })).messages;
    expect(nextMessageDate('gp', later)).toBe(cases.kari.gp.dpsScript.request!.date);
  });
});
