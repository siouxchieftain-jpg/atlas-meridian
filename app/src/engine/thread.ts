import type { CaseContent, CaseId, Outcome, ReasonId, Role, StructuredReturn, T } from '../content/types';
import type { DpsWork, GpWork } from '../state/types';
import { DPS_TODAY, GP_TODAY } from './clock';

/** One entry in a referral thread. Text is content (T) or what a person wrote (string). */
export interface ThreadMessage {
  id: string;
  from: Role;
  date: string;
  /** For example the outcome label («Be om mer informasjon»). */
  /** «skip»: a side chose «Ikke svar nå» or «Ikke spør nå»; shown as a divider where it happened (r7F-03, r7A-08). */
  /** «newReferral»: review mode, the played GP side sent a new referral after «Henvis på nytt»; a divider on the DPS side (r10F-06). */
  outcome?: Outcome | 'question' | 'answer' | 'reply' | 'ack' | 'referral' | 'skip' | 'newReferral';
  text: T | string;
  reasons?: ReasonId[];
  reasonLines?: T[];
  structured?: StructuredReturn;
  explanation?: string;
  advice?: string;
  /** Written in advance for the prototype (the other side is scripted). */
  scripted?: boolean;
  /** Review mode: a scripted reply standing in for a side nobody has played. */
  example?: boolean;
}

export interface ThreadInput {
  caseId: CaseId;
  content: CaseContent;
  viewer: Role;
  mode: 'study' | 'review';
  gp: GpWork;
  dps: DpsWork;
  /** Review mode: whether each side has been played. Study mode: the viewer's side only. */
  gpPlayed: boolean;
  dpsPlayed: boolean;
  /** Study mode: the other side's reply is held until the last form page is sent. */
  held: boolean;
}

export type ThreadAwaiting =
  | 'gpReply' // GP may reply to DPS's request (Kari, Erlend)
  | 'gpQuestion' // GP may ask about the return (Astrid)
  | 'dpsFinal' // DPS makes the final choice after the GP's reply
  | 'dpsAnswer' // DPS may answer the GP's question (Astrid)
  | null;

export interface ThreadOutput {
  messages: ThreadMessage[];
  awaiting: ThreadAwaiting;
  /** True when a reply from the other side exists but is held (study mode). */
  heldReply: boolean;
  /** The referral loop has ended (grant, return acknowledged, or answer given). */
  ended: boolean;
  /** Review mode: the other side is being played and has not answered yet, so no example stands in. */
  waitingOther?: boolean;
  /** The GP chose not to reply to DPS's request (Kari, Erlend) or not to ask (Astrid): «Ikke svar nå», «Ikke spør nå». */
  gpSkipped?: boolean;
  /** DPS chose not to answer the GP's question (Astrid): «Ikke svar nå». */
  dpsSkipped?: boolean;
}

/** The GP's own message of this kind; the latest one, since a reply to a later request comes after one to an earlier. */
const gpOwn = (w: GpWork, kind: 'reply' | 'question') => w.messages.filter((m) => m.kind === kind).at(-1);

export function deriveThread(input: ThreadInput): ThreadOutput {
  const { caseId } = input;
  if (caseId === 'astrid') return withNewReferral(input, astridThread(input));
  if (caseId === 'kari' || caseId === 'erlend') return withNewReferral(input, referralThread(input));
  return { messages: [], awaiting: null, heldReply: false, ended: true };
}

/**
 * Review mode, DPS side: the played GP side has sent a new referral after «Henvis på nytt». The prototype does not follow it,
 * and the DPS thread says so where it happened, as the GP side's Sendt page does (G-12, r10F-06).
 */
function withNewReferral(input: ThreadInput, out: ThreadOutput): ThreadOutput {
  const { caseId, viewer, mode, gp, gpPlayed } = input;
  if (viewer !== 'dps' || mode !== 'review' || !gpPlayed || gp.secondReferral !== 'sent') return out;
  if (caseId !== 'astrid' && gp.referral !== 'sent') return out;
  const latest = out.messages.map((m) => m.date).sort().at(-1) ?? GP_TODAY;
  const date = gp.secondReferralDate && gp.secondReferralDate > latest ? gp.secondReferralDate : latest;
  return { ...out, messages: [...out.messages, { id: 'gp-new-referral', from: 'gp', date, outcome: 'newReferral', text: { nb: '', en: '' } }] };
}

/* ---------- Kari and Erlend: a referral, then DPS's assessment ---------- */

