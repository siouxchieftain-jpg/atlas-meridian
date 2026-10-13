import { SearchBox, makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowRight16Regular, Circle12Filled, Clock16Regular } from '@fluentui/react-icons';
import { useId, useMemo, useState, type ReactNode } from 'react';
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
  // The study's guide card beside the cards; below its width it goes on top.
  body: { display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: '24px' },
  main: { flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  // Two tiers in one list: the cases, then the ordinary patients on a row of their own.
  grid: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
    gap: '16px',
  },
  gridWide: { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))' },
  tierStart: { gridColumnStart: 1 },
  card: {
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingInline: '18px',
    paddingBlockStart: '16px',
    paddingBlockEnd: '14px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    textDecoration: 'none',
    textAlign: 'start',
    font: 'inherit',
    width: '100%',
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  link: {
    cursor: 'pointer',
    ':hover': { border: `1px solid ${tokens.colorBrandStroke2}`, boxShadow: tokens.shadow4 },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
  },
  // The study's current case: a brand edge, as in the guide card's list.
  current: { border: `1px solid ${tokens.colorBrandStroke2}` },
  selected: { border: `2px solid ${tokens.colorBrandStroke1}`, backgroundColor: tokens.colorBrandBackground2, paddingInline: '17px', paddingBlockStart: '15px', paddingBlockEnd: '13px' },
  quiet: { backgroundColor: tokens.colorNeutralBackground2, color: tokens.colorNeutralForeground2 },
  top: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 8px' },
  time: { ...typographyStyles.body1Strong, fontVariantNumeric: 'tabular-nums' },
  received: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  tag: {
    ...typographyStyles.caption1,
    paddingInline: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'nowrap',
  },
  tagNow: { ...typographyStyles.caption1Strong, color: tokens.colorBrandForeground1, backgroundColor: tokens.colorBrandBackground2, border: `1px solid ${tokens.colorBrandStroke2}` },
  tagPlain: { border: 'none', paddingInline: 0, color: tokens.colorNeutralForeground3 },
  who: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM, minWidth: 0 },
  avatar: {
    flex: '0 0 36px',
    width: '36px',
    height: '36px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...typographyStyles.caption1Strong,
  },
  whoText: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  name: { ...typographyStyles.body1Strong, overflowWrap: 'anywhere' },
  visit: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  summary: {
    ...typographyStyles.body1,
    margin: 0,
    color: tokens.colorNeutralForeground2,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  chips: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  newMark: { color: tokens.colorBrandForeground1, display: 'inline-flex', alignItems: 'center' },
  foot: {
    marginBlockStart: 'auto',
    paddingBlockStart: '10px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: '28px',
  },
  footOpen: { ...typographyStyles.body1Strong, color: tokens.colorBrandForegroundLink },
  footLater: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  footQuiet: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, marginBlockStart: 'auto' },
  caption: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground3 },
  // Frister: when each referral or message is due, beside the referral cards.
  deadlines: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    paddingInline: '18px',
    paddingBlock: '16px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  deadlinesTitle: { ...typographyStyles.body1Strong, margin: 0, display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
  dl: { margin: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  dt: { ...typographyStyles.body1Strong },
  dd: { margin: 0, display: 'flex', flexDirection: 'column', gap: '2px', ...typographyStyles.body1 },
  ddNote: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
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
  /** Where the card leads; omitted when it cannot be opened. */
  to?: string;
  /** The tour's frames open a card in place instead of leaving the tour. */
  onOpen?: () => void;
  selected?: boolean;
  chips: Chip[];
  /** A quiet line when the card is visible but not yet open in the study. */
  note?: string;
  /** «Sak 1» to «Sak 3» in the study; the current case is marked. */
  tag?: string;
  current?: boolean;
}

