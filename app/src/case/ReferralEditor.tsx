import { Button, Field, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowRight16Regular, Attach16Regular, CheckmarkCircle16Regular, Circle16Regular, CircleHalfFill16Regular, Delete20Regular, Send20Regular, Save20Regular } from '@fluentui/react-icons';
import { useId, useRef, useState } from 'react';
import type { CaseId, SectionId, T } from '../content/types';
import type { StringKey } from '../i18n/strings';
import { cases, vocab } from '../content';
import { formatDate, useLang } from '../i18n/i18n';
import { GP_TODAY, laterOf } from '../engine/clock';
import { positionKey } from '../engine/placement';
import { gpLocked } from '../engine/flow';
import { sectionStatus } from '../engine/criteria';
import { clearedDps, dpsHasWork, type GpWork } from '../state/types';
import { ConfirmDialog } from '../shell/HeaderParts';
import { useWork } from '../state/work';
import { DesignNote, GrowingTextarea, ProvenanceChip, srOnly } from '../patterns/basics';
import { focusAfterOverlay, useAtlasAnnounce } from '../patterns/announce';
import { Responsibility } from './AtlasPanelGp';
import { useCaseStatus } from './useCaseStatus';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  section: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalS,
    paddingBlockEnd: tokens.spacingVerticalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  // On a big screen the field keeps a writing width (960 px) and «Hva DPS ser etter» takes up to 400 px beside it (3.4.1).
  fieldCol: { flexGrow: 999, flexShrink: 1, flexBasis: '320px', minWidth: 0, maxWidth: '960px', display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  margin: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '200px',
    minWidth: 0,
    maxWidth: '400px',
    alignSelf: 'flex-start',
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground2,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  marginTitle: { ...typographyStyles.caption1Strong, color: tokens.colorNeutralForeground1 },
  // Meridian's margin status: a 16 px icon with a 6 px gap (r5A-04).
  marginStatus: { display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalSNudge, ...typographyStyles.caption1Strong, color: tokens.colorNeutralForeground1, marginBlockStart: tokens.spacingVerticalXXS },
  chipRow: { display: 'flex', gap: tokens.spacingHorizontalXS, flexWrap: 'wrap', alignItems: 'center' },
  readText: { ...typographyStyles.body1, margin: 0, whiteSpace: 'pre-line' },
  empty: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground3 },
  block: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  blockHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  blockTitle: { ...typographyStyles.body1Strong, margin: 0 },
  blockText: { ...typographyStyles.body1, margin: 0 },
  caption: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
  attach: { display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalXS, ...typographyStyles.body1 },
  buttons: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS, alignItems: 'center' },
  sentLine: {
    ...typographyStyles.body1Strong,
    margin: 0,
    ':focus': { outline: 'none' },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px', borderRadius: tokens.borderRadiusSmall },
  },
});

type Tfn = (x: T) => string;

/**
 * The initial text of a section: the record's pre-fill (empty for «Spørsmål til DPS»). A new referral after «Henvis på nytt»
 * starts from the first one: Astrid's from her record, Kari's and Erlend's (review mode, after a return the DPS side played)
 * from the referral the GP side sent (r9F-01).
 */
function initialSection(caseId: CaseId, section: SectionId, second: boolean, t: Tfn, gp?: GpWork): { text: string; source: 'note' | 'first' | null } {
  const c = cases[caseId].gp;
  if (second) {
    const first = c.firstReferral?.sections[section];
    const text = first ? t(first) : gp ? sectionText(caseId, gp, section, t) : '';
    return { text, source: text ? 'first' : null };
  }
  if (section === 'sporsmal') return { text: '', source: null };
  const d = c.referralDraft?.[section];
  if (!d) return { text: '', source: null };
  const text = t(d.text);
  return { text, source: d.fromNote && text ? 'note' : null };
}

/** The current text of a section: the participant's edit, or the record's pre-fill. */
export function sectionText(caseId: CaseId, gp: GpWork, section: SectionId, t: Tfn, second = false): string {
  const edited = second ? gp.secondDraft?.[section] : gp.draft?.[section];
  return edited ?? initialSection(caseId, section, second, t, gp).text;
}

/** The draft section by section (Informasjonsguiden reads each criterion in its own section, r4F-02). */
export function draftSections(caseId: CaseId, gp: GpWork, t: Tfn, second = false): Record<SectionId, string> {
  return Object.fromEntries(vocab.sectionOrder.map((sec) => [sec, sectionText(caseId, gp, sec, t, second)])) as Record<SectionId, string>;
}

/** «Fra ATLAS-panelet»: the GP's own placement, tags, description and confidence, in words. */
/**
 * What goes with the referral from the ATLAS panel, named from what the GP actually filled in.
 * The draft and the Sendt page say the same (R2GP-04, R3F-04).
 */