function referralThread(input: ThreadInput): ThreadOutput {
  const { content, viewer, mode, gp, dps, gpPlayed, dpsPlayed, held } = input;
  const messages: ThreadMessage[] = [];
  const script = content.gp.dpsScript;
  const gpScript = content.dps?.gpScript ?? {};

  // Is there a referral in this thread?
  const gpSide = viewer === 'gp';
  const referralSent = gpSide ? gp.referral === 'sent' : true;
  if (!referralSent) return { messages, awaiting: null, heldReply: false, ended: false };
  const referralDate = gpSide ? gp.referralDate ?? GP_TODAY : content.dps?.referral.sent ?? GP_TODAY;
  messages.push({
    id: 'referral',
    from: 'gp',
    date: referralDate,
    outcome: 'referral',
    text: { nb: '', en: '' },
    scripted: !gpSide && !(mode === 'review' && gpPlayed && gp.referral === 'sent'),
  });

  // Whose assessment counts: the DPS participant's (DPS viewer, or review with DPS played) or the script.
  const useDpsWork = viewer === 'dps' || (mode === 'review' && dpsPlayed);
  if (useDpsWork) {
    if (!dps.sent || !dps.outcome) return { messages, awaiting: null, heldReply: false, ended: false };
    const firstDate = dps.sentDate ?? DPS_TODAY;
    messages.push(dpsOutcomeMessage('dps-1', dps.outcome, firstDate, dps.question, dps.reasons, dps.explanation, dps.advice));
    if (dps.outcome === 'rett') return { messages, awaiting: null, heldReply: false, ended: true };
    // The GP's side of the exchange. In review mode the GP side's own work answers DPS only when it sent the referral DPS
    // read; a GP side that kept the referral («Behold») leaves the example exchange in place (r8F-03).
    const gpUsesWork = viewer === 'gp' || (mode === 'review' && gpPlayed && gp.referral === 'sent');
    let gpSkipped = false;
    if (dps.outcome === 'info') {
      let gpReplied = false;
      if (gpUsesWork) {
        const r = gpOwn(gp, 'reply');
        if (r) {
          messages.push({ id: r.id, from: 'gp', date: r.date, outcome: 'reply', text: r.text });
          gpReplied = true;
        } else if (gp.skippedMessage) {
          gpReplied = true;
          gpSkipped = true;
          messages.push(skipEvent('gp-skip-reply', 'gp', firstDate));
        } else if (viewer === 'gp') {
          return { messages, awaiting: 'gpReply', heldReply: false, ended: false };
        } else {
          // Review, DPS viewer: the GP side is played and has not answered yet, so no example reply stands in for it, and
          // DPS has no final choice to make until it does (r8F-01).
          return { messages, awaiting: null, heldReply: false, ended: false, waitingOther: true };
        }
      }
      if (!gpReplied && gpScript.replyToRequest) {
        if (held) return { messages, awaiting: null, heldReply: true, ended: false };
        messages.push({
          id: 'gp-reply-script',
          from: 'gp',
          date: gpScript.replyToRequest.date,
          outcome: 'reply',
          text: gpScript.replyToRequest.text,
          scripted: mode === 'study',
          example: mode === 'review',
        });
      }
      if (!dps.finalSent || !dps.finalOutcome) {
        if (viewer === 'dps') return { messages, awaiting: 'dpsFinal', heldReply: false, ended: false, gpSkipped };
        // Review, GP viewer, with the DPS side being played: wait for its final choice; a played side is never mixed with an example.
        if (dpsPlayed && gpReplied) return { messages, awaiting: null, heldReply: false, ended: false, waitingOther: true, gpSkipped };
        // Otherwise the scripted grant stands in as an example.
        const grant = content.gp.dpsScript.grant;
        if (grant) {
          messages.push({
            id: 'dps-grant',
            from: 'dps',
            date: grant.date,
            outcome: 'rett',
            text: grant.text,
            reasonLines: grant.reasons,
            example: true,
          });
          return { messages, awaiting: null, heldReply: false, ended: true };
        }
        return { messages, awaiting: null, heldReply: false, ended: false };
      }
      messages.push(
        dpsOutcomeMessage('dps-2', dps.finalOutcome, dps.finalDate ?? DPS_TODAY, '', dps.finalReasons, dps.finalExplanation, dps.finalAdvice),
      );
      if (dps.finalOutcome === 'rett') return { messages, awaiting: null, heldReply: false, ended: true, gpSkipped };
    }
    // A return. The GP side answers it with a plan (GP viewer); DPS sees the GP's acknowledgement. In review mode a GP side
    // being played is never mixed with the example receipt (r7F-03).
    if (viewer === 'gp') return { messages, awaiting: null, heldReply: false, ended: true, gpSkipped };
    if (gpScript.ackOfReturn && !(mode === 'review' && gpPlayed && gp.referral === 'sent')) {
      if (held) return { messages, awaiting: null, heldReply: true, ended: false };
      messages.push({
        id: 'gp-ack-script',
        from: 'gp',
        date: gpScript.ackOfReturn.date,
        outcome: 'ack',
        text: gpScript.ackOfReturn.text,
        scripted: mode === 'study',
        example: mode === 'review',
      });
    }
    return { messages, awaiting: null, heldReply: false, ended: true, gpSkipped };
  }

  // The GP viewer with a scripted DPS side (study mode, or review with DPS not played).
  if (held) return { messages, awaiting: null, heldReply: true, ended: false };
  const example = mode === 'review';
  let gpSkipped = false;
  if (script.request) {
    messages.push({
      id: 'dps-request',
      from: 'dps',
      date: script.request.date,
      outcome: 'info',
      text: script.request.text,
      scripted: !example,
      example,
    });
    const r = gpOwn(gp, 'reply');
    if (r) messages.push({ id: r.id, from: 'gp', date: r.date, outcome: 'reply', text: r.text });
    else if (!gp.skippedMessage) return { messages, awaiting: 'gpReply', heldReply: false, ended: false };
    else {
      gpSkipped = true;
      messages.push(skipEvent('gp-skip-reply', 'gp', script.request.date));
    }
  }
  if (script.grant) {
    messages.push({
      id: 'dps-grant',
      from: 'dps',
      date: script.grant.date,
      outcome: 'rett',
      text: script.grant.text,
      reasonLines: script.grant.reasons,
      scripted: !example,
      example,
    });
  }
  return { messages, awaiting: null, heldReply: false, ended: true, gpSkipped };
}

