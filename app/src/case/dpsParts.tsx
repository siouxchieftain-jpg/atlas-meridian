import { Button, Checkbox, Divider, Field, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowEnter20Regular, ArrowReply20Regular, ChevronDown16Regular, ChevronRight16Regular, QuestionCircle20Regular } from '@fluentui/react-icons';
import { useId, useState, type ReactNode } from 'react';
import type { CaseId, ConfLevel, CriterionId, Outcome, ReasonId, SectionId, TagId } from '../content/types';
import { cases, vocab } from '../content';
import { formatDate, useLang } from '../i18n/i18n';
import { DPS_TODAY, laterOf } from '../engine/clock';
import { referralCriteria } from '../engine/criteria';
import type { ThreadOutput } from '../engine/thread';
import { useWork, type WorkApi } from '../state/work';
import type { DpsWork } from '../state/types';
import { ChoiceGroup } from '../patterns/ChoiceGroup';
import { DesignNote, GrowingTextarea, ProvenanceChip, StatusChip } from '../patterns/basics';
import { InfoGuide, TagList } from '../patterns/clinical';
import { AtlasPanelHead } from './CaseLayout';
import { BandSection } from './BandSection';
import { PreviousReferralCard } from './record';
import { Responsibility } from './AtlasPanelGp';
import { sectionText } from './ReferralEditor';

const useStyles = makeStyles({
  letter: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  letterMeta: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalL, ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  rows: { display: 'flex', flexDirection: 'column' },
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(150px, 200px) minmax(0, 1fr)',
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalXXS,
    paddingBlock: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    '@media only screen and (max-width: 639px)': { gridTemplateColumns: '1fr' },
  },
  rowLabel: { ...typographyStyles.body1Strong, margin: 0 },
  rowText: { ...typographyStyles.body1, margin: 0, whiteSpace: 'pre-line' },
  empty: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground3 },
  attachHead: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  attachText: {
    ...typographyStyles.body1,
    whiteSpace: 'pre-line',
    margin: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  unsure: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  unsureHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  h3: { ...typographyStyles.subtitle2, margin: 0 },
  quote: { ...typographyStyles.body1, margin: 0 },
  caption: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  reasons: { display: 'flex', flexDirection: 'column' },
  reasonText: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
  sentBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
  },
  sentTitle: { ...typographyStyles.body1Strong, margin: 0, display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
  chips: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS },
});

export const outcomeIcon: Record<Outcome, ReactNode> = {
  info: <QuestionCircle20Regular />,
  rett: <ArrowEnter20Regular />,
  retur: <ArrowReply20Regular />,
};

/* ---------- The referral as DPS receives it ---------- */

export interface Received {
  sections: Record<SectionId, string>;
  tags: TagId[];
  description: string;
  confidence?: ConfLevel;
  placement?: number;
  mentioned: CriterionId[];
  sent: string;
  received: string;
  deadline: string;
  /** Review: the GP side was not played, so the scripted referral stands in («Eksempelsvar»). */
  example: boolean;
}

/** The referral as DPS sees it: the GP's played referral in review mode, otherwise the scripted one. */
export function receivedReferral(caseId: CaseId, work: WorkApi, t: (x: { nb: string; en: string }) => string): Received {
  const d = cases[caseId].dps!;
  const gp = work.gp(caseId);
  const playedReferral = work.mode === 'review' && gp.referral === 'sent' && caseId !== 'astrid';
  if (playedReferral) {
    const sections = Object.fromEntries(vocab.sectionOrder.map((sec) => [sec, sectionText(caseId, gp, sec, t)])) as Record<SectionId, string>;
    return {
      sections,
      tags: gp.tags,
      description: gp.description,
      confidence: gp.confidence,
      placement: gp.placement,
      mentioned: referralCriteria(sections),
      sent: gp.referralDate ?? d.referral.sent,
      received: gp.referralDate ?? d.referral.received,
      deadline: d.referral.deadline,
      example: false,
    };
  }
  const sections = Object.fromEntries(vocab.sectionOrder.map((sec) => [sec, t(d.referral.sections[sec])])) as Record<SectionId, string>;
  return {
    sections,
    tags: d.gpUncertainty?.tags ?? [],
    description: d.gpUncertainty ? t(d.gpUncertainty.description) : '',
    confidence: d.gpUncertainty?.confidence,
    placement: d.gpUncertainty?.placement,
    mentioned: d.guideAsReceived,
    sent: d.referral.sent,
    received: d.referral.received,
    deadline: d.referral.deadline,
    example: work.mode === 'review' && caseId !== 'astrid',
  };
}