/** The first sentence of the briefing's «Hvem» row is the name and age, which the card already shows. */
function whoSummary(caseId: CaseId, t: (x: T) => string): string | undefined {
  const row = cases[caseId].gp.briefing.rows.find((r) => r.label.nb === 'Hvem');
  if (!row) return undefined;
  const text = t(row.value);
  const i = text.indexOf('. ');
  return i > 0 ? text.slice(i + 2) : text;
}

/** What DPS gets with the referral (the briefing's «Hva du får»). */
function dpsSummary(caseId: CaseId, t: (x: T) => string): string | undefined {
  const row = cases[caseId].dps?.briefing.rows.find((r) => r.label.nb === 'Hva du får');
  return row ? t(row.value) : undefined;
}

/** The card's outer element: a link, a toggle button in the tour, or a plain card. */
function CardShell({ entry, className, children }: { entry: ListEntry; className?: string; children: ReactNode }) {
  const cls = useStyles();
  if (entry.to) {
    return (
      <RouterLink to={entry.to} className={mergeClasses(cls.card, cls.link, entry.current && cls.current, className)}>
        {children}
      </RouterLink>
    );
  }
  if (entry.onOpen) {
    return (
      <button type="button" className={mergeClasses(cls.card, cls.link, entry.selected && cls.selected, className)} onClick={entry.onOpen} aria-pressed={entry.selected}>
        {children}
      </button>
    );
  }
  return <div className={mergeClasses(cls.card, className)}>{children}</div>;
}

function CardFoot({ entry, openLabel }: { entry: ListEntry; openLabel: string }) {
  const cls = useStyles();
  if (entry.to || entry.onOpen) {
    return (
      <span className={mergeClasses(cls.foot, cls.footOpen)}>
        {openLabel}
        <ArrowRight16Regular aria-hidden="true" />
      </span>
    );
  }
  return entry.note ? (
    <span className={mergeClasses(cls.foot, cls.footLater)}>
      <Clock16Regular aria-hidden="true" />
      {entry.note}
    </span>
  ) : null;
}

