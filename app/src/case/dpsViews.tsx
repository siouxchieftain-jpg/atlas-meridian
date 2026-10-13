import { Badge, Button, makeStyles, tokens, typographyStyles, mergeClasses } from '@fluentui/react-components';
import { ArrowRight16Regular, CheckmarkCircle12Regular, Clock12Regular } from '@fluentui/react-icons';
import type { CaseId } from '../content/types';
import { cases, vocab } from '../content';
import { formatDate, useLang } from '../i18n/i18n';
import { navigate } from '../router/router';
import { useWork } from '../state/work';
import { DesignNote, Panel, ProvenanceChip, RoleAvatar, StatusChip } from '../patterns/basics';
import { InfoGuide, PlainLetter } from '../patterns/clinical';
import { Actions } from '../patterns/layout';
import { Responsibility } from './AtlasPanelGp';
import { CompactBand } from './BandSection';
import { AtlasPanelHead, CaseLayout } from './CaseLayout';
import { AtlasPlaceholder, AtlasTaskBar, CaseModeBar, OtherSideButton } from './CaseChrome';
import { CaseTitle } from './CaseTitle';
import { AtlasPanelDps, FinalChoiceSection, GpUnsureBlock, NoteAttachment, ReferralLetter, receivedReferral } from './dpsParts';
import { Composer, StructuredReturnView, ThreadView } from './Thread';
import { useCaseStatus } from './useCaseStatus';

