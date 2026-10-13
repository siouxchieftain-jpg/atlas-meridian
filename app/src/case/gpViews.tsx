import { Button, Divider, Tab, TabList, makeStyles, tokens, typographyStyles, mergeClasses } from '@fluentui/react-components';
import { ArrowRight16Regular } from '@fluentui/react-icons';
import { useState } from 'react';
import type { CaseId } from '../content/types';
import { cases, vocab } from '../content';
import { formatDate, useLang } from '../i18n/i18n';
import { referralCriteria } from '../engine/criteria';
import { navigate } from '../router/router';
import { useWork } from '../state/work';
import { DesignNote, Panel, ProvenanceChip } from '../patterns/basics';
import { InfoGuide, PlainLetter } from '../patterns/clinical';
import { Actions, Body } from '../patterns/layout';
import { AtlasPanelGp, Responsibility } from './AtlasPanelGp';
import { CompactBand } from './BandSection';
import { AtlasPanelHead, CaseLayout } from './CaseLayout';
import { AtlasPlaceholder, AtlasTaskBar, CaseModeBar, OtherSideButton } from './CaseChrome';
import { CaseTitle } from './CaseTitle';
import { PlanPanel } from './pages';
import { ProfileRail, RecordTabs } from './record';
import { ReferralEditor, draftSections } from './ReferralEditor';
import { Composer, StructuredReturnView, ThreadView } from './Thread';
import { useCaseStatus } from './useCaseStatus';

const useStyles = makeStyles({
  // A line that takes focus after «Ikke spør nå» or «Ikke svar nå», where the composer was (r5F-04).
  afterSkip: {
    ':focus': { outline: 'none' },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px', borderRadius: tokens.borderRadiusSmall },
  },
  grid: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-start' },
  profile: { flexGrow: 1, flexShrink: 1, flexBasis: '240px', minWidth: 0 },
  centre: { flexGrow: 999, flexShrink: 1, flexBasis: '0', minWidth: '58%' },
  h2: { ...typographyStyles.subtitle1, margin: 0 },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  caption: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
  stack: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  asked: {
    ...typographyStyles.body1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorBrandBackground2,
    whiteSpace: 'pre-line',
  },
  subtle: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
});

function visitLine(caseId: CaseId, t: (x: { nb: string; en: string }) => string): string {
  const c = cases[caseId].gp;
  return `${t(c.timeliste.visit)} · ${c.timeliste.time}`;
}

/** Profile rail and the centre tabs (Notat with the self-report, Legemidler, Historikk). */
function Workspace({ caseId }: { caseId: CaseId }) {
  const cls = useStyles();
  const work = useWork();
  const c = cases[caseId];
  return (
    <div className={cls.grid}>
      <div className={cls.profile}>
        <ProfileRail content={c} />
        <DesignNote id="profil" show={work.notes} />
      </div>
      <div className={cls.centre}>
        <RecordTabs content={c} />
        <DesignNote id="selvrapport" show={work.notes} />
      </div>
    </div>
  );
}

/** Astrid, ATLAS view: the structured return, and room for a question to DPS. */
function AstridReturn() {
  const cls = useStyles();
  const { s, lang } = useLang();
  const work = useWork();
  const status = useCaseStatus('astrid');
  const gp = work.gp('astrid');
  const ret = cases.astrid.gp.dpsScript.return!;
  const question = gp.messages.find((m) => m.kind === 'question');
  return (
    <Panel aria-label={s('readReturn')}>
      <div className={cls.stack}>
        <div className={cls.head}>
          <h2 className={cls.h2}>{s('readReturn')}</h2>
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <ProvenanceChip source="dps" />
            <span className={cls.caption}>{formatDate(ret.date, lang)}</span>
          </span>
        </div>
        {/* The outcome with its word and icon, as in the thread (B1, RV-09). */}
        <StructuredReturnView ret={ret} withOutcome />
        <DesignNote id="retur" show={work.notes} />
        <Divider />
        {question ? (
          <>
            <h3 style={{ ...typographyStyles.subtitle2, margin: 0 }}>{s('yourQuestion')}</h3>
            <p className={cls.asked}>{question.text}</p>
            <p className={cls.caption}>{s('sentOn', { date: formatDate(question.date, lang) })}</p>
          </>
        ) : gp.skippedMessage ? (
          <p className={mergeClasses(cls.subtle, cls.afterSkip)} data-after-composer="" tabIndex={-1}>
            {s('questionSkipped')}
          </p>
        ) : (
          <Composer
            caseId="astrid"
            kind="gpQuestion"
            thread={status.thread}
            onDone={(sent) => {
              work.ownDecision('astrid');
              if (sent) navigate(work.casePath('astrid', 'sendt'));
            }}
          />
        )}
        {(question || gp.skippedMessage) && !work.held('astrid') && (
          <Actions>
            <Button appearance="primary" icon={<ArrowRight16Regular />} iconPosition="after" onClick={() => navigate(work.casePath('astrid', status.next))}>
              {s('continue')}
            </Button>
          </Actions>
        )}
      </div>
    </Panel>
  );
}

