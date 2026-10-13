import { SearchBox, makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { Circle12Filled } from '@fluentui/react-icons';
import { useMemo, useState } from 'react';
import type { CaseId, T } from '../content/types';
import { cases, ordinary, vocab } from '../content';
import { formatDate, formatDateWithWeekday, useLang } from '../i18n/i18n';
import { DPS_TODAY, GP_TODAY } from '../engine/clock';
import { caseStatus, gpHeld } from '../engine/flow';
import { RouterLink } from '../router/router';
import { useWork, type WorkApi } from '../state/work';
import { DesignNote, StatusChip } from '../patterns/basics';
import { Muted, PageCard } from '../patterns/layout';
import { PageHeading } from '../shell/PageHeading';

/** «1 referral case», not «1 referral cases» (r6F-07). */
function summaryKey(total: number, withCase: number): 'timelisteSummaryOne' | 'timelisteSummaryOneCase' | 'timelisteSummary' {
  if (withCase === 1) return total === 1 ? 'timelisteSummaryOne' : 'timelisteSummaryOneCase';
  return 'timelisteSummary';
}

const useStyles = makeStyles({
  head: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacingHorizontalL, flexWrap: 'wrap' },
  search: { width: 'min(360px, 100%)' },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  row: {
    display: 'grid',
    gridTemplateColumns: '64px 44px minmax(0, 1fr) auto',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalXS,
    minHeight: '64px',
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    textDecoration: 'none',
    boxSizing: 'border-box',
    '@media only screen and (max-width: 639px)': {
      gridTemplateColumns: '52px 40px minmax(0, 1fr)',
    },
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  link: {
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover, border: `1px solid ${tokens.colorNeutralStroke1Hover}` },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
  },
  muted: { color: tokens.colorNeutralForeground2 },
  time: { ...typographyStyles.subtitle2, fontVariantNumeric: 'tabular-nums', color: tokens.colorNeutralForeground1 },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...typographyStyles.caption1Strong,
  },
  who: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  name: { ...typographyStyles.body1Strong },
  visit: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    justifyContent: 'flex-end',
    '@media only screen and (max-width: 639px)': { gridColumn: '3 / 4', justifyContent: 'flex-start' },
  },
  // Below 1024 px the received date, the sender and the deadline stay on the row, under the
  // patient with their labels, instead of disappearing (WCAG 1.4.10, MF-05).
  qRow: {
    gridTemplateColumns: 'minmax(96px, 120px) minmax(0, 1.4fr) minmax(0, 1fr) minmax(110px, 180px) minmax(170px, 260px)',
    gridTemplateAreas: '"rec pat from dl chips"',
    '@media only screen and (max-width: 1023px)': {
      alignItems: 'start',
      gridTemplateColumns: 'auto auto minmax(0, 1fr) auto',
      gridTemplateAreas: '"pat pat pat chips" "rec from dl dl"',
    },
    '@media only screen and (max-width: 639px)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
      gridTemplateAreas: '"pat" "chips" "rec" "from" "dl"',
    },
  },
  qRec: { gridArea: 'rec' },
  qPat: { gridArea: 'pat' },
  qFrom: { gridArea: 'from' },
  qDl: { gridArea: 'dl' },
  /** The queue's single column below 640: the chips sit under the patient, not in a third column. */
  // The new-dot stays beside the chips; chips that wrap line up with each other, not under the dot (r5A-07).
  qChipCell: { flexWrap: 'nowrap', alignItems: 'flex-start' },
  qChipGroup: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS, minWidth: 0 },
  // As tall as a chip, so the dot sits on the middle of the first chip line (r6A-06).
  qNewMark: { minHeight: '24px', flexShrink: 0 },
  qChips: {
    minWidth: 0,
    gridArea: 'chips',
    // Under the «Status» heading, not at the far edge (r4A-07).
    '@media only screen and (min-width: 1024px)': { justifyContent: 'flex-start' },
    '@media only screen and (max-width: 639px)': { gridColumn: 'auto' },
  },
  qCell: { display: 'flex', flexDirection: 'column', minWidth: 0, ...typographyStyles.body1 },
  qLabel: {
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground3,
    '@media only screen and (min-width: 1024px)': { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' },
  },
  qHead: {
    display: 'grid',
    gridTemplateColumns: 'minmax(96px, 120px) minmax(0, 1.4fr) minmax(0, 1fr) minmax(110px, 180px) minmax(170px, 260px)',
    boxSizing: 'border-box',
    columnGap: tokens.spacingHorizontalM,
    paddingInline: `calc(${tokens.spacingHorizontalL} + 1px)`,
    ...typographyStyles.caption1Strong,
    color: tokens.colorNeutralForeground3,
    '@media only screen and (max-width: 1023px)': { display: 'none' },
  },
  newMark: { color: tokens.colorBrandForeground1, display: 'inline-flex', alignItems: 'center', gap: '4px', ...typographyStyles.caption1Strong },
  later: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  button: { width: '100%', textAlign: 'start', font: 'inherit', cursor: 'pointer' },
  selected: { border: `2px solid ${tokens.colorBrandStroke1}`, backgroundColor: tokens.colorBrandBackground2 },
});

