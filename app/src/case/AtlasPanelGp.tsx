import { Button, Divider, Field, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowForward20Regular, ArrowRight16Regular, PauseCircle20Regular } from '@fluentui/react-icons';
import { useId } from 'react';
import type { CaseId } from '../content/types';
import { cases } from '../content';
import { useLang } from '../i18n/i18n';
import { mentionedCriteria, referralCriteria } from '../engine/criteria';
import { gpLocked } from '../engine/flow';
import { useWork } from '../state/work';
import { ChoiceGroup } from '../patterns/ChoiceGroup';
import { DesignNote, GrowingTextarea, ProvenanceChip } from '../patterns/basics';
import { useAtlasAnnounce } from '../patterns/announce';
import { ConfidenceScale, InfoGuide, UncertaintyTags } from '../patterns/clinical';
import { AtlasPanelHead } from './CaseLayout';
import { BandSection } from './BandSection';
import { PreviousReferralCard } from './record';
import { draftSections } from './ReferralEditor';
import { useCaseStatus } from './useCaseStatus';

const useStyles = makeStyles({
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  h3: { ...typographyStyles.subtitle2, margin: 0 },
  resp: {
    ...typographyStyles.caption1Strong,
    color: tokens.colorNeutralForeground2,
    margin: 0,
  },
  reason: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
  row: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS, alignItems: 'center' },
  status: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2, margin: 0 },
  lockedLine: {
    ...typographyStyles.caption1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalS,
    paddingBlock: tokens.spacingVerticalXS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
  },
});

/** «Du har det endelige kliniske ansvaret», on every decision. */
export function Responsibility() {
  const cls = useStyles();
  const { s } = useLang();
  return <p className={cls.resp}>{s('responsibility')}</p>;
}

/** Din beslutning: Behold or Henvis, equal, nothing pre-selected (B2, B3). */
export function DecisionSection({ caseId }: { caseId: CaseId }) {
  const cls = useStyles();
  const { s } = useLang();
  const work = useWork();
  const gp = work.gp(caseId);
  const status = useCaseStatus(caseId);
  const reasonId = useId();
  const announce = useAtlasAnnounce();
  const locked = gpLocked(caseId, gp, work.formSent(caseId));
  const chosen = gp.decision;
  const savedLine = s('decisionSavedAs', { v: chosen === 'behold' ? s('decisionHold') : s('decisionRefer') });
  return (
    <section className={cls.section} aria-label={s('decisionTitle')} data-section="decision" data-section-done={gp.decisionSaved && chosen ? '' : undefined}>
      <ChoiceGroup<'behold' | 'henvis'>
        legend={s('decisionTitle')}
        chip={<ProvenanceChip source="own" />}
        value={chosen}
        disabled={locked}
        onChange={(v) => work.updateGp(caseId, { decision: v, decisionSaved: false })}
        choices={[
          { value: 'behold', label: s('decisionHold'), icon: <PauseCircle20Regular /> },
          { value: 'henvis', label: s('decisionRefer'), icon: <ArrowForward20Regular /> },
        ]}
      />
      <Field label={s('decisionReason')} hint={s('decisionReasonHint')}>
        <GrowingTextarea
          value={gp.decisionReason}
          disabled={locked}
          rows={2}
          onChange={(_, d) => work.updateGp(caseId, { decisionReason: d.value })}
        />
      </Field>
      {!locked && (
        <div className={cls.row}>
          <Button
            appearance={chosen && !gp.decisionSaved ? 'primary' : 'secondary'}
            disabledFocusable={!chosen || gp.decisionSaved === true}
            aria-describedby={!chosen ? reasonId : undefined}
            onClick={() => {
              if (!chosen) return;
              // Confirmed by the line below and said once by the announcer (G-32).
              work.updateGp(caseId, { decisionSaved: true });
              announce(savedLine);
              if (chosen === 'behold') work.ownDecision(caseId);
            }}
          >
            {s('decisionSave')}
          </Button>
          {gp.decisionSaved && chosen === 'henvis' && !work.sandbox && (
            <Button appearance="primary" icon={<ArrowRight16Regular />} iconPosition="after" onClick={() => work.go(work.casePath(caseId, 'henvisning'))}>
              {s('writeReferral')}
            </Button>
          )}
        </div>
      )}
      {!chosen && !locked && (
        <p className={cls.reason} id={reasonId}>
          {s('decisionSaveReason')}
        </p>
      )}
      {gp.decisionSaved && <p className={cls.status}>{savedLine}</p>}
      {gp.decisionSaved && chosen === 'behold' && !work.held(caseId) && (
        <div className={cls.row}>
          <Button appearance="primary" icon={<ArrowRight16Regular />} iconPosition="after" onClick={() => work.go(work.casePath(caseId, status.next))}>
            {s('continue')}
          </Button>
        </div>
      )}
      <Responsibility />
      <DesignNote id="beslutning" show={work.notes} />
    </section>
  );
}

