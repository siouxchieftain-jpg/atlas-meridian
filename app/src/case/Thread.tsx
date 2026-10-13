import { Button, Field, Link, makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronDown16Regular, ChevronRight16Regular, Delete20Regular, Send20Regular } from '@fluentui/react-icons';
import { useEffect, useId, useRef, useState, type ReactElement } from 'react';
import type { CaseId, Role, StructuredReturn, T } from '../content/types';
import { vocab } from '../content';
import { capitalFirst, formatDate, numberWord, useLang } from '../i18n/i18n';
import { daysBetween } from '../engine/clock';
import { nextMessageDate, type ThreadMessage, type ThreadOutput } from '../engine/thread';
import { useWork } from '../state/work';
import { DesignNote, GrowingTextarea, ProvenanceChip, RoleAvatar, StatusChip } from '../patterns/basics';
import { focusAfterOverlay, useAtlasAnnounce } from '../patterns/announce';
import { ConfirmDialog } from '../shell/HeaderParts';
import { outcomeIcon } from './dpsParts';

const useStyles = makeStyles({
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground3,
    // A long event wraps as a centred label, and the rules keep a minimum length (Meridian Dialogue: events are dividers, r8A-04).
    textAlign: 'center',
    borderRadius: tokens.borderRadiusLarge,
    '::before': { content: '""', flex: '1 0 16px', height: '1px', backgroundColor: tokens.colorNeutralStroke2 },
    '::after': { content: '""', flex: '1 0 16px', height: '1px', backgroundColor: tokens.colorNeutralStroke2 },
    // The same ring as a message when a skip moves focus here (r8A-05).
    ':focus': { outline: 'none' },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '4px' },
  },
  msg: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-start',
    maxWidth: '760px',
    borderRadius: tokens.borderRadiusLarge,
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '4px' },
  },
  own: { flexDirection: 'row-reverse', alignSelf: 'flex-end' },
  bubbleCol: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS, minWidth: 0 },
  meta: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, display: 'flex', gap: tokens.spacingHorizontalS, flexWrap: 'wrap', alignItems: 'center' },
  ownMeta: { justifyContent: 'flex-end' },
  who: { ...typographyStyles.caption1Strong, color: tokens.colorNeutralForeground1 },
  bubble: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  ownBubble: { backgroundColor: tokens.colorBrandBackground2 },
  outcome: { ...typographyStyles.body1Strong, margin: 0, display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
  text: { ...typographyStyles.body1, margin: 0, whiteSpace: 'pre-line' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS },
  lines: { margin: 0, paddingInlineStart: tokens.spacingHorizontalL, ...typographyStyles.body1 },
  held: {
    ...typographyStyles.body1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px dashed ${tokens.colorNeutralStroke1}`,
    color: tokens.colorNeutralForeground2,
  },
  composer: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  composerRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalM },
  reason: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
  ret: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  retTitle: { ...typographyStyles.body1Strong, margin: 0 },
  unmet: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  unmetItem: { paddingBlock: tokens.spacingVerticalXS, borderTop: `1px solid ${tokens.colorNeutralStroke2}`, display: 'flex', flexDirection: 'column' },
  unmetLabel: { ...typographyStyles.body1Strong },
});

/** «Retur med råd» as a structured return: reasons, explanation, advice and the criteria not met. */
export function StructuredReturnView({
  ret,
  showUnmet = true,
  unmetOpen = true,
  withOutcome = false,
}: {
  ret: StructuredReturn;
  showUnmet?: boolean;
  unmetOpen?: boolean;
  /** Outside a thread message, the return names its outcome with its word and icon (B1, RV-09). */
  withOutcome?: boolean;
}) {
  const cls = useStyles();
  const { s, t } = useLang();
  const [open, setOpen] = useState(unmetOpen);
  const unmetId = useId();
  return (
    <div className={cls.ret} data-section="retur">
      {withOutcome && (
        <p className={cls.outcome}>
          <span aria-hidden="true" style={{ display: 'inline-flex' }}>
            {outcomeIcon.retur}
          </span>
          {t(vocab.outcomes.retur.label)}
        </p>
      )}
      <div className={cls.chips} role="group" aria-label={s('reasonsLabel')}>
        {ret.reasons.map((r) => (
          <StatusChip key={r}>{t(vocab.reasons[r])}</StatusChip>
        ))}
      </div>
      <div>
        <p className={cls.retTitle}>{s('explanation')}</p>
        <p className={cls.text}>{t(ret.explanation)}</p>
      </div>
      <div>
        <p className={cls.retTitle}>{s('advice')}</p>
        <p className={cls.text}>{t(ret.advice)}</p>
      </div>
      {showUnmet && ret.unmet.length > 0 && (
        <div>
          <Button
            appearance="transparent"
            icon={open ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
            aria-expanded={open}
            aria-controls={unmetId}
            onClick={() => setOpen(!open)}
            style={{ paddingInline: 0, minWidth: 0, fontWeight: 600 }}
          >
            {s('criteriaNotMet')}
          </Button>
          <ul className={cls.unmet} id={unmetId} hidden={!open}>
            {ret.unmet.map((u, i) => (
              <li key={i} className={cls.unmetItem}>
                <span className={cls.unmetLabel}>{t(u.criterion)}</span>
                <span>{t(u.text)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function textOf(x: T | string, t: (v: T) => string): string {
  return typeof x === 'string' ? x : t(x);
}

function Gap({ from, to }: { from: string; to: string }) {
  const cls = useStyles();
  const { s, lang } = useLang();
  const n = daysBetween(from, to);
  if (n <= 0) return null;
  // «Seks dager senere», not «6 dager senere», beside «Én dag senere» (R2V-06).
  return <li className={cls.divider}>{n === 1 ? s('dayLater') : capitalFirst(s('daysLater', { n: numberWord(n, lang) }))}</li>;
}

function MessageItem({ m, viewer }: { m: ThreadMessage; viewer: Role }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const own = m.from === viewer && !m.scripted && !m.example;
  const who = own ? s('you') : t(m.from === 'gp' ? vocab.roles.gp : vocab.roles.dps);
  const label =
    m.outcome === 'info' || m.outcome === 'rett' || m.outcome === 'retur'
      ? t(vocab.outcomes[m.outcome].label)
      : m.outcome === 'question'
        ? s('msgQuestion')
        : m.outcome === 'answer'
          ? s('msgAnswer')
          : m.outcome === 'ack'
            ? s('msgAck')
            : m.outcome === 'reply'
              ? s('msgReply')
              : '';
  const text = textOf(m.text, t);
  return (
    // Focusable from script only: after a send, focus moves to the message just sent (2.4.3).
    <li className={mergeClasses(cls.msg, own && cls.own)} data-message={m.id} data-own={own ? '' : undefined} tabIndex={-1}>
      <RoleAvatar role={m.from} size={32} />
      <div className={cls.bubbleCol}>
        <div className={mergeClasses(cls.meta, own && cls.ownMeta)}>
          <span className={cls.who}>{who}</span>
          <span>{formatDate(m.date, lang)}</span>
          {m.scripted && <span>{s('scriptedNote')}</span>}
          {/* An example question is no reply: «Eksempel» (r10F-07). */}
          {m.example && <StatusChip>{s(m.outcome === 'question' ? 'exampleBadge' : 'exampleReply')}</StatusChip>}
        </div>
        <div className={mergeClasses(cls.bubble, own && cls.ownBubble)}>
          {label && (
            <p className={cls.outcome}>
              {(m.outcome === 'info' || m.outcome === 'rett' || m.outcome === 'retur') && (
                <span aria-hidden="true" style={{ display: 'inline-flex' }}>
                  {outcomeIcon[m.outcome]}
                </span>
              )}
              {label}
            </p>
          )}
          {m.structured ? (
            <StructuredReturnView ret={m.structured} />
          ) : (
            <>
              {m.reasons && m.reasons.length > 0 && (
                <div className={cls.chips} role="group" aria-label={s('reasonsLabel')}>
                  {m.reasons.map((r) => (
                    <StatusChip key={r}>{t(vocab.reasons[r])}</StatusChip>
                  ))}
                </div>
              )}
              {text.trim() && <p className={cls.text}>{text}</p>}
              {m.advice && (
                <p className={cls.text}>
                  <strong>{s('advice')}:</strong> {m.advice}
                </p>
              )}
              {m.reasonLines && m.reasonLines.length > 0 && (
                <ul className={cls.lines}>
                  {m.reasonLines.map((r, i) => (
                    <li key={i}>{t(r)}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

/** The thread: role labels, own messages on the right, time skips and system events as dividers. */
export function ThreadView({ thread }: { thread: ThreadOutput }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const work = useWork();
  const announce = useAtlasAnnounce();
  // A message from the other side that joins the thread while the reader is here is announced once (4.1.3).
  const seen = useRef(thread.messages.length);
  useEffect(() => {
    const n = thread.messages.length;
    if (n > seen.current) {
      const last = thread.messages[n - 1];
      if (last.from !== work.viewer && last.outcome !== 'referral' && last.outcome !== 'skip' && last.outcome !== 'newReferral') {
        announce(s('newMessageFrom', { who: t(last.from === 'gp' ? vocab.roles.gp : vocab.roles.dps) }));
      }
    }
    seen.current = n;
  }, [thread.messages, work.viewer, announce, s, t]);
  const items: ReactElement[] = [];
  thread.messages.forEach((m, i) => {
    const prev = thread.messages[i - 1];
    if (m.outcome === 'referral') {
      items.push(
        <li key={m.id} className={cls.divider}>
          {s('referralSentOn', { date: formatDate(m.date, lang) })}
        </li>,
      );
      return;
    }
    if (m.outcome === 'newReferral') {
      items.push(
        <li key={m.id} className={cls.divider} data-new-referral="">
          {s('newReferralDivider', { date: formatDate(m.date, lang) })}
        </li>,
      );
      return;
    }
    if (m.outcome === 'skip') {
      // A system event, said from the reader's side: «Du svarte ikke …» to the one who chose it, «Fastlegen svarte ikke …» to the other.
      const own = m.from === work.viewer;
      const key =
        m.id === 'gp-skip-question'
          ? own ? 'questionSkipped' : 'gpAskedNothing'
          : m.id === 'dps-skip-answer'
            ? own ? 'answerSkipped' : 'dpsDidNotAnswer'
            : own ? 'youDidNotReply' : 'gpDidNotReply';
      items.push(
        <li key={m.id} className={cls.divider} data-after-composer="" tabIndex={-1}>
          {s(key)}
        </li>,
      );
      return;
    }
    if (prev) items.push(<Gap key={`gap-${m.id}`} from={prev.date} to={m.date} />);
    items.push(<MessageItem key={m.id} m={m} viewer={work.viewer} />);
  });
  return (
    <div>
      {thread.messages.length === 0 ? (
        <p className={cls.reason}>{s('noThreadYet')}</p>
      ) : (
        <ol className={cls.list} aria-label={s('dialogTab')}>
          {items}
        </ol>
      )}
      {thread.heldReply && (
        <p className={cls.held} style={{ marginTop: 12 }}>
          {s('heldReply')}
        </p>
      )}
      {/* Review: the other side is played and has not answered yet; the same note as a held reply (r8F-01, r9A-04). */}
      {thread.waitingOther && (
        <p className={cls.held} style={{ marginTop: 12 }}>
          {s(work.viewer === 'gp' ? 'waitingForDps' : 'waitingForGp')}
        </p>
      )}
      <DesignNote id="dialog" show={work.notes} />
    </div>
  );
}

/**
 * The composer: always empty at the start (B3). Kari and Erlend: the GP's
 * reply to a request. Astrid: the GP's question, or the DPS answer.
 */
export function Composer({
  caseId,
  kind,
  thread,
  onDone,
}: {
  caseId: CaseId;
  kind: 'gpReply' | 'gpQuestion' | 'dpsAnswer';
  thread: ThreadOutput;
  onDone?: (sent: boolean) => void;
}) {
  const cls = useStyles();
  const { s } = useLang();
  const work = useWork();
  const [text, setText] = useState('');
  const reasonId = useId();
  const role: Role = kind === 'dpsAnswer' ? 'dps' : 'gp';
  const label = role === 'gp' ? s('dialogComposerGp') : s('dialogComposerDps');
  const skipLabel = kind === 'gpQuestion' ? s('dialogSkipQuestion') : s('dialogSkipReply');
  const date = nextMessageDate(role, thread.messages);
  // Review mode: the GP's question, or the choice not to ask, is new to DPS, so an answer DPS gave to the example
  // question does not answer it; DPS answers this one (r6F-02).
  // And a reply, or the choice not to reply, is new to DPS, so a final choice DPS made after the example reply is
  // made again (r7F-03).
  const clearExampleAnswer = () => {
    if (work.mode !== 'review') return;
    if (kind === 'gpQuestion') work.updateDps(caseId, { answer: '', answerSent: false, answerSkipped: false });
    if (kind === 'gpReply' && work.dps(caseId).finalSent)
      work.updateDps(caseId, { finalSent: false, finalOutcome: undefined, finalDate: undefined, finalReasons: [], finalExplanation: '', finalAdvice: '' });
  };
  // What the DPS side did after the example goes only after a confirmation, as with a referral (r10F-08, G-14).
  const dpsNow = work.dps(caseId);
  const clears =
    work.mode === 'review' &&
    ((kind === 'gpQuestion' && (dpsNow.answerSent === true || dpsNow.answerSkipped === true)) || (kind === 'gpReply' && dpsNow.finalSent === true));
  const [confirm, setConfirm] = useState<'send' | 'skip' | null>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const toLastOwn = () => {
    const own = document.querySelectorAll<HTMLElement>('[data-message][data-own]');
    return own[own.length - 1];
  };
  const toAfterSkip = () => {
    const all = document.querySelectorAll<HTMLElement>('[data-message]');
    return document.querySelector<HTMLElement>('[data-after-composer]') ?? all[all.length - 1];
  };
  const send = () => {
    if (!text.trim()) return;
    if (clears) setConfirm('send');
    else doSend();
  };
  const skip = () => {
    if (clears) setConfirm('skip');
    else doSkip();
  };
  const doSend = () => {
    const v = text.trim();
    if (!v) return;
    if (kind === 'dpsAnswer') {
      work.updateDps(caseId, { answer: v, answerSent: true, sentDate: date });
    } else {
      work.updateGp(caseId, (w) => ({
        messages: [...w.messages, { id: `${kind}-${w.messages.length + 1}`, from: 'gp', date, text: v, kind: kind === 'gpReply' ? 'reply' : 'question' }],
        skippedMessage: false,
      }));
      clearExampleAnswer();
    }
    setText('');
    onDone?.(true);
    window.requestAnimationFrame(() => toLastOwn()?.focus());
  };
  const doSkip = () => {
    if (kind === 'dpsAnswer') work.updateDps(caseId, { answerSkipped: true });
    else {
      work.updateGp(caseId, { skippedMessage: true });
      clearExampleAnswer();
    }
    onDone?.(false);
    // The composer goes; focus moves to the thread's latest item instead of the page (r5F-04). A form panel
    // that opens now takes focus after this.
    window.requestAnimationFrame(() => toAfterSkip()?.focus());
  };
  return (
    <div className={cls.composer} data-section="composer">
      <Field label={label}>
        <GrowingTextarea value={text} rows={3} maxLength={3800} onChange={(_, d) => setText(d.value)} />
      </Field>
      <div className={cls.composerRow}>
        <Button
          ref={sendRef}
          appearance={text.trim() ? 'primary' : 'secondary'}
          icon={<Send20Regular />}
          disabledFocusable={!text.trim()}
          aria-describedby={!text.trim() ? reasonId : undefined}
          onClick={send}
        >
          {kind === 'dpsAnswer' ? s('sendAnswer') : s('send')}
        </Button>
        <Link as="button" ref={skipRef} onClick={skip}>
          {skipLabel}
        </Link>
        <ProvenanceChip source="own" />
      </div>
      {!text.trim() && (
        <p className={cls.reason} id={reasonId}>
          {s('composerEmpty')}
        </p>
      )}
      {clears && (
        <ConfirmDialog
          open={confirm !== null}
          title={s(kind === 'gpQuestion' ? 'clearAnswerTitle' : 'clearDpsTitle')}
          body={s(kind === 'gpQuestion' ? 'clearAnswerBody' : 'clearFinalBody')}
          confirmLabel={s('clearAndContinue')}
          icon={<Delete20Regular />}
          onCancel={() => {
            // Cancelled: nothing changes, and focus goes back to what was chosen (2.4.3).
            const was = confirm;
            setConfirm(null);
            focusAfterOverlay(() => (was === 'skip' ? skipRef.current : sendRef.current));
          }}
          onConfirm={() => {
            const was = confirm;
            setConfirm(null);
            if (was === 'skip') {
              doSkip();
              focusAfterOverlay(toAfterSkip);
            } else {
              doSend();
              focusAfterOverlay(toLastOwn);
            }
          }}
        />
      )}
    </div>
  );
}