export interface Chip {
  label: string;
  isNew?: boolean;
}

/* ---------- Chips from the work on a case ---------- */

export function gpChips(caseId: CaseId, work: WorkApi, t: (x: T) => string, s: (k: 'chipReferred' | 'chipDraft' | 'chipHeld' | 'chipReply' | 'chipDone') => string): Chip[] {
  const c = cases[caseId];
  const gp = work.gp(caseId);
  const chips: Chip[] = c.gp.timeliste.chips.map((x) => ({ label: t(x.label), isNew: x.isNew }));
  if (caseId !== 'astrid') {
    if (gp.referral === 'sent') chips.push({ label: s('chipReferred') });
    else if (gp.referral === 'draft') chips.push({ label: s('chipDraft') });
    else if (gp.decisionSaved && gp.decision === 'behold') chips.push({ label: s('chipHeld') });
    if (gp.referral === 'sent' && !gpHeld(caseId, gp)) {
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
      if (st.thread.messages.some((m) => m.from === 'dps' && m.outcome !== 'skip')) chips.push({ label: s('chipReply'), isNew: !st.complete });
    }
  }
  if (work.mode === 'study' && work.phase(caseId) === 'done') chips.push({ label: s('chipDone') });
  return chips;
}

export function dpsChips(
  caseId: CaseId,
  work: WorkApi,
  t: (x: T) => string,
  s: (k: 'chipAnswered' | 'chipNotAnswered' | 'chipNewMessage' | 'chipNoReply' | 'chipDone' | 'chipAssessed') => string,
): Chip[] {
  const c = cases[caseId];
  const dps = work.dps(caseId);
  if (caseId === 'astrid') {
    // The GP's question: new until DPS answers it or chooses not to answer now (R2DPS-05, R3F-07).
    const done = work.mode === 'study' && work.phase(caseId) === 'done' ? [{ label: s('chipDone') }] : [];
    if (dps.answerSent) return [{ label: s('chipAnswered') }, ...done];
    if (dps.answerSkipped) return [{ label: s('chipNotAnswered') }, ...done];
    // Review mode: when the GP side was played without a question, there is no new message to read (r7F-02).
    const g = work.gp(caseId);
    const noQuestion = work.mode === 'review' && work.played('gp', caseId) && g.skippedMessage === true && !g.messages.some((m) => m.kind === 'question');
    const chips = c.dps!.queue.chips.filter((x) => !(noQuestion && x.isNew));
    return [...chips.map((x) => ({ label: t(x.label), isNew: x.isNew })), ...done];
  }
  if (!dps.sent || !dps.outcome) return c.dps!.queue.chips.map((x) => ({ label: t(x.label), isNew: x.isNew }));
  const chips: Chip[] = [{ label: `${s('chipAssessed')}: ${t(vocab.outcomes[dps.finalOutcome ?? dps.outcome].label).toLowerCase()}` }];
  const st = caseStatus({
    caseId,
    content: c,
    viewer: 'dps',
    mode: work.mode,
    gp: work.gp(caseId),
    dps,
    gpPlayed: work.played('gp', caseId),
    dpsPlayed: work.played('dps', caseId),
    held: work.held(caseId),
    phase: work.phase(caseId),
    withoutAtlas: work.withoutAtlas(caseId),
  });
  // DPS's final choice is due: after the GP's reply, or after the GP chose not to reply (r7F-02).
  if (st.thread.awaiting === 'dpsFinal') chips.push({ label: st.thread.gpSkipped ? s('chipNoReply') : s('chipNewMessage'), isNew: true });
  if (work.mode === 'study' && work.phase(caseId) === 'done') chips.push({ label: s('chipDone') });
  return chips;
}

/* ---------- Timeliste (GP) ---------- */

export interface ListEntry {
  caseId: CaseId;
  /** Where the row leads; omitted when the row cannot be opened. */
  to?: string;
  /** The tour's frames open a row in place instead of leaving the tour. */
  onOpen?: () => void;
  selected?: boolean;
  chips: Chip[];
  /** A quiet line when the row is visible but not yet open in the study. */
  note?: string;
}