/** «Ikke svar nå» or «Ikke spør nå», where it happened in the thread: the day of the message it did not answer. */
function skipEvent(id: 'gp-skip-reply' | 'gp-skip-question' | 'dps-skip-answer', from: Role, date: string): ThreadMessage {
  return { id, from, date, outcome: 'skip', text: { nb: '', en: '' } };
}

export function dpsOutcomeMessage(
  id: string,
  outcome: Outcome,
  date: string,
  question: string,
  reasons: ReasonId[],
  explanation: string,
  advice: string,
): ThreadMessage {
  const text = outcome === 'info' ? question : outcome === 'retur' ? explanation : '';
  return {
    id,
    from: 'dps',
    date,
    outcome,
    text,
    reasons: outcome === 'retur' ? reasons : undefined,
    explanation: outcome === 'retur' ? explanation : undefined,
    advice: outcome === 'retur' ? advice : undefined,
    scripted: false,
    example: false,
  };
}

/* ---------- Astrid: a structured return, a question, an answer ---------- */

function astridThread(input: ThreadInput): ThreadOutput {
  const { content, viewer, mode, gp, dps, gpPlayed, dpsPlayed, held } = input;
  const messages: ThreadMessage[] = [];
  const ret = content.gp.dpsScript.return;
  const sentDate = content.gp.firstReferral?.sent ?? '2026-03-02';
  messages.push({ id: 'referral', from: 'gp', date: sentDate, outcome: 'referral', text: { nb: '', en: '' } });
  if (ret) {
    messages.push({
      id: 'dps-return',
      from: 'dps',
      date: ret.date,
      outcome: 'retur',
      text: ret.explanation,
      reasons: ret.reasons,
      structured: ret,
    });
  }

  // The GP's question.
  const gpUsesWork = viewer === 'gp' || (mode === 'review' && gpPlayed);
  let asked = false;
  if (gpUsesWork) {
    const q = gpOwn(gp, 'question');
    if (q) {
      messages.push({ id: q.id, from: 'gp', date: q.date, outcome: 'question', text: q.text });
      asked = true;
    } else if (gp.skippedMessage) {
      messages.push(skipEvent('gp-skip-question', 'gp', messages[messages.length - 1].date));
      return { messages, awaiting: null, heldReply: false, ended: true, gpSkipped: true };
    } else if (viewer === 'gp') {
      return { messages, awaiting: 'gpQuestion', heldReply: false, ended: false };
    }
  }
  if (!asked) {
    const q = content.dps?.gpScript.question;
    if (q) {
      messages.push({
        id: 'gp-question-script',
        from: 'gp',
        date: q.date,
        outcome: 'question',
        text: q.text,
        scripted: mode === 'study',
        example: mode === 'review',
      });
      asked = true;
    }
  }

  // DPS's answer.
  const dpsUsesWork = viewer === 'dps' || (mode === 'review' && dpsPlayed);
  if (dpsUsesWork) {
    if (dps.answerSent && dps.answer) {
      messages.push({ id: 'dps-answer', from: 'dps', date: dps.sentDate ?? DPS_TODAY, outcome: 'answer', text: dps.answer });
      return { messages, awaiting: null, heldReply: false, ended: true };
    }
    if (dps.answerSkipped) {
      messages.push(skipEvent('dps-skip-answer', 'dps', messages[messages.length - 1].date));
      return { messages, awaiting: null, heldReply: false, ended: true, dpsSkipped: true };
    }
    if (viewer === 'dps') return { messages, awaiting: 'dpsAnswer', heldReply: false, ended: false };
  }
  const a = content.gp.dpsScript.answer;
  if (a && asked) {
    if (held) return { messages, awaiting: null, heldReply: true, ended: false };
    messages.push({
      id: 'dps-answer-script',
      from: 'dps',
      date: a.date,
      outcome: 'answer',
      text: a.text,
      scripted: mode === 'study',
      example: mode === 'review',
    });
  }
  return { messages, awaiting: null, heldReply: false, ended: true };
}

/** The date a newly written message carries: the later of the role's «today» and the thread's latest date. */
export function nextMessageDate(role: Role, messages: ThreadMessage[]): string {
  const today = role === 'gp' ? GP_TODAY : DPS_TODAY;
  const latest = messages.map((m) => m.date).sort().at(-1);
  return latest && latest > today ? latest : today;
}
