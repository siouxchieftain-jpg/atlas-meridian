import { Button, Popover, PopoverSurface, PopoverTrigger, makeStyles, mergeClasses, shorthands, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowMaximizeVertical20Regular, ArrowMinimizeVertical20Regular, ArrowRight20Regular, Checkmark16Filled, Checkmark16Regular, Dismiss16Regular } from '@fluentui/react-icons';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import guideData from '../content/guide.json';
import { useLang } from '../i18n/i18n';
import { currentPath } from '../router/router';
import { readJSON, writeJSON } from '../state/persist';
import { NextMark, SrOnly } from '../patterns/basics';
import { AtlasCard } from '../patterns/AtlasCard';
import { guide } from '../theme/constants';

/**
 * The guide layer (3.7). Numbered markers on the parts of a case page, each opening the
 * same four lines (Where, Do, Look for, Tell us) that the task strip, the tour and the written guide read, from one
 * content file (`content/guide.json`). The markers find their parts by `data-section`, so no part's own code changes.
 */

type Text = { nb: string; en: string };
export interface GuideMarker {
  n: number;
  selector: string;
  views: string[];
  /** The tour step that shows this part, so the tour can carry the same number. */
  tour?: string;
  /** «corner»: the pin sits on the part's top corner and the part keeps its width (a field, not a section). */
  place?: 'corner';
  seksjon: string;
  part: Text;
  where: Text;
  do: Text;
  lookFor: Text;
  tellUs: Text;
  /** A shorter label for its box under «Oppgaven din», where the part's name is long (3.8). */
  box?: Text;
}
const DATA = guideData as { gp: GuideMarker[]; dps: GuideMarker[] };

// One small store: which marker is open, which are done, which are on the page now.
type GuideState = { open: number | null; done: Record<string, boolean>; auto: Record<string, boolean>; present: number[] };
let state: GuideState = { open: null, done: {}, auto: {}, present: [] };
const subs = new Set<() => void>();
function set(next: Partial<GuideState>) {
  state = { ...state, ...next };
  subs.forEach((f) => f());
}
/** Ticks belong to one case: a part ticked on Kari is not ticked on Erlend. */
function doneKey(n: number): string {
  return `${currentPath().split('/')[3] ?? ''}:${n}`;
}

/** A part is done when the participant ticked it, or (3.8) when the page says so: a part to act on carries
 * `data-section-done` once its work is done; a part to read is done once it has been in view for a moment. */
function isDone(st: GuideState, n: number): boolean {
  const k = doneKey(n);
  return !!st.done[k] || !!st.auto[k];
}
const READ_PARTS = '[data-section="guide"], [data-section="gp-usikker"], [data-section="fra-atlas"], [data-section="retur"], [data-margin]';

function useGuideState(): GuideState {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
  );
}