/** Timeliste i dag: time, initials, name and age, visit type, neutral status chips (new in brand tint). */
export function TimelisteView({ entries, notes, title, withSearch = true }: { entries: ListEntry[]; notes?: boolean; title?: boolean; withSearch?: boolean }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const all = [
      ...entries.map((e) => ({ kind: 'case' as const, e, time: cases[e.caseId].gp.timeliste.time })),
      ...ordinary.map((o) => ({ kind: 'ordinary' as const, o, time: o.time })),
    ].sort((a, b) => a.time.localeCompare(b.time));
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((r) => {
      const name = r.kind === 'case' ? cases[r.e.caseId].patient.name : r.o.name;
      const fnr = r.kind === 'case' ? cases[r.e.caseId].patient.fnr : r.o.fnr;
      return name.toLowerCase().includes(needle) || fnr.replace(/\D/g, '').startsWith(needle.replace(/\D/g, '') || '¤');
    });
  }, [entries, q]);
  const withCase = entries.length;
  const total = entries.length + ordinary.length;
  return (
    <>
      <div className={cls.head}>
        {title !== false ? (
          <PageHeading title={s('navTimeliste')} sub={s(summaryKey(total, withCase), { date: capital(formatDateWithWeekday(GP_TODAY, lang)), n: total, m: withCase })}>
            {s('timelisteTitle')}
          </PageHeading>
        ) : (
          <div>
            <h2 style={{ ...typographyStyles.subtitle1, margin: 0 }}>{s('timelisteTitle')}</h2>
            <Muted>{s(summaryKey(total, withCase), { date: capital(formatDateWithWeekday(GP_TODAY, lang)), n: total, m: withCase })}</Muted>
          </div>
        )}
        {withSearch && (
          <SearchBox
            className={cls.search}
            value={q}
            onChange={(_, d) => setQ(d.value)}
            placeholder={s('searchPatients')}
            aria-label={s('searchPatients')}
            dismiss={{ 'aria-label': s('clearSearch') }}
          />
        )}
      </div>
      <DesignNote id="timeliste" show={!!notes} />
      {rows.length === 0 ? (
        <Muted>{s('noMatches')}</Muted>
      ) : (
        <ul className={cls.list} aria-label={s('timelisteTitle')}>
          {rows.map((r) => {
            if (r.kind === 'ordinary') {
              return (
                <li key={r.o.id}>
                  <div className={mergeClasses(cls.row, cls.muted)}>
                    <span className={cls.time}>{r.o.time}</span>
                    <span className={cls.avatar} aria-hidden="true">
                      {r.o.initials}
                    </span>
                    <span className={cls.who}>
                      <span className={cls.name}>{s('patientAge', { name: r.o.name, age: r.o.age })}</span>
                      <span className={cls.visit}>{t(r.o.visit)}</span>
                    </span>
                  </div>
                </li>
              );
            }
            const c = cases[r.e.caseId];
            const inner = (
              <>
                <span className={cls.time}>{c.gp.timeliste.time}</span>
                <span className={cls.avatar} aria-hidden="true">
                  {c.patient.initials}
                </span>
                <span className={cls.who}>
                  <span className={cls.name}>{s('patientAge', { name: c.patient.name, age: c.patient.age })}</span>
                  <span className={cls.visit}>{t(c.gp.timeliste.visit)}</span>
                  {r.e.note && <span className={cls.later}>{r.e.note}</span>}
                </span>
                {r.e.chips.length > 0 && (
                  <span className={cls.chips}>
                    {r.e.chips.map((x, i) => (
                      <StatusChip key={i} isNew={x.isNew}>
                        {x.label}
                      </StatusChip>
                    ))}
                  </span>
                )}
              </>
            );
            return (
              <li key={r.e.caseId}>
                {r.e.to ? (
                  <RouterLink to={r.e.to} className={mergeClasses(cls.row, cls.link)}>
                    {inner}
                  </RouterLink>
                ) : r.e.onOpen ? (
                  <button type="button" className={mergeClasses(cls.row, cls.link, cls.button, r.e.selected && cls.selected)} onClick={r.e.onOpen} aria-pressed={r.e.selected}>
                    {inner}
                  </button>
                ) : (
                  <div className={cls.row}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Muted>{s('ordinaryNote')}</Muted>
    </>
  );
}

/* ---------- Mottatte henvisninger (DPS) ---------- */

export function QueueView({ entries, notes, title }: { entries: ListEntry[]; notes?: boolean; title?: boolean }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  return (
    <>
      <div className={cls.head}>
        {title !== false ? (
          <PageHeading title={s('queueTitle')} sub={s(entries.length === 1 ? 'queueSummaryOne' : 'queueSummary', { date: capital(formatDateWithWeekday(DPS_TODAY, lang)), n: entries.length })}>
            {s('queueTitle')}
          </PageHeading>
        ) : (
          <div>
            <h2 style={{ ...typographyStyles.subtitle1, margin: 0 }}>{s('queueTitle')}</h2>
            <Muted>{s(entries.length === 1 ? 'queueSummaryOne' : 'queueSummary', { date: capital(formatDateWithWeekday(DPS_TODAY, lang)), n: entries.length })}</Muted>
          </div>
        )}
      </div>
      <DesignNote id="dps-ko" show={!!notes} />
      <div className={cls.qHead} aria-hidden="true">
        <span>{s('colReceived')}</span>
        <span>{s('colPatient')}</span>
        <span>{s('colFrom')}</span>
        <span>{s('colDeadline')}</span>
        <span>{s('colStatus')}</span>
      </div>
      <ul className={cls.list} aria-label={s('queueTitle')}>
        {entries.map((e) => {
          const c = cases[e.caseId];
          const q = c.dps!.queue;
          const isNew = e.chips.some((x) => x.isNew);
          const inner = (
            <>
              <span className={mergeClasses(cls.qCell, cls.qRec)}>
                <span className={cls.qLabel}>{s('colReceived')}</span>
                {formatDate(q.received, lang)}
              </span>
              <span className={mergeClasses(cls.qCell, cls.qPat)}>
                <span className={cls.qLabel}>{s('colPatient')}</span>
                <span className={cls.name}>{s('patientAge', { name: c.patient.name, age: c.patient.age })}</span>
                {e.note && <span className={cls.later}>{e.note}</span>}
              </span>
              <span className={mergeClasses(cls.qCell, cls.qFrom)}>
                <span className={cls.qLabel}>{s('colFrom')}</span>
                {t(vocab.roles.gp)}
              </span>
              <span className={mergeClasses(cls.qCell, cls.qDl)}>
                {/* A referral DPS has already answered shows when it was assessed, not a deadline that has passed (R3F-07). */}
                {c.dps!.returnSent ? (
                  s('queueAssessedOn', { date: formatDate(c.dps!.returnSent.date, lang) })
                ) : (
                  <>
                    <span className={cls.qLabel}>{s('colDeadline')}</span>
                    {formatDate(q.deadline, lang)}
                  </>
                )}
              </span>
              <span className={mergeClasses(cls.chips, cls.qChips, cls.qChipCell)}>
                {isNew && (
                  <span className={mergeClasses(cls.newMark, cls.qNewMark)}>
                    <Circle12Filled aria-hidden="true" />
                  </span>
                )}
                <span className={cls.qChipGroup}>
                  {e.chips.map((x, i) => (
                    <StatusChip key={i} isNew={x.isNew}>
                      {x.label}
                    </StatusChip>
                  ))}
                </span>
              </span>
            </>
          );
          return (
            <li key={e.caseId}>
              {e.to ? (
                <RouterLink to={e.to} className={mergeClasses(cls.row, cls.qRow, cls.link)}>
                  {inner}
                </RouterLink>
              ) : e.onOpen ? (
                <button type="button" className={mergeClasses(cls.row, cls.qRow, cls.link, cls.button, e.selected && cls.selected)} onClick={e.onOpen} aria-pressed={e.selected}>
                  {inner}
                </button>
              ) : (
                <div className={mergeClasses(cls.row, cls.qRow)}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function capital(x: string): string {
  return x ? x.charAt(0).toUpperCase() + x.slice(1) : x;
}

/** The list page for the viewer's role (Timeliste or Mottatte henvisninger). */
export function ListPage({ caseIds, openable, note }: { caseIds: CaseId[]; openable: (c: CaseId) => boolean; note?: (c: CaseId) => string | undefined }) {
  const { s, t } = useLang();
  const work = useWork();
  const S = s as unknown as (k: string) => string;
  if (work.viewer === 'gp') {
    const entries: ListEntry[] = caseIds.map((caseId) => ({
      caseId,
      to: openable(caseId) ? (work.mode === 'study' ? work.casePath(caseId) : work.casePath(caseId, 'orientering')) : undefined,
      chips: gpChips(caseId, work, t, S),
      note: note?.(caseId),
    }));
    return (
      <PageCard>
        <TimelisteView entries={entries} notes={work.notes} />
      </PageCard>
    );
  }
  const entries: ListEntry[] = caseIds
    .filter((c) => !!cases[c].dps)
    .map((caseId) => ({
      caseId,
      to: openable(caseId) ? (work.mode === 'study' ? work.casePath(caseId) : work.casePath(caseId, 'orientering')) : undefined,
      chips: dpsChips(caseId, work, t, S),
      note: note?.(caseId),
    }));
  return (
    <PageCard>
      <QueueView entries={entries} notes={work.notes} />
    </PageCard>
  );
}
