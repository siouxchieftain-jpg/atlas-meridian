import { Button, Popover, PopoverSurface, PopoverTrigger, makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';
import { Checkmark16Regular, Dismiss16Regular } from '@fluentui/react-icons';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import guideData from '../content/guide.json';
import { useLang } from '../i18n/i18n';
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
  seksjon: string;
  part: Text;
  where: Text;
  do: Text;
  lookFor: Text;
  tellUs: Text;
}
const DATA = guideData as { gp: GuideMarker[]; dps: GuideMarker[] };

// One small store: which marker is open, which are done, which are on the page now.
type GuideState = { open: number | null; done: Record<string, boolean>; present: number[] };
let state: GuideState = { open: null, done: {}, present: [] };
const subs = new Set<() => void>();
function set(next: Partial<GuideState>) {
  state = { ...state, ...next };
  subs.forEach((f) => f());
}
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
  },
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
  const done = !!st.done[m.n];
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
              set({ done: { ...state.done, [m.n]: !done }, open: done ? m.n : null });
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
  const done = !!st.done[m.n];
  return createPortal(
    <Popover open={open} onOpenChange={(_, d) => set({ open: d.open ? m.n : null })} positioning="below-start" withArrow trapFocus>
      <PopoverTrigger disableButtonEnhancement>
        <Button
          className={`${cls.pin} ${done ? cls.pinDone : ''}`}
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
        // The number sits before the part's heading, as a guide mark; the part moves in to make room.
        if (!('guideIndented' in el.dataset)) {
          el.dataset.guideIndented = '';
          el.style.paddingLeft = `${parseFloat(getComputedStyle(el).paddingLeft) + 36}px`;
        }
        found.push({ m, el });
      }
      setHosts((prev) => (prev.length === found.length && prev.every((p, i) => p.el === found[i].el) ? prev : found));
      const present = found.map((f) => f.m.n);
      if (present.join() !== state.present.join()) set({ present });
    };
    scan();
    const main = document.querySelector('main');
    const obs = new MutationObserver(scan);
    if (main) obs.observe(main, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
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
const TASKS: Record<string, Text> = (guideData as unknown as { tasks: Record<string, Text> }).tasks ?? {};

export function GuideTaskStrip({ role, view, task, note }: { role: 'gp' | 'dps'; view: string | undefined; task: string; note?: ReactNode }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const st = useGuideState();
  const markers = markersFor(role, view).filter((m) => st.present.includes(m.n));
  return (
    <section className={cls.strip} aria-label={s('guideTask')}>
      <span className={cls.eyebrow}>{s('guideTask')}</span>
      <p style={{ margin: 0 }}>{TASKS[`${role}/${view}`] ? t(TASKS[`${role}/${view}`]) : task}</p>
      {note}
      {markers.length > 0 && (
        <ol className={cls.chips} aria-label={s('guideStepsHere')}>
          {markers.map((m) => {
            const done = !!st.done[m.n];
            return (
              <li key={m.n}>
                <button
                  type="button"
                  className={`${cls.chip} ${done ? cls.chipDone : ''}`}
                  onClick={() => {
                    document.querySelector<HTMLElement>(`[data-guide-pin="${m.n}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    set({ open: m.n });
                  }}
                >
                  <span className={`${cls.num} ${cls.chipNum}`} aria-hidden="true">
                    {done ? <Checkmark16Regular /> : m.n}
                  </span>
                  {t(m.part)}
                  {done && <span className="visually-hidden">{s('guideDoneSuffix')}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