/** Timeliste i dag: the cases first, then the ordinary patients on a row of their own; neutral status chips (new in brand tint). */
export function TimelisteView({
  entries,
  notes,
  title,
  withSearch = true,
  aside,
}: {
  entries: ListEntry[];
  notes?: boolean;
  title?: boolean;
  withSearch?: boolean;
  /** The study's guide card, beside the cards. */
  aside?: ReactNode;
}) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const [q, setQ] = useState('');
  const match = (name: string, fnr: string) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return name.toLowerCase().includes(needle) || fnr.replace(/\D/g, '').startsWith(needle.replace(/\D/g, '') || '¤');
  };
  const caseRows = useMemo(
    () => entries.filter((e) => match(cases[e.caseId].patient.name, cases[e.caseId].patient.fnr)).sort((a, b) => cases[a.caseId].gp.timeliste.time.localeCompare(cases[b.caseId].gp.timeliste.time)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, q],
  );
  const routineRows = useMemo(
    () => ordinary.filter((o) => match(o.name, o.fnr)).sort((a, b) => a.time.localeCompare(b.time)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q],
  );
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
      <div className={cls.body}>
        {aside}
        <div className={cls.main}>
          <DesignNote id="timeliste" show={!!notes} />
          {caseRows.length + routineRows.length === 0 ? (
            <Muted>{s('noMatches')}</Muted>
          ) : (
            <ul className={cls.grid} aria-label={s('timelisteTitle')}>
              {caseRows.map((e) => {
                const c = cases[e.caseId];
                const summary = whoSummary(e.caseId, t);
                return (
                  <li key={e.caseId}>
                    <CardShell entry={e}>
                      <span className={cls.top}>
                        <span className={cls.time}>{c.gp.timeliste.time}</span>
                        {e.tag && <span className={mergeClasses(cls.tag, e.current && cls.tagNow)}>{e.tag}</span>}
                      </span>
                      <span className={cls.who}>
                        <span className={cls.avatar} aria-hidden="true">
                          {c.patient.initials}
                        </span>
                        <span className={cls.whoText}>
                          <span className={cls.name}>{s('patientAge', { name: c.patient.name, age: c.patient.age })}</span>
                          <span className={cls.visit}>{t(c.gp.timeliste.visit)}</span>
                        </span>
                      </span>
                      {summary && <span className={cls.summary}>{summary}</span>}
                      {e.chips.length > 0 && (
                        <span className={cls.chips}>
                          {e.chips.map((x, i) => (
                            <StatusChip key={i} isNew={x.isNew}>
                              {x.label}
                            </StatusChip>
                          ))}
                        </span>
                      )}
                      <CardFoot entry={e} openLabel={s('listOpenCase')} />
                    </CardShell>
                  </li>
                );
              })}
              {routineRows.map((o, i) => (
                <li key={o.id} className={i === 0 ? cls.tierStart : undefined}>
                  <div className={mergeClasses(cls.card, cls.quiet)}>
                    <span className={cls.top}>
                      <span className={cls.time}>{o.time}</span>
                      <span className={mergeClasses(cls.tag, cls.tagPlain)}>{s('listRoutineTag')}</span>
                    </span>
                    <span className={cls.who}>
                      <span className={cls.avatar} aria-hidden="true">
                        {o.initials}
                      </span>
                      <span className={cls.whoText}>
                        <span className={cls.name}>{s('patientAge', { name: o.name, age: o.age })}</span>
                        <span className={cls.visit}>{t(o.visit)}</span>
                      </span>
                    </span>
                    <span className={cls.footQuiet}>{s('listRoutineClosed')}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className={cls.caption}>
            {s('listSortedGp')} {s('ordinaryNote')}
          </p>
        </div>
      </div>
    </>
  );
}

/* ---------- Mottatte henvisninger (DPS) ---------- */

export function QueueView({ entries, notes, title, aside }: { entries: ListEntry[]; notes?: boolean; title?: boolean; aside?: ReactNode }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const deadlinesId = useId();
  // Newest first; the same day keeps the study's order.
  const rows = [...entries].sort((a, b) => cases[b.caseId].dps!.queue.received.localeCompare(cases[a.caseId].dps!.queue.received));
  const open = rows.filter((e) => !cases[e.caseId].dps!.returnSent);
  const answered = rows.filter((e) => !!cases[e.caseId].dps!.returnSent);
  const byDeadline = new Map<string, string[]>();
  open.forEach((e) => {
    const d = cases[e.caseId].dps!.queue.deadline;
    byDeadline.set(d, [...(byDeadline.get(d) ?? []), cases[e.caseId].patient.name]);
  });
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
      <div className={cls.body}>
        {aside}
        <div className={cls.main}>
          <DesignNote id="dps-ko" show={!!notes} />
          <ul className={mergeClasses(cls.grid, cls.gridWide)} aria-label={s('queueTitle')}>
            {rows.map((e) => {
              const c = cases[e.caseId];
              const q = c.dps!.queue;
              const isNew = e.chips.some((x) => x.isNew);
              const summary = dpsSummary(e.caseId, t);
              return (
                <li key={e.caseId}>
                  <CardShell entry={e}>
                    <span className={cls.top}>
                      <span className={cls.received}>
                        {s('colReceived')} {formatDate(q.received, lang)}
                      </span>
                      {e.tag && <span className={mergeClasses(cls.tag, e.current && cls.tagNow)}>{e.tag}</span>}
                    </span>
                    <span className={cls.who}>
                      <span className={cls.avatar} aria-hidden="true">
                        {c.patient.initials}
                      </span>
                      <span className={cls.whoText}>
                        <span className={cls.name}>{s('patientAge', { name: c.patient.name, age: c.patient.age })}</span>
                        <span className={cls.visit}>
                          {s('colFrom')} {t(vocab.roles.gp).toLowerCase()}
                        </span>
                      </span>
                    </span>
                    {summary && <span className={cls.summary}>{summary}</span>}
                    <span className={cls.chips}>
                      {isNew && (
                        <span className={cls.newMark}>
                          <Circle12Filled aria-hidden="true" />
                        </span>
                      )}
                      {e.chips.map((x, i) => (
                        <StatusChip key={i} isNew={x.isNew}>
                          {x.label}
                        </StatusChip>
                      ))}
                      {/* A referral DPS has already answered shows when it was assessed, not a deadline that has passed (R3F-07). */}
                      <StatusChip>
                        {c.dps!.returnSent ? s('queueAssessedOn', { date: formatDate(c.dps!.returnSent.date, lang) }) : `${s('colDeadline')} ${formatDate(q.deadline, lang)}`}
                      </StatusChip>
                    </span>
                    <CardFoot entry={e} openLabel={s('listOpenReferral')} />
                  </CardShell>
                </li>
              );
            })}
            {title !== false && rows.length > 0 && (
              <li>
                <section className={cls.deadlines} aria-labelledby={deadlinesId}>
                  <h2 id={deadlinesId} className={cls.deadlinesTitle}>
                    <Clock16Regular aria-hidden="true" />
                    {s('queueDeadlinesTitle')}
                  </h2>
                  <dl className={cls.dl}>
                    {[...byDeadline.entries()].map(([d, names]) => (
                      <div key={d}>
                        <dt className={cls.dt}>{formatDate(d, lang)}</dt>
                        <dd className={cls.dd}>
                          <span>{names.join(', ')}</span>
                          <span className={cls.ddNote}>{s('queueDeadlineRule')}</span>
                        </dd>
                      </div>
                    ))}
                    {answered.length > 0 && (
                      <div>
                        <dt className={cls.dt}>{s('queueMessageLabel')}</dt>
                        <dd className={cls.dd}>
                          <span>{answered.map((e) => cases[e.caseId].patient.name).join(', ')}</span>
                          <span className={cls.ddNote}>{s('queueMessageRule')}</span>
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              </li>
            )}
          </ul>
          <p className={cls.caption}>{s('listSortedDps')}</p>
        </div>
      </div>
    </>
  );
}

function capital(x: string): string {
  return x ? x.charAt(0).toUpperCase() + x.slice(1) : x;
}

/** The list page for the viewer's role (Timeliste or Mottatte henvisninger). */
export function ListPage({
  caseIds,
  openable,
  note,
  guide,
  tag,
}: {
  caseIds: CaseId[];
  openable: (c: CaseId) => boolean;
  note?: (c: CaseId) => string | undefined;
  /** Study mode: the guide card beside the cards. */
  guide?: ReactNode;
  /** Study mode: «Sak 1» to «Sak 3», and which one is current. */
  tag?: (c: CaseId) => { label: string; current: boolean } | undefined;
}) {
  const { s, t } = useLang();
  const work = useWork();
  const S = s as unknown as (k: string) => string;
  const entry = (caseId: CaseId, chips: Chip[]): ListEntry => ({
    caseId,
    to: openable(caseId) ? (work.mode === 'study' ? work.casePath(caseId) : work.casePath(caseId, 'orientering')) : undefined,
    chips,
    note: note?.(caseId),
    tag: tag?.(caseId)?.label,
    current: tag?.(caseId)?.current,
  });
  if (work.viewer === 'gp') {
    const entries = caseIds.map((caseId) => entry(caseId, gpChips(caseId, work, t, S)));
    return (
      <PageCard>
        <TimelisteView entries={entries} notes={work.notes} aside={guide} />
      </PageCard>
    );
  }
  const entries = caseIds.filter((c) => !!cases[c].dps).map((caseId) => entry(caseId, dpsChips(caseId, work, t, S)));
  return (
    <PageCard>
      <QueueView entries={entries} notes={work.notes} aside={guide} />
    </PageCard>
  );
}