const useStyles = makeStyles({
  pin: {
    position: 'absolute',
    top: '-3px',
    left: '0',
    zIndex: 2,
    minWidth: '28px',
    width: '28px',
    height: '28px',
    padding: 0,
    borderRadius: '50%',
    border: `1px solid ${guide.cardEdge}`,
    backgroundImage: guide.mark,
    color: guide.ink,
    fontWeight: tokens.fontWeightBold,
    fontSize: tokens.fontSizeBase300,
    boxShadow: tokens.shadow4,
    ':hover': { backgroundImage: guide.mark, color: guide.ink, boxShadow: tokens.shadow8 },
    ':hover:active': { backgroundImage: guide.mark, color: guide.ink },
    // Fluent's focus ring squares the corners; the pin stays round.
    ':focus-visible': { borderRadius: '50%' },
  },
  pinCorner: { top: '-12px', left: 'auto', insetInlineEnd: '-10px' },
  pinDone: { backgroundImage: 'none', backgroundColor: tokens.colorNeutralBackground1, color: guide.ink },
  surface: { padding: 0, maxWidth: '340px', borderRadius: tokens.borderRadiusXLarge, overflow: 'hidden', border: `1px solid ${guide.cardEdge}` },
  head: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, padding: '12px 12px 10px 14px', backgroundImage: guide.card, borderBottom: `1px solid ${guide.cardEdge}` },
  num: {
    flexShrink: 0,
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundImage: guide.mark,
    color: guide.ink,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: tokens.fontWeightBold,
  },
  eyebrow: { ...typographyStyles.caption1Strong, color: guide.ink, display: 'block' },
  title: { ...typographyStyles.body1Strong, margin: 0 },
  body: { padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  dl: { margin: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  dt: { ...typographyStyles.caption1Strong, color: guide.ink },
  dd: { ...typographyStyles.body1, margin: 0 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  strip: {
    borderRadius: tokens.borderRadiusXLarge,
    border: `1px solid ${guide.cardEdge}`,
    backgroundImage: guide.card,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  chips: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minHeight: '32px',
    padding: '2px 12px 2px 3px',
    borderRadius: tokens.borderRadiusCircular,
    border: `1px solid ${guide.track}`,
    backgroundColor: 'rgba(255,255,255,0.85)',
    color: tokens.colorNeutralForeground1,
    ...typographyStyles.body1,
    cursor: 'pointer',
    ':hover': { ...shorthands.borderColor(guide.coral) },
  },
  chipNum: { width: '24px', height: '24px', fontSize: tokens.fontSizeBase200 },
  chipDone: { color: tokens.colorNeutralForeground2 },
  // 3.8: the checklist under the task: small boxes in a grid, each ticking itself.
  checklist: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
    gap: '8px',
  },
  box: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minHeight: '48px',
    padding: '8px 12px 8px 8px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${guide.track}`,
    backgroundColor: 'rgba(255,255,255,0.9)',
    color: tokens.colorNeutralForeground1,
    textAlign: 'start',
    ...typographyStyles.body1,
    cursor: 'pointer',
    transitionProperty: 'background-color, border-color',
    transitionDuration: '0.2s',
    ':hover': { ...shorthands.borderColor(guide.coral) },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
  },
  boxDone: {
    ...shorthands.borderColor(tokens.colorPaletteGreenBorder1),
    backgroundColor: tokens.colorPaletteGreenBackground1,
  },
  tick: {
    flexShrink: 0,
    width: '24px',
    height: '24px',
    borderRadius: tokens.borderRadiusMedium,
    border: `2px solid ${guide.track}`,
    backgroundColor: tokens.colorNeutralBackground1,
    color: guide.ink,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightBold,
    boxSizing: 'border-box',
  },
  tickDone: {
    ...shorthands.borderColor(tokens.colorPaletteGreenForeground1),
    backgroundColor: tokens.colorPaletteGreenForeground1,
    color: '#FFFFFF',
  },
  boxText: { minWidth: 0, display: 'flex', flexDirection: 'column' },
  boxSummary: { ...typographyStyles.caption1, color: tokens.colorPaletteGreenForeground1, overflowWrap: 'anywhere' },
  progressRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  moduleNext: { display: 'flex', justifyContent: 'flex-end', paddingTop: tokens.spacingVerticalS, borderTop: `1px solid ${tokens.colorNeutralStroke2}` },
  boxOpen: {
    ...shorthands.borderColor(guide.coral),
    boxShadow: `0 0 0 1px ${guide.coral}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  modules: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  atlasTag: { display: 'flex', alignItems: 'center', gap: '8px', ...typographyStyles.caption1Strong, color: tokens.colorBrandForeground1 },
  module: {
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    padding: '14px 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    boxShadow: tokens.shadow2,
  },
  moduleHead: { display: 'flex', alignItems: 'flex-start', gap: '10px' },
  moduleDo: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  moduleFoot: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalS, justifyContent: 'space-between' },
  allDone: { ...typographyStyles.body1Strong, display: 'flex', alignItems: 'center', gap: '8px', color: tokens.colorPaletteGreenForeground1, margin: 0 },
  progress: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
});

/** The marker a tour step shows, if any: the tour and the case pages use the same numbers. */
export function markerForTour(stepId: string): number | undefined {
  return [...DATA.gp, ...DATA.dps].find((m) => m.tour === stepId)?.n;
}

/** The marker of a part in the «Give feedback» list, so the list carries the numbers seen on the page. */
export function markerForSection(role: string, view: string, seksjon: string): number | undefined {
  const r = role === 'dps' ? 'dps' : 'gp';
  return DATA[r].find((m) => m.seksjon === seksjon && m.views.includes(view))?.n;
}

/** The marker's number as a badge, for the tour and the feedback list. */
export function MarkerNumber({ n, small }: { n: number; small?: boolean }) {
  const cls = useStyles();
  return (
    <span className={small ? `${cls.num} ${cls.chipNum}` : cls.num} aria-hidden="true">
      {n}
    </span>
  );
}

export function markersFor(role: 'gp' | 'dps', view: string | undefined): GuideMarker[] {
  if (!view) return [];
  return DATA[role].filter((m) => m.views.includes(view));
}

function MarkerCard({ m, onClose }: { m: GuideMarker; onClose: () => void }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const st = useGuideState();
  const done = isDone(st, m.n);
  const L = [s('guideWhere'), s('guideDo'), s('guideLookFor'), s('guideTellUs')];
  return (
    <>
      <div className={cls.head}>
        <span className={cls.num} aria-hidden="true">
          {m.n}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className={cls.eyebrow}>{s('guideLabel')}</span>
          <p className={cls.title}>{t(m.part)}</p>
        </div>
        <Button appearance="subtle" size="small" icon={<Dismiss16Regular />} aria-label={s('guideClose')} onClick={onClose} />
      </div>
      <div className={cls.body}>
        <dl className={cls.dl}>
          {[m.where, m.do, m.lookFor, m.tellUs].map((x, i) => (
            <div key={L[i]}>
              <dt className={cls.dt}>{L[i]}</dt>
              <dd className={cls.dd}>{t(x)}</dd>
            </div>
          ))}
        </dl>
        <div className={cls.actions}>
          <Button
            size="small"
            appearance={done ? 'secondary' : 'primary'}
            icon={done ? <Checkmark16Regular /> : undefined}
            onClick={() => {
              set({ done: { ...state.done, [doneKey(m.n)]: !done }, open: done ? m.n : null });
            }}
          >
            {done ? s('guideDone') : s('guideMarkDone')}
          </Button>
        </div>
      </div>
    </>
  );
}

function Pin({ m, host }: { m: GuideMarker; host: HTMLElement }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const st = useGuideState();
  const open = st.open === m.n;
  const done = isDone(st, m.n);
  return createPortal(
    <Popover open={open} onOpenChange={(_, d) => set({ open: d.open ? m.n : null })} positioning={{ position: 'before', align: 'top', fallbackPositions: ['after-top', 'below-start'] }} withArrow trapFocus>
      <PopoverTrigger disableButtonEnhancement>
        <Button
          className={mergeClasses(cls.pin, m.place === 'corner' && cls.pinCorner, done && cls.pinDone)}
          aria-label={`${s('guideLabel')} ${m.n}: ${t(m.part)}${done ? s('guideDoneSuffix') : ''}`}
          data-guide-pin={m.n}
        >
          {done ? <Checkmark16Regular /> : m.n}
        </Button>
      </PopoverTrigger>
      <PopoverSurface className={cls.surface} aria-label={t(m.part)}>
        <MarkerCard m={m} onClose={() => set({ open: null })} />
      </PopoverSurface>
    </Popover>,
    host,
  );
}

/** Finds each marker's part on the page and places its pin there; follows the page as parts appear. */
export function GuideLayer({ role, view }: { role: 'gp' | 'dps'; view: string | undefined }) {
  const [hosts, setHosts] = useState<{ m: GuideMarker; el: HTMLElement }[]>([]);
  useEffect(() => {
    const markers = markersFor(role, view);
    const scan = () => {
      const found: { m: GuideMarker; el: HTMLElement }[] = [];
      for (const m of markers) {
        const el = document.querySelector<HTMLElement>(`main ${m.selector}`);
        if (!el) continue;
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        found.push({ m, el });
      }
      // The numbered parts move in to make room for the number. Where one column holds two or more of them (the ATLAS
      // panel), its other parts move in too, unnumbered, so the headings stay in line.
      const columns = new Map<HTMLElement, number>();
      for (const { m, el } of found) if (m.place !== 'corner' && el.parentElement) columns.set(el.parentElement, (columns.get(el.parentElement) ?? 0) + 1);
      for (const { m, el } of found) {
        if (m.place === 'corner' || el.closest('[data-task-modules]')) continue;
        const many = el.parentElement && (columns.get(el.parentElement) ?? 0) >= 2;
        const row = many ? Array.from(el.parentElement!.children).filter((c): c is HTMLElement => c instanceof HTMLElement && c.hasAttribute('data-section')) : [el];
        for (const part of row) {
          if ('guideIndented' in part.dataset) continue;
          part.dataset.guideIndented = '';
          part.style.paddingLeft = `${parseFloat(getComputedStyle(part).paddingLeft) + 36}px`;
        }
      }
      // Parts that live in the task boxes carry their number on the box, not a pin (3.8).
      const pinned = found.filter((f) => !f.el.closest('[data-task-modules]'));
      setHosts((prev) => (prev.length === pinned.length && prev.every((p, i) => p.el === pinned[i].el) ? prev : pinned));
      const present = found.map((f) => f.m.n);
      if (present.join() !== state.present.join()) set({ present });
      // Parts to act on say when they are done (3.8).
      let auto = state.auto;
      for (const { m, el } of found) {
        if (el.matches(READ_PARTS)) {
          // A part to read inside the ATLAS card, one at a time, ticks when the participant leaves it (TaskParts), not
          // when it scrolls past (review R4).
          if (!el.closest('[data-task-modules]:not([data-show-all])')) watchRead(m.n, el);
          continue;
        }
        const k = doneKey(m.n);
        const now = el.hasAttribute('data-section-done') || !!el.querySelector('[data-section-done]');
        if (!!auto[k] !== now) auto = { ...auto, [k]: now };
      }
      if (auto !== state.auto) set({ auto });
    };
    // Parts to read: done once at least half of the part has been in view for a little over a second.
    const timers = new Map<number, number>();
    const watched = new Map<HTMLElement, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const n = watched.get(e.target as HTMLElement);
          if (n === undefined) continue;
          if (e.isIntersecting) {
            if (!timers.has(n))
              timers.set(
                n,
                window.setTimeout(() => {
                  const k = doneKey(n);
                  if (!state.auto[k]) set({ auto: { ...state.auto, [k]: true } });
                }, 1200),
              );
          } else {
            window.clearTimeout(timers.get(n));
            timers.delete(n);
          }
        }
      },
      { threshold: 0.5 },
    );
    function watchRead(n: number, el: HTMLElement) {
      if (watched.has(el) || state.auto[doneKey(n)]) return;
      watched.set(el, n);
      io.observe(el);
    }
    scan();
    const main = document.querySelector('main');
    const obs = new MutationObserver(scan);
    if (main) obs.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-section-done', 'data-show-all'] });
    return () => {
      obs.disconnect();
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      document.querySelectorAll<HTMLElement>('[data-guide-indented]').forEach((el) => {
        el.style.paddingLeft = '';
        delete el.dataset.guideIndented;
      });
      set({ present: [], open: null });
    };
  }, [role, view]);
  return (
    <>
      {hosts.map(({ m, el }) => (
        <Pin key={m.n} m={m} host={el} />
      ))}
    </>
  );
}

/** The task line on a case page, with the page's markers as numbered steps that tick off. */
const SHOW_ALL_KEY = 'atlas.guide.showAll';

const TASKS: Record<string, Text> = (guideData as unknown as { tasks: Record<string, Text> }).tasks ?? {};

export function GuideTaskStrip({ role, view, task, note }: { role: 'gp' | 'dps'; view: string | undefined; task: string; note?: ReactNode }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const st = useGuideState();
  const markers = markersFor(role, view).filter((m) => st.present.includes(m.n));
  const doneCount = markers.filter((m) => isDone(st, m.n)).length;
  return (
    <section className={cls.strip} aria-label={s('guideTask')}>
      <span className={cls.eyebrow}>{s('guideTask')}</span>
      <p style={{ margin: 0 }}>{TASKS[`${role}/${view}`] ? t(TASKS[`${role}/${view}`]) : task}</p>
      {note}
      {markers.length > 0 && (
        <>
          {/* 3.8: the page's parts as a checklist under the task; each ticks itself as its work is done. */}
          <ol className={cls.checklist} aria-label={s('guideStepsHere')}>
            {markers.map((m) => {
              const done = isDone(st, m.n);
              return (
                <li key={m.n}>
                  <button
                    type="button"
                    className={mergeClasses(cls.box, done && cls.boxDone)}
                    data-guide-step={m.n}
                    data-done={done ? '' : undefined}
                    onClick={() => {
                      document.querySelector<HTMLElement>(`[data-guide-pin="${m.n}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                      set({ open: m.n });
                    }}
                  >
                    <span className={mergeClasses(cls.tick, done && cls.tickDone)} aria-hidden="true">
                      {done ? <Checkmark16Filled /> : m.n}
                    </span>
                    <span className={cls.boxText}>{t(m.part)}</span>
                    {done && <SrOnly>{s('guideDoneSuffix')}</SrOnly>}
                  </button>
                </li>
              );
            })}
          </ol>
          <span className={cls.progress}>{s('guideProgress', { n: doneCount, total: markers.length })}</span>
        </>
      )}
    </section>
  );
}

