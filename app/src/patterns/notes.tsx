import { Button, makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronLeft16Regular, ChevronRight16Regular, Dismiss20Regular, Lightbulb20Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { notes } from '../content';
import { useLang } from '../i18n/i18n';
import { guide } from '../theme/constants';
import { GuideImage } from './basics';
import { NotesContext, useNotes, type NoteEntry, type NotesApi } from './notesContext';

/** Holds the notes on the current screen (review mode). */
export function NotesProvider({ on, children }: { on: boolean; children: ReactNode }) {
  const parts = useRef(new Map<string, HTMLElement>());
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const register = useCallback((id: string, el: HTMLElement) => {
    parts.current.set(id, el);
    setVersion((v) => v + 1);
    return () => {
      if (parts.current.get(id) === el) parts.current.delete(id);
      setVersion((v) => v + 1);
    };
  }, []);
  const entries = useMemo<NoteEntry[]>(() => {
    const list = [...parts.current.entries()].map(([id, el]) => ({ id, el }));
    // In the order the parts come on the screen.
    list.sort((a, b) => (a.el === b.el ? 0 : a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    return list;
    // `version` changes whenever a part comes or goes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
  useEffect(() => {
    if (selected && !entries.some((e) => e.id === selected)) setSelected(null);
  }, [entries, selected]);
  useEffect(() => {
    if (!on) setSelected(null);
  }, [on]);
  const select = useCallback<NotesApi['select']>((id, opts = {}) => {
    setSelected(id);
    if (!id) return;
    const el = parts.current.get(id);
    if (opts.scroll && el) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }
    // From a marker on the screen: focus goes to the note in the drawer, which says what the marker means.
    if (opts.focusDrawer) window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-note-item="${id}"]`)?.focus());
  }, []);
  const api = useMemo<NotesApi>(() => ({ on, entries, selected, select, register }), [on, entries, selected, select, register]);
  return <NotesContext.Provider value={api}>{children}</NotesContext.Provider>;
}

const useStyles = makeStyles({
  // At the foot of the navigation column: it takes its own place, so it never covers the screen.
  pill: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalS,
    width: '40px',
    height: '40px',
    padding: 0,
    border: 'none',
    borderRadius: tokens.borderRadiusCircular,
    background: guide.mark,
    boxShadow: '0 0 2px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.14)',
    color: tokens.colorNeutralForeground1,
    ...typographyStyles.body1Strong,
    cursor: 'pointer',
    ':hover': { filter: 'saturate(1.15) brightness(1.02)' },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
    '@media (forced-colors: active)': { background: 'ButtonFace', color: 'ButtonText', border: '1px solid ButtonText' },
    '@media print': { display: 'none' },
  },
  // The wide column (1366 px and up, expanded): the full pill with its label.
  pillWide: {
    '@media only screen and (min-width: 1366px)': {
      alignSelf: 'flex-start',
      width: 'auto',
      height: 'auto',
      minHeight: '40px',
      paddingInlineStart: '14px',
      paddingInlineEnd: '10px',
    },
  },
  label: { display: 'none' },
  labelWide: { '@media only screen and (min-width: 1366px)': { display: 'inline' } },
  // Below 640 px there is no navigation column: the switch sits in the header, as an icon.
  header: {
    width: '32px',
    height: '32px',
    boxShadow: 'none',
    '@media only screen and (min-width: 640px)': { display: 'none' },
  },
  badge: {
    minWidth: '22px',
    height: '22px',
    paddingInline: '4px',
    boxSizing: 'border-box',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralForeground1,
    color: tokens.colorNeutralForegroundInverted,
    ...typographyStyles.caption1Strong,
    lineHeight: '22px',
    textAlign: 'center',
  },
  // On the round button the count sits on its corner.
  badgeCorner: { position: 'absolute', top: '-6px', right: '-8px', minWidth: '18px', height: '18px', lineHeight: '18px', fontSize: tokens.fontSizeBase100 },
  badgeCornerWide: { '@media only screen and (min-width: 1366px)': { position: 'static', minWidth: '22px', height: '22px', lineHeight: '22px', fontSize: tokens.fontSizeBase200 } },
  chev: {
    display: 'inline-flex',
    transitionProperty: 'transform',
    transitionDuration: '0.32s',
    transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0.01ms' },
  },
  chevOpen: { transform: 'rotate(180deg)' },
  chevWide: { display: 'none', '@media only screen and (min-width: 1366px)': { display: 'inline-flex' } },
  // Slides in over the navigation column; the screen beside it stays still (no reflow).
  drawer: {
    position: 'fixed',
    zIndex: 890,
    left: 0,
    top: 'calc(var(--atlas-header-h, 48px) + 8px)',
    // It ends just above the Merknader switch at the foot of the column (below 640 px the switch is in the header).
    bottom: '16px',
    '@media only screen and (min-width: 640px)': { bottom: '60px' },
    '@media only screen and (min-width: 1366px)': { bottom: '104px' },
    width: 'min(252px, calc(100vw - 32px))',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '0 12px 12px 0',
    boxShadow: '0 0 2px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.16)',
    transform: 'translateX(calc(-100% - 32px))',
    visibility: 'hidden',
    transitionProperty: 'transform, visibility',
    transitionDuration: '0.32s',
    transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0.01ms' },
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
    '@media print': { display: 'none' },
  },
  drawerOpen: { transform: 'none', visibility: 'visible' },
  // The header fades into the white body: no edge between them.
  head: {
    position: 'relative',
    isolation: 'isolate',
    overflow: 'hidden',
    flexShrink: 0,
    paddingInline: '18px',
    paddingBlockStart: '22px',
    paddingBlockEnd: '14px',
    borderRadius: '0 12px 0 0',
    background: `linear-gradient(180deg,rgba(255,255,255,0) 30%,#FFFFFF 100%), ${guide.card}`,
  },
  headRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacingHorizontalS },
  eyebrow: { ...typographyStyles.caption1Strong, margin: 0, color: guide.ink },
  title: { ...typographyStyles.subtitle1, margin: '2px 0 0' },
  count: { ...typographyStyles.caption1, margin: '2px 0 0', color: tokens.colorNeutralForeground2 },
  intro: { ...typographyStyles.caption1, margin: '12px 0 0', color: tokens.colorNeutralForeground2 },
  list: {
    flex: '1 1 auto',
    overflowY: 'auto',
    listStyle: 'none',
    margin: 0,
    paddingInline: '12px',
    paddingBlockStart: '4px',
    paddingBlockEnd: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  item: {
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingInline: '12px',
    paddingBlock: '10px',
    border: '1px solid #EEE6E2',
    borderRadius: '10px',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontFamily: 'inherit',
    textAlign: 'start',
    cursor: 'pointer',
    ':hover': { border: '1px solid #F2BBA4' },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
    '@media (forced-colors: active)': { border: '1px solid ButtonText' },
  },
  itemSel: { backgroundColor: '#FFF4EE', border: '1px solid #F2BBA4' },
  itemHead: { display: 'flex', alignItems: 'center', gap: '10px' },
  num: {
    flex: '0 0 24px',
    width: '24px',
    height: '24px',
    borderRadius: tokens.borderRadiusCircular,
    background: guide.mark,
    ...typographyStyles.caption1Strong,
    lineHeight: '24px',
    textAlign: 'center',
  },
  itemTitle: { ...typographyStyles.body1Strong },
  itemText: { ...typographyStyles.body1, color: tokens.colorNeutralForeground1 },
  clamp: {
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground2,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  foot: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    paddingInline: '14px',
    paddingBlock: '10px 14px',
    borderTop: '1px solid #F0E6E1',
  },
  of: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  footBtns: { display: 'flex', gap: '6px' },
});

/**
 * Merknader on or off. In the navigation column (a round button, or the full
 * pill when the column is wide); below 640 px, where there is no column, an
 * icon in the header. Review mode only.
 */
export function NotesPill({ onToggle, place, wide }: { onToggle: (on: boolean) => void; place: 'rail' | 'header'; wide?: boolean }) {
  const cls = useStyles();
  const { s } = useLang();
  const api = useNotes();
  if (!api) return null;
  const n = api.on ? api.entries.length : 0;
  const full = place === 'rail' && !!wide;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={api.on}
      aria-label={s('notesSwitch')}
      className={mergeClasses(cls.pill, full && cls.pillWide, place === 'header' && cls.header)}
      onClick={() => onToggle(!api.on)}
      data-notes-pill={place}
      data-no-print=""
    >
      <Lightbulb20Regular aria-hidden="true" />
      {place === 'rail' && <span className={mergeClasses(cls.label, full && cls.labelWide)}>{s('notesSwitch')}</span>}
      {n > 0 && (
        <span className={mergeClasses(cls.badge, cls.badgeCorner, full && cls.badgeCornerWide)} aria-hidden="true">
          {n}
        </span>
      )}
      {full && (
        <span className={mergeClasses(cls.chev, cls.chevWide, api.on && cls.chevOpen)} aria-hidden="true">
          <ChevronRight16Regular />
        </span>
      )}
    </button>
  );
}

/** The notes on this screen, numbered as the markers are. Slides out when Merknader is on and the screen has notes. */
export function NotesDrawer({ onClose }: { onClose: () => void }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const api = useNotes();
  const titleId = useId();
  if (!api) return null;
  const n = api.entries.length;
  const open = api.on && n > 0;
  const i = api.selected ? api.entries.findIndex((e) => e.id === api.selected) : -1;
  const go = (d: 1 | -1) => {
    if (!n) return;
    const from = i < 0 ? (d > 0 ? -1 : 0) : i;
    api.select(api.entries[(from + d + n) % n].id, { scroll: true, focusDrawer: true });
  };
  return (
    <aside className={mergeClasses(cls.drawer, open && cls.drawerOpen)} aria-labelledby={titleId} data-notes-drawer="" data-no-print="">
      <div className={cls.head}>
        <GuideImage variant="header" />
        <div className={cls.headRow}>
          <div>
            <p className={cls.eyebrow}>{s('reviewModeLabel')}</p>
            <h2 id={titleId} className={cls.title}>
              {s('notesSwitch')}
            </h2>
            <p className={cls.count}>{s('notesOnScreen', { n })}</p>
          </div>
          <Button appearance="subtle" icon={<Dismiss20Regular />} aria-label={s('notesClose')} onClick={onClose} />
        </div>
        <p className={cls.intro}>{s('notesIntro')}</p>
      </div>
      <ol className={cls.list}>
        {api.entries.map((e, k) => {
          const note = notes[e.id];
          if (!note) return null;
          const sel = api.selected === e.id;
          return (
            <li key={e.id}>
              <button
                type="button"
                className={mergeClasses(cls.item, sel && cls.itemSel)}
                aria-pressed={sel}
                data-note-item={e.id}
                onClick={() => api.select(sel ? null : e.id, { scroll: !sel })}
              >
                <span className={cls.itemHead}>
                  <span className={cls.num} aria-hidden="true">
                    {k + 1}
                  </span>
                  <span className={cls.itemTitle}>{t(note.title)}</span>
                </span>
                <span className={sel ? cls.itemText : cls.clamp}>{t(note.text)}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className={cls.foot}>
        <span className={cls.of}>{i >= 0 ? s('notesOf', { i: i + 1, n }) : ''}</span>
        <div className={cls.footBtns}>
          <Button size="small" icon={<ChevronLeft16Regular />} onClick={() => go(-1)}>
            {s('notesPrev')}
          </Button>
          <Button size="small" icon={<ChevronRight16Regular />} iconPosition="after" onClick={() => go(1)}>
            {s('notesNext')}
          </Button>
        </div>
      </div>
    </aside>
  );
}