/**
 * The GP's ATLAS panel. Order: Tidligere henvisning (Erlend), Usikkerhetsvisning
 * (place first), Hva er uklart, Informasjonsguiden, Din trygghet nå, Din
 * beslutning (not for Erlend, whose decision is the referral itself).
 */
export type GpPart = 'band' | 'tags' | 'guide' | 'confidence' | 'decision';

/** Mock (3.8): one ATLAS part on its own, for the boxes under «Oppgaven din». */
export function AtlasPartGp({ caseId, part }: { caseId: CaseId; part: GpPart }) {
  return <AtlasPanelGp caseId={caseId} variant="consult" only={part} />;
}

export function AtlasPanelGp({ caseId, variant, only }: { caseId: CaseId; variant: 'consult' | 'referral'; only?: GpPart }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const work = useWork();
  const content = cases[caseId];
  const gp = work.gp(caseId);
  const locked = gpLocked(caseId, gp, work.formSent(caseId));
  const readsDraft = variant === 'referral';
  // A referral is read section by section, a note as one text (r4F-02).
  const mentioned = readsDraft ? referralCriteria(draftSections(caseId, gp, (x) => t(x))) : mentionedCriteria(t(content.gp.note.text));
  const withDecision = variant === 'consult' && caseId !== 'erlend';
  const show = (p: GpPart) => !only || only === p;
  const div = only ? null : <Divider />;
  return (
    <>
      {!only && <AtlasPanelHead />}
      {/* Locked controls stay readable and focusable; one line says why (G-18). */}
      {locked && <p className={cls.lockedLine}>{s('lockedGp')}</p>}
      {!only && content.gp.previousReferral && (
        <>
          <PreviousReferralCard prev={content.gp.previousReferral} source="record" />
          <Divider />
        </>
      )}
      {show('band') && <BandSection
        viewer="gp"
        own={gp.placement}
        onPlace={(v) => work.updateGp(caseId, (w) => ({ placement: v, placementFirst: w.placementFirst ?? v }))}
        reading={content.gp.systemReading}
        readOnly={locked}
        notes={work.notes}
      />}
      {div}
      {show('tags') && <div data-section="tags" data-section-done={gp.tags.length > 0 || !!gp.description?.trim() ? '' : undefined}>
        <UncertaintyTags
          tags={gp.tags}
          description={gp.description}
          disabled={locked}
          hint={s('unclearGoesWith')}
          onTags={(tags) => work.updateGp(caseId, { tags })}
          onDescription={(description) => work.updateGp(caseId, { description })}
        />
        <DesignNote id="hva-er-uklart" show={work.notes} />
      </div>}
      {div}
      {show('guide') && <section className={cls.section} aria-label={s('guideTitle')} data-section="guide">
        <h3 className={cls.h3}>{s('guideTitle')}</h3>
        <InfoGuide mentioned={mentioned} mode={readsDraft ? (gp.referral === 'sent' || locked ? 'sent' : 'draft') : 'note'} />
        <DesignNote id="informasjonsguiden" show={work.notes} />
      </section>}
      {div}
      {show('confidence') && <section className={cls.section} aria-label={s('confidenceTitle')} data-section="confidence" data-section-done={gp.confidence ? '' : undefined}>
        <ConfidenceScale
          value={gp.confidence}
          disabled={locked}
          note={s('confidenceNote')}
          onChange={(confidence) => work.updateGp(caseId, { confidence })}
        />
        <DesignNote id="trygghet" show={work.notes} />
      </section>}
      {withDecision && show('decision') && (
        <>
          {div}
          <DecisionSection caseId={caseId} />
        </>
      )}
    </>
  );
}