/** Astrid's ATLAS panel: what the first referral mentioned, as Informasjonsguiden reads it. */
function AstridSide() {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const first = cases.astrid.gp.firstReferral!;
  const sections = Object.fromEntries(vocab.sectionOrder.map((sec) => [sec, t(first.sections[sec])]));
  return (
    <>
      <AtlasPanelHead />
      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-label={s('guideTitle')}>
        <h3 style={{ ...typographyStyles.subtitle2, margin: 0 }}>{s('guideTitle')}</h3>
        <p className={cls.caption}>{s('firstReferralGuide', { date: formatDate(first.sent, lang) })}</p>
        {/* The GP's own first referral: read as it was when «du» sent it, not as DPS received it (r6F-06). */}
        <InfoGuide mentioned={referralCriteria(sections)} mode="sent" />
      </section>
      <Responsibility />
    </>
  );
}

/** The new referral: Informasjonsguiden reads the draft as it is written, and once it is sent, as it was sent (r10F-04). */
function SecondDraftSide({ caseId }: { caseId: CaseId }) {
  const { s, t } = useLang();
  const work = useWork();
  const gp = work.gp(caseId);
  return (
    <>
      <AtlasPanelHead />
      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-label={s('guideTitle')}>
        <h3 style={{ ...typographyStyles.subtitle2, margin: 0 }}>{s('guideTitle')}</h3>
        <InfoGuide mentioned={referralCriteria(draftSections(caseId, gp, t, true))} mode={gp.secondReferral === 'sent' ? 'sent' : 'draft'} />
      </section>
    </>
  );
}

/** Konsultasjon: the workspace, with the ATLAS panel or its placeholder. */
export function GpConsultation({ caseId }: { caseId: CaseId }) {
  const { s, t } = useLang();
  const work = useWork();
  const c = cases[caseId];
  const gp = work.gp(caseId);
  const without = work.withoutAtlas(caseId);
  // Study: the case-only bar carries the placeholder, so the form panel can sit inline beside the case.
  const side = without
    ? work.mode === 'review'
      ? <AtlasPlaceholder caseId={caseId} />
      : undefined
    : caseId === 'astrid'
      ? <AstridSide />
      : <AtlasPanelGp caseId={caseId} variant="consult" />;
  const compact = !without && c.gp.systemReading ? <CompactBand own={gp.placement} reading={c.gp.systemReading} /> : undefined;
  return (
    <CaseLayout side={side} compactSummary={compact}>
      <CaseModeBar caseId={caseId} />
      <AtlasTaskBar caseId={caseId} />
      <CaseTitle
        caseId={caseId}
        docTitle={s('consultation')}
        crumbs={[{ label: s('navTimeliste'), to: work.listPath }, { label: s('consultation') }]}
        sub={visitLine(caseId, t)}
      />
      {caseId === 'erlend' && without && c.gp.caseOnlyLetter && (
        <Panel aria-label={s('previousRefusalLetter')}>
          <PlainLetter letter={c.gp.caseOnlyLetter} source="dps" />
        </Panel>
      )}
      {caseId === 'erlend' && !without && (
        <Panel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <Body>{s('erlendDraftLine')}</Body>
            <Button appearance="primary" icon={<ArrowRight16Regular />} iconPosition="after" onClick={() => navigate(work.casePath(caseId, 'henvisning'))}>
              {s('openDraft')}
            </Button>
          </div>
        </Panel>
      )}
      {caseId === 'astrid' && without && c.gp.caseOnlyLetter && (
        <Panel aria-label={s('replyFromDps')}>
          <PlainLetter letter={c.gp.caseOnlyLetter} source="dps" />
        </Panel>
      )}
      {caseId === 'astrid' && !without && <AstridReturn />}
      <Workspace caseId={caseId} />
    </CaseLayout>
  );
}