export function atlasLine(gp: GpWork, s: (k: StringKey, v?: Record<string, string | number>) => string): string {
  const parts: string[] = [];
  if (gp.tags.length || gp.description.trim()) parts.push(s('sentPartUnclear'));
  if (gp.confidence) parts.push(s('sentPartConfidence'));
  if (gp.placement !== undefined) parts.push(s('sentPartPlacement'));
  if (!parts.length) return s('sentAtlasNone');
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} ${s('listAnd')} ${parts[parts.length - 1]}`;
  const line = s(parts.length === 1 ? 'sentAtlasOne' : 'sentAtlasMany', { list });
  return gp.placement !== undefined ? `${line} ${s('sentPlacementLater')}` : line;
}

export function FromAtlasPanel({ gp }: { gp: GpWork }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const work = useWork();
  const parts: string[] = [];
  if (gp.placement !== undefined) parts.push(`${t(vocab.band.own)}: ${s(positionKey(gp.placement))}`);
  if (gp.tags.length) parts.push(`${s('unclearTitle')}: ${gp.tags.map((x) => t(vocab.tags[x].label)).join(', ')}`);
  if (gp.confidence) parts.push(`${s('confidenceTitle')}: ${t(vocab.confidence[gp.confidence]).toLowerCase()}`);
  const empty = parts.length === 0 && !gp.description.trim();
  return (
    <section className={cls.block} aria-label={s('fromAtlasPanel')} data-section="fra-atlas">
      <div className={cls.blockHead}>
        <h3 className={cls.blockTitle}>{s('fromAtlasPanel')}</h3>
        <ProvenanceChip source="own" />
      </div>
      {empty ? (
        <p className={cls.empty}>{s('sentAtlasNone')}</p>
      ) : (
        <>
          {parts.map((p) => (
            <p key={p} className={cls.blockText}>
              {p}
            </p>
          ))}
          {gp.description.trim() && <p className={cls.blockText}>«{gp.description.trim()}»</p>}
          {/* Says only what is attached, as the Sendt page does (R3F-04). */}
          <p className={cls.caption}>{atlasLine(gp, s)}</p>
        </>
      )}
      <DesignNote id="fra-atlas-panelet" show={work.notes} />
    </section>
  );
}

/**
 * Ny henvisning: five sections, each with the margin guide «Hva DPS ser
 * etter». Blocks pre-filled from the note are marked «Hentet fra notatet»
 * and stay editable; «Spørsmål til DPS» starts empty. «Send henvisning» and
 * «Lagre utkast» are equal choices.
 */
export function ReferralEditor({ caseId, second = false }: { caseId: CaseId; second?: boolean }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const work = useWork();
  const gp = work.gp(caseId);
  const caseStat = useCaseStatus(caseId);
  const announce = useAtlasAnnounce();
  const status = second ? gp.secondReferral : gp.referral;
  const sent = status === 'sent';
  // The first referral is read-only once sent or once the case's form is sent; the new draft after «Henvis på nytt» comes after the form.
  const readOnly = sent || (!second && gpLocked(caseId, gp, work.formSent(caseId)));
  const setSection = (section: SectionId, value: string) =>
    work.updateGp(caseId, (w) => (second ? { secondDraft: { ...(w.secondDraft ?? {}), [section]: value } } : { draft: { ...(w.draft ?? {}), [section]: value } }));

  const sentRef = useRef<HTMLParagraphElement>(null);
  const sendBtn = useRef<HTMLButtonElement>(null);
  const idBase = useId();
  // Review: the DPS side has already worked on this case, reading the example referral. Sending the GP side's own
  // referral removes that work, after a confirmation, so no assessment rests on a referral DPS never read (r8F-01).
  const [confirmClear, setConfirmClear] = useState(false);
  const clearsDps = !second && work.mode === 'review' && caseId !== 'astrid' && dpsHasWork(work.dps(caseId));
  const send = () => {
    if (clearsDps && !confirmClear) {
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    if (clearsDps) work.updateDps(caseId, clearedDps());
    // The new referral comes after the thread it follows, so its date is never before the last message (r5F-05).
    if (second) work.updateGp(caseId, { secondReferral: 'sent', secondReferralDate: laterOf(GP_TODAY, ...caseStat.thread.messages.map((m) => m.date)) });
    else work.updateGp(caseId, { referral: 'sent', referralDate: GP_TODAY });
    if (!second) work.ownDecision(caseId);
    work.go(work.casePath(caseId, 'sendt'));
    // The tour's practice frame stays where it is: focus goes to the line that replaced the buttons (r4F-03).
    if (work.sandbox) focusAfterOverlay(() => sentRef.current);
  };
  const keep = () => {
    if (second) work.updateGp(caseId, { secondReferral: 'draft' });
    else work.updateGp(caseId, { referral: 'draft' });
    announce(s('draftSaved'));
    if (!second) work.ownDecision(caseId);
    else work.toSummary(caseId);
  };

  return (
    <div className={cls.root}>
      {/* The referral's own heading, so its sections are not heard as part of what stands above them (r10A-02). */}
      <h2 style={srOnly}>{s('secReferral')}</h2>
      {vocab.sectionOrder.map((section) => {
        const meta = vocab.sections[section];
        const init = initialSection(caseId, section, second, t, gp);
        const value = sectionText(caseId, gp, section, t, second);
        const label = t(meta.label);
        const status = sectionStatus(section, value);
        const chipId = `${idBase}-${section}-kilde`;
        const showChip = !!(init.source || value.trim());
        return (
          <div key={section} className={cls.section} data-section={`henvisning-${section}`}>
            <div className={cls.fieldCol}>
              {readOnly ? (
                <>
                  <h3 className={cls.blockTitle}>{label}</h3>
                  {value.trim() ? <p className={cls.readText}>{value}</p> : <p className={cls.empty}>{s('sectionEmpty')}</p>}
                </>
              ) : (
                <Field label={label}>
                  <GrowingTextarea
                    value={value}
                    // The text's source is heard with the field, not only after it (r10A-03).
                    aria-describedby={showChip ? chipId : undefined}
                    placeholder={s('writeHere')}
                    rows={section === 'sporsmal' ? 2 : 3}
                    onChange={(_, d) => setSection(section, d.value)}
                  />
                </Field>
              )}
              {/* Provenance follows the text: the record's words while unchanged, the participant's once edited or written. */}
              {showChip && (
                <div className={cls.chipRow} id={chipId}>
                  {init.source && value === init.text ? (
                    <ProvenanceChip source="note" label={init.source === 'note' ? s('fromNote') : s('fromFirstReferral')} />
                  ) : (
                    <ProvenanceChip source="own" label={init.source ? s('editedByYou') : s('writtenByYou')} />
                  )}
                </div>
              )}
            </div>
            <div className={cls.margin} role="note" aria-label={`${s('whatDpsLooksFor')}: ${label}`} data-margin="">
              <span className={cls.marginTitle}>{s('whatDpsLooksFor')}</span>
              <span>{t(meta.guide)}</span>
              {status && (
                <span className={cls.marginStatus} data-status={status}>
                  {status === 'mentioned' ? (
                    <CheckmarkCircle16Regular aria-hidden="true" />
                  ) : status === 'partlyMentioned' ? (
                    <CircleHalfFill16Regular aria-hidden="true" />
                  ) : (
                    <Circle16Regular aria-hidden="true" />
                  )}
                  {/* Once the referral can no longer change, «ennå» goes: «Ikke funnet» (r5A-04). */}
                  {status === 'notMentionedYet' && readOnly ? s('notMentioned') : s(status)}
                </span>
              )}
            </div>
          </div>
        );
      })}
      <DesignNote id="henvisning-margin" show={work.notes} />
      {!second && <FromAtlasPanel gp={gp} />}
      <p className={cls.attach}>
        <Attach16Regular aria-hidden="true" />
        {s('attachmentNote')}
      </p>
      {readOnly ? (
        <p className={cls.sentLine} ref={sentRef} tabIndex={-1}>
          {sent ? s('referralSentOn', { date: formatDate((second ? gp.secondReferralDate : gp.referralDate) ?? GP_TODAY, lang) }) : status === 'draft' ? s('draftSaved') : s('formStepDone')}
        </p>
      ) : (
        <div className={cls.buttons}>
          <Button ref={sendBtn} icon={<Send20Regular />} onClick={send}>
            {s('sendReferral')}
          </Button>
          <Button icon={<Save20Regular />} onClick={keep}>
            {s('saveDraft')}
          </Button>
        </div>
      )}
      {/* The hold choice says what it means (C2 b): a GP may otherwise read it as «finish later». */}
      {!readOnly && status !== 'draft' && <p className={cls.caption}>{second ? s('draftMeansSecond') : caseId === 'torbjorn' ? s('draftMeansShort') : s('draftMeans')}</p>}
      {!readOnly && status === 'draft' && <p className={cls.caption}>{s('draftSaved')}</p>}
      {status === 'draft' && !second && !work.held(caseId) && (
        <div className={cls.buttons}>
          <Button appearance="primary" icon={<ArrowRight16Regular />} iconPosition="after" onClick={() => work.go(work.casePath(caseId, caseStat.next))}>
            {s('continue')}
          </Button>
        </div>
      )}
      <Responsibility />
      {clearsDps && (
        <ConfirmDialog
          open={confirmClear}
          title={s('clearDpsTitle')}
          body={s('clearDpsBody')}
          confirmLabel={s('clearDpsConfirm')}
          icon={<Delete20Regular />}
          onCancel={() => {
            // Cancelled: focus goes back to «Send henvisning» (2.4.3).
            setConfirmClear(false);
            focusAfterOverlay(() => sendBtn.current);
          }}
          onConfirm={send}
        />
      )}
    </div>
  );
}
