import { makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { LockClosed20Regular } from '@fluentui/react-icons';
import { useId, type ReactNode } from 'react';
import { cases } from '../content';
import { formatDayMonth, useLang } from '../i18n/i18n';
import { DPS_TODAY, isWeekday } from '../engine/clock';
import { CORE } from './parts';
import { useStudy } from '../state/study';

/**
 * The parts of the start page and the list (3.4): one card anatomy for every part, so parts that look alike behave
 * alike. A card has a title, a line under it that says what it holds, its body, and a quiet note at its foot. What only
 * shows an ordinary day sits in one grey group labelled «Eksempler», never in a dashed box or behind a control that does
 * nothing.
 */
const useStyles = makeStyles({
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    paddingInline: '20px',
    paddingBlockStart: '16px',
    paddingBlockEnd: '18px',
    minWidth: 0,
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow4,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  // A part that opens later in the study: the same card, quieter, its lock line in place of the body.
  cardLocked: { backgroundColor: tokens.colorNeutralBackground2, boxShadow: 'none', border: `1px solid ${tokens.colorNeutralStroke2}` },
  headText: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  title: { ...typographyStyles.subtitle2, margin: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: '8px', rowGap: '2px' },
  sub: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground3 },
  foot: { ...typographyStyles.caption1, margin: 0, marginBlockStart: 'auto', color: tokens.colorNeutralForeground3 },
  badge: {
    ...typographyStyles.caption1Strong,
    paddingInline: '8px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    whiteSpace: 'nowrap',
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  examples: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingInline: '12px',
    paddingBlock: '10px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    color: tokens.colorNeutralForeground2,
    '@media (forced-colors: active)': { border: '1px dashed CanvasText' },
  },
  examplesLabel: { ...typographyStyles.caption1Strong, margin: 0, color: tokens.colorNeutralForeground2 },
  // A locked part keeps its place and its row's height: a quiet panel that says when it opens and what it will hold.
  lockedBody: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    paddingBlock: '12px',
    textAlign: 'center',
  },
  lockIcon: {
    width: '40px',
    height: '40px',
    borderRadius: tokens.borderRadiusCircular,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  lockLine: { ...typographyStyles.body1Strong, margin: 0, color: tokens.colorNeutralForeground2 },
  lockNote: { ...typographyStyles.caption1, margin: 0, maxWidth: '36ch', color: tokens.colorNeutralForeground2 },
  // The deadline strip: the working days as dates, today outlined, a deadline filled. A date, never a countdown.
  days: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gap: '4px' },
  dayCell: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    paddingBlock: '5px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    ...typographyStyles.caption2,
    color: tokens.colorNeutralForeground2,
  },
  dayNum: {
    ...typographyStyles.caption1Strong,
    width: '24px',
    height: '24px',
    borderRadius: tokens.borderRadiusCircular,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground1,
    fontVariantNumeric: 'tabular-nums',
  },
  dayToday: { border: `1px solid ${tokens.colorBrandStroke1}`, backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground1 },
  dayNumDue: {
    backgroundColor: tokens.colorNeutralForeground1,
    color: tokens.colorNeutralForegroundInverted,
    '@media (forced-colors: active)': { forcedColorAdjust: 'none', backgroundColor: 'CanvasText', color: 'Canvas' },
  },
  dueLine: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground2 },
  framedHead: { ...typographyStyles.subtitle2, margin: 0 },
  // «Frister» beside the referrals: as wide and as tall as its cell.
  fill: { flex: '1 1 auto', alignSelf: 'stretch' },
});

/**
 * The examples in a part: the rest of an ordinary day, which the prototype only shows. One treatment everywhere (3.4,
 * the list's): a grey group under a visible label that says so once, no links, no hover, nothing that looks like a
 * control. Screen readers hear the label as the group's name.
 */
export function ExampleGroup({ children, label }: { children: ReactNode; label?: string }) {
  const cls = useStyles();
  const { s } = useLang();
  const id = useId();
  return (
    <div className={cls.examples} role="group" aria-labelledby={id} data-examples="">
      <p className={cls.examplesLabel} id={id}>
        {label ?? s('examplesLabel')}
      </p>
      {children}
    </div>
  );
}

export function NewBadge({ children }: { children: ReactNode }) {
  const cls = useStyles();
  return <span className={cls.badge}>{children}</span>;
}

/**
 * One part of the start page: a title, a line under it that says what the part holds, its body, and a quiet note at
 * its foot. No part opens anything by its frame (3.4: one door per destination); a part that opens later says so with
 * a lock, as the cases do before the tour.
 */