/**
 * 3.8 (Jishnu, 24 November; design review R1 to R21): the ATLAS parts as boxes under «Oppgaven din», and ATLAS as its own
 * card under the task. The coral task strip holds the study's guidance (the task, the boxes, the count, «Vis alle
 * delene», «Nå: …»); the lavender ATLAS card holds only the parts. A box always opens its part; a part never moves on by
 * itself: «Neste» under it, marked «Trykk her», opens the next, brings the boxes back into view and moves focus to the new
 * part's heading. Only the parts in the card are boxes and counted.
 */
const useParts = makeStyles({
  row: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '8px',
    scrollMarginTop: 'calc(var(--atlas-header-h, 48px) + 16px)',
    // Below 640 px: one line of compact boxes; the open one carries its name (review R12).
    '@media (max-width: 639px)': { display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px' },
  },
  item: { minWidth: 0, '@media (max-width: 639px)': { flex: '0 0 auto' } },
  box: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minHeight: '52px',
    padding: '8px 12px 8px 10px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${guide.track}`,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    textAlign: 'start',
    ...typographyStyles.body1,
    cursor: 'pointer',
    transitionProperty: 'border-color, box-shadow',
    transitionDuration: '0.15s',
    ':hover': { ...shorthands.borderColor(guide.coral) },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
    '@media (max-width: 639px)': { minHeight: '44px', padding: '6px 10px 6px 6px' },
  },
  boxOpen: { ...shorthands.borderColor(guide.coral), boxShadow: `inset 0 0 0 1px ${guide.coral}` },
  badge: {
    flexShrink: 0,
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    backgroundImage: guide.mark,
    color: guide.ink,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightBold,
  },
  badgeDone: { backgroundImage: 'none', backgroundColor: tokens.colorPaletteGreenForeground1, color: '#FFFFFF' },
  // Soft hyphens in the box labels break long words at the joint (review N1); no break inside a word.
  label: { minWidth: 0, display: 'flex', flexDirection: 'column', hyphens: 'manual' },
  tickWide: { display: 'inline-flex', '@media (max-width: 639px)': { display: 'none' } },
  numNarrow: { display: 'none', '@media (max-width: 639px)': { display: 'inline' } },
  labelNarrowHidden: { '@media (max-width: 639px)': { display: 'none' } },
  summary: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  meta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  count: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  now: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground1 },
  nowLabel: { fontWeight: tokens.fontWeightSemibold, color: guide.ink },
  parts: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  part: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  partAll: { paddingTop: tokens.spacingVerticalL, borderTop: `1px solid ${tokens.colorNeutralStroke2}`, ':first-child': { paddingTop: 0, borderTop: 'none' } },
  foot: { display: 'flex', justifyContent: 'flex-end', paddingTop: tokens.spacingVerticalM, borderTop: `1px solid ${tokens.colorNeutralStroke2}` },
  allDone: { ...typographyStyles.body1Strong, display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: tokens.colorNeutralForeground1 },
  allDoneTick: { color: tokens.colorPaletteGreenForeground1, display: 'inline-flex' },
});