/** The consultation note sent with the referral: collapsed, the same block in the case-only state and the ATLAS view. */
export function NoteAttachment({ caseId }: { caseId: CaseId }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const [open, setOpen] = useState(false);
  const attachId = useId();
  const d = cases[caseId].dps!;
  return (
    <div>
      <div className={cls.attachHead}>
        <Button
          appearance="transparent"
          icon={open ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
          aria-expanded={open}
          aria-controls={attachId}
          onClick={() => setOpen(!open)}
        >
          {s('attachmentNote')}
        </Button>
        <ProvenanceChip source="note" />
      </div>
      <p className={cls.attachText} id={attachId} hidden={!open}>
        {t(d.referral.noteAttachment)}
      </p>
    </div>
  );
}

/** The referral body: the same text in the case-only letter and in the ATLAS view (B1 and B2 differ by ATLAS only). */
export function ReferralLetter({ caseId, received, letterFrame }: { caseId: CaseId; received: Received; letterFrame?: boolean }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  return (
    <article className={cls.letter} aria-label={s('referralAsSent')}>
      <div className={cls.letterMeta}>
        {letterFrame ? (
          <>
            <span>
              {s('letterFrom')}: {t(vocab.roles.gp)}
            </span>
            <span>{s('referralToDps')}</span>
            <span>
              {s('letterDate')}: {formatDate(received.sent, lang)}
            </span>
          </>
        ) : (
          <span>{s('fromReferringGp', { date: formatDate(received.received, lang) })}</span>
        )}
        <ProvenanceChip source="gp" />
        {received.example && <StatusChip>{s('exampleBadge')}</StatusChip>}
      </div>
      <div className={cls.rows}>
        {vocab.sectionOrder.map((sec) => (
          <div key={sec} className={cls.row}>
            <h3 className={cls.rowLabel}>{t(vocab.sections[sec].label)}</h3>
            {/* An empty section is «Tom», as the GP side shows it: never «Ingen», which reads as a finding (r10F-02). */}
            {received.sections[sec].trim() ? <p className={cls.rowText}>{received.sections[sec]}</p> : <p className={cls.empty}>{s('sectionEmpty')}</p>}
          </div>
        ))}
      </div>
      <NoteAttachment caseId={caseId} />
    </article>
  );
}

/** «Hva fastlegen var usikker på»: tags, the GP's words, confidence in words. Never a history. */
export function GpUnsureBlock({ received }: { received: Received }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const work = useWork();
  return (
    <section className={cls.unsure} aria-label={s('gpUnsure')} data-section="gp-usikker">
      <div className={cls.unsureHead}>
        <h2 className={cls.h3}>{s('gpUnsure')}</h2>
        <ProvenanceChip source="gp" />
      </div>
      {received.tags.length ? <TagList tags={received.tags} /> : <p className={cls.caption}>{s('noTagsChosen')}</p>}
      {received.description.trim() ? <p className={cls.quote}>«{received.description.trim()}»</p> : <p className={cls.caption}>{s('noDescription')}</p>}
      <p className={cls.caption}>
        {s('gpConfidenceWords', { v: received.confidence ? t(vocab.confidence[received.confidence]).toLowerCase() : s('notSet').toLowerCase() })}{' '}
        {s('noGpHistory')}
      </p>
      <DesignNote id="dps-usikkerhet" show={work.notes} />
    </section>
  );
}

/* ---------- Vurdering: three neutral outcomes ---------- */

function ReturnFields({
  reasons,
  explanation,
  advice,
  disabled,
  onReasons,
  onExplanation,
  onAdvice,
}: {
  reasons: ReasonId[];
  explanation: string;
  advice: string;
  disabled?: boolean;
  onReasons: (r: ReasonId[]) => void;
  onExplanation: (v: string) => void;
  onAdvice: (v: string) => void;
}) {
  const cls = useStyles();
  const { s, t } = useLang();
  return (
    <>
      <fieldset style={{ border: 'none', margin: 0, padding: 0 }} disabled={disabled}>
        <legend style={{ ...typographyStyles.body1Strong, padding: 0, marginBottom: 4 }}>{s('reasonsAtLeastOne')}</legend>
        <div className={cls.reasons}>
          {vocab.reasonOrder.map((r) => (
            <Checkbox
              key={r}
              label={t(vocab.reasons[r])}
              checked={reasons.includes(r)}
              disabled={disabled}
              onChange={(_, d) => onReasons(d.checked ? [...reasons, r] : reasons.filter((x) => x !== r))}
            />
          ))}
        </div>
      </fieldset>
      <Field label={s('explanationToGp')}>
        <GrowingTextarea value={explanation} disabled={disabled} rows={2} onChange={(_, d) => onExplanation(d.value)} />
      </Field>
      <Field label={s('adviceToGp')} required>
        <GrowingTextarea value={advice} disabled={disabled} rows={2} onChange={(_, d) => onAdvice(d.value)} />
      </Field>
    </>
  );
}

function outcomeValid(outcome: Outcome | undefined, w: { reasons: ReasonId[]; advice: string; question?: string }): string | null {
  if (!outcome) return 'sendAssessmentReason';
  if (outcome === 'info' && !(w.question ?? '').trim()) return 'requestNeeds';
  if (outcome === 'retur' && (!w.reasons.length || !w.advice.trim())) return 'returnNeeds';
  return null;
}

/** A sent assessment, read-only. */
export function SentAssessment({ outcome, date, w, final }: { outcome: Outcome; date: string; w: { reasons: ReasonId[]; advice: string; explanation: string; question: string }; final?: boolean }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  return (
    <div
      className={cls.sentBox}
      data-sent-assessment={final ? 'final' : 'first'}
      tabIndex={-1}
      role="group"
      aria-label={t(vocab.outcomes[outcome].label)}
    >
      <p className={cls.sentTitle}>
        <span aria-hidden="true" style={{ display: 'inline-flex' }}>
          {outcomeIcon[outcome]}
        </span>
        {t(vocab.outcomes[outcome].label)}
      </p>
      <p className={cls.caption}>{s(final ? 'finalSentOn' : 'assessmentSentOn', { date: formatDate(date, lang) })}</p>
      {outcome === 'info' && w.question.trim() && <p className={cls.quote}>{w.question}</p>}
      {outcome === 'retur' && (
        <>
          <div className={cls.chips}>
            {w.reasons.map((r) => (
              <StatusChip key={r}>{t(vocab.reasons[r])}</StatusChip>
            ))}
          </div>
          {w.explanation.trim() && <p className={cls.quote}>{w.explanation}</p>}
          <p className={cls.quote}>
            <strong>{s('advice')}:</strong> {w.advice}
          </p>
        </>
      )}
    </div>
  );
}

/** Vurdering: Be om mer informasjon, Rett til helsehjelp, Retur med råd. Only what the reply consists of is required (B2). */
export function DpsOutcomeSection({ caseId, onSent }: { caseId: CaseId; onSent: () => void }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const work = useWork();
  const dps = work.dps(caseId);
  const reasonId = useId();
  const sent = dps.sent === true;
  const problem = outcomeValid(dps.outcome, dps);
  const upd = (p: Partial<DpsWork>) => work.updateDps(caseId, p);
  return (
    <section className={cls.section} aria-label={s('assessmentTitle')} data-section="vurdering">
      {sent && dps.outcome ? (
        <>
          <div className={cls.unsureHead}>
            <h3 className={cls.h3}>{s('assessmentTitle')}</h3>
            <ProvenanceChip source="own" />
          </div>
          <SentAssessment outcome={dps.outcome} date={dps.sentDate ?? DPS_TODAY} w={dps} />
        </>
      ) : (
        <>
          <ChoiceGroup<Outcome>
            legend={s('assessmentTitle')}
            chip={<ProvenanceChip source="own" />}
            layout="column"
            value={dps.outcome}
            onChange={(v) => upd({ outcome: v })}
            choices={vocab.outcomeOrder.map((o) => ({ value: o, label: t(vocab.outcomes[o].label), icon: outcomeIcon[o] }))}
          />
          {dps.outcome === 'info' && (
            <Field label={s('questionToGp')} required>
              <GrowingTextarea value={dps.question} rows={3} onChange={(_, d) => upd({ question: d.value })} />
            </Field>
          )}
          {dps.outcome === 'retur' && (
            <ReturnFields
              reasons={dps.reasons}
              explanation={dps.explanation}
              advice={dps.advice}
              onReasons={(reasons) => upd({ reasons })}
              onExplanation={(explanation) => upd({ explanation })}
              onAdvice={(advice) => upd({ advice })}
            />
          )}
          <div>
            <Button
              appearance={problem ? 'secondary' : 'primary'}
              disabledFocusable={!!problem}
              aria-describedby={problem ? reasonId : undefined}
              onClick={() => {
                if (problem || sent) return;
                upd({ sent: true, sentDate: DPS_TODAY });
                // Review mode: what the GP replied to the example request does not answer DPS's own assessment;
                // the GP answers this one (r6F-04).
                if (work.mode === 'review') work.updateGp(caseId, (w) => ({ messages: w.messages.filter((m) => m.kind !== 'reply'), skippedMessage: false }));
                onSent();
              }}
            >
              {s('sendAssessment')}
            </Button>
          </div>
          {problem && (
            <p className={cls.reasonText} id={reasonId}>
              {s(problem as 'sendAssessmentReason')}
            </p>
          )}
        </>
      )}
      <Responsibility />
      <DesignNote id="dps-vurdering" show={work.notes} />
    </section>
  );
}

/** After «Be om mer informasjon» and the GP's reply: one final choice, as a new message in the thread. */
export function FinalChoiceSection({ caseId, thread }: { caseId: CaseId; thread: ThreadOutput }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const work = useWork();
  const dps = work.dps(caseId);
  const reasonId = useId();
  const upd = (p: Partial<DpsWork>) => work.updateDps(caseId, p);
  if (dps.finalSent && dps.finalOutcome) {
    return (
      <SentAssessment
        outcome={dps.finalOutcome}
        date={dps.finalDate ?? DPS_TODAY}
        final
        w={{ reasons: dps.finalReasons, advice: dps.finalAdvice, explanation: dps.finalExplanation, question: '' }}
      />
    );
  }
  const problem = outcomeValid(dps.finalOutcome, { reasons: dps.finalReasons, advice: dps.finalAdvice });
  const latest = thread.messages.map((m) => m.date);
  // No reply came: the choice is not «etter svaret fra fastlegen» (r6F-04).
  const legend = thread.gpSkipped ? s('finalChoiceNoReply') : s('finalChoice');
  return (
    <section className={cls.section} style={{ maxWidth: 760 }} aria-label={legend} data-section="endelig-vurdering">
      <ChoiceGroup<'rett' | 'retur'>
        legend={legend}
        layout="column"
        value={dps.finalOutcome}
        onChange={(v) => upd({ finalOutcome: v })}
        choices={(['rett', 'retur'] as const).map((o) => ({ value: o, label: t(vocab.outcomes[o].label), icon: outcomeIcon[o] }))}
      />
      {dps.finalOutcome === 'retur' && (
        <ReturnFields
          reasons={dps.finalReasons}
          explanation={dps.finalExplanation}
          advice={dps.finalAdvice}
          onReasons={(finalReasons) => upd({ finalReasons })}
          onExplanation={(finalExplanation) => upd({ finalExplanation })}
          onAdvice={(finalAdvice) => upd({ finalAdvice })}
        />
      )}
      <div>
        <Button
          appearance={problem ? 'secondary' : 'primary'}
          disabledFocusable={!!problem}
          aria-describedby={problem ? reasonId : undefined}
          onClick={() => {
            if (problem) return;
            upd({ finalSent: true, finalDate: laterOf(DPS_TODAY, ...latest) });
            // The section gives way to the final choice as a message in the thread: focus moves to it,
            // so it is read (2.4.3, R2A-02); the sent box is the fallback where the section stays.
            window.requestAnimationFrame(() => {
              const own = document.querySelectorAll<HTMLElement>('[data-message][data-own]');
              (own[own.length - 1] ?? document.querySelector<HTMLElement>('[data-sent-assessment="final"]'))?.focus();
            });
          }}
        >
          {s('sendAssessment')}
        </Button>
      </div>
      {problem && (
        <p className={cls.reasonText} id={reasonId}>
          {s(problem as 'sendAssessmentReason')}
        </p>
      )}
      <Responsibility />
    </section>
  );
}

/** The DPS ATLAS panel: place first, then the GP's marker and the system's reading; Informasjonsguiden as received; Vurdering. */
export function AtlasPanelDps({ caseId, received, onSent, withOutcome }: { caseId: CaseId; received: Received; onSent: () => void; withOutcome: boolean }) {
  const cls = useStyles();
  const { s } = useLang();
  const work = useWork();
  const content = cases[caseId];
  const d = content.dps!;
  const dps = work.dps(caseId);
  // A form sent before «Vis ATLAS» leaves the ATLAS work open; the assessment itself locks once sent.
  const locked = dps.sent === true;
  return (
    <>
      <AtlasPanelHead />
      {d.previousReferral && (
        <>
          <PreviousReferralCard prev={d.previousReferral} source="dpsRecord" />
          <Divider />
        </>
      )}
      {d.systemReading && (
        <>
          <BandSection
            viewer="dps"
            own={dps.placement}
            onPlace={(v) => work.updateDps(caseId, (w) => ({ placement: v, placementFirst: w.placementFirst ?? v }))}
            other={received.placement !== undefined ? { role: 'gp', value: received.placement } : undefined}
            reading={d.systemReading}
            readOnly={locked}
            notes={work.notes}
          />
          <Divider />
        </>
      )}
      <section className={cls.section} aria-label={s('guideTitle')} data-section="guide">
        <h3 className={cls.h3}>{s('guideTitle')}</h3>
        <InfoGuide mentioned={received.mentioned} mode="received" />
      </section>
      {withOutcome && (
        <>
          <Divider />
          <DpsOutcomeSection caseId={caseId} onSent={onSent} />
        </>
      )}
    </>
  );
}
