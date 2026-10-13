import { makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import type { CaseId, PatternData } from '../content/types';
import { cases, vocab } from '../content';
import { formatDate, useLang } from '../i18n/i18n';
import { useWorkOptional } from '../state/work';
import { DesignNote, ProvenanceChip } from '../patterns/basics';
import { caseStatus, gpHeld } from '../engine/flow';
import { neutralBar } from '../theme/constants';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  privacy: {
    ...typographyStyles.body1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  meta: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS, alignItems: 'center', ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  // One column when the box is narrower than a card (a tour frame at 320 px, r8A-01).
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: tokens.spacingHorizontalL, rowGap: tokens.spacingVerticalL },
  block: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, minWidth: 0 },
  h2: { ...typographyStyles.subtitle2, margin: 0 },
  total: { ...typographyStyles.title3, margin: 0 },
  bar: {
    display: 'flex',
    height: '12px',
    borderRadius: tokens.borderRadiusCircular,
    overflow: 'hidden',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    printColorAdjust: 'exact',
    WebkitPrintColorAdjust: 'exact',
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  seg0: { backgroundColor: neutralBar[0], '@media (forced-colors: active)': { forcedColorAdjust: 'none', backgroundColor: 'CanvasText' } },
  seg1: { backgroundColor: neutralBar[1], '@media (forced-colors: active)': { forcedColorAdjust: 'none', backgroundColor: 'GrayText' } },
  // In forced colours the third and fourth segments differ by pattern, not only by an outline (1.4.11, AX-15).
  seg2: {
    backgroundColor: neutralBar[2],
    '@media (forced-colors: active)': {
      forcedColorAdjust: 'none',
      backgroundColor: 'Canvas',
      backgroundImage: 'repeating-linear-gradient(45deg, CanvasText 0 2px, Canvas 2px 6px)',
    },
  },
  seg3: {
    backgroundColor: neutralBar[3],
    '@media (forced-colors: active)': { forcedColorAdjust: 'none', backgroundColor: 'Canvas', outline: '1px solid CanvasText', outlineOffset: '-1px' },
  },
  legend: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  legendItem: {
    display: 'grid',
    gridTemplateColumns: '14px minmax(0, 1fr) auto',
    columnGap: tokens.spacingHorizontalS,
    alignItems: 'center',
    paddingBlock: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ...typographyStyles.body1,
  },
  swatch: { width: '12px', height: '12px', borderRadius: '2px', border: `1px solid ${tokens.colorNeutralStroke1}` },
  count: { ...typographyStyles.body1Strong, fontVariantNumeric: 'tabular-nums' },
  rows: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ...typographyStyles.body1,
  },
  note: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
  empty: {
    ...typographyStyles.body1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px dashed ${tokens.colorNeutralStroke1}`,
    color: tokens.colorNeutralForeground2,
  },
  dash: { color: tokens.colorNeutralForeground3 },
});

const SEG = ['seg0', 'seg1', 'seg2', 'seg3'] as const;

/** «Denne økten»: what the viewer did as GP in this session, read from the stored work. */
function SessionRows() {
  const cls = useStyles();
  const { s, t } = useLang();
  const work = useWorkOptional();
  if (!work || work.viewer !== 'gp') return null;
  const ids: CaseId[] = ['kari', 'erlend', 'astrid', 'torbjorn'];
  const rows: { name: string; text: string }[] = [];
  ids.forEach((caseId) => {
    const gp = work.gp(caseId);
    const c = cases[caseId];
    if (caseId === 'astrid') {
      if (gp.secondReferral) rows.push({ name: c.patient.name, text: gp.secondReferral === 'sent' ? s('chipReferred') : s('chipDraft') });
      return;
    }
    if (gp.referral === 'draft' || (gp.decisionSaved && gp.decision === 'behold' && !gp.referral)) {
      rows.push({ name: c.patient.name, text: gpHeld(caseId, gp) ? s('noReferralSent') : s('chipDraft') });
      return;
    }
    if (gp.referral !== 'sent') return;
    const st = caseStatus({
      caseId,
      content: c,
      viewer: 'gp',
      mode: work.mode,
      gp,
      dps: work.dps(caseId),
      gpPlayed: work.played('gp', caseId),
      dpsPlayed: work.played('dps', caseId),
      held: work.held(caseId),
      phase: work.phase(caseId),
      withoutAtlas: work.withoutAtlas(caseId),
    });
    const last = [...st.thread.messages].reverse().find((m) => m.from === 'dps' && (m.outcome === 'rett' || m.outcome === 'retur' || m.outcome === 'info'));
    const outcome = last && (last.outcome === 'rett' || last.outcome === 'retur' || last.outcome === 'info') ? t(vocab.outcomes[last.outcome].label) : s('awaitingReply');
    rows.push({ name: c.patient.name, text: `${s('chipReferred')} · ${outcome}` });
  });
  return (
    <section className={cls.block} aria-label={s('patternSession')}>
      <h2 className={cls.h2}>{s('patternSession')}</h2>
      {rows.length === 0 ? (
        <p className={cls.note}>{s('patternSessionNone')}</p>
      ) : (
        <ul className={cls.rows}>
          {rows.map((r) => (
            <li key={r.name} className={cls.row}>
              <span>{r.name}</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Mitt henvisningsmønster: counts, a neutral proportion bar, return reasons
 * («En retur kan ha flere årsaker»), quarters, the privacy line and the
 * fictional-figures label. No score, no colour for outcomes (B1, B5).
 */
export function PatternView({ data, noData, session, compact, notes }: { data: PatternData; noData?: boolean; session?: boolean; compact?: boolean; notes?: boolean }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const sum = data.outcomes.reduce((a, o) => a + o.count, 0) || 1;
  return (
    <div className={cls.root} data-section="monster">
      {!compact && <p className={cls.privacy}>{s('patternPrivacy')}</p>}
      {/* With no data there are no figures: no «Fiktive tall», period or footnote beside «Ingen data ennå» (SV-17). */}
      {!noData && (
        <div className={cls.meta}>
          <ProvenanceChip source="fictional" />
          <span>{t(data.period)}</span>
          <span>{s('asOf', { date: formatDate(data.asOf, lang) })}</span>
        </div>
      )}
      {noData ? (
        <>
          <p className={cls.empty}>
            <strong>{s('noDataTitle')}.</strong> {s('noDataPattern')}
          </p>
          <div className={cls.grid}>
            <section className={cls.block} aria-label={s('patternOutcomes')}>
              <h2 className={cls.h2}>{s('patternOutcomes')}</h2>
              <ul className={cls.legend}>
                {data.outcomes.map((o) => (
                  <li key={o.key} className={cls.legendItem}>
                    <span />
                    <span>{t(o.label)}</span>
                    <span className={cls.dash}>{s('none')}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className={cls.block} aria-label={s('patternReasons')}>
              <h2 className={cls.h2}>{s('patternReasons')}</h2>
              <p className={cls.note}>{s('patternReasonsNote')}</p>
            </section>
          </div>
        </>
      ) : (
        <div className={cls.grid}>
          <section className={cls.block} aria-label={s('patternOutcomes')}>
            <h2 className={cls.h2}>{s('patternOutcomes')}</h2>
            <p className={cls.total}>{s('referralsCount', { n: data.total })}</p>
            <div className={cls.bar} aria-hidden="true">
              {data.outcomes.map((o, i) =>
                o.count > 0 ? <span key={o.key} className={mergeClasses(cls[SEG[i % 4]])} style={{ width: `${(o.count / sum) * 100}%` }} /> : null,
              )}
            </div>
            <ul className={cls.legend}>
              {data.outcomes.map((o, i) => (
                <li key={o.key} className={cls.legendItem}>
                  <span className={mergeClasses(cls.swatch, cls[SEG[i % 4]])} aria-hidden="true" />
                  <span>{t(o.label)}</span>
                  <span className={cls.count}>{o.count}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className={cls.block} aria-label={s('patternReasons')}>
            <h2 className={cls.h2}>{s('patternReasons')}</h2>
            <ul className={cls.rows}>
              {data.returnReasons.map((r) => (
                <li key={r.reason} className={cls.row}>
                  <span>{t(vocab.reasons[r.reason])}</span>
                  <span className={cls.count}>{r.count}</span>
                </li>
              ))}
            </ul>
            <p className={cls.note}>{s('patternReasonsNote')}</p>
          </section>
          <section className={cls.block} aria-label={s('patternQuarters')}>
            <h2 className={cls.h2}>{s('patternQuarters')}</h2>
            <ul className={cls.rows}>
              {data.quarters.map((q) => (
                <li key={q.label.nb} className={cls.row}>
                  <span>{t(q.label)}</span>
                  <span className={cls.count}>{q.count}</span>
                </li>
              ))}
            </ul>
          </section>
          {session && <SessionRows />}
        </div>
      )}
      {!noData && <p className={cls.note}>{t(data.footnote)}</p>}
      <DesignNote id="monster" show={!!notes} />
    </div>
  );
}