/** Ny henvisning. Erlend starts here (Appendix C2 b), with his record in a tab beside the draft. */
export function GpReferral({ caseId }: { caseId: CaseId }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const work = useWork();
  const c = cases[caseId];
  const gp = work.gp(caseId);
  const [tab, setTab] = useState<'draft' | 'record'>('draft');
  // The new referral after «Henvis på nytt»: Astrid's, or Kari's and Erlend's after a return the DPS side played (r9F-01).
  const second = caseId === 'astrid' || (gp.referral === 'sent' && gp.planSaved === true && gp.plan === 'henvisPaNytt');
  if (work.withoutAtlas(caseId)) return <GpConsultation caseId={caseId} />;
  const side = second ? <SecondDraftSide caseId={caseId} /> : <AtlasPanelGp caseId={caseId} variant="referral" />;
  const compact = !second && c.gp.systemReading ? <CompactBand own={gp.placement} reading={c.gp.systemReading} /> : undefined;
  const ret = c.gp.dpsScript.return;
  const dps = work.dps(caseId);
  const advice = caseId === 'astrid' ? (ret ? t(ret.advice) : '') : dps.finalSent && dps.finalOutcome === 'retur' ? dps.finalAdvice : dps.sent && dps.outcome === 'retur' ? dps.advice : '';
  return (
    <CaseLayout side={side} compactSummary={compact}>
      <CaseModeBar caseId={caseId} />
      <AtlasTaskBar caseId={caseId} />
      <CaseTitle
        caseId={caseId}
        docTitle={s('newReferral')}
        heading={s('newReferral')}
        crumbs={[
          { label: s('navTimeliste'), to: work.listPath },
          { label: s('consultation'), to: work.casePath(caseId, 'konsultasjon') },
          { label: s('newReferral') },
        ]}
        sub={`${s('referralTo')} · ${s('patientAge', { name: c.patient.name, age: c.patient.age })}`}
      />
      {caseId === 'erlend' && (
        <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as 'draft' | 'record')}>
          <Tab value="draft">{s('newReferral')}</Tab>
          <Tab value="record">{s('noteAndRecord')}</Tab>
        </TabList>
      )}
      {second && advice.trim() && (
        <Panel aria-label={s('advice')}>
          <div className={cls.stack}>
            <Body>{s(gp.secondReferral === 'sent' ? 'secondSentIntro' : 'secondDraftIntro')}</Body>
            <div>
              <div className={cls.head}>
                <h2 className={cls.h2}>{s('advice')}</h2>
                <ProvenanceChip source="dps" />
              </div>
              <Body>{advice}</Body>
            </div>
          </div>
        </Panel>
      )}
      {tab === 'record' && caseId === 'erlend' ? (
        <Workspace caseId={caseId} />
      ) : (
        <Panel aria-label={s('newReferral')}>
          <ReferralEditor caseId={caseId} second={second} />
        </Panel>
      )}
    </CaseLayout>
  );
}

/** Dialog med DPS: the thread, the reply composer when DPS asked, and the way on. */
export function GpDialog({ caseId }: { caseId: CaseId }) {
  const { s } = useLang();
  const work = useWork();
  const status = useCaseStatus(caseId);
  const gp = work.gp(caseId);
  const c = cases[caseId];
  const awaiting = status.thread.awaiting;
  const planPending = status.planKind !== null && !gp.planSaved;
  return (
    <CaseLayout>
      <CaseTitle
        caseId={caseId}
        docTitle={s('dialogWithDps')}
        heading={s('dialogWithDps')}
        crumbs={[{ label: s('navTimeliste'), to: work.listPath }, { label: s('dialogWithDps') }]}
        sub={s('patientAge', { name: c.patient.name, age: c.patient.age })}
      />
      <OtherSideButton caseId={caseId} view="dialog" />
      <Panel aria-label={s('dialogWithDps')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ThreadView thread={status.thread} />
          {awaiting === 'gpReply' && <Composer caseId={caseId} kind="gpReply" thread={status.thread} />}
          {awaiting === 'gpQuestion' && (
            <Composer caseId={caseId} kind="gpQuestion" thread={status.thread} onDone={() => work.ownDecision(caseId)} />
          )}
          {!awaiting && status.thread.ended && status.planKind === 'both' && <PlanPanel caseId={caseId} status={status} />}
          {!awaiting && !status.thread.heldReply && status.planKind !== 'both' && (status.complete || planPending) && (
            <Actions>
              {status.complete ? (
                <Button appearance="primary" icon={<ArrowRight16Regular />} iconPosition="after" onClick={() => work.toSummary(caseId)}>
                  {s('toSummary')}
                </Button>
              ) : (
                <Button appearance="primary" icon={<ArrowRight16Regular />} iconPosition="after" onClick={() => navigate(work.casePath(caseId, 'plan'))}>
                  {s('toPlan')}
                </Button>
              )}
            </Actions>
          )}
        </div>
      </Panel>
    </CaseLayout>
  );
}