export function HomeCard({
  part,
  title,
  sub,
  badge,
  locked,
  lockedNote,
  foot,
  children,
  className,
}: {
  part: string;
  title: ReactNode;
  sub?: ReactNode;
  badge?: ReactNode;
  /** The part opens later in the study: its lock line replaces the body. */
  locked?: string;
  /** What the part will hold once it opens, said under the lock line without any of its figures. */
  lockedNote?: string;
  foot?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const cls = useStyles();
  const titleId = useId();
  return (
    <section
      className={mergeClasses(cls.card, locked && cls.cardLocked, className)}
      aria-labelledby={titleId}
      data-home-part={part}
      data-locked={locked ? '' : undefined}
    >
      <div className={cls.headText}>
        <h2 id={titleId} className={cls.title}>
          {title}
          {badge}
        </h2>
        {sub && <p className={cls.sub}>{sub}</p>}
      </div>
      {locked ? (
        <div className={cls.lockedBody}>
          <span className={cls.lockIcon} aria-hidden="true">
            <LockClosed20Regular />
          </span>
          <p className={cls.lockLine}>{locked}</p>
          {lockedNote && <p className={cls.lockNote}>{lockedNote}</p>}
        </div>
      ) : (
        children
      )}
      {!locked && foot && <p className={cls.foot}>{foot}</p>}
    </section>
  );
}

const WEEKDAY: Record<'nb' | 'en', string[]> = {
  nb: ['sø', 'ma', 'ti', 'on', 'to', 'fr', 'lø'],
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
};

/** The next ten working days from `from`, as ISO dates (no public holidays fall in March 2026). */
export function workingDays(from: string, n = 10): string[] {
  const out: string[] = [];
  for (let d = from; out.length < n; ) {
    if (isWeekday(d)) out.push(d);
    const next = new Date(`${d}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    d = next.toISOString().slice(0, 10);
  }
  return out;
}

/**
 * The deadline strip, for both roles: ten working days from today, today outlined, a day with a legal assessment
 * deadline filled, and under it whose deadline falls there. A date, never a countdown, and never a ranking. The cells
 * are a picture for the eye; the sentence under them says every deadline in words, for everyone (3.5: a label on a list
 * item is often not read).
 */
export function DeadlineStrip({ today, due, empty }: { today: string; due: { date: string; names: string[] }[]; empty: string }) {
  const cls = useStyles();
  const { s, lang } = useLang();
  const days = workingDays(today);
  const weekday = (iso: string) => WEEKDAY[lang][new Date(`${iso}T12:00:00Z`).getUTCDay()];
  return (
    <>
      <ol className={cls.days} aria-hidden="true">
        {days.map((d) => {
          const isToday = d === today;
          const hit = due.find((x) => x.date === d);
          return (
            <li key={d} className={mergeClasses(cls.dayCell, isToday && cls.dayToday)} data-due={hit ? '' : undefined}>
              <span>{isToday ? s('homeToday') : weekday(d)}</span>
              <span className={mergeClasses(cls.dayNum, hit && cls.dayNumDue)}>{Number(d.slice(8))}</span>
            </li>
          );
        })}
      </ol>
      <p className={cls.dueLine}>
        {due.length > 0 ? due.map((x) => `${formatDayMonth(x.date, lang).replace(' ', '\u00a0')}: ${x.names.join(', ')}`).join(' · ') : empty}
      </p>
    </>
  );
}

/**
 * DPS's deadlines (boards 4b and 8c): the strip for the referrals not yet assessed, as a card of its own beside the
 * received referrals, or inside the intake card on the start page.
 */
export function Deadlines({ framed }: { framed?: boolean }) {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const titleId = useId();
  // Only what is still open: not answered before the study's day, and not done by the participant.
  const open = CORE.filter((c) => !cases[c].dps!.returnSent && study.state.phase[c] !== 'done');
  const byDate = new Map<string, string[]>();
  for (const c of open) {
    const d = cases[c].dps!.queue.deadline;
    byDate.set(d, [...(byDate.get(d) ?? []), cases[c].patient.name]);
  }
  const due = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, names]) => ({ date, names }));
  const strip = <DeadlineStrip today={DPS_TODAY} due={due} empty={s('deadlinesNone')} />;
  if (!framed) return strip;
  return (
    <section className={mergeClasses(cls.card, cls.fill)} aria-labelledby={titleId} data-home-part="frister">
      <h2 id={titleId} className={cls.framedHead}>
        {s('queueDeadlinesTitle')}
      </h2>
      {strip}
      <p className={cls.foot}>{s('homeDeadlineNote')}</p>
    </section>
  );
}