export function TaskParts({
  caseId,
  role,
  view,
  task,
  note,
  modules,
  summaries,
  arrive,
  doneTask,
  finalStep,
}: {
  caseId: string;
  role: 'gp' | 'dps';
  view: string | undefined;
  task: string;
  note?: ReactNode;
  modules: Partial<Record<number, ReactNode>>;
  summaries?: Partial<Record<number, string>>;
  /** The first time ATLAS opens on this case. */
  arrive?: boolean;
  /** The task line once every part is done: what comes next on the page («Neste: …»). */
  doneTask?: string;
  /** After the last part, where the work goes on (Erlend: «Neste: Skriv henvisningen»). */
  finalStep?: { label: string; onClick: () => void };
}) {
  const cls = useParts();
  const base = useStyles();
  const { s, t } = useLang();
  const st = useGuideState();
  const parts = markersFor(role, view).filter((m) => modules[m.n]);
  const doneCount = parts.filter((m) => isDone(st, m.n)).length;
  const allDone = parts.length > 0 && doneCount === parts.length;
  // The last part (the decision, or the last before the draft) done: the page's next step is what is left.
  const lastDone = parts.length > 0 && isDone(st, parts[parts.length - 1].n);
  const [active, setActive] = useState<number>(() => parts.find((m) => !isDone(st, m.n))?.n ?? parts[parts.length - 1]?.n ?? 0);
  const [started, setStarted] = useState(false);
  // One choice per case, kept in this browser (review R13): a participant's other cases start one part at a time.
  const key = `${SHOW_ALL_KEY}.${caseId}`;
  const [showAll, setShowAllState] = useState(() => readJSON<boolean>(key) === true);
  const setShowAll = (on: boolean) => {
    setShowAllState(on);
    writeJSON(key, on);
  };
  const rowRef = useRef<HTMLOListElement>(null);
  // Parts to read (the guide, what the GP was unsure about) tick when left after at least 1.2 s open (review R4).
  const isRead = (m: GuideMarker) => /guide"|gp-usikker|fra-atlas|retur/.test(m.selector);
  const openedAt = useRef<{ n: number; at: number }>({ n: active, at: Date.now() });
  useEffect(() => {
    openedAt.current = { n: active, at: Date.now() };
  }, [active]);
  const leave = () => {
    const m = parts.find((x) => x.n === openedAt.current.n);
    if (m && isRead(m) && Date.now() - openedAt.current.at >= 1200 && !isDone(st, m.n)) set({ auto: { ...state.auto, [doneKey(m.n)]: true } });
  };
  const boxLabel = (m: GuideMarker) => t(m.box ?? m.part).replace(/\?$/, '');
  const nextAfter = (n: number) => parts.find((x) => x.n > n && !isDone(st, x.n)) ?? parts.find((x) => x.n !== n && !isDone(st, x.n));
  // Focus to the part's heading, the boxes back in view (review R2, R3).
  const focusPart = (n: number, scrollRow: boolean) => {
    window.requestAnimationFrame(() => {
      const part = document.getElementById(`task-part-${n}`);
      if (scrollRow) rowRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      // All parts shown: a box brings its part into view (review N3).
      else if (showAll) part?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      const head = part?.querySelector<HTMLElement>('h2, h3, h4, legend') ?? part;
      if (head) {
        if (!head.hasAttribute('tabindex')) head.setAttribute('tabindex', '-1');
        head.focus({ preventScroll: true });
      }
    });
  };
  const open = (n: number, scrollRow: boolean) => {
    if (!showAll) leave();
    setStarted(true);
    if (!showAll) setActive(n);
    focusPart(n, scrollRow);
  };
  const current = parts.find((m) => m.n === active);
  const nextFor = (m: GuideMarker) => (isDone(st, m.n) || isRead(m) ? nextAfter(m.n) : undefined);
  return (
    <>
      <section className={base.strip} aria-label={s('guideTask')} data-task-parts="">
        {/* While the strip is on screen, it says what is left; the title's «Gjenstår» would repeat it (review R7, R8). */}
        <style>{'[data-case-remaining]{display:none}'}</style>
        <span className={base.eyebrow}>{s('guideTask')}</span>
        <p style={{ margin: 0 }}>{(allDone || lastDone) && doneTask ? doneTask : TASKS[`${role}/${view}`] ? t(TASKS[`${role}/${view}`]) : task}</p>
        {note}
        <ol className={cls.row} aria-label={s('guideStepsHere')} ref={rowRef}>
          {parts.map((m) => {
            const done = isDone(st, m.n);
            const isOpen = !showAll && m.n === active;
            return (
              <li key={m.n} className={cls.item}>
                <button
                  type="button"
                  className={mergeClasses(cls.box, isOpen && cls.boxOpen)}
                  data-guide-step={m.n}
                  data-done={done ? '' : undefined}
                  aria-current={isOpen ? 'step' : undefined}
                  aria-controls={`task-part-${m.n}`}
                  aria-label={
                    done
                      ? summaries?.[m.n]
                        ? s('boxDoneNameWith', { n: m.n, part: boxLabel(m), summary: summaries[m.n]! })
                        : s('boxDoneName', { n: m.n, part: boxLabel(m) })
                      : `${m.n}. ${boxLabel(m)}`
                  }
                  onClick={() => open(m.n, false)}
                >
                  <span className={mergeClasses(cls.badge, done && cls.badgeDone)} aria-hidden="true">
                    {done ? (
                      <>
                        <span className={cls.tickWide}>
                          <Checkmark16Filled />
                        </span>
                        {/* Narrow, the done pills keep their numbers (review N6). */}
                        <span className={cls.numNarrow}>{m.n}</span>
                      </>
                    ) : (
                      m.n
                    )}
                  </span>
                  <span className={mergeClasses(cls.label, !isOpen && cls.labelNarrowHidden)} aria-hidden="true">
                    {boxLabel(m)}
                    {done && summaries?.[m.n] && <span className={cls.summary}>{summaries[m.n]}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className={cls.meta}>
          <span className={cls.count}>{allDone ? s('guideAllDone') : s('guideProgress', { n: doneCount, total: parts.length })}</span>
          <Button appearance="subtle" size="small" icon={showAll ? <ArrowMinimizeVertical20Regular /> : <ArrowMaximizeVertical20Regular />} aria-pressed={showAll} onClick={() => setShowAll(!showAll)}>
            {showAll ? s('taskShowOne') : s('taskShowAll')}
          </Button>
        </div>
        {!showAll && current && !isDone(st, current.n) && (
          <p className={cls.now}>
            <span className={cls.nowLabel}>{s('taskNow')}:</span> {t(current.do)}
          </p>
        )}
      </section>
      <AtlasCard on arrive={arrive} arriveLine={arrive && !started && doneCount === 0}>
        <div className={cls.parts} data-task-modules="" data-show-all={showAll ? '' : undefined}>
          {/* Every part stays in the page, so each can tick itself; one at a time shows, or all. */}
          {parts.map((m) => {
            const next = nextFor(m);
            const last = !next && isDone(st, m.n) && finalStep && allDone;
            return (
              <div key={m.n} id={`task-part-${m.n}`} className={mergeClasses(cls.part, showAll && cls.partAll)} hidden={!showAll && m.n !== active}>
                {modules[m.n]}
                {!showAll && next && (
                  <div className={cls.foot}>
                    <NextMark on>
                      <Button appearance="primary" size="large" icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => open(next.n, true)}>
                        {s('taskNextPart', { part: boxLabel(next) })}
                      </Button>
                    </NextMark>
                  </div>
                )}
                {!showAll && last && (
                  <div className={cls.foot}>
                    <NextMark on>
                      <Button appearance="primary" size="large" icon={<ArrowRight20Regular />} iconPosition="after" onClick={finalStep.onClick}>
                        {finalStep.label}
                      </Button>
                    </NextMark>
                  </div>
                )}
              </div>
            );
          })}
          {showAll && allDone && finalStep && (
            <div className={cls.foot}>
              <NextMark on>
                <Button appearance="primary" size="large" icon={<ArrowRight20Regular />} iconPosition="after" onClick={finalStep.onClick}>
                  {finalStep.label}
                </Button>
              </NextMark>
            </div>
          )}
        </div>
      </AtlasCard>
    </>
  );
}