const useStyles = makeStyles({
  // A line that takes focus after «Ikke spør nå» or «Ikke svar nå», where the composer was (r5F-04).
  afterSkip: {
    ':focus': { outline: 'none' },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px', borderRadius: tokens.borderRadiusSmall },
  },
  frist: { whiteSpace: 'nowrap' },
  stack: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  h2: { ...typographyStyles.subtitle1, margin: 0 },
  caption: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
  ownLine: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    ...typographyStyles.body1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  question: { display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'flex-start' },
  bubble: {
    ...typographyStyles.body1,
    margin: 0,
    whiteSpace: 'pre-line',
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  answered: {
    ...typographyStyles.body1,
    margin: 0,
    whiteSpace: 'pre-line',
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorBrandBackground2,
  },
});

function Frist({ date }: { date: string }) {
  const cls = useStyles();
  const { s, lang } = useLang();
  return (
    // Meridian's Frist badge: Important, with a clock (G-22 keeps `calendar_ltr` for the Timeliste).
    <Badge className={cls.frist} appearance="tint" color="important" size="large" icon={<Clock12Regular />}>
      {s('deadline', { date: formatDate(date, lang) })}
    </Badge>
  );
}

/** A referral DPS has already answered shows when it was assessed, as the queue does, not a passed deadline (r4F-07). */
function Assessed({ date }: { date: string }) {
  const { s, lang } = useLang();
  return (
    <Badge appearance="tint" color="informative" size="large" icon={<CheckmarkCircle12Regular />}>
      {s('queueAssessedOn', { date: formatDate(date, lang) })}
    </Badge>
  );
}

/**
 * The GP's question to DPS about Astrid's return, as a message from a role.
 * A question written for the prototype says so: «Forhåndsskrevet melding i
 * prototypen» in the study, «Eksempelsvar» in review mode where nobody has
 * played the GP side.
 */
function QuestionFromGp({ text, date, kind }: { text: string; date: string; kind: 'played' | 'scripted' | 'example' }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  return (
    <section aria-label={s('questionFromGp')} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className={cls.head}>
        <h2 className={cls.h2}>{s('questionFromGp')}</h2>
        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <ProvenanceChip source="gp" />
          <span className={cls.caption}>{formatDate(date, lang)}</span>
          {kind === 'scripted' && <span className={cls.caption}>{s('scriptedNote')}</span>}
          {kind === 'example' && <StatusChip>{s('exampleBadge')}</StatusChip>}
        </span>
      </div>
      <div className={cls.question}>
        <RoleAvatar role="gp" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <span className={cls.caption}>{t(vocab.roles.gp)}</span>
          <p className={cls.bubble}>{text}</p>
        </div>
      </div>
    </section>
  );
}

/** Astrid on the DPS side: the referral, the return the team sent, the GP's question, and the answer. */
function AstridDps({ without }: { without: boolean }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const work = useWork();
  const status = useCaseStatus('astrid');
  const d = cases.astrid.dps!;
  const dps = work.dps('astrid');
  const scriptKind = work.mode === 'review' ? 'example' : 'scripted';
  if (without) {
    const q = d.gpScript.questionPlain!;
    return (
      <>
        <Panel aria-label={s('referralAndReply')}>
          <div className={cls.stack}>
            {d.plainLetter && <PlainLetter letter={d.plainLetter} source="dpsRecord" />}
            {/* The same record as the ATLAS view: the note went with the referral (B1 and B2 differ by ATLAS only). */}
            <NoteAttachment caseId="astrid" />
          </div>
        </Panel>
        <Panel aria-label={s('questionFromGp')}>
          <QuestionFromGp text={t(q.text)} date={q.date} kind={scriptKind} />
        </Panel>
      </>
    );
  }
  const received = receivedReferral('astrid', work, t);
  const scripted = d.gpScript.question!;
  // Review mode: a question the GP side played replaces the scripted one, on both sides (C2 f).
  const gpPlayed = work.mode === 'review' && work.played('gp', 'astrid');
  const playedQ = gpPlayed ? work.gp('astrid').messages.find((m) => m.kind === 'question') : undefined;
  const gpAskedNothing = gpPlayed && !playedQ && work.gp('astrid').skippedMessage === true;
  const q = playedQ ? { text: playedQ.text, date: playedQ.date } : { text: t(scripted.text), date: scripted.date };
  return (
    <>
      <Panel aria-label={s('referralAsSent')}>
        <div className={cls.stack}>
          <div className={cls.head}>
            <h2 className={cls.h2}>{s('referralAsSent')}</h2>
          </div>
          <ReferralLetter caseId="astrid" received={received} />
        </div>
      </Panel>
      {d.returnSent && (
        <Panel aria-label={s('returnTheTeamSent')}>
          <div className={cls.stack}>
            <div className={cls.head}>
              <h2 className={cls.h2}>{s('returnTheTeamSent')}</h2>
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <ProvenanceChip source="dpsRecord" />
                <span className={cls.caption}>{formatDate(d.returnSent.date, lang)}</span>
              </span>
            </div>
            <StructuredReturnView ret={d.returnSent} withOutcome />
            <DesignNote id="dps-retur" show={work.notes} />
          </div>
        </Panel>
      )}
      <Panel aria-label={s('questionFromGp')}>
        <div className={cls.stack}>
          {gpAskedNothing ? (
            <p className={cls.caption}>{s('gpAskedNothing')}</p>
          ) : (
            <QuestionFromGp text={q.text} date={q.date} kind={playedQ ? 'played' : scriptKind} />
          )}
          {gpAskedNothing ? null : dps.answerSent ? (
            <>
              <h3 style={{ ...typographyStyles.subtitle2, margin: 0 }}>{s('yourAnswer')}</h3>
              <p className={cls.answered}>{dps.answer}</p>
              <p className={cls.caption}>{s('sentOn', { date: formatDate(dps.sentDate ?? q.date, lang) })}</p>
            </>
          ) : dps.answerSkipped ? (
            <>
              <p className={mergeClasses(cls.caption, cls.afterSkip)} data-after-composer="" tabIndex={-1}>
                {s('answerSkipped')}
              </p>
              {!work.held('astrid') && (
                <Actions>
                  <Button appearance="primary" icon={<ArrowRight16Regular />} iconPosition="after" onClick={() => navigate(work.casePath('astrid', status.next))}>
                    {s('continue')}
                  </Button>
                </Actions>
              )}
            </>
          ) : (
            <Composer
              caseId="astrid"
              kind="dpsAnswer"
              thread={status.thread}
              onDone={(sent) => {
                work.ownDecision('astrid');
                if (sent) navigate(work.casePath('astrid', 'sendt'));
              }}
            />
          )}
          <Responsibility />
        </div>
      </Panel>
    </>
  );
}

/** Vurdering: the referral (a standard letter in the case-only state), and with ATLAS the GP's uncertainty and the panel. */
export function DpsAssessment({ caseId }: { caseId: CaseId }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const work = useWork();
  const status = useCaseStatus(caseId);
  const c = cases[caseId];
  const d = c.dps!;
  const dps = work.dps(caseId);
  const without = work.withoutAtlas(caseId);
  const received = receivedReferral(caseId, work, t);
  const onSent = () => {
    work.ownDecision(caseId);
    navigate(work.casePath(caseId, 'sendt'));
  };
  let side;
  if (without) side = work.mode === 'review' ? <AtlasPlaceholder caseId={caseId} /> : undefined;
  else if (caseId === 'astrid')
    side = (
      <>
        <AtlasPanelHead />
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-label={s('guideTitle')}>
          <h3 style={{ ...typographyStyles.subtitle2, margin: 0 }}>{s('guideTitle')}</h3>
          <InfoGuide mentioned={received.mentioned} mode="received" />
        </section>
      </>
    );
  else side = <AtlasPanelDps caseId={caseId} received={received} onSent={onSent} withOutcome />;
  const compact = !without && d.systemReading ? (
    <CompactBand own={dps.placement} other={received.placement !== undefined ? { role: 'gp', value: received.placement } : undefined} reading={d.systemReading} />
  ) : undefined;
  return (
    <CaseLayout side={side} compactSummary={compact}>
      <CaseModeBar caseId={caseId} />
      <AtlasTaskBar caseId={caseId} />
      <CaseTitle
        caseId={caseId}
        docTitle={s('assessmentTitle')}
        crumbs={[{ label: s('navQueue'), to: work.listPath }, { label: s('referralOn', { date: formatDate(d.referral.received, lang) }) }]}
        sub={s('fromReferringGp', { date: formatDate(d.referral.received, lang) })}
        side={d.returnSent ? <Assessed date={d.returnSent.date} /> : <Frist date={d.referral.deadline} />}
      />
      {caseId === 'astrid' ? (
        <AstridDps without={without} />
      ) : (
        <>
          {d.ownRecordLine && (
            <p className={cls.ownLine}>
              <ProvenanceChip source="dpsRecord" />
              {t(d.ownRecordLine)}
            </p>
          )}
          <Panel aria-label={s('referralAsSent')}>
            <div className={cls.stack}>
              <h2 className={cls.h2}>{without ? s('referralLetter') : s('referralAsSent')}</h2>
              <ReferralLetter caseId={caseId} received={received} letterFrame={without} />
            </div>
          </Panel>
          {!without && <GpUnsureBlock received={received} />}
          {dps.sent && !work.held(caseId) && (
            <Actions>
              <Button appearance="primary" icon={<ArrowRight16Regular />} iconPosition="after" onClick={() => navigate(work.casePath(caseId, status.next === 'vurdering' ? 'dialog' : status.next))}>
                {s('continue')}
              </Button>
            </Actions>
          )}
        </>
      )}
    </CaseLayout>
  );
}

/** Dialog med fastlegen: the thread, the final choice after a request, and the way on. */
export function DpsDialog({ caseId }: { caseId: CaseId }) {
  const { s } = useLang();
  const work = useWork();
  const status = useCaseStatus(caseId);
  const c = cases[caseId];
  return (
    <CaseLayout>
      <CaseTitle
        caseId={caseId}
        docTitle={s('dialogWithGp')}
        heading={s('dialogWithGp')}
        crumbs={[{ label: s('navQueue'), to: work.listPath }, { label: s('dialogWithGp') }]}
        sub={s('patientAge', { name: c.patient.name, age: c.patient.age })}
      />
      <OtherSideButton caseId={caseId} view="dialog" />
      <Panel aria-label={s('dialogWithGp')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* The GP's «Ikke svar nå» or «Ikke spør nå» is a divider in the thread, where it happened (r6F-04, r7F-02, r7A-08). */}
          <ThreadView thread={status.thread} />
          {status.thread.awaiting === 'dpsFinal' && <FinalChoiceSection caseId={caseId} thread={status.thread} />}
          {status.thread.awaiting === 'dpsAnswer' && (
            <Composer caseId={caseId} kind="dpsAnswer" thread={status.thread} onDone={() => work.ownDecision(caseId)} />
          )}
          {status.complete && (
            <Actions>
              <Button appearance="primary" icon={<ArrowRight16Regular />} iconPosition="after" onClick={() => work.toSummary(caseId)}>
                {s('toSummary')}
              </Button>
            </Actions>
          )}
        </div>
      </Panel>
    </CaseLayout>
  );
}
